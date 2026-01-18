// ************* This script is used to import life questions into the database. *************
// node "scripts/import-life-questions.mjs" --uid YOUR_UID --dry-run
// Then remove --dry-run to write:
// node "scripts/import-life-questions.mjs" --uid YOUR_UID

// Optional flags:
// --file path/to/markdown.md (defaults to ../LIFE_QUESTIONS.md)
// --status DRAFT|PUBLISH|DONE|ARCHIVE
// --service-account path/to/serviceAccount.json
// *************

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import admin from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parseArgs = () => {
  const args = new Map();
  const raw = process.argv.slice(2);
  for (let i = 0; i < raw.length; i += 1) {
    const token = raw[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = raw[i + 1];
    if (!next || next.startsWith('--')) {
      args.set(key, true);
    } else {
      args.set(key, next);
      i += 1;
    }
  }
  return args;
};

const extractQuestions = (markdown) => {
  const lines = markdown.split(/\r?\n/);
  const questions = [];
  const seen = new Set();

  const push = (text) => {
    const normalized = text.trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    questions.push(normalized);
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let match = trimmed.match(/^>\s*Q\d+\.?\s*["“](.+?)["”]\s*$/);
    if (match) {
      push(match[1]);
      continue;
    }

    match = trimmed.match(/^\*\*Q:\*\*\s*["“](.+?)["”]\s*$/);
    if (match) {
      push(match[1]);
      continue;
    }

    match = trimmed.match(/^["“](.+?)["”]\s*$/);
    if (match) {
      push(match[1]);
    }
  }

  return questions;
};

const resolveProjectId = async () => {
  if (process.env.FIREBASE_PROJECT_ID) return process.env.FIREBASE_PROJECT_ID;
  if (process.env.GOOGLE_CLOUD_PROJECT) return process.env.GOOGLE_CLOUD_PROJECT;

  const rcPath = path.resolve(process.cwd(), '.firebaserc');
  try {
    const raw = await fs.readFile(rcPath, 'utf8');
    const data = JSON.parse(raw);
    const defaultProject = data?.projects?.default;
    return typeof defaultProject === 'string' ? defaultProject : undefined;
  } catch {
    return undefined;
  }
};

const main = async () => {
  const args = parseArgs();
  const uid = args.get('uid');
  const status = (args.get('status') || 'PUBLISH').toUpperCase();
  const dryRun = Boolean(args.get('dry-run'));
  const fileArg = args.get('file');

  if (!uid || typeof uid !== 'string') {
    throw new Error('Missing required --uid argument.');
  }

  const serviceAccountPath = args.get('service-account') || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const projectId = await resolveProjectId();
  if (serviceAccountPath && typeof serviceAccountPath === 'string') {
    const resolved = path.isAbsolute(serviceAccountPath)
      ? serviceAccountPath
      : path.resolve(process.cwd(), serviceAccountPath);
    const serviceAccount = JSON.parse(await fs.readFile(resolved, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id || projectId,
    });
  } else {
    if (projectId) {
      admin.initializeApp({ projectId });
    } else {
      admin.initializeApp();
    }
  }

  const mdPath = fileArg
    ? path.resolve(process.cwd(), fileArg)
    : path.resolve(__dirname, '..', 'LIFE_QUESTIONS.md');

  const markdown = await fs.readFile(mdPath, 'utf8');
  const questions = extractQuestions(markdown);

  if (questions.length === 0) {
    console.log('No questions found in markdown.');
    return;
  }

  const db = getFirestore();
  const collectionRef = db.collection('users').doc(uid).collection('questions');

  const existingSnap = await collectionRef.get();
  const existingContent = new Set(
    existingSnap.docs
      .map((doc) => (doc.data()?.content || '').trim())
      .filter(Boolean)
  );

  const pending = questions.filter((q) => !existingContent.has(q));

  if (pending.length === 0) {
    console.log('All questions already exist. Nothing to import.');
    return;
  }

  console.log(`Found ${questions.length} questions, ${pending.length} new.`);
  if (dryRun) {
    console.log('Dry run enabled. No writes performed.');
    return;
  }

  let batch = db.batch();
  let batchCount = 0;
  let written = 0;

  for (const content of pending) {
    const id = `q-${crypto.randomUUID()}`;
    const docRef = collectionRef.doc(id);
    batch.set(docRef, {
      id,
      content,
      status,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    batchCount += 1;
    written += 1;

    if (batchCount >= 450) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`Imported ${written} questions into users/${uid}/questions.`);
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
