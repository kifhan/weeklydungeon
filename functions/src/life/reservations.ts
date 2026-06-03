import { randomUUID } from "node:crypto";
import * as functions from "firebase-functions/v2";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { CronExpressionParser } from "cron-parser";
import { db } from "../firebase";
import { getAuthenticatedUid } from "./auth";
import { generateScheduleWindow } from "./gemini";
import type {
  CreateReservationRequest,
  CreateReservationResponse,
  PreviewReservationScheduleRequest,
  PreviewReservationScheduleResult,
  ReservationType,
  ReservationWriteModel,
  TargetFields,
  TargetKind,
} from "./types";

const DEFAULT_TIMEZONE = "UTC";

export function normalizeTimezone(timezone?: string | null): string {
  const value = timezone?.trim();
  return value || DEFAULT_TIMEZONE;
}

function parseRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Missing or invalid ${fieldName}`,
    );
  }

  return value.trim();
}

function parseIsoDate(value: string, fieldName: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Invalid ${fieldName}`,
    );
  }

  return date;
}

export function buildTargetFields(
  targetKind: TargetKind,
  targetId: string,
): TargetFields {
  if (targetKind === "question") {
    return { questionId: targetId, metaQuestionId: null };
  }

  return { questionId: null, metaQuestionId: targetId };
}

async function assertTargetExists(
  uid: string,
  targetKind: TargetKind,
  targetId: string,
): Promise<void> {
  const collectionName = targetKind === "question" ? "questions" : "metaQuestions";
  const targetSnap = await db
    .collection("users")
    .doc(uid)
    .collection(collectionName)
    .doc(targetId)
    .get();

  if (!targetSnap.exists) {
    throw new functions.https.HttpsError(
      "not-found",
      `Target ${targetKind} does not exist`,
    );
  }
}

export function computeNextRunDate(
  cronExpression: string,
  timezone: string,
  fromDate: Date,
): Date {
  const interval = CronExpressionParser.parse(cronExpression, {
    currentDate: fromDate,
    tz: normalizeTimezone(timezone),
  });

  return interval.next().toDate();
}

function roundToFiveMinutes(date: Date): Date {
  const step = 5 * 60 * 1000;
  return new Date(Math.round(date.getTime() / step) * step);
}

export function generateRandomSlots(
  start: Date,
  end: Date,
  count: number,
): string[] {
  if (count <= 0) {
    return [];
  }

  const startMs = start.getTime();
  const endMs = end.getTime();
  if (endMs <= startMs) {
    return [];
  }

  const slots = new Set<number>();
  const attempts = Math.max(20, count * 10);

  for (let index = 0; index < attempts && slots.size < count; index += 1) {
    const rand = startMs + Math.random() * (endMs - startMs);
    const rounded = roundToFiveMinutes(new Date(rand)).getTime();
    slots.add(Math.min(Math.max(rounded, startMs), endMs));
  }

  if (slots.size < count) {
    const step = (endMs - startMs) / count;
    for (let index = 0; index < count && slots.size < count; index += 1) {
      const ms = startMs + step * (index + 0.5);
      const rounded = roundToFiveMinutes(new Date(ms)).getTime();
      slots.add(Math.min(Math.max(rounded, startMs), endMs));
    }
  }

  return Array.from(slots)
    .sort((left, right) => left - right)
    .slice(0, count)
    .map((ms) => new Date(ms).toISOString());
}

function createReservationId(): string {
  return `res-${randomUUID()}`;
}

function buildReservationModel(
  targetFields: TargetFields,
  type: ReservationType,
  timezone: string,
  nextRunAt: Date,
  options?: {
    targetTime?: string | null;
    cronExpression?: string | null;
    aiSchedulePrompt?: string | null;
  },
): ReservationWriteModel {
  return {
    id: createReservationId(),
    ...targetFields,
    type,
    targetTime: options?.targetTime ?? null,
    cronExpression: options?.cronExpression ?? null,
    aiSchedulePrompt: options?.aiSchedulePrompt ?? null,
    isProcessed: false,
    nextRunAt,
    lastRunAt: null,
    timezone,
  };
}

export function buildReservationWriteModels(
  input: CreateReservationRequest,
  now: Date,
): ReservationWriteModel[] {
  const targetId = input.targetId.trim();
  const timezone = normalizeTimezone(input.timezone);
  const targetFields = buildTargetFields(input.targetKind, targetId);

  switch (input.type) {
  case "FIXED": {
    const fixedAt = parseRequiredString(input.fixedAt, "fixedAt");
    const fixedDate = parseIsoDate(fixedAt, "fixedAt");
    return [
      buildReservationModel(targetFields, "FIXED", timezone, fixedDate, {
        targetTime: fixedDate.toISOString(),
      }),
    ];
  }
  case "RECURRING": {
    const cronExpression = parseRequiredString(input.cronExpression, "cronExpression");
    const nextRunAt = computeNextRunDate(cronExpression, timezone, now);
    return [
      buildReservationModel(targetFields, "RECURRING", timezone, nextRunAt, {
        cronExpression,
      }),
    ];
  }
  case "AI_GENERATED": {
    if (!Array.isArray(input.slots) || input.slots.length === 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "AI-generated reservations require at least one slot",
      );
    }

    return input.slots.map((slot) => {
      const slotDate = parseIsoDate(slot, "slot");
      return buildReservationModel(targetFields, "AI_GENERATED", timezone, slotDate, {
        targetTime: slotDate.toISOString(),
        aiSchedulePrompt: input.aiPrompt?.trim() || null,
      });
    });
  }
  default:
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Unsupported reservation type",
    );
  }
}

export const previewReservationSchedule = functions.https.onCall(async (request) => {
  const uid = getAuthenticatedUid(request);
  const data = (request.data ?? {}) as Partial<PreviewReservationScheduleRequest>;
  const targetKind = data.targetKind;
  const targetId = parseRequiredString(data.targetId, "targetId");
  const prompt = parseRequiredString(data.prompt, "prompt");
  const timezone = normalizeTimezone(data.timezone);

  if (targetKind !== "question" && targetKind !== "meta") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "targetKind must be 'question' or 'meta'",
    );
  }

  await assertTargetExists(uid, targetKind, targetId);

  const previewWindow = await generateScheduleWindow(prompt, timezone);
  const start = parseIsoDate(previewWindow.startIso, "startIso");
  const end = parseIsoDate(previewWindow.endIso, "endIso");
  const slots = generateRandomSlots(start, end, previewWindow.count);

  const response: PreviewReservationScheduleResult = {
    slots,
    startIso: previewWindow.startIso,
    endIso: previewWindow.endIso,
    count: previewWindow.count,
  };

  return response;
});

export const createReservation = functions.https.onCall(async (request) => {
  const uid = getAuthenticatedUid(request);
  const data = (request.data ?? {}) as Partial<CreateReservationRequest>;
  const targetKind = data.targetKind;
  const targetId = parseRequiredString(data.targetId, "targetId");

  if (targetKind !== "question" && targetKind !== "meta") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "targetKind must be 'question' or 'meta'",
    );
  }

  const type = data.type;
  if (type !== "FIXED" && type !== "RECURRING" && type !== "AI_GENERATED") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid reservation type",
    );
  }

  await assertTargetExists(uid, targetKind, targetId);

  const writeModels = buildReservationWriteModels(
    {
      targetKind,
      targetId,
      type,
      fixedAt: data.fixedAt,
      cronExpression: data.cronExpression,
      aiPrompt: data.aiPrompt,
      slots: data.slots,
      timezone: data.timezone,
    },
    new Date(),
  );

  const batch = db.batch();
  for (const model of writeModels) {
    const reservationRef = db
      .collection("users")
      .doc(uid)
      .collection("questionReservations")
      .doc(model.id);

    batch.set(reservationRef, {
      id: model.id,
      questionId: model.questionId,
      metaQuestionId: model.metaQuestionId,
      type: model.type,
      targetTime: model.targetTime,
      cronExpression: model.cronExpression,
      aiSchedulePrompt: model.aiSchedulePrompt,
      isProcessed: model.isProcessed,
      nextRunAt: Timestamp.fromDate(model.nextRunAt),
      lastRunAt: model.lastRunAt,
      timezone: model.timezone,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();

  const response: CreateReservationResponse = {
    count: writeModels.length,
    ids: writeModels.map((model) => model.id),
  };

  return response;
});
