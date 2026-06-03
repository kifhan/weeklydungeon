import type { FirestoreDateValue } from "./types";

type DateInputLike = {
  toDate?: () => Date;
};

export function toIsoString(value: FirestoreDateValue): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
  }

  const maybeDateInput = value as DateInputLike;
  if (typeof maybeDateInput.toDate === "function") {
    const parsed = maybeDateInput.toDate();
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  return null;
}

export function formatLocalDateTime(iso?: string | null): string {
  if (!iso) {
    return "No time";
  }

  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }

  return parsed.toLocaleString();
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return String((error as { message?: string }).message);
  }

  return fallback;
}
