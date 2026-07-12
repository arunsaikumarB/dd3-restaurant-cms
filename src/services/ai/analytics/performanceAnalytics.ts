import { avg, opsTable, pct } from "./client";
import { listWorkflows } from "./workflowAnalytics";
import type { PerformanceAnalytics, QualityAnalytics } from "./types";

export async function getPerformanceAnalytics(limit = 200): Promise<PerformanceAnalytics> {
  const workflows = await listWorkflows(limit);
  if (!workflows.length) {
    return {
      avgPlannerMs: 0,
      avgToolMs: 0,
      avgRetrievalMs: 0,
      avgAggregationMs: 0,
      avgGeminiMs: 0,
      avgReflectionMs: 0,
      avgTotalMs: 0,
      bottlenecks: [],
      detections: [],
    };
  }

  const avgPlannerMs = Math.round(avg(workflows.map((w) => w.timings.plannerMs)));
  const avgToolMs = Math.round(avg(workflows.map((w) => w.timings.toolMs)));
  const avgRetrievalMs = Math.round(avg(workflows.map((w) => w.timings.retrievalMs)));
  const avgAggregationMs = Math.round(avg(workflows.map((w) => w.timings.aggregationMs)));
  const avgGeminiMs = Math.round(avg(workflows.map((w) => w.timings.geminiMs)));
  const avgReflectionMs = Math.round(avg(workflows.map((w) => w.timings.reflectionMs)));
  const avgTotalMs = Math.round(avg(workflows.map((w) => w.timings.totalMs)));

  const stages = [
    { stage: "Planner", avgMs: avgPlannerMs },
    { stage: "Tools", avgMs: avgToolMs },
    { stage: "Retrieval", avgMs: avgRetrievalMs },
    { stage: "Aggregation", avgMs: avgAggregationMs },
    { stage: "Gemini", avgMs: avgGeminiMs },
    { stage: "Reflection", avgMs: avgReflectionMs },
  ].sort((a, b) => b.avgMs - a.avgMs);

  const sum = stages.reduce((s, x) => s + x.avgMs, 0) || 1;
  const bottlenecks = stages.map((s) => ({
    ...s,
    sharePercent: pct(s.avgMs, sum),
  }));

  const detections: string[] = [];
  if (avgToolMs > 1500) detections.push("Slow Tool execution detected");
  if (avgRetrievalMs > 1200) detections.push("Slow RAG retrieval detected");
  if (avgPlannerMs > 400) detections.push("Slow Planner detected");
  if (avgGeminiMs > 3000) detections.push("Slow Gemini responses detected");
  if (avgTotalMs > 6000) detections.push("High total response time");
  if (workflows.filter((w) => (w.confidence ?? 1) < 0.45).length / workflows.length > 0.25) {
    detections.push("Low confidence area — review knowledge coverage");
  }
  const largeContext = workflows.filter((w) => w.toolSuccessCount + w.toolFailureCount >= 6).length;
  if (largeContext > workflows.length * 0.2) detections.push("Large context packages frequent");

  return {
    avgPlannerMs,
    avgToolMs,
    avgRetrievalMs,
    avgAggregationMs,
    avgGeminiMs,
    avgReflectionMs,
    avgTotalMs,
    bottlenecks,
    detections,
  };
}

export async function getQualityAnalytics(limit = 200): Promise<QualityAnalytics> {
  try {
    const t = opsTable("agent_quality");
    const workflows = await listWorkflows(limit);
    if (t) {
      const { data } = await t
        .select("confidence, knowledge_coverage, hallucination_risk, completed")
        .order("recorded_at", { ascending: false })
        .limit(limit);
      const rows = (data ?? []) as Array<{
        confidence: number | null;
        knowledge_coverage: number | null;
        hallucination_risk: number | null;
        completed: boolean;
      }>;
      if (rows.length) {
        return {
          avgConfidence: avg(rows.map((r) => Number(r.confidence ?? 0))),
          avgKnowledgeCoverage: avg(rows.map((r) => Number(r.knowledge_coverage ?? 0))),
          avgHallucinationRisk: avg(rows.map((r) => Number(r.hallucination_risk ?? 0))),
          successfulConversations: rows.filter((r) => r.completed).length,
          incompleteConversations: rows.filter((r) => !r.completed).length,
          repeatedClarifications: workflows.filter((w) => w.needsFollowUp).length,
          answerQualityScore: Number(
            (
              avg(rows.map((r) => Number(r.confidence ?? 0))) * 70 +
              avg(rows.map((r) => Number(r.knowledge_coverage ?? 0))) * 30
            ).toFixed(1),
          ),
        };
      }
    }
    return {
      avgConfidence: avg(workflows.map((w) => w.confidence ?? 0)),
      avgKnowledgeCoverage: 0.5,
      avgHallucinationRisk: avg(workflows.map((w) => 1 - (w.confidence ?? 0.5))),
      successfulConversations: workflows.filter((w) => w.success && !w.needsFollowUp).length,
      incompleteConversations: workflows.filter((w) => w.needsFollowUp || !w.success).length,
      repeatedClarifications: workflows.filter((w) => w.needsFollowUp).length,
      answerQualityScore: Number((avg(workflows.map((w) => w.confidence ?? 0)) * 100).toFixed(1)),
    };
  } catch {
    return {
      avgConfidence: 0,
      avgKnowledgeCoverage: 0,
      avgHallucinationRisk: 0,
      successfulConversations: 0,
      incompleteConversations: 0,
      repeatedClarifications: 0,
      answerQualityScore: 0,
    };
  }
}
