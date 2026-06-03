import { randomUUID } from "node:crypto";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { FieldValue } from "firebase-admin/firestore";
import type { DocumentData } from "firebase-admin/firestore";
import { db } from "../firebase";
import { summarizeAnswer } from "./gemini";

export function buildAnswerContextPayload(
  answerId: string,
  summary: string,
  embedding?: number[] | null,
): DocumentData {
  const contextId = `ctx-${randomUUID()}`;
  const payload: DocumentData = {
    id: contextId,
    answerId,
    summary,
    createdAt: FieldValue.serverTimestamp(),
  };

  if (embedding && embedding.length > 0) {
    payload.embedding = FieldValue.vector(embedding);
  }

  return payload;
}

export const onAnswerCreate = onDocumentCreated(
  "users/{uid}/answers/{answerId}",
  async (event) => {
    const snap = event.data;
    if (!snap) {
      return;
    }

    const answer = snap.data();
    const uid = event.params.uid;
    const answerId = event.params.answerId;
    const questionText = String(answer.sourceQuestionText || "");
    const answerText = String(answer.answerContent || "");

    if (!questionText || !answerText) {
      console.warn(`Incomplete answer data for ${answerId}`);
      return;
    }

    const existingContext = await db
      .collection("users")
      .doc(uid)
      .collection("questionContexts")
      .where("answerId", "==", answerId)
      .limit(1)
      .get();

    if (!existingContext.empty) {
      console.log(`Context already exists for answer ${answerId}`);
      return;
    }

    const summary = await summarizeAnswer(questionText, answerText);
    const contextPayload = buildAnswerContextPayload(answerId, summary, null);

    await db
      .collection("users")
      .doc(uid)
      .collection("questionContexts")
      .doc(String(contextPayload.id))
      .set(contextPayload);
  },
);
