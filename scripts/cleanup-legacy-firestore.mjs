#!/usr/bin/env node
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const LEGACY_USER_COLLECTIONS = [
  'boards',
  'weeks',
  'logs',
  'questions',
  'metaQuestions',
  'questionReservations',
  'answers',
  'questionContexts',
  'deliveries',
];

const LEGACY_USER_DOCS = ['settings/lifeQuestions'];
const BATCH_LIMIT = 450;

function printHelp() {
  console.log(`Usage:
  pnpm cleanup:legacy -- --project <project-id> --uid <uid>
  pnpm cleanup:legacy -- --project <project-id> --all-users

Options:
  --project <id>                 Required Firebase project id.
  --uid <uid>                    Target one user.
  --all-users                    Target every user document under users/.
  --dry-run                      Print target paths and counts. Default.
  --execute                      Delete targets. Requires --confirm and --backup-export.
  --confirm                      Required with --execute.
  --backup-export <path-or-note> Required with --execute; record the backup/export used.
  --confirm-production <id>      Required with --execute for production-like project ids.
  --service-account <json>       Optional service account JSON path. Defaults to ADC.
  --help                         Show this help.

Legacy targets:
  users/{uid}/{${LEGACY_USER_COLLECTIONS.join('|')}}/*
  users/{uid}/settings/lifeQuestions
  nested documents below those legacy documents`);
}

function parseArgs(argv) {
  const args = {
    dryRun: true,
    execute: false,
    confirm: false,
    allUsers: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case '--':
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
      case '--project':
        args.project = argv[++index];
        break;
      case '--uid':
        args.uid = argv[++index];
        break;
      case '--all-users':
        args.allUsers = true;
        break;
      case '--dry-run':
        args.dryRun = true;
        args.execute = false;
        break;
      case '--execute':
        args.execute = true;
        args.dryRun = false;
        break;
      case '--confirm':
        args.confirm = true;
        break;
      case '--backup-export':
        args.backupExport = argv[++index];
        break;
      case '--confirm-production':
        args.confirmProduction = argv[++index];
        break;
      case '--service-account':
        args.serviceAccount = argv[++index];
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function validateArgs(args) {
  if (args.help) return;
  if (!args.project) throw new Error('--project is required.');
  if (!args.uid && !args.allUsers) throw new Error('Pass --uid <uid> or --all-users.');
  if (args.uid && args.allUsers) throw new Error('Use either --uid or --all-users, not both.');

  if (args.execute) {
    if (!args.confirm) throw new Error('--execute requires --confirm.');
    if (!args.backupExport) throw new Error('--execute requires --backup-export <path-or-note>.');
    if (isProductionProject(args.project) && args.confirmProduction !== args.project) {
      throw new Error(`Production project deletion requires --confirm-production ${args.project}.`);
    }
  }
}

function isProductionProject(projectId) {
  return /(^|[-_])(prod|production)([-_]|$)/i.test(projectId);
}

async function initAdmin(args) {
  if (args.serviceAccount) {
    const serviceAccount = await importJson(args.serviceAccount);
    initializeApp({
      credential: cert(serviceAccount),
      projectId: args.project,
    });
  } else {
    initializeApp({
      credential: applicationDefault(),
      projectId: args.project,
    });
  }
  return getFirestore();
}

async function importJson(path) {
  const { readFile } = await import('node:fs/promises');
  return JSON.parse(await readFile(path, 'utf8'));
}

async function listTargetUids(db, args) {
  if (args.uid) return [args.uid];
  const snapshot = await db.collection('users').get();
  return snapshot.docs.map((doc) => doc.id);
}

async function collectDocumentTree(docRef, collector) {
  const snapshot = await docRef.get();
  if (!snapshot.exists) return;

  const childCollections = await docRef.listCollections();
  for (const collectionRef of childCollections) {
    await collectCollectionTree(collectionRef, collector);
  }

  collector.push(docRef);
}

async function collectCollectionTree(collectionRef, collector) {
  const docs = await collectionRef.listDocuments();
  for (const docRef of docs) {
    await collectDocumentTree(docRef, collector);
  }
}

async function collectTargetsForUser(db, uid) {
  const userRef = db.collection('users').doc(uid);
  const docs = [];

  for (const collectionName of LEGACY_USER_COLLECTIONS) {
    await collectCollectionTree(userRef.collection(collectionName), docs);
  }

  for (const relativePath of LEGACY_USER_DOCS) {
    await collectDocumentTree(userRef.collection('settings').doc(relativePath.split('/')[1]), docs);
  }

  return docs;
}

async function deleteDocs(db, docs) {
  let batch = db.batch();
  let pending = 0;
  let deleted = 0;

  for (const docRef of docs) {
    batch.delete(docRef);
    pending += 1;
    deleted += 1;

    if (pending >= BATCH_LIMIT) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }

  if (pending > 0) {
    await batch.commit();
  }

  return deleted;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  validateArgs(args);

  const db = await initAdmin(args);
  const uids = await listTargetUids(db, args);
  const allTargets = [];

  console.log(`Project: ${args.project}`);
  console.log(`Mode: ${args.execute ? 'execute' : 'dry-run'}`);
  console.log(`Users: ${uids.length}`);
  if (args.backupExport) console.log(`Backup/export: ${args.backupExport}`);

  for (const uid of uids) {
    const docs = await collectTargetsForUser(db, uid);
    allTargets.push(...docs);
    console.log(`\nusers/${uid}: ${docs.length} legacy documents`);
    for (const docRef of docs) {
      console.log(`  ${docRef.path}`);
    }
  }

  console.log(`\nTotal legacy documents: ${allTargets.length}`);

  if (!args.execute) {
    console.log('Dry run only. Pass --execute --confirm --backup-export <path-or-note> to delete.');
    return;
  }

  const deleted = await deleteDocs(db, allTargets);
  console.log(`Deleted ${deleted} legacy documents.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
