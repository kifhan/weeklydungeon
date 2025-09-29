import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { formatWeekKey } from '../utils/date';
import { HabitEntry, DungeonLog, WeekData, ScheduleBlock } from '../types';

// ========== Generalized Kanban Model ==========
// We generalize the previous "weeks" to a Kanban-like structure so the UI can model week/day columns or any arbitrary columns.
// Firestore layout:
// users/{uid}/boards/{boardId}
// users/{uid}/boards/{boardId}/columns/{columnId}
// users/{uid}/boards/{boardId}/cards/{cardId}
// Where columns store ordering of cardIds; cards store the block/task detail.

export type Board = {
  id: string;
  name: string; // e.g., "Weekly Dungeon Map (2025-09-29)" or "My Kanban"
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type Column = {
  id: string;
  name: string; // e.g., monday, tuesday, backlog, in-progress, done
  order: number; // ordering among columns
  cardOrder: string[]; // ordering of card ids within this column
  title?: string; // display title for the column/day
  theme?: string; // description/theme
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type Card = {
  id: string;
  title: string; // block.name
  startTime?: string;
  endTime?: string;
  emoji?: string;
  note?: string;
  blockType?: string; // Focus/Flow/...
  energyLevel?: string; // High/Moderate/Low/Recharge
  done?: boolean;
  reflectionNote?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

// Helpers to build paths
const userDoc = (uid: string) => doc(db, 'users', uid);
const boardsCol = (uid: string) => collection(userDoc(uid), 'boards');
const boardDoc = (uid: string, boardId: string) => doc(boardsCol(uid), boardId);
const columnsCol = (uid: string, boardId: string) => collection(boardDoc(uid, boardId), 'columns');
const columnDoc = (uid: string, boardId: string, columnId: string) => doc(columnsCol(uid, boardId), columnId);
const cardsCol = (uid: string, boardId: string) => collection(boardDoc(uid, boardId), 'cards');
const cardDoc = (uid: string, boardId: string, cardId: string) => doc(cardsCol(uid, boardId), cardId);

// ========== Boards ==========
export async function createBoard(uid: string, board: Omit<Board, 'id'> & { id?: string }) {
  const id = board.id || crypto.randomUUID();
  await setDoc(boardDoc(uid, id), {
    id,
    name: board.name,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return id;
}

export function listenBoards(uid: string, cb: (boards: Board[]) => void) {
  const q = query(boardsCol(uid), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const list: Board[] = [];
    snap.forEach((d) => list.push(d.data() as Board));
    cb(list);
  });
}

export async function updateBoard(uid: string, boardId: string, patch: Partial<Board>) {
  await updateDoc(boardDoc(uid, boardId), { ...patch, updatedAt: serverTimestamp() });
}

export async function deleteBoard(uid: string, boardId: string) {
  // Danger: consider cascading delete of columns/cards in callable or via client-side batch
  await deleteDoc(boardDoc(uid, boardId));
}

// ========== Columns ==========
export async function createColumn(uid: string, boardId: string, column: Omit<Column, 'id'> & { id?: string }) {
  const id = column.id || crypto.randomUUID();
  await setDoc(columnDoc(uid, boardId, id), {
    id,
    name: column.name,
    order: column.order ?? 0,
    cardOrder: column.cardOrder ?? [],
    title: column.title || null,
    theme: column.theme || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return id;
}

export function listenColumns(uid: string, boardId: string, cb: (cols: Column[]) => void) {
  const q = query(columnsCol(uid, boardId), orderBy('order', 'asc'));
  return onSnapshot(q, (snap) => {
    const list: Column[] = [];
    snap.forEach((d) => list.push(d.data() as Column));
    cb(list);
  });
}

export async function updateColumn(uid: string, boardId: string, columnId: string, patch: Partial<Column>) {
  await updateDoc(columnDoc(uid, boardId, columnId), { ...patch, updatedAt: serverTimestamp() });
}

export async function deleteColumn(uid: string, boardId: string, columnId: string) {
  await deleteDoc(columnDoc(uid, boardId, columnId));
}

// ========== Cards ==========
export async function createCard(uid: string, boardId: string, card: Omit<Card, 'id'> & { id?: string }) {
  const id = card.id || crypto.randomUUID();
  await setDoc(cardDoc(uid, boardId, id), {
    id,
    title: card.title,
    startTime: card.startTime || null,
    endTime: card.endTime || null,
    emoji: card.emoji || null,
    note: card.note || '',
    blockType: card.blockType || null,
    energyLevel: card.energyLevel || null,
    done: !!card.done,
    reflectionNote: card.reflectionNote || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return id;
}

export function listenCards(uid: string, boardId: string, cb: (cards: Card[]) => void) {
  const q = query(cardsCol(uid, boardId), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => {
    const list: Card[] = [];
    snap.forEach((d) => list.push(d.data() as Card));
    cb(list);
  });
}

export async function updateCard(uid: string, boardId: string, cardId: string, patch: Partial<Card>) {
  await updateDoc(cardDoc(uid, boardId, cardId), { ...patch, updatedAt: serverTimestamp() });
}

export async function deleteCard(uid: string, boardId: string, cardId: string) {
  await deleteDoc(cardDoc(uid, boardId, cardId));
}

export async function moveCard(
  uid: string,
  boardId: string,
  cardId: string,
  fromColumnId: string,
  toColumnId: string,
  toIndex: number
) {
  // Atomically update columns' cardOrder using a batch
  const batch = writeBatch(db);
  const fromRef = columnDoc(uid, boardId, fromColumnId);
  const toRef = columnDoc(uid, boardId, toColumnId);

  const fromSnap = await getDoc(fromRef);
  const toSnap = await getDoc(toRef);
  const fromData = fromSnap.data() as Column | undefined;
  const toData = toSnap.data() as Column | undefined;
  if (!fromData || !toData) return;

  const fromOrder = [...fromData.cardOrder].filter((id) => id !== cardId);
  const toOrder = [...toData.cardOrder];
  toOrder.splice(toIndex, 0, cardId);

  batch.update(fromRef, { cardOrder: fromOrder, updatedAt: serverTimestamp() });
  batch.update(toRef, { cardOrder: toOrder, updatedAt: serverTimestamp() });
  await batch.commit();
}

// ========== Habits (kept for feature parity) ==========
const habitsCol = (uid: string) => collection(userDoc(uid), 'habits');

export function listenHabitEntries(uid: string, cb: (entries: HabitEntry[]) => void) {
  const q = query(habitsCol(uid), orderBy('createdAt', 'desc'), limit(500));
  return onSnapshot(q, (snap) => {
    const list: HabitEntry[] = [];
    snap.forEach((d) => list.push(d.data() as HabitEntry));
    cb(list);
  });
}

export async function addHabitEntry(uid: string, entry: HabitEntry) {
  const ref = doc(habitsCol(uid), entry.id);
  await setDoc(ref, {
    ...entry,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// ========== Logs (kept for feature parity) ==========
const logsCol = (uid: string) => collection(userDoc(uid), 'logs');

export function listenDungeonLogs(uid: string, cb: (logs: DungeonLog[]) => void) {
  const q = query(logsCol(uid), orderBy('completedAt', 'desc'), limit(500));
  return onSnapshot(q, (snap) => {
    const list: DungeonLog[] = [];
    snap.forEach((d) => list.push(d.data() as DungeonLog));
    cb(list);
  });
}

export async function addDungeonLog(uid: string, log: DungeonLog) {
  const ref = doc(logsCol(uid), log.id);
  await setDoc(ref, {
    ...log,
    createdAt: serverTimestamp(),
  });
}

// ========== Compatibility helpers to convert WeekData to Kanban ==========
// This lets us keep the current UI while persisting into the generalized model.

export async function saveWeekAsBoard(uid: string, boardId: string, weekData: WeekData) {
  // Ensure board exists
  const boardSnap = await getDoc(boardDoc(uid, boardId));
  if (!boardSnap.exists()) {
    await createBoard(uid, { id: boardId, name: `Weekly Dungeon ${boardId}` });
  }

  // Upsert columns for each day; create cards for blocks and set column ordering
  const batch = writeBatch(db);

  const dayKeys = Object.keys(weekData);
  dayKeys.forEach((dayKey, dayIndex) => {
    const colRef = columnDoc(uid, boardId, dayKey);
    const blocks = weekData[dayKey].blocks || [];
    const cardIds: string[] = [];

    // Set column doc
    batch.set(colRef, {
      id: dayKey,
      name: dayKey,
      order: dayIndex,
      title: weekData[dayKey].title || dayKey,
      theme: weekData[dayKey].theme || '',
      cardOrder: blocks.map((b) => {
        const id = b.id || crypto.randomUUID();
        cardIds.push(id);
        return id;
      }),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Ensure each block is a card
    blocks.forEach((b) => {
      const id = b.id || crypto.randomUUID();
      const cRef = cardDoc(uid, boardId, id);
      batch.set(cRef, {
        id,
        title: b.name,
        startTime: b.startTime,
        endTime: b.endTime,
        emoji: b.emoji,
        note: b.note,
        blockType: b.blockType,
        energyLevel: b.energyLevel,
        done: b.done,
        reflectionNote: b.reflectionNote || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
  });

  await batch.commit();
}

export type { Board as KanbanBoard, Column as KanbanColumn, Card as KanbanCard };

// ========== Weeks subcollection API (as per prompt) ==========
const weeksCol = (uid: string) => collection(userDoc(uid), 'weeks');
const weekDocRef = (uid: string, weekKey: string) => doc(weeksCol(uid), weekKey);

export function getWeekKey(date: Date): string {
  return formatWeekKey(date);
}

export type WeekDoc = {
  weekKey: string;
  weekStartDate: string; // ISO yyyy-mm-dd (Monday)
  data: WeekData;
  updatedAt?: Timestamp;
};

export async function saveWeek(uid: string, weekKey: string, weekData: WeekData) {
  await setDoc(
    weekDocRef(uid, weekKey),
    {
      weekKey,
      weekStartDate: weekKey,
      data: weekData,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function listenWeek(
  uid: string,
  weekKey: string,
  cb: (doc: WeekDoc | null) => void
) {
  return onSnapshot(weekDocRef(uid, weekKey), (snap) => {
    if (!snap.exists()) return cb(null);
    cb(snap.data() as WeekDoc);
  });
}

export async function updateBlock(uid: string, weekKey: string, updatedBlock: ScheduleBlock) {
  const snap = await getDoc(weekDocRef(uid, weekKey));
  if (!snap.exists()) return;
  const data = snap.data() as WeekDoc;
  const newData: WeekData = { ...data.data };
  // Find the day that contains the block
  for (const dayKey of Object.keys(newData)) {
    const blocks = newData[dayKey].blocks || [];
    const idx = blocks.findIndex((b) => b.id === updatedBlock.id);
    if (idx !== -1) {
      const newBlocks = [...blocks];
      newBlocks[idx] = updatedBlock;
      newData[dayKey] = { ...newData[dayKey], blocks: newBlocks };
      break;
    }
  }
  await saveWeek(uid, weekKey, newData);
}

export async function toggleBlockDone(
  uid: string,
  weekKey: string,
  dayKey: string,
  blockId: string,
  done: boolean
) {
  const snap = await getDoc(weekDocRef(uid, weekKey));
  if (!snap.exists()) return;
  const data = snap.data() as WeekDoc;
  const day = data.data[dayKey];
  if (!day) return;
  const updated = day.blocks.map((b) => (b.id === blockId ? { ...b, done } : b));
  const newData: WeekData = { ...data.data, [dayKey]: { ...day, blocks: updated } };
  await saveWeek(uid, weekKey, newData);
}

// ===== Migration helpers =====
export async function hasWeekDoc(uid: string, weekKey: string): Promise<boolean> {
  const snap = await getDoc(weekDocRef(uid, weekKey));
  return snap.exists();
}

export async function hasAnyHabits(uid: string): Promise<boolean> {
  const q = query(habitsCol(uid), limit(1));
  const s = await getDocs(q);
  return !s.empty;
}

export async function hasAnyLogs(uid: string): Promise<boolean> {
  const q = query(logsCol(uid), limit(1));
  const s = await getDocs(q);
  return !s.empty;
}

export async function batchAddHabits(uid: string, entries: HabitEntry[]) {
  if (!entries?.length) return;
  const batch = writeBatch(db);
  for (const e of entries) {
    const ref = doc(habitsCol(uid), e.id);
    batch.set(ref, { ...e, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
  }
  await batch.commit();
}

export async function batchAddLogs(uid: string, logs: DungeonLog[]) {
  if (!logs?.length) return;
  const batch = writeBatch(db);
  for (const l of logs) {
    const ref = doc(logsCol(uid), l.id);
    batch.set(ref, { ...l, createdAt: serverTimestamp() }, { merge: true });
  }
  await batch.commit();
}

export async function migrateLocalIfNeeded(
  uid: string,
  opts: {
    weekKey: string;
    weekData?: WeekData;
    habits?: HabitEntry[];
    logs?: DungeonLog[];
  }
) {
  const tasks: Promise<any>[] = [];

  // Week
  if (opts.weekData) {
    const exists = await hasWeekDoc(uid, opts.weekKey);
    if (!exists) {
      tasks.push(saveWeek(uid, opts.weekKey, opts.weekData));
    }
  }

  // Habits
  if (opts.habits && opts.habits.length > 0) {
    const any = await hasAnyHabits(uid);
    if (!any) {
      tasks.push(batchAddHabits(uid, opts.habits));
    }
  }

  // Logs
  if (opts.logs && opts.logs.length > 0) {
    const any = await hasAnyLogs(uid);
    if (!any) {
      tasks.push(batchAddLogs(uid, opts.logs));
    }
  }

  await Promise.all(tasks);
}
