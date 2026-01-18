import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';
// Note: For production cron parsing, use a proper library like node-cron or later

admin.initializeApp();
const db = getFirestore();

const GEMINI_API_KEY = functions.config().gemini?.api_key || process.env.GEMINI_API_KEY || '';
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// ========== Notification Token Registration ==========
export const registerNotificationToken = functions.https.onCall(async (request) => {
  const { uid, token, platform } = request.data;
  if (!uid || !token || !platform) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }

  const tokenRef = db.collection('users').doc(uid).collection('notificationTokens').doc(token);
  await tokenRef.set({
    token,
    platform,
    createdAt: FieldValue.serverTimestamp(),
    lastSeenAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  return { success: true };
});

// ========== AI Schedule Parsing ==========
export const parseSchedulePrompt = functions.https.onCall(async (request) => {
  const { uid, prompt, timezone } = request.data;
  if (!uid || !prompt) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }

  if (!genAI) {
    throw new functions.https.HttpsError('failed-precondition', 'Gemini API key not configured');
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const now = new Date().toISOString();
    const parsePrompt = `Parse the following natural language schedule request.
Return ONLY a JSON object with fields: start_iso, end_iso, count (integer).
Use timezone: ${timezone || 'UTC'}. Current time is ${now}.
Schedule request: "${prompt.trim()}"

Example response: {"start_iso": "2025-01-20T09:00:00Z", "end_iso": "2025-01-24T18:00:00Z", "count": 3}`;

    const result = await model.generateContent(parsePrompt);
    const text = result.response.text().trim().replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(text);

    if (!parsed?.start_iso || !parsed?.end_iso || !parsed?.count) {
      throw new Error('Invalid schedule response');
    }

    const start = new Date(parsed.start_iso);
    const end = new Date(parsed.end_iso);
    const count = Math.max(1, Math.min(100, parseInt(String(parsed.count), 10) || 1));

    const slots = generateRandomSlots(start, end, count);
    return { slots, start_iso: parsed.start_iso, end_iso: parsed.end_iso, count };
  } catch (error: any) {
    throw new functions.https.HttpsError('internal', `Failed to parse schedule: ${error.message}`);
  }
});

function generateRandomSlots(start: Date, end: Date, count: number): string[] {
  if (count <= 0) return [];
  const startMs = start.getTime();
  const endMs = end.getTime();
  if (endMs <= startMs) return [];

  const slots = new Set<number>();
  const attempts = Math.max(20, count * 10);
  for (let i = 0; i < attempts && slots.size < count; i++) {
    const rand = startMs + Math.random() * (endMs - startMs);
    const rounded = roundToFiveMinutes(new Date(rand)).getTime();
    slots.add(Math.min(Math.max(rounded, startMs), endMs));
  }

  if (slots.size < count) {
    const step = (endMs - startMs) / count;
    for (let i = 0; i < count && slots.size < count; i++) {
      const ms = startMs + step * (i + 0.5);
      const rounded = roundToFiveMinutes(new Date(ms)).getTime();
      slots.add(Math.min(Math.max(rounded, startMs), endMs));
    }
  }

  return Array.from(slots)
    .sort((a, b) => a - b)
    .slice(0, count)
    .map((ms) => new Date(ms).toISOString());
}

function roundToFiveMinutes(date: Date): Date {
  const step = 5 * 60 * 1000;
  return new Date(Math.round(date.getTime() / step) * step);
}

// ========== Confirm Generated Schedule ==========
export const confirmGeneratedSchedule = functions.https.onCall(async (request) => {
  const { uid, reservationBase, slots } = request.data;
  if (!uid || !reservationBase || !Array.isArray(slots) || slots.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }

  const batch = db.batch();
  const settingsRef = db.collection('users').doc(uid).collection('settings').doc('lifeQuestions');
  const settingsSnap = await settingsRef.get();
  const timezone = settingsSnap.exists() ? (settingsSnap.data()?.timezone || 'UTC') : 'UTC';

  for (const slot of slots) {
    const resId = `res-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const resRef = db.collection('users').doc(uid).collection('questionReservations').doc(resId);
    batch.set(resRef, {
      id: resId,
      ...reservationBase,
      type: 'AI_GENERATED',
      targetTime: slot,
      nextRunAt: admin.firestore.Timestamp.fromDate(new Date(slot)),
      timezone,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
  return { success: true, count: slots.length };
});

// ========== Generate Meta Question (RAG) ==========
async function generateMetaQuestion(uid: string, metaQuestionId: string): Promise<string> {
  const metaRef = db.collection('users').doc(uid).collection('metaQuestions').doc(metaQuestionId);
  const metaSnap = await metaRef.get();
  if (!metaSnap.exists()) {
    throw new Error('Meta question not found');
  }
  const meta = metaSnap.data()!;
  const basePrompt = meta.basePrompt || '';

  // Retrieve recent contexts using vector search (if available) or recent N
  const contextsRef = db.collection('users').doc(uid).collection('questionContexts');
  let contexts: Array<{ summary: string }> = [];

  try {
      // Use most recent contexts (vector search requires proper setup with findNearest)
      // For now, we'll use recent contexts - full vector search can be added later
      const recentContexts = await contextsRef.orderBy('createdAt', 'desc').limit(5).get();
      contexts = recentContexts.docs.map((d) => ({ summary: d.data().summary || '' }));
    } catch (error) {
      // Fallback to recent contexts
      const recentContexts = await contextsRef.orderBy('createdAt', 'desc').limit(5).get();
      contexts = recentContexts.docs.map((d) => ({ summary: d.data().summary || '' }));
    }

  if (!genAI) {
    return basePrompt; // Fallback
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const contextText = contexts.length > 0
      ? contexts.map((c) => c.summary).join('\n')
      : '- No recent context available.';

    const prompt = `You are generating a single personalized question for a user.
Base prompt: ${basePrompt}
Recent context summaries:
${contextText}

Return ONE question sentence only, no extra text.`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    return basePrompt; // Fallback
  }
}

// ========== Scheduler (runs every minute) ==========
export const scanReservations = functions.scheduler.onSchedule('every 1 minutes', async (event) => {
  const now = admin.firestore.Timestamp.now();
  const usersRef = db.collection('users');

  // Get all users (in production, consider pagination or user-specific scheduling)
  const usersSnap = await usersRef.get();

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const reservationsRef = userDoc.ref.collection('questionReservations');

    // Query reservations where nextRunAt <= now and not processed (for FIXED/AI_GENERATED)
    // or RECURRING that need to run
    const dueReservations = await reservationsRef
      .where('nextRunAt', '<=', now)
      .where('isProcessed', '==', false)
      .limit(50)
      .get();

    for (const resDoc of dueReservations.docs) {
      const reservation = resDoc.data();
      await processReservation(uid, resDoc.id, reservation, now);
    }

    // Also check RECURRING reservations
    const recurringReservations = await reservationsRef
      .where('type', '==', 'RECURRING')
      .where('isProcessed', '==', false)
      .limit(50)
      .get();

    for (const resDoc of recurringReservations.docs) {
      const reservation = resDoc.data();
      if (reservation.cronExpression && reservation.nextRunAt) {
        const nextRun = admin.firestore.Timestamp.fromMillis(
          reservation.nextRunAt.toMillis()
        );
        if (nextRun.toMillis() <= now.toMillis()) {
          await processReservation(uid, resDoc.id, reservation, now);
        }
      }
    }
  }
});

async function processReservation(
  uid: string,
  reservationId: string,
  reservation: any,
  now: admin.firestore.Timestamp
): Promise<void> {
  let questionText = '';

  if (reservation.questionId) {
    // Manual question
    const questionRef = db.collection('users').doc(uid).collection('questions').doc(reservation.questionId);
    const questionSnap = await questionRef.get();
    if (questionSnap.exists()) {
      questionText = questionSnap.data()!.content || '';
    }
  } else if (reservation.metaQuestionId) {
    // Meta question - generate with RAG
    try {
      questionText = await generateMetaQuestion(uid, reservation.metaQuestionId);
    } catch (error) {
      console.error(`Failed to generate meta question for ${reservationId}:`, error);
      const metaRef = db.collection('users').doc(uid).collection('metaQuestions').doc(reservation.metaQuestionId);
      const metaSnap = await metaRef.get();
      questionText = metaSnap.exists() ? (metaSnap.data()!.basePrompt || '') : '';
    }
  }

  if (!questionText) {
    console.warn(`No question text for reservation ${reservationId}`);
    return;
  }

  // Get notification tokens
  const tokensRef = db.collection('users').doc(uid).collection('notificationTokens');
  const tokensSnap = await tokensRef.get();

  if (tokensSnap.empty) {
    console.warn(`No notification tokens for user ${uid}`);
    // Still create delivery for in-app inbox
  }

  // Create delivery
  const deliveryId = `delivery-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const deliveryRef = db.collection('users').doc(uid).collection('deliveries').doc(deliveryId);
  const scheduledFor = reservation.nextRunAt?.toDate() || reservation.targetTime
    ? admin.firestore.Timestamp.fromDate(new Date(reservation.targetTime))
    : now;

  // Send FCM notifications
  const messaging = admin.messaging();
  const sendPromises: Promise<any>[] = [];

  for (const tokenDoc of tokensSnap.docs) {
    const tokenData = tokenDoc.data();
    const token = tokenData.token;

    sendPromises.push(
      messaging.send({
        token,
        notification: {
          title: 'Life Question',
          body: questionText,
        },
        data: {
          deliveryId,
          reservationId,
          questionText,
          type: 'life_question',
        },
        webpush: {
          notification: {
            title: 'Life Question',
            body: questionText,
            icon: '/favicon.ico',
          },
        },
      }).catch((error) => {
        console.error(`Failed to send FCM to token ${token}:`, error);
        // Mark invalid tokens for cleanup
        if (error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered') {
          return tokenDoc.ref.delete();
        }
        return null;
      })
    );
  }

  const results = await Promise.allSettled(sendPromises);
  const sentCount = results.filter((r) => r.status === 'fulfilled').length;
  const status = sentCount > 0 || tokensSnap.empty ? 'SENT' : 'FAILED';

  await deliveryRef.set({
    id: deliveryId,
    reservationId,
    questionText,
    channel: 'FCM',
    status,
    scheduledFor: scheduledFor.toDate().toISOString(),
    sentAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  });

  // Update reservation
  const resRef = db.collection('users').doc(uid).collection('questionReservations').doc(reservationId);
  if (reservation.type === 'FIXED' || reservation.type === 'AI_GENERATED') {
    await resRef.update({
      isProcessed: true,
      lastRunAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Mark question as DONE if FIXED
    if (reservation.type === 'FIXED' && reservation.questionId) {
      const questionRef = db.collection('users').doc(uid).collection('questions').doc(reservation.questionId);
      await questionRef.update({ status: 'DONE', updatedAt: FieldValue.serverTimestamp() });
    }
  } else if (reservation.type === 'RECURRING' && reservation.cronExpression) {
    // Compute next run time
    const timezone = reservation.timezone || 'UTC';
    const lastRun = reservation.lastRunAt?.toDate() || new Date();
    const nextRun = computeNextCronRun(reservation.cronExpression, lastRun, timezone);

    await resRef.update({
      nextRunAt: admin.firestore.Timestamp.fromDate(nextRun),
      lastRunAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}

function computeNextCronRun(cronExpression: string, fromDate: Date, timezone: string): Date {
  // Simplified cron parser - for production, use a proper library
  // This handles basic patterns like "0 9 * * 1" (Monday 9 AM)
  try {
    const parts = cronExpression.trim().split(/\s+/);
    if (parts.length !== 5) {
      throw new Error('Invalid cron expression');
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    const next = new Date(fromDate);
    
    // Set time
    next.setMinutes(parseInt(minute, 10) || 0);
    next.setHours(parseInt(hour, 10) || 0);
    next.setSeconds(0);
    next.setMilliseconds(0);

    // If time has passed today, move to next occurrence
    if (next.getTime() <= fromDate.getTime()) {
      // Simple increment: add 24 hours (for daily) or 7 days (for weekly)
      if (dayOfWeek !== '*') {
        // Weekly pattern
        next.setDate(next.getDate() + 7);
      } else {
        // Daily pattern
        next.setDate(next.getDate() + 1);
      }
    }

    return next;
  } catch (error) {
    // Fallback: add 24 hours
    const next = new Date(fromDate);
    next.setHours(next.getHours() + 24);
    return next;
  }
}

// ========== Post-Answer Processing (Firestore Trigger) ==========
export const onAnswerCreate = functions.firestore
  .document('users/{uid}/answers/{answerId}')
  .onCreate(async (snap, context) => {
    const answer = snap.data();
    const uid = context.params.uid;
    const answerId = context.params.answerId;

    // Check if context already exists (idempotency)
    const existingContext = await db
      .collection('users').doc(uid)
      .collection('questionContexts')
      .where('answerId', '==', answerId)
      .limit(1)
      .get();

    if (!existingContext.empty) {
      console.log(`Context already exists for answer ${answerId}`);
      return;
    }

    const questionText = answer.sourceQuestionText || '';
    const answerText = answer.answerContent || '';

    if (!questionText || !answerText) {
      console.warn(`Incomplete answer data for ${answerId}`);
      return;
    }

    // Generate summary
    let summary = answerText.slice(0, 280); // Fallback
    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const prompt = `Summarize the following Q&A into up to 3 plain sentences of user context.
Question: "${questionText}"
Answer: "${answerText}"
Return only the summary.`;

        const result = await model.generateContent(prompt);
        summary = result.response.text().trim();
      } catch (error) {
        console.error(`Failed to generate summary for ${answerId}:`, error);
      }
    }

    // Generate embedding (using Vertex AI or Gemini embedding)
    let embedding: number[] | null = null;
    if (genAI) {
      try {
        // Use text-embedding-004 or similar
        // For now, we'll use a placeholder - in production, use Vertex AI Embeddings API
        // This requires additional setup with @google-cloud/aiplatform
        // For MVP, we'll store summary and add embedding later
        embedding = null; // TODO: Implement Vertex AI embedding
      } catch (error) {
        console.error(`Failed to generate embedding for ${answerId}:`, error);
      }
    }

    // Store context
    const contextId = `ctx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const contextRef = db.collection('users').doc(uid).collection('questionContexts').doc(contextId);

    const contextData: any = {
      id: contextId,
      answerId,
      summary,
      createdAt: FieldValue.serverTimestamp(),
    };

    if (embedding) {
      // Store as Firestore Vector type
      contextData.embedding = FieldValue.vector(embedding);
    }

    await contextRef.set(contextData);
  });
