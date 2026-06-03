import * as functions from "firebase-functions/v2";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

function requireGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Gemini API key not configured",
    );
  }

  return genAI;
}

function stripCodeFences(value: string): string {
  return value.replace(/```json/gi, "").replace(/```/g, "").trim();
}

function parseJsonResponse<T>(value: string): T {
  return JSON.parse(stripCodeFences(value)) as T;
}

export async function generateScheduleWindow(
  prompt: string,
  timezone: string,
): Promise<{ startIso: string; endIso: string; count: number }> {
  const model = requireGenAI().getGenerativeModel({ model: "gemini-2.5-flash" });
  const now = new Date().toISOString();
  const schedulePrompt = `Parse the following natural language schedule request.
Return ONLY a JSON object with fields: start_iso, end_iso, count (integer).
Use timezone: ${timezone}. Current time is ${now}.
Schedule request: "${prompt.trim()}"

Example response: {"start_iso": "2025-01-20T09:00:00Z", "end_iso": "2025-01-24T18:00:00Z", "count": 3}`;

  const result = await model.generateContent(schedulePrompt);
  const parsed = parseJsonResponse<{
    start_iso?: string;
    end_iso?: string;
    count?: number | string;
  }>(result.response.text());

  const startIso = parsed.start_iso;
  const endIso = parsed.end_iso;
  const count = Math.max(1, Math.min(100, parseInt(String(parsed.count ?? 1), 10) || 1));

  if (!startIso || !endIso) {
    throw new functions.https.HttpsError(
      "internal",
      "Failed to parse schedule response",
    );
  }

  return { startIso, endIso, count };
}

export async function generateMetaQuestion(
  basePrompt: string,
  contextSummaries: string[],
): Promise<string> {
  if (!genAI) {
    return basePrompt;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const contextText = contextSummaries.length > 0 ?
      contextSummaries.join("\n") :
      "- No recent context available.";

    const prompt = `You are generating a single personalized question for a user.
Base prompt: ${basePrompt}
Recent context summaries:
${contextText}

Return ONE question sentence only, no extra text.`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch {
    return basePrompt;
  }
}

export async function summarizeAnswer(
  questionText: string,
  answerText: string,
): Promise<string> {
  if (!genAI) {
    return answerText.slice(0, 280);
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `Summarize the following Q&A into up to 3 plain sentences of user context.
Question: "${questionText}"
Answer: "${answerText}"
Return only the summary.`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch {
    return answerText.slice(0, 280);
  }
}
