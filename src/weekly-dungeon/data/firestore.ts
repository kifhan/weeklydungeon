import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/firebase';
import {
  currentQuestDay,
  currentWeekKey,
  defaultDungeonProfile,
  type DungeonProfile,
  type Habit,
  type HabitLog,
  type MemoryContext,
  type Quest,
  type QuestDifficulty,
  type QuestStatus,
  type Reflection,
  type ReflectionAnswer,
  type ReflectionDelivery,
} from '../domain/types';
import {
  type PracticeReview,
  type PracticeSession,
  type PracticeSettings,
} from '../practice/model';

type Listener<T> = (items: T[]) => void;
type ListenerError = (error: Error) => void;

function makeId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readDoc<T extends { id: string }>(snapshot: QueryDocumentSnapshot<DocumentData>): T {
  return { id: snapshot.id, ...snapshot.data() } as T;
}

function timestampMillis(value: unknown) {
  if (!value) return 0;
  if (typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
    return value.toMillis();
  }
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function sortQuests(quests: Quest[]) {
  return [...quests].sort((a, b) => {
    const sortDelta = (a.sortOrder || 0) - (b.sortOrder || 0);
    if (sortDelta !== 0) return sortDelta;
    const createdDelta = timestampMillis(a.createdAt) - timestampMillis(b.createdAt);
    if (createdDelta !== 0) return createdDelta;
    return a.id.localeCompare(b.id);
  });
}

export const dungeonPaths = {
  user: (uid: string) => doc(db, 'users', uid),
  quests: (uid: string) => collection(db, 'users', uid, 'quests'),
  quest: (uid: string, questId: string) => doc(db, 'users', uid, 'quests', questId),
  habits: (uid: string) => collection(db, 'users', uid, 'habits'),
  habit: (uid: string, habitId: string) => doc(db, 'users', uid, 'habits', habitId),
  habitLogs: (uid: string) => collection(db, 'users', uid, 'habitLogs'),
  habitLog: (uid: string, logId: string) => doc(db, 'users', uid, 'habitLogs', logId),
  reflections: (uid: string) => collection(db, 'users', uid, 'reflections'),
  reflection: (uid: string, reflectionId: string) => doc(db, 'users', uid, 'reflections', reflectionId),
  reflectionSchedules: (uid: string) => collection(db, 'users', uid, 'reflectionSchedules'),
  reflectionDeliveries: (uid: string) => collection(db, 'users', uid, 'reflectionDeliveries'),
  reflectionDelivery: (uid: string, deliveryId: string) =>
    doc(db, 'users', uid, 'reflectionDeliveries', deliveryId),
  reflectionAnswers: (uid: string) => collection(db, 'users', uid, 'reflectionAnswers'),
  reflectionAnswer: (uid: string, answerId: string) => doc(db, 'users', uid, 'reflectionAnswers', answerId),
  memoryContexts: (uid: string) => collection(db, 'users', uid, 'memoryContexts'),
  notificationTokens: (uid: string) => collection(db, 'users', uid, 'notificationTokens'),
  profile: (uid: string) => doc(db, 'users', uid, 'settings', 'profile'),
  practiceSettings: (uid: string) => doc(db, 'users', uid, 'settings', 'practice'),
  practiceSessions: (uid: string) => collection(db, 'users', uid, 'practiceSessions'),
  practiceSession: (uid: string, sessionId: string) => doc(db, 'users', uid, 'practiceSessions', sessionId),
  practiceReviews: (uid: string) => collection(db, 'users', uid, 'practiceReviews'),
  practiceReview: (uid: string, reviewId: string) => doc(db, 'users', uid, 'practiceReviews', reviewId),
  migration: (uid: string) => doc(db, 'users', uid, 'settings', 'migration'),
};

export function listenQuests(uid: string, onData: Listener<Quest>, onError?: ListenerError): Unsubscribe {
  return onSnapshot(dungeonPaths.quests(uid), (snapshot) => onData(sortQuests(snapshot.docs.map(readDoc<Quest>))), onError);
}

export function listenCurrentWeekQuests(
  uid: string,
  onData: Listener<Quest>,
  onError?: ListenerError,
  weekKey = currentWeekKey()
): Unsubscribe {
  const q = query(dungeonPaths.quests(uid), where('weekKey', '==', weekKey));
  return onSnapshot(q, (snapshot) => onData(sortQuests(snapshot.docs.map(readDoc<Quest>))), onError);
}

export function listenQuestHistory(uid: string, onData: Listener<Quest>, onError?: ListenerError): Unsubscribe {
  const q = query(dungeonPaths.quests(uid), orderBy('completedAt', 'desc'), limit(100));
  return onSnapshot(q, (snapshot) => onData(snapshot.docs.map(readDoc<Quest>)), onError);
}

export function listenHabits(uid: string, onData: Listener<Habit>, onError?: ListenerError): Unsubscribe {
  const q = query(dungeonPaths.habits(uid), orderBy('createdAt', 'asc'), limit(200));
  return onSnapshot(q, (snapshot) => onData(snapshot.docs.map(readDoc<Habit>)), onError);
}

export function listenHabitLogs(uid: string, onData: Listener<HabitLog>, onError?: ListenerError): Unsubscribe {
  const q = query(dungeonPaths.habitLogs(uid), orderBy('date', 'desc'), limit(500));
  return onSnapshot(q, (snapshot) => onData(snapshot.docs.map(readDoc<HabitLog>)), onError);
}

export function listenReflections(uid: string, onData: Listener<Reflection>, onError?: ListenerError): Unsubscribe {
  const q = query(dungeonPaths.reflections(uid), orderBy('createdAt', 'desc'), limit(200));
  return onSnapshot(q, (snapshot) => onData(snapshot.docs.map(readDoc<Reflection>)), onError);
}

export function listenReflectionDeliveries(
  uid: string,
  onData: Listener<ReflectionDelivery>,
  onError?: ListenerError
): Unsubscribe {
  const q = query(dungeonPaths.reflectionDeliveries(uid), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(q, (snapshot) => onData(snapshot.docs.map(readDoc<ReflectionDelivery>)), onError);
}

export function listenReflectionAnswers(
  uid: string,
  onData: Listener<ReflectionAnswer>,
  onError?: ListenerError
): Unsubscribe {
  const q = query(dungeonPaths.reflectionAnswers(uid), orderBy('answeredAt', 'desc'), limit(200));
  return onSnapshot(q, (snapshot) => onData(snapshot.docs.map(readDoc<ReflectionAnswer>)), onError);
}

export function listenMemoryContexts(
  uid: string,
  onData: Listener<MemoryContext>,
  onError?: ListenerError
): Unsubscribe {
  const q = query(dungeonPaths.memoryContexts(uid), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(q, (snapshot) => onData(snapshot.docs.map(readDoc<MemoryContext>)), onError);
}

export function listenDungeonProfile(
  uid: string,
  onData: (profile: DungeonProfile) => void,
  onError?: ListenerError
): Unsubscribe {
  return onSnapshot(
    dungeonPaths.profile(uid),
    (snapshot) => onData(snapshot.exists() ? { ...defaultDungeonProfile, ...snapshot.data() } : defaultDungeonProfile),
    onError
  );
}

export function listenPracticeSettings(
  uid: string,
  onData: (settings: PracticeSettings | null) => void,
  onError?: ListenerError
): Unsubscribe {
  return onSnapshot(
    dungeonPaths.practiceSettings(uid),
    (snapshot) => onData(snapshot.exists() ? (snapshot.data() as PracticeSettings) : null),
    onError
  );
}

export function listenPracticeSession(
  uid: string,
  sessionId: string,
  onData: (session: PracticeSession | null) => void,
  onError?: ListenerError
): Unsubscribe {
  return onSnapshot(
    dungeonPaths.practiceSession(uid, sessionId),
    (snapshot) => onData(snapshot.exists() ? (snapshot.data() as PracticeSession) : null),
    onError
  );
}

export function listenPracticeReview(
  uid: string,
  reviewId: string,
  onData: (review: PracticeReview | null) => void,
  onError?: ListenerError
): Unsubscribe {
  return onSnapshot(
    dungeonPaths.practiceReview(uid, reviewId),
    (snapshot) => onData(snapshot.exists() ? (snapshot.data() as PracticeReview) : null),
    onError
  );
}

export function listenPracticeSessions(
  uid: string,
  onData: Listener<PracticeSession>,
  onError?: ListenerError
): Unsubscribe {
  const q = query(dungeonPaths.practiceSessions(uid), orderBy('updatedAt', 'desc'), limit(100));
  return onSnapshot(q, (snapshot) => onData(snapshot.docs.map(readDoc<PracticeSession>)), onError);
}

export function listenPracticeReviews(
  uid: string,
  onData: Listener<PracticeReview>,
  onError?: ListenerError
): Unsubscribe {
  const q = query(dungeonPaths.practiceReviews(uid), orderBy('updatedAt', 'desc'), limit(50));
  return onSnapshot(q, (snapshot) => onData(snapshot.docs.map(readDoc<PracticeReview>)), onError);
}

export async function createQuest(
  uid: string,
  quest: {
    title: string;
    note?: string;
    weekKey?: string;
    day?: Quest['day'];
    difficulty?: QuestDifficulty;
    reward?: string;
    sortOrder?: number;
  }
) {
  const id = makeId('quest');
  await setDoc(dungeonPaths.quest(uid, id), {
    id,
    title: quest.title,
    note: quest.note || '',
    weekKey: quest.weekKey || currentWeekKey(),
    day: quest.day || currentQuestDay(),
    status: 'planned' satisfies QuestStatus,
    difficulty: quest.difficulty || 'standard',
    reward: quest.reward || '',
    sortOrder: quest.sortOrder ?? Date.now(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    completedAt: null,
  });
  return id;
}

export async function updateQuest(uid: string, questId: string, patch: Partial<Quest>) {
  await updateDoc(dungeonPaths.quest(uid, questId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function cycleQuestStatus(uid: string, quest: Quest) {
  const nextStatus: QuestStatus = quest.status === 'planned' ? 'active' : quest.status === 'active' ? 'complete' : 'planned';
  await updateQuest(uid, quest.id, {
    status: nextStatus,
    completedAt: nextStatus === 'complete' ? new Date() : null,
  });
}

export async function deleteQuest(uid: string, questId: string) {
  await deleteDoc(dungeonPaths.quest(uid, questId));
}

export async function createHabit(uid: string, habit: Pick<Habit, 'name' | 'target'> & Partial<Habit>) {
  const id = makeId('habit');
  await setDoc(dungeonPaths.habit(uid, id), {
    id,
    name: habit.name,
    target: habit.target,
    description: habit.description || '',
    cadence: habit.cadence || 'daily',
    status: habit.status || 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return id;
}

export async function updateHabit(uid: string, habitId: string, patch: Partial<Habit>) {
  await updateDoc(dungeonPaths.habit(uid, habitId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteHabit(uid: string, habitId: string) {
  await deleteDoc(dungeonPaths.habit(uid, habitId));
}

export async function setHabitLog(
  uid: string,
  log: Pick<HabitLog, 'habitId' | 'date' | 'checked'> & Partial<Pick<HabitLog, 'note'>>
) {
  const id = `${log.habitId}_${log.date}`;
  await setDoc(
    dungeonPaths.habitLog(uid, id),
    {
      id,
      habitId: log.habitId,
      date: log.date,
      checked: log.checked,
      note: log.note || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  return id;
}

export async function createReflection(uid: string, reflection: Pick<Reflection, 'question'> & Partial<Reflection>) {
  const id = makeId('reflection');
  await setDoc(dungeonPaths.reflection(uid, id), {
    id,
    question: reflection.question,
    source: reflection.source || 'manual',
    status: reflection.status || 'queued',
    deliveryId: reflection.deliveryId || null,
    answerId: reflection.answerId || null,
    dueAt: reflection.dueAt || null,
    answeredAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return id;
}

export async function answerReflection(
  uid: string,
  input: {
    question: string;
    answer: string;
    reflectionId?: string | null;
    deliveryId?: string | null;
  }
) {
  const answerId = makeId('answer');
  const answeredAt = new Date().toISOString();
  const batch = writeBatch(db);

  batch.set(dungeonPaths.reflectionAnswer(uid, answerId), {
    id: answerId,
    reflectionId: input.reflectionId || null,
    deliveryId: input.deliveryId || null,
    question: input.question,
    answer: input.answer,
    answeredAt,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (input.reflectionId) {
    batch.update(dungeonPaths.reflection(uid, input.reflectionId), {
      status: 'answered',
      answerId,
      answeredAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
  return answerId;
}

export async function acknowledgeReflectionDelivery(uid: string, deliveryId: string) {
  await updateDoc(dungeonPaths.reflectionDelivery(uid, deliveryId), {
    status: 'acked',
  });
}

export async function saveDungeonProfile(uid: string, profile: Partial<DungeonProfile>) {
  await setDoc(
    dungeonPaths.profile(uid),
    {
      ...profile,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function savePracticeSettings(uid: string, settings: PracticeSettings) {
  await setDoc(
    dungeonPaths.practiceSettings(uid),
    {
      ...settings,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function savePracticeSession(uid: string, session: PracticeSession) {
  await setDoc(
    dungeonPaths.practiceSession(uid, session.id),
    {
      ...session,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function savePracticeReview(uid: string, review: PracticeReview) {
  await setDoc(
    dungeonPaths.practiceReview(uid, review.id),
    {
      ...review,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
