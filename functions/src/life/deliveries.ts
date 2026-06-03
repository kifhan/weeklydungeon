import * as functions from "firebase-functions/v2";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db, admin } from "../firebase";
import { getAuthenticatedUid } from "./auth";
import { generateMetaQuestion } from "./gemini";
import { computeNextRunDate, normalizeTimezone } from "./reservations";
import type {
  NotificationPlatform,
  RegisterNotificationTokenRequest,
  ReservationDoc,
} from "./types";

const VALID_PLATFORMS = new Set<NotificationPlatform>(["web", "ios", "android"]);
const LEGACY_PLACEHOLDER_WINDOW_MS = 60 * 1000;

type DateInputLike = {
  toDate?: () => Date;
};

export function toDateOrNull(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "object" && value !== null) {
    const maybeDateInput = value as DateInputLike;
    if (typeof maybeDateInput.toDate === "function") {
      const date = maybeDateInput.toDate();
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  return null;
}

export function resolveScheduledForDate(
  reservation: Pick<ReservationDoc, "nextRunAt" | "targetTime">,
  fallbackDate: Date,
): Date {
  return toDateOrNull(reservation.nextRunAt) ??
    toDateOrNull(reservation.targetTime) ??
    fallbackDate;
}

export function getLegacyRecurringNextRun(
  reservation: ReservationDoc,
  nowDate: Date,
): Date | null {
  if (reservation.type !== "RECURRING" || !reservation.cronExpression) {
    return null;
  }

  if (reservation.lastRunAt) {
    return null;
  }

  const createdAt = toDateOrNull(reservation.createdAt);
  const nextRunAt = toDateOrNull(reservation.nextRunAt);
  if (!createdAt || !nextRunAt) {
    return null;
  }

  if (Math.abs(nextRunAt.getTime() - createdAt.getTime()) > LEGACY_PLACEHOLDER_WINDOW_MS) {
    return null;
  }

  const normalizedNextRun = computeNextRunDate(
    reservation.cronExpression,
    normalizeTimezone(reservation.timezone),
    createdAt,
  );

  return normalizedNextRun.getTime() > nowDate.getTime() ? normalizedNextRun : null;
}

async function loadQuestionText(uid: string, reservation: ReservationDoc): Promise<string> {
  if (reservation.questionId) {
    const questionSnap = await db
      .collection("users")
      .doc(uid)
      .collection("questions")
      .doc(reservation.questionId)
      .get();

    if (questionSnap.exists) {
      return String(questionSnap.data()?.content || "");
    }
  }

  if (reservation.metaQuestionId) {
    const metaSnap = await db
      .collection("users")
      .doc(uid)
      .collection("metaQuestions")
      .doc(reservation.metaQuestionId)
      .get();

    if (!metaSnap.exists) {
      return "";
    }

    const basePrompt = String(metaSnap.data()?.basePrompt || "");
    const recentContexts = await db
      .collection("users")
      .doc(uid)
      .collection("questionContexts")
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();

    const contextSummaries = recentContexts.docs
      .map((doc) => String(doc.data().summary || ""))
      .filter(Boolean);

    return generateMetaQuestion(basePrompt, contextSummaries);
  }

  return "";
}

export const registerNotificationToken = functions.https.onCall(async (request) => {
  const uid = getAuthenticatedUid(request);
  const data = (request.data ?? {}) as Partial<RegisterNotificationTokenRequest>;
  const token = typeof data.token === "string" ? data.token.trim() : "";
  const platform = data.platform;

  if (!token || !platform || !VALID_PLATFORMS.has(platform)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing or invalid notification token payload",
    );
  }

  const tokenRef = db
    .collection("users")
    .doc(uid)
    .collection("notificationTokens")
    .doc(token);

  await tokenRef.set({
    token,
    platform,
    createdAt: FieldValue.serverTimestamp(),
    lastSeenAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  return { success: true };
});

export async function processReservation(
  uid: string,
  reservationId: string,
  reservation: ReservationDoc,
  now: Timestamp = Timestamp.now(),
): Promise<void> {
  const reservationRef = db
    .collection("users")
    .doc(uid)
    .collection("questionReservations")
    .doc(reservationId);

  const normalizedLegacyNextRun = getLegacyRecurringNextRun(reservation, now.toDate());
  if (normalizedLegacyNextRun) {
    await reservationRef.update({
      nextRunAt: Timestamp.fromDate(normalizedLegacyNextRun),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return;
  }

  const questionText = await loadQuestionText(uid, reservation);
  if (!questionText) {
    console.warn(`No question text for reservation ${reservationId}`);
    return;
  }

  const tokensSnap = await db
    .collection("users")
    .doc(uid)
    .collection("notificationTokens")
    .get();

  const deliveryId = `delivery-${reservationId}-${Date.now()}`;
  const deliveryRef = db
    .collection("users")
    .doc(uid)
    .collection("deliveries")
    .doc(deliveryId);
  const scheduledForDate = resolveScheduledForDate(reservation, now.toDate());
  const messaging = admin.messaging();

  const deliveryResults = await Promise.all(tokensSnap.docs.map(async (tokenDoc) => {
    const token = String(tokenDoc.data().token || "");
    if (!token) {
      return false;
    }

    try {
      await messaging.send({
        token,
        notification: {
          title: "Life Question",
          body: questionText,
        },
        data: {
          deliveryId,
          reservationId,
          questionText,
          type: "life_question",
        },
        webpush: {
          notification: {
            title: "Life Question",
            body: questionText,
            icon: "/favicon.ico",
          },
        },
      });
      return true;
    } catch (error) {
      console.error(`Failed to send FCM to token ${token}:`, error);
      const code = error && typeof error === "object" && "code" in error ?
        String((error as { code?: string }).code) :
        "";
      if (
        code === "messaging/invalid-registration-token" ||
        code === "messaging/registration-token-not-registered"
      ) {
        await tokenDoc.ref.delete();
      }

      return false;
    }
  }));

  const sentCount = deliveryResults.filter(Boolean).length;
  const hasTokens = !tokensSnap.empty;
  const status = sentCount > 0 || !hasTokens ? "SENT" : "FAILED";
  const channel = hasTokens ? "FCM" : "IN_APP";

  await deliveryRef.set({
    id: deliveryId,
    reservationId,
    questionText,
    channel,
    status,
    scheduledFor: scheduledForDate.toISOString(),
    sentAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  });

  if (reservation.type === "FIXED" || reservation.type === "AI_GENERATED") {
    await reservationRef.update({
      isProcessed: true,
      lastRunAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (reservation.type === "FIXED" && reservation.questionId) {
      const questionRef = db
        .collection("users")
        .doc(uid)
        .collection("questions")
        .doc(reservation.questionId);
      await questionRef.update({
        status: "DONE",
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    return;
  }

  if (reservation.type === "RECURRING" && reservation.cronExpression) {
    const nextRunDate = computeNextRunDate(
      reservation.cronExpression,
      normalizeTimezone(reservation.timezone),
      scheduledForDate,
    );

    await reservationRef.update({
      nextRunAt: Timestamp.fromDate(nextRunDate),
      lastRunAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}
