import { avg, countBy, dayLabel, opsTable, pct } from "./client";
import type { PlannerAnalytics } from "./types";

export async function getPlannerAnalytics(limit = 400): Promise<PlannerAnalytics> {
  try {
    const t = opsTable("agent_execution_plans");
    if (!t) return empty();
    const { data } = await t
      .select("intent, goal, complexity, confidence, clarification_required, human_escalation, message_preview, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    const rows = (data ?? []) as Array<{
      intent: string;
      goal: string;
      complexity: string;
      confidence: number;
      clarification_required: boolean;
      human_escalation: boolean;
      message_preview: string | null;
      created_at: string;
    }>;
    if (!rows.length) return empty();

    const intents = countBy(rows.map((r) => r.intent));
    return {
      totalPlans: rows.length,
      avgConfidence: avg(rows.map((r) => Number(r.confidence))),
      avgLatencyMs: 0,
      clarificationRate: pct(rows.filter((r) => r.clarification_required).length, rows.length),
      escalationRate: pct(rows.filter((r) => r.human_escalation).length, rows.length),
      intentDistribution: intents,
      goalDistribution: countBy(rows.map((r) => r.goal)),
      complexityDistribution: countBy(rows.map((r) => r.complexity)),
      mostCommonIntents: intents.slice(0, 8),
      unknownIntents: rows.filter((r) => r.intent === "unknown").length,
      mostComplexRequests: rows
        .filter((r) => r.complexity === "complex")
        .map((r) => r.message_preview ?? r.goal)
        .slice(0, 10),
      plannerTrends: countBy(rows.map((r) => dayLabel(r.created_at))).slice(-14),
    };
  } catch {
    return empty();
  }
}

function empty(): PlannerAnalytics {
  return {
    totalPlans: 0,
    avgConfidence: 0,
    avgLatencyMs: 0,
    clarificationRate: 0,
    escalationRate: 0,
    intentDistribution: [],
    goalDistribution: [],
    complexityDistribution: [],
    mostCommonIntents: [],
    unknownIntents: 0,
    mostComplexRequests: [],
    plannerTrends: [],
  };
}
