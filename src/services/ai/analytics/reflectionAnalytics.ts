import { getReflectionDashboard } from "../reflection/reflectionLogger";
import { avg, countBy, dayLabel, opsTable, pct } from "./client";
import type { ReflectionOpsAnalytics } from "./types";

export async function getReflectionOpsAnalytics(limit = 400): Promise<ReflectionOpsAnalytics> {
  const base = await getReflectionDashboard(limit);
  try {
    const t = opsTable("agent_reflections");
    if (!t) {
      return {
        averageConfidence: base.averageConfidence,
        averageReflectionScore: base.averageReflectionScore,
        clarificationRate: base.clarificationRate,
        escalationRate: base.escalationRate,
        fallbackRate: 0,
        goalCompletionRate: base.goalCompletionRate,
        confidenceTrend: [],
        lowConfidenceTopics: base.lowConfidenceQuestions,
        confidenceDistribution: base.confidenceDistribution,
      };
    }
    const { data } = await t
      .select("confidence, next_action, created_at, confidence_band")
      .order("created_at", { ascending: false })
      .limit(limit);
    const rows = (data ?? []) as Array<{
      confidence: number;
      next_action: string;
      created_at: string;
      confidence_band: string;
    }>;
    const fallbacks = rows.filter((r) =>
      ["limited_answer", "recommend_call", "suggest_human"].includes(r.next_action),
    ).length;

    const byDay = new Map<string, number[]>();
    for (const r of rows) {
      const d = dayLabel(r.created_at);
      const list = byDay.get(d) ?? [];
      list.push(Number(r.confidence));
      byDay.set(d, list);
    }

    return {
      averageConfidence: base.averageConfidence,
      averageReflectionScore: base.averageReflectionScore,
      clarificationRate: base.clarificationRate,
      escalationRate: base.escalationRate,
      fallbackRate: pct(fallbacks, rows.length || 1),
      goalCompletionRate: base.goalCompletionRate,
      confidenceTrend: [...byDay.entries()]
        .map(([label, vals]) => ({ label, value: avg(vals) }))
        .slice(-14),
      lowConfidenceTopics: base.lowConfidenceQuestions,
      confidenceDistribution: base.confidenceDistribution,
    };
  } catch {
    return {
      averageConfidence: base.averageConfidence,
      averageReflectionScore: base.averageReflectionScore,
      clarificationRate: base.clarificationRate,
      escalationRate: base.escalationRate,
      fallbackRate: 0,
      goalCompletionRate: base.goalCompletionRate,
      confidenceTrend: [],
      lowConfidenceTopics: base.lowConfidenceQuestions,
      confidenceDistribution: base.confidenceDistribution,
    };
  }
}

export async function getEscalationAnalytics(limit = 300): Promise<import("./types").EscalationAnalytics> {
  try {
    const t = opsTable("agent_escalations");
    if (!t) return { total: 0, byReason: [], byDepartment: [], byPriority: [], pending: 0, repeated: 0 };
    const { data } = await t
      .select("reason, department, priority, conversation_id")
      .order("created_at", { ascending: false })
      .limit(limit);
    const rows = (data ?? []) as Array<{
      reason: string | null;
      department: string | null;
      priority: string | null;
      conversation_id: string | null;
    }>;
    const convCounts = new Map<string, number>();
    for (const r of rows) {
      if (!r.conversation_id) continue;
      convCounts.set(r.conversation_id, (convCounts.get(r.conversation_id) ?? 0) + 1);
    }
    return {
      total: rows.length,
      byReason: countBy(rows.map((r) => (r.reason ?? "Unknown").split(":")[0] ?? "Unknown")),
      byDepartment: countBy(rows.map((r) => r.department ?? "Guest Services")),
      byPriority: countBy(rows.map((r) => r.priority ?? "medium")),
      pending: rows.length,
      repeated: [...convCounts.values()].filter((n) => n > 1).length,
    };
  } catch {
    return { total: 0, byReason: [], byDepartment: [], byPriority: [], pending: 0, repeated: 0 };
  }
}

export async function getGoalAnalytics(limit = 300): Promise<import("./types").GoalAnalytics> {
  try {
    const t = opsTable("agent_goal_progress");
    if (!t) {
      return {
        completed: 0,
        incomplete: 0,
        abandoned: 0,
        averageCompletion: 0,
        mostCommonGoals: [],
        averageCompletionPercent: 0,
      };
    }
    const { data } = await t
      .select("goal, progress_percent, status")
      .order("created_at", { ascending: false })
      .limit(limit);
    const rows = (data ?? []) as Array<{ goal: string; progress_percent: number; status: string }>;
    const completed = rows.filter((r) => r.status === "completed").length;
    const abandoned = rows.filter((r) => r.status === "abandoned").length;
    const incomplete = rows.filter((r) => r.status === "active" || r.status === "blocked").length;
    return {
      completed,
      incomplete,
      abandoned,
      averageCompletion: pct(completed, rows.length || 1),
      mostCommonGoals: countBy(rows.map((r) => r.goal)).slice(0, 8),
      averageCompletionPercent: Math.round(avg(rows.map((r) => Number(r.progress_percent)))),
    };
  } catch {
    return {
      completed: 0,
      incomplete: 0,
      abandoned: 0,
      averageCompletion: 0,
      mostCommonGoals: [],
      averageCompletionPercent: 0,
    };
  }
}
