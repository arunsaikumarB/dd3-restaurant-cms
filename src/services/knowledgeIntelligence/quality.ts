import type { KnowledgeQualityRow } from "../../types/knowledgeIntelligence";
import { listKnowledgeFeedback } from "./feedback";
import { kiTable, writeAudit } from "./client";

export async function getLatestQuality(): Promise<KnowledgeQualityRow | null> {
  const { data, error } = await kiTable("knowledge_quality")
    .select("*")
    .order("snapshot_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as KnowledgeQualityRow | null) ?? null;
}

export type QualityDashboard = KnowledgeQualityRow & {
  topDocuments: Array<{ id: string; title: string; retrieval_count: number }>;
  worstDocuments: Array<{ id: string; title: string; retrieval_count: number; index_status: string }>;
  knowledgeGaps: string[];
  unansweredQuestions: string[];
  lowSimilarityQuestions: string[];
  escalatedQuestions: string[];
};

export async function refreshQualitySnapshot(): Promise<QualityDashboard> {
  const { data: docs } = await kiTable("semantic_documents").select(
    "id, title, index_status, workflow_status, retrieval_count, chunk_count, updated_at, ocr_status",
  );
  const documents = (docs ?? []) as Array<{
    id: string;
    title: string;
    index_status: string;
    workflow_status: string;
    retrieval_count: number;
    chunk_count: number;
    updated_at: string;
    ocr_status: string;
  }>;

  const total = Math.max(documents.length, 1);
  const published = documents.filter((d) => d.workflow_status === "published").length;
  const indexed = documents.filter((d) => d.index_status === "indexed").length;
  const pending = documents.filter((d) => d.workflow_status === "pending_review").length;
  const failed = documents.filter((d) => d.index_status === "failed").length;

  const { data: metrics } = await kiTable("knowledge_metrics")
    .select("metric_value")
    .eq("metric_key", "retrieval_avg_similarity")
    .order("recorded_at", { ascending: false })
    .limit(50);
  const sims = ((metrics ?? []) as Array<{ metric_value: number }>).map((m) => Number(m.metric_value));
  const avgSimilarity = sims.length ? sims.reduce((a, b) => a + b, 0) / sims.length : 0;

  const feedback = await listKnowledgeFeedback(400);
  const helpful = feedback.filter((f) => f.feedback_type === "helpful").length;
  const negative = feedback.filter((f) => f.feedback_type !== "helpful").length;
  const feedbackScore = feedback.length ? Math.round((helpful / feedback.length) * 100) : 70;
  const ratings = feedback.map((f) => f.rating).filter((r): r is number => typeof r === "number");
  const avgResponseRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  const now = Date.now();
  const fresh = documents.filter((d) => now - new Date(d.updated_at).getTime() < 90 * 86400000).length;
  const knowledgeFreshness = Math.round((fresh / total) * 100);
  const approvalCompliance = Math.round((published / total) * 100);
  const knowledgeCoverage = Math.round((indexed / total) * 100);
  const retrievalAccuracy = Math.round(Math.min(100, avgSimilarity * 100 + (helpful > negative ? 5 : 0)));
  const chunkQuality = Math.round(
    (documents.filter((d) => d.chunk_count > 0 && d.chunk_count < 200).length / total) * 100,
  );
  const hallucinationRisk = Math.max(
    0,
    Math.round(100 - retrievalAccuracy * 0.6 - feedbackScore * 0.4),
  );

  const overall = Math.round(
    retrievalAccuracy * 0.2 +
      chunkQuality * 0.1 +
      knowledgeCoverage * 0.15 +
      knowledgeFreshness * 0.1 +
      approvalCompliance * 0.15 +
      feedbackScore * 0.2 +
      (100 - hallucinationRisk) * 0.1,
  );

  const row = {
    overall_score: overall,
    retrieval_accuracy: retrievalAccuracy,
    chunk_quality: chunkQuality,
    avg_similarity: Number(avgSimilarity.toFixed(4)),
    hallucination_risk: hallucinationRisk,
    knowledge_coverage: knowledgeCoverage,
    knowledge_freshness: knowledgeFreshness,
    approval_compliance: approvalCompliance,
    feedback_score: feedbackScore,
    avg_response_rating: Number(avgResponseRating.toFixed(2)),
    metrics: { published, indexed, pending, failed, feedbackCount: feedback.length },
  };

  const { data: saved, error } = await kiTable("knowledge_quality").insert(row).select("*").single();
  if (error) throw error;

  await writeAudit({
    eventType: "quality_snapshot",
    summary: `Quality score ${overall}`,
    entityType: "quality",
    entityId: (saved as KnowledgeQualityRow).id,
  });

  const topDocuments = [...documents]
    .sort((a, b) => (b.retrieval_count ?? 0) - (a.retrieval_count ?? 0))
    .slice(0, 8)
    .map((d) => ({ id: d.id, title: d.title, retrieval_count: d.retrieval_count ?? 0 }));

  const worstDocuments = [...documents]
    .filter((d) => d.index_status === "failed" || (d.workflow_status === "published" && (d.retrieval_count ?? 0) === 0))
    .slice(0, 8)
    .map((d) => ({
      id: d.id,
      title: d.title,
      retrieval_count: d.retrieval_count ?? 0,
      index_status: d.index_status,
    }));

  const unansweredQuestions = feedback
    .filter((f) => f.feedback_type === "missing_information")
    .map((f) => f.question)
    .slice(0, 12);

  const escalatedQuestions = feedback
    .filter((f) => f.feedback_type === "needs_human")
    .map((f) => f.question)
    .slice(0, 12);

  const lowSimilarityQuestions = feedback
    .filter((f) => f.feedback_type === "not_helpful" || f.feedback_type === "incorrect")
    .map((f) => f.question)
    .slice(0, 12);

  return {
    ...(saved as KnowledgeQualityRow),
    topDocuments,
    worstDocuments,
    knowledgeGaps: unansweredQuestions.slice(0, 8),
    unansweredQuestions,
    lowSimilarityQuestions,
    escalatedQuestions,
  };
}
