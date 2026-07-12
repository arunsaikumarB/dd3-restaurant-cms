import type { KnowledgeFeedbackRow, KnowledgeFeedbackType } from "../../types/knowledgeIntelligence";
import { kiTable, writeAudit } from "./client";

export async function submitKnowledgeFeedback(input: {
  question: string;
  response?: string;
  feedbackType: KnowledgeFeedbackType;
  rating?: number;
  conversationId?: string;
  sessionId?: string;
  locationId?: string;
  retrievedChunks?: unknown[];
  documentIds?: string[];
  chunkIds?: string[];
  promptVersion?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await kiTable("knowledge_feedback").insert({
    conversation_id: input.conversationId ?? null,
    session_id: input.sessionId ?? null,
    location_id: input.locationId ?? null,
    question: input.question.trim(),
    response: input.response ?? null,
    feedback_type: input.feedbackType,
    rating: input.rating ?? null,
    retrieved_chunks: input.retrievedChunks ?? [],
    document_ids: input.documentIds ?? [],
    chunk_ids: input.chunkIds ?? [],
    prompt_version: input.promptVersion ?? null,
    metadata: input.metadata ?? {},
  });
  if (error) throw error;
  await writeAudit({
    eventType: "feedback",
    summary: `Feedback ${input.feedbackType}: “${input.question.slice(0, 80)}”`,
    entityType: "feedback",
    metadata: { feedbackType: input.feedbackType, locationId: input.locationId },
  });
}

export async function listKnowledgeFeedback(limit = 100): Promise<KnowledgeFeedbackRow[]> {
  const { data, error } = await kiTable("knowledge_feedback")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as KnowledgeFeedbackRow[];
}

export type FeedbackDashboard = {
  mostFailed: Array<{ question: string; count: number }>;
  mostIncorrect: Array<{ question: string; count: number }>;
  missingKnowledge: Array<{ question: string; count: number }>;
  downvotedDocuments: Array<{ documentId: string; count: number }>;
  downvotedChunks: Array<{ chunkId: string; count: number }>;
  totals: Record<KnowledgeFeedbackType, number>;
};

export async function getFeedbackDashboard(): Promise<FeedbackDashboard> {
  const rows = await listKnowledgeFeedback(500);
  const totals: FeedbackDashboard["totals"] = {
    helpful: 0,
    not_helpful: 0,
    incorrect: 0,
    missing_information: 0,
    needs_human: 0,
  };
  const failedMap = new Map<string, number>();
  const incorrectMap = new Map<string, number>();
  const missingMap = new Map<string, number>();
  const docMap = new Map<string, number>();
  const chunkMap = new Map<string, number>();

  for (const row of rows) {
    totals[row.feedback_type] = (totals[row.feedback_type] ?? 0) + 1;
    const q = row.question.trim();
    if (row.feedback_type === "not_helpful" || row.feedback_type === "needs_human") {
      failedMap.set(q, (failedMap.get(q) ?? 0) + 1);
    }
    if (row.feedback_type === "incorrect") {
      incorrectMap.set(q, (incorrectMap.get(q) ?? 0) + 1);
    }
    if (row.feedback_type === "missing_information") {
      missingMap.set(q, (missingMap.get(q) ?? 0) + 1);
    }
    if (row.feedback_type !== "helpful") {
      for (const id of row.document_ids ?? []) docMap.set(id, (docMap.get(id) ?? 0) + 1);
      for (const id of row.chunk_ids ?? []) chunkMap.set(id, (chunkMap.get(id) ?? 0) + 1);
    }
  }

  const top = (m: Map<string, number>, key: "question" | "documentId" | "chunkId") =>
    [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([k, count]) => ({ [key]: k, count }) as never);

  return {
    mostFailed: top(failedMap, "question"),
    mostIncorrect: top(incorrectMap, "question"),
    missingKnowledge: top(missingMap, "question"),
    downvotedDocuments: top(docMap, "documentId"),
    downvotedChunks: top(chunkMap, "chunkId"),
    totals,
  };
}
