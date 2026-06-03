import type { Timestamp } from "firebase/firestore";

export type QuestionStatus = "DRAFT" | "PUBLISH" | "DONE" | "ARCHIVE";
export type ReservationType = "FIXED" | "RECURRING" | "AI_GENERATED";
export type ScheduleTargetKind = "question" | "meta";
export type MetaQuestionStatus = "DRAFT" | "PUBLISH" | "ARCHIVE";
export type DeliveryChannel = "FCM" | "EMAIL" | "IN_APP";
export type DeliveryStatus = "SENT" | "FAILED" | "ACKED";

export type FirestoreDateValue =
  | Timestamp
  | {
    toDate(): Date;
  }
  | Date
  | string
  | null
  | undefined;

export interface Question {
  id: string;
  content: string;
  status: QuestionStatus;
  createdAt: string | null;
  updatedAt: string | null;
}

export type QuestionInput = Pick<Question, "id" | "content" | "status">;

export interface MetaQuestion {
  id: string;
  basePrompt: string;
  topicTags: string[];
  status: MetaQuestionStatus;
  createdAt: string | null;
  updatedAt: string | null;
}

export type MetaQuestionInput = Pick<
  MetaQuestion,
  "id" | "basePrompt" | "topicTags" | "status"
>;

export interface QuestionReservation {
  id: string;
  questionId: string | null;
  metaQuestionId: string | null;
  type: ReservationType;
  targetTime: string | null;
  cronExpression: string | null;
  aiSchedulePrompt: string | null;
  isProcessed: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  timezone: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Delivery {
  id: string;
  reservationId: string;
  questionText: string;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  scheduledFor: string;
  sentAt: string | null;
  createdAt: string | null;
}

export interface Answer {
  id: string;
  deliveryId: string | null;
  reservationId: string | null;
  sourceQuestionText: string;
  answerContent: string;
  answeredAt: string;
  createdAt: string | null;
}

export type AnswerInput = Pick<
  Answer,
  "id" | "deliveryId" | "reservationId" | "sourceQuestionText" | "answerContent" | "answeredAt"
>;

export interface QuestionContext {
  id: string;
  answerId: string;
  summary: string;
  createdAt: string | null;
}

export interface LifeQuestionSettings {
  timezone: string;
  notificationChannel?: string | null;
  updatedAt: string | null;
}

export interface PreviewReservationScheduleInput {
  targetKind: ScheduleTargetKind;
  targetId: string;
  prompt: string;
  timezone: string;
}

export interface PreviewReservationScheduleResult {
  slots: string[];
  startIso: string;
  endIso: string;
  count: number;
}

export interface CreateReservationInput {
  targetKind: ScheduleTargetKind;
  targetId: string;
  type: ReservationType;
  timezone: string;
  fixedAt?: string;
  cronExpression?: string;
  aiPrompt?: string;
  slots?: string[];
}

export interface CreateReservationResult {
  count: number;
  ids: string[];
}
