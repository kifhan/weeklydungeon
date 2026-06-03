export type TargetKind = "question" | "meta";
export type ReservationType = "FIXED" | "RECURRING" | "AI_GENERATED";
export type NotificationPlatform = "web" | "ios" | "android";

export interface RegisterNotificationTokenRequest {
  token: string;
  platform: NotificationPlatform;
}

export interface PreviewReservationScheduleRequest {
  targetKind: TargetKind;
  targetId: string;
  prompt: string;
  timezone?: string | null;
}

export interface PreviewReservationScheduleResult {
  slots: string[];
  startIso: string;
  endIso: string;
  count: number;
}

export interface CreateReservationRequest {
  targetKind: TargetKind;
  targetId: string;
  type: ReservationType;
  fixedAt?: string | null;
  cronExpression?: string | null;
  aiPrompt?: string | null;
  slots?: string[];
  timezone?: string | null;
}

export interface CreateReservationResponse {
  count: number;
  ids: string[];
}

export interface TargetFields {
  questionId: string | null;
  metaQuestionId: string | null;
}

export interface ReservationWriteModel extends TargetFields {
  id: string;
  type: ReservationType;
  targetTime: string | null;
  cronExpression: string | null;
  aiSchedulePrompt: string | null;
  isProcessed: boolean;
  nextRunAt: Date;
  lastRunAt: Date | null;
  timezone: string;
}

export interface ReservationDoc extends TargetFields {
  id: string;
  type: ReservationType;
  targetTime?: string | null;
  cronExpression?: string | null;
  aiSchedulePrompt?: string | null;
  isProcessed?: boolean;
  nextRunAt?: unknown;
  lastRunAt?: unknown;
  timezone?: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
}
