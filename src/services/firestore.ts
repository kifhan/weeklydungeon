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
import {
  HabitEntry,
  DungeonLog,
  WeekData,
  ScheduleBlock,
  Question,
  MetaQuestion,
  QuestionReservation,
  Answer,
  QuestionContext,
  LifeQuestionSettings,
  Delivery,
  NotificationToken,
} from '../types';

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

// ========== Quest Board Helpers ==========
const QUESTS_BOARD_ID = 'quests';
const DEFAULT_COLUMNS = [
  { id: 'backlog', name: 'backlog', title: 'Backlog', order: 0 },
  { id: 'today', name: 'today', title: 'Today', order: 1 },
  { id: 'in_progress', name: 'in_progress', title: 'In Progress', order: 2 },
  { id: 'done', name: 'done', title: 'Done', order: 3 },
];

export async function ensureQuestsBoardExists(uid: string): Promise<string> {
  const boardId = QUESTS_BOARD_ID;
  const boardRef = boardDoc(uid, boardId);
  const boardSnap = await getDoc(boardRef);

  if (!boardSnap.exists()) {
    // Create board
    await createBoard(uid, { id: boardId, name: 'Quest Board' });

    // Create default columns
    const batch = writeBatch(db);
    DEFAULT_COLUMNS.forEach((col) => {
      const colRef = columnDoc(uid, boardId, col.id);
      batch.set(colRef, {
        id: col.id,
        name: col.name,
        order: col.order,
        title: col.title,
        theme: null,
        cardOrder: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  }

  return boardId;
}

export async function addCardToColumn(
  uid: string,
  boardId: string,
  columnId: string,
  card: Omit<Card, 'id'>,
  position: 'top' | 'bottom' = 'bottom'
): Promise<string> {
  const cardId = await createCard(uid, boardId, card);
  const colRef = columnDoc(uid, boardId, columnId);
  const colSnap = await getDoc(colRef);
  const colData = colSnap.data() as Column | undefined;
  if (!colData) throw new Error(`Column ${columnId} not found`);

  const newOrder = position === 'top' 
    ? [cardId, ...colData.cardOrder]
    : [...colData.cardOrder, cardId];

  await updateColumn(uid, boardId, columnId, { cardOrder: newOrder });
  return cardId;
}

export async function reorderCardInColumn(
  uid: string,
  boardId: string,
  columnId: string,
  cardId: string,
  newIndex: number
): Promise<void> {
  const colRef = columnDoc(uid, boardId, columnId);
  const colSnap = await getDoc(colRef);
  const colData = colSnap.data() as Column | undefined;
  if (!colData) return;

  const currentOrder = [...colData.cardOrder];
  const oldIndex = currentOrder.indexOf(cardId);
  if (oldIndex === -1) return;

  currentOrder.splice(oldIndex, 1);
  currentOrder.splice(newIndex, 0, cardId);

  await updateColumn(uid, boardId, columnId, { cardOrder: currentOrder });
}

// ========== Migration from WeekData to Kanban Board ==========
function getCurrentDayKey(date: Date): string {
  const dayIndex = date.getDay();
  const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  if (dayIndex === 0) return DAYS[6];
  return DAYS[dayIndex - 1];
}

export async function migrateWeekDataToQuestsBoard(uid: string, weekKey: string, weekData: WeekData): Promise<void> {
  const boardId = await ensureQuestsBoardExists(uid);
  
  // Check if board already has cards (don't migrate if it does)
  const cardsSnap = await getDocs(query(cardsCol(uid, boardId), limit(1)));
  if (!cardsSnap.empty) {
    // Board already has data, skip migration
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDayKey = getCurrentDayKey(today);
  
  const batch = writeBatch(db);
  const cardIdsByColumn: Record<string, string[]> = {
    backlog: [],
    today: [],
    in_progress: [],
    done: [],
  };

  // Convert all blocks to cards
  for (const [dayKey, dayData] of Object.entries(weekData)) {
    if (!dayData?.blocks) continue;
    
    for (const block of dayData.blocks) {
      const cardId = block.id || crypto.randomUUID();
      const cardRef = cardDoc(uid, boardId, cardId);
      
      // Determine target column
      let targetColumn = 'backlog';
      if (block.done) {
        targetColumn = 'done';
      } else if (dayKey === todayDayKey) {
        targetColumn = 'today';
      }
      
      // Preserve original day context in note
      const originalNote = block.note || '';
      const dayContext = `[Originally for ${dayKey}]`;
      const enhancedNote = originalNote ? `${originalNote} ${dayContext}` : dayContext;
      
      batch.set(cardRef, {
        id: cardId,
        title: block.name,
        startTime: block.startTime || null,
        endTime: block.endTime || null,
        emoji: block.emoji || '📜',
        note: enhancedNote,
        blockType: block.blockType || null,
        energyLevel: block.energyLevel || null,
        done: block.done || false,
        reflectionNote: block.reflectionNote || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      cardIdsByColumn[targetColumn].push(cardId);
    }
  }

  // Update column cardOrders
  for (const [columnId, cardIds] of Object.entries(cardIdsByColumn)) {
    if (cardIds.length > 0) {
      const colRef = columnDoc(uid, boardId, columnId);
      batch.update(colRef, {
        cardOrder: cardIds,
        updatedAt: serverTimestamp(),
      });
    }
  }

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

export async function deleteHabitEntry(uid: string, entryId: string) {
  await deleteDoc(doc(habitsCol(uid), entryId));
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

// ========== Character Profile ==========
const profileDoc = (uid: string) => doc(db, 'users', uid, 'settings', 'profile');

export async function saveCharacterProfile(uid: string, profile: any) {
  await setDoc(profileDoc(uid), {
    ...profile,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export function listenCharacterProfile(uid: string, cb: (profile: any) => void) {
  return onSnapshot(profileDoc(uid), (snap) => {
    if (snap.exists()) {
      cb(snap.data());
    } else {
      cb(null);
    }
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

// ========== Life Question Bot ==========
const questionsCol = (uid: string) => collection(userDoc(uid), 'questions');
const questionDoc = (uid: string, id: string) => doc(questionsCol(uid), id);
const metaQuestionsCol = (uid: string) => collection(userDoc(uid), 'metaQuestions');
const metaQuestionDoc = (uid: string, id: string) => doc(metaQuestionsCol(uid), id);
const reservationsCol = (uid: string) => collection(userDoc(uid), 'questionReservations');
const reservationDoc = (uid: string, id: string) => doc(reservationsCol(uid), id);
const answersCol = (uid: string) => collection(userDoc(uid), 'answers');
const answerDoc = (uid: string, id: string) => doc(answersCol(uid), id);
const contextsCol = (uid: string) => collection(userDoc(uid), 'questionContexts');
const contextDoc = (uid: string, id: string) => doc(contextsCol(uid), id);
const deliveriesCol = (uid: string) => collection(userDoc(uid), 'deliveries');
const deliveryDoc = (uid: string, id: string) => doc(deliveriesCol(uid), id);
const notificationTokensCol = (uid: string) => collection(userDoc(uid), 'notificationTokens');
const notificationTokenDoc = (uid: string, token: string) => doc(notificationTokensCol(uid), token);
const lifeSettingsDoc = (uid: string) => doc(db, 'users', uid, 'settings', 'lifeQuestions');

export function listenQuestions(uid: string, cb: (questions: Question[]) => void) {
  const q = query(questionsCol(uid), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const list: Question[] = [];
    snap.forEach((d) => list.push(d.data() as Question));
    cb(list);
  });
}

export async function addQuestion(uid: string, question: Question) {
  await setDoc(questionDoc(uid, question.id), {
    ...question,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateQuestion(uid: string, id: string, patch: Partial<Question>) {
  await updateDoc(questionDoc(uid, id), { ...patch, updatedAt: serverTimestamp() });
}

export async function deleteQuestion(uid: string, id: string) {
  await deleteDoc(questionDoc(uid, id));
}

export function listenMetaQuestions(uid: string, cb: (questions: MetaQuestion[]) => void) {
  const q = query(metaQuestionsCol(uid), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const list: MetaQuestion[] = [];
    snap.forEach((d) => list.push(d.data() as MetaQuestion));
    cb(list);
  });
}

export async function addMetaQuestion(uid: string, metaQuestion: MetaQuestion) {
  await setDoc(metaQuestionDoc(uid, metaQuestion.id), {
    ...metaQuestion,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateMetaQuestion(uid: string, id: string, patch: Partial<MetaQuestion>) {
  await updateDoc(metaQuestionDoc(uid, id), { ...patch, updatedAt: serverTimestamp() });
}

export async function deleteMetaQuestion(uid: string, id: string) {
  await deleteDoc(metaQuestionDoc(uid, id));
}

export function listenQuestionReservations(uid: string, cb: (reservations: QuestionReservation[]) => void) {
  const q = query(reservationsCol(uid), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const list: QuestionReservation[] = [];
    snap.forEach((d) => list.push(d.data() as QuestionReservation));
    cb(list);
  });
}

export async function addQuestionReservation(uid: string, reservation: QuestionReservation) {
  await setDoc(reservationDoc(uid, reservation.id), {
    ...reservation,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateQuestionReservation(uid: string, id: string, patch: Partial<QuestionReservation>) {
  await updateDoc(reservationDoc(uid, id), { ...patch, updatedAt: serverTimestamp() });
}

export async function deleteQuestionReservation(uid: string, id: string) {
  await deleteDoc(reservationDoc(uid, id));
}

export function listenAnswers(uid: string, cb: (answers: Answer[]) => void) {
  const q = query(answersCol(uid), orderBy('answeredAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const list: Answer[] = [];
    snap.forEach((d) => list.push(d.data() as Answer));
    cb(list);
  });
}

export async function addAnswer(uid: string, answer: Answer) {
  await setDoc(answerDoc(uid, answer.id), {
    ...answer,
    createdAt: serverTimestamp(),
  });
}

export function listenQuestionContexts(uid: string, cb: (contexts: QuestionContext[]) => void) {
  const q = query(contextsCol(uid), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(q, (snap) => {
    const list: QuestionContext[] = [];
    snap.forEach((d) => list.push(d.data() as QuestionContext));
    cb(list);
  });
}

export async function addQuestionContext(uid: string, context: QuestionContext) {
  await setDoc(contextDoc(uid, context.id), {
    ...context,
    createdAt: serverTimestamp(),
  });
}

export function listenLifeQuestionSettings(uid: string, cb: (settings: LifeQuestionSettings | null) => void) {
  return onSnapshot(lifeSettingsDoc(uid), (snap) => {
    if (!snap.exists()) return cb(null);
    cb(snap.data() as LifeQuestionSettings);
  });
}

export async function saveLifeQuestionSettings(uid: string, settings: LifeQuestionSettings) {
  await setDoc(
    lifeSettingsDoc(uid),
    {
      ...settings,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

// ========== Deliveries ==========
export function listenDeliveries(uid: string, cb: (deliveries: Delivery[]) => void) {
  const q = query(deliveriesCol(uid), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(q, (snap) => {
    const list: Delivery[] = [];
    snap.forEach((d) => list.push(d.data() as Delivery));
    cb(list);
  });
}

export async function updateDelivery(uid: string, id: string, patch: Partial<Delivery>) {
  await updateDoc(deliveryDoc(uid, id), patch);
}

export async function addDelivery(uid: string, delivery: Delivery) {
  await setDoc(deliveryDoc(uid, delivery.id), {
    ...delivery,
    createdAt: serverTimestamp(),
    sentAt: serverTimestamp(),
  });
}

// ========== Notification Tokens ==========
export async function addNotificationToken(uid: string, token: NotificationToken) {
  await setDoc(notificationTokenDoc(uid, token.token), {
    ...token,
    createdAt: serverTimestamp(),
    lastSeenAt: serverTimestamp(),
  }, { merge: true });
}

export function listenNotificationTokens(uid: string, cb: (tokens: NotificationToken[]) => void) {
  return onSnapshot(notificationTokensCol(uid), (snap) => {
    const list: NotificationToken[] = [];
    snap.forEach((d) => list.push(d.data() as NotificationToken));
    cb(list);
  });
}
