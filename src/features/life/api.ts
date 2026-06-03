import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions as cloudFunctions } from "@/firebase";
import type {
  Answer,
  AnswerInput,
  CreateReservationInput,
  CreateReservationResult,
  Delivery,
  LifeQuestionSettings,
  MetaQuestion,
  MetaQuestionInput,
  MetaQuestionStatus,
  PreviewReservationScheduleInput,
  PreviewReservationScheduleResult,
  Question,
  QuestionContext,
  QuestionInput,
  QuestionReservation,
  QuestionStatus,
  ReservationType,
} from "./types";
import { toIsoString } from "./utils";

const QUESTION_STATUSES: QuestionStatus[] = ["DRAFT", "PUBLISH", "DONE", "ARCHIVE"];
const META_QUESTION_STATUSES: MetaQuestionStatus[] = ["DRAFT", "PUBLISH", "ARCHIVE"];
const RESERVATION_TYPES: ReservationType[] = ["FIXED", "RECURRING", "AI_GENERATED"];

type QuestionDoc = {
  content?: string;
  status?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type MetaQuestionDoc = {
  basePrompt?: string;
  topicTags?: unknown;
  status?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type QuestionReservationDoc = {
  questionId?: string | null;
  metaQuestionId?: string | null;
  type?: unknown;
  targetTime?: string | null;
  cronExpression?: string | null;
  aiSchedulePrompt?: string | null;
  isProcessed?: boolean;
  nextRunAt?: unknown;
  lastRunAt?: unknown;
  timezone?: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type DeliveryDoc = {
  reservationId?: string;
  questionText?: string;
  channel?: unknown;
  status?: unknown;
  scheduledFor?: string;
  sentAt?: unknown;
  createdAt?: unknown;
};

type AnswerDoc = {
  deliveryId?: string | null;
  reservationId?: string | null;
  sourceQuestionText?: string;
  answerContent?: string;
  answeredAt?: string;
  createdAt?: unknown;
};

type QuestionContextDoc = {
  answerId?: string;
  summary?: string;
  createdAt?: unknown;
};

type LifeQuestionSettingsDoc = {
  timezone?: string;
  notificationChannel?: string | null;
  updatedAt?: unknown;
};

const userDoc = (uid: string) => doc(db, "users", uid);
const questionsCol = (uid: string) => collection(userDoc(uid), "questions");
const questionDoc = (uid: string, id: string) => doc(questionsCol(uid), id);
const metaQuestionsCol = (uid: string) => collection(userDoc(uid), "metaQuestions");
const metaQuestionDoc = (uid: string, id: string) => doc(metaQuestionsCol(uid), id);
const reservationsCol = (uid: string) => collection(userDoc(uid), "questionReservations");
const reservationDoc = (uid: string, id: string) => doc(reservationsCol(uid), id);
const answersCol = (uid: string) => collection(userDoc(uid), "answers");
const answerDoc = (uid: string, id: string) => doc(answersCol(uid), id);
const contextsCol = (uid: string) => collection(userDoc(uid), "questionContexts");
const deliveriesCol = (uid: string) => collection(userDoc(uid), "deliveries");
const deliveryDoc = (uid: string, id: string) => doc(deliveriesCol(uid), id);
const lifeSettingsDoc = (uid: string) => doc(db, "users", uid, "settings", "lifeQuestions");

function mapSnapshot<T, U>(
  snapshot: { id: string; data(): DocumentData },
  mapper: (id: string, raw: T) => U,
): U {
  return mapper(snapshot.id, snapshot.data() as T);
}

function mapQuestion(id: string, raw: QuestionDoc): Question {
  const status = QUESTION_STATUSES.includes(raw.status as QuestionStatus) ?
    (raw.status as QuestionStatus) :
    "DRAFT";

  return {
    id,
    content: raw.content || "",
    status,
    createdAt: toIsoString(raw.createdAt),
    updatedAt: toIsoString(raw.updatedAt),
  };
}

function mapMetaQuestion(id: string, raw: MetaQuestionDoc): MetaQuestion {
  const status = META_QUESTION_STATUSES.includes(raw.status as MetaQuestionStatus) ?
    (raw.status as MetaQuestionStatus) :
    "DRAFT";

  return {
    id,
    basePrompt: raw.basePrompt || "",
    topicTags: Array.isArray(raw.topicTags) ?
      raw.topicTags.filter((tag): tag is string => typeof tag === "string") :
      [],
    status,
    createdAt: toIsoString(raw.createdAt),
    updatedAt: toIsoString(raw.updatedAt),
  };
}

function mapReservation(id: string, raw: QuestionReservationDoc): QuestionReservation {
  const type = RESERVATION_TYPES.includes(raw.type as ReservationType) ?
    (raw.type as ReservationType) :
    "FIXED";

  return {
    id,
    questionId: raw.questionId ?? null,
    metaQuestionId: raw.metaQuestionId ?? null,
    type,
    targetTime: raw.targetTime ?? null,
    cronExpression: raw.cronExpression ?? null,
    aiSchedulePrompt: raw.aiSchedulePrompt ?? null,
    isProcessed: Boolean(raw.isProcessed),
    nextRunAt: toIsoString(raw.nextRunAt),
    lastRunAt: toIsoString(raw.lastRunAt),
    timezone: raw.timezone?.trim() || "UTC",
    createdAt: toIsoString(raw.createdAt),
    updatedAt: toIsoString(raw.updatedAt),
  };
}

function mapDelivery(id: string, raw: DeliveryDoc): Delivery {
  return {
    id,
    reservationId: raw.reservationId || "",
    questionText: raw.questionText || "",
    channel: raw.channel === "EMAIL" || raw.channel === "IN_APP" ? raw.channel : "FCM",
    status: raw.status === "FAILED" || raw.status === "ACKED" ? raw.status : "SENT",
    scheduledFor: raw.scheduledFor || new Date(0).toISOString(),
    sentAt: toIsoString(raw.sentAt),
    createdAt: toIsoString(raw.createdAt),
  };
}

function mapAnswer(id: string, raw: AnswerDoc): Answer {
  return {
    id,
    deliveryId: raw.deliveryId ?? null,
    reservationId: raw.reservationId ?? null,
    sourceQuestionText: raw.sourceQuestionText || "",
    answerContent: raw.answerContent || "",
    answeredAt: raw.answeredAt || new Date(0).toISOString(),
    createdAt: toIsoString(raw.createdAt),
  };
}

function mapQuestionContext(id: string, raw: QuestionContextDoc): QuestionContext {
  return {
    id,
    answerId: raw.answerId || "",
    summary: raw.summary || "",
    createdAt: toIsoString(raw.createdAt),
  };
}

function mapSettings(raw: LifeQuestionSettingsDoc | null): LifeQuestionSettings | null {
  if (!raw) {
    return null;
  }

  return {
    timezone: raw.timezone?.trim() || "UTC",
    notificationChannel: raw.notificationChannel ?? null,
    updatedAt: toIsoString(raw.updatedAt),
  };
}

const previewReservationScheduleCallable = httpsCallable<
  PreviewReservationScheduleInput,
  PreviewReservationScheduleResult
>(cloudFunctions, "previewReservationSchedule");

const createReservationCallable = httpsCallable<
  CreateReservationInput,
  CreateReservationResult
>(cloudFunctions, "createReservation");

export function listenQuestions(uid: string, cb: (questions: Question[]) => void) {
  const questionsQuery = query(questionsCol(uid), orderBy("createdAt", "desc"));
  return onSnapshot(questionsQuery, (snapshot) => {
    cb(snapshot.docs.map((item) => mapSnapshot<QuestionDoc, Question>(item, mapQuestion)));
  });
}

export async function addQuestion(uid: string, question: QuestionInput) {
  await setDoc(questionDoc(uid, question.id), {
    id: question.id,
    content: question.content,
    status: question.status,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateQuestion(uid: string, id: string, patch: Partial<QuestionInput>) {
  await updateDoc(questionDoc(uid, id), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteQuestion(uid: string, id: string) {
  await deleteDoc(questionDoc(uid, id));
}

export function listenMetaQuestions(uid: string, cb: (questions: MetaQuestion[]) => void) {
  const metaQuestionsQuery = query(metaQuestionsCol(uid), orderBy("createdAt", "desc"));
  return onSnapshot(metaQuestionsQuery, (snapshot) => {
    cb(snapshot.docs.map((item) => mapSnapshot<MetaQuestionDoc, MetaQuestion>(item, mapMetaQuestion)));
  });
}

export async function addMetaQuestion(uid: string, metaQuestion: MetaQuestionInput) {
  await setDoc(metaQuestionDoc(uid, metaQuestion.id), {
    id: metaQuestion.id,
    basePrompt: metaQuestion.basePrompt,
    topicTags: metaQuestion.topicTags,
    status: metaQuestion.status,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateMetaQuestion(uid: string, id: string, patch: Partial<MetaQuestionInput>) {
  await updateDoc(metaQuestionDoc(uid, id), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteMetaQuestion(uid: string, id: string) {
  await deleteDoc(metaQuestionDoc(uid, id));
}

export function listenQuestionReservations(
  uid: string,
  cb: (reservations: QuestionReservation[]) => void,
) {
  const reservationsQuery = query(reservationsCol(uid), orderBy("createdAt", "desc"));
  return onSnapshot(reservationsQuery, (snapshot) => {
    cb(snapshot.docs.map((item) => mapSnapshot<QuestionReservationDoc, QuestionReservation>(item, mapReservation)));
  });
}

export async function deleteQuestionReservation(uid: string, id: string) {
  await deleteDoc(reservationDoc(uid, id));
}

export async function previewReservationSchedule(input: PreviewReservationScheduleInput) {
  const result = await previewReservationScheduleCallable(input);
  return result.data;
}

export async function createReservation(input: CreateReservationInput) {
  const result = await createReservationCallable(input);
  return result.data;
}

export function listenAnswers(uid: string, cb: (answers: Answer[]) => void) {
  const answersQuery = query(answersCol(uid), orderBy("answeredAt", "desc"));
  return onSnapshot(answersQuery, (snapshot) => {
    cb(snapshot.docs.map((item) => mapSnapshot<AnswerDoc, Answer>(item, mapAnswer)));
  });
}

export async function addAnswer(uid: string, answer: AnswerInput) {
  await setDoc(answerDoc(uid, answer.id), {
    id: answer.id,
    deliveryId: answer.deliveryId,
    reservationId: answer.reservationId,
    sourceQuestionText: answer.sourceQuestionText,
    answerContent: answer.answerContent,
    answeredAt: answer.answeredAt,
    createdAt: serverTimestamp(),
  });
}

export function listenQuestionContexts(uid: string, cb: (contexts: QuestionContext[]) => void) {
  const contextsQuery = query(contextsCol(uid), orderBy("createdAt", "desc"));
  return onSnapshot(contextsQuery, (snapshot) => {
    cb(snapshot.docs.map((item) => mapSnapshot<QuestionContextDoc, QuestionContext>(item, mapQuestionContext)));
  });
}

export function listenLifeQuestionSettings(
  uid: string,
  cb: (settings: LifeQuestionSettings | null) => void,
) {
  return onSnapshot(lifeSettingsDoc(uid), (snapshot) => {
    cb(snapshot.exists() ? mapSettings(snapshot.data() as LifeQuestionSettingsDoc) : null);
  });
}

export async function saveLifeQuestionSettings(
  uid: string,
  settings: Pick<LifeQuestionSettings, "timezone" | "notificationChannel">,
) {
  await setDoc(lifeSettingsDoc(uid), {
    timezone: settings.timezone,
    notificationChannel: settings.notificationChannel ?? null,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export function listenDeliveries(uid: string, cb: (deliveries: Delivery[]) => void) {
  const deliveriesQuery = query(deliveriesCol(uid), orderBy("createdAt", "desc"));
  return onSnapshot(deliveriesQuery, (snapshot) => {
    cb(snapshot.docs.map((item) => mapSnapshot<DeliveryDoc, Delivery>(item, mapDelivery)));
  });
}

export async function updateDelivery(
  uid: string,
  id: string,
  patch: Partial<Pick<Delivery, "status">>,
) {
  await updateDoc(deliveryDoc(uid, id), patch);
}
