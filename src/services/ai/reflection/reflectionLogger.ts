import { createClientIfConfigured } from "../../../lib/supabase/client";
import type { ReflectionResult } from "./types";

function table(name: string) {
  const c = createClientIfConfigured();
  if (!c) return null;
  return (c as unknown as { from: (t: string) => ReturnType<NonNullable<ReturnType<typeof createClientIfConfigured>>["from"]> }).from(
    name,
  );
}

export async function persistReflection(
  result: ReflectionResult,
  meta?: {
    conversationId?: string | null;
    locationId?: string | null;
    message?: string;
    planId?: string | null;
  },
): Promise<void> {
  try {
    const reflections = table("agent_reflections");
    if (reflections) {
      await reflections.insert({
        id: result.reflectionId,
        conversation_id: meta?.conversationId ?? null,
        location_id: meta?.locationId ?? null,
        plan_id: meta?.planId ?? null,
        message_preview: (meta?.message ?? "").slice(0, 280),
        completed: result.completed,
        confidence: result.confidence,
        confidence_band: result.confidenceBand,
        needs_follow_up: result.needsFollowUp,
        needs_escalation: result.needsEscalation,
        next_action: result.nextAction,
        reason: result.reason,
        reflection_json: result,
      });
    }

    const scores = table("agent_confidence_scores");
    if (scores) {
      await scores.insert({
        reflection_id: result.reflectionId,
        confidence: result.confidence,
        band: result.confidenceBand,
        breakdown: result.breakdown,
        location_id: meta?.locationId ?? null,
      });
    }

    const goals = table("agent_goal_progress");
    if (goals) {
      await goals.insert({
        reflection_id: result.reflectionId,
        conversation_id: meta?.conversationId ?? null,
        goal: result.goalProgress.goal,
        progress_percent: result.goalProgress.progressPercent,
        completed_fields: result.goalProgress.completedFields,
        missing_fields: result.goalProgress.missingFields,
        status: result.goalProgress.status,
      });
    }

    if (result.needsEscalation) {
      const esc = table("agent_escalations");
      if (esc) {
        await esc.insert({
          reflection_id: result.reflectionId,
          conversation_id: meta?.conversationId ?? null,
          recommended: true,
          reason: result.escalation.reason,
          priority: result.escalation.priority,
          department: result.escalation.suggestedDepartment,
          location_id: meta?.locationId ?? null,
        });
      }
    }

    if (result.needsFollowUp) {
      const clar = table("agent_clarifications");
      if (clar) {
        await clar.insert({
          reflection_id: result.reflectionId,
          conversation_id: meta?.conversationId ?? null,
          missing_fields: result.missing,
          question: result.followUpQuestion,
          location_id: meta?.locationId ?? null,
        });
      }
    }

    const metrics = table("agent_reflection_metrics");
    if (metrics) {
      await metrics.insert({
        metric_key: "reflection_run",
        metric_value: 1,
        confidence: result.confidence,
        next_action: result.nextAction,
        escalated: result.needsEscalation,
        clarified: result.needsFollowUp,
        location_id: meta?.locationId ?? null,
        dimensions: {
          band: result.confidenceBand,
          reflectionScore: result.evaluation.reflectionScore,
        },
      });
    }
  } catch {
    /* never block guest path */
  }
}

export async function getReflectionDashboard(limit = 400): Promise<{
  averageConfidence: number;
  escalationRate: number;
  clarificationRate: number;
  goalCompletionRate: number;
  averageReflectionScore: number;
  confidenceDistribution: { high: number; medium: number; low: number };
  lowConfidenceQuestions: string[];
  mostEscalatedTopics: Array<{ topic: string; count: number }>;
  incompleteConversations: number;
}> {
  try {
    const t = table("agent_reflections");
    if (!t) return emptyDash();
    const { data } = await t
      .select("confidence, confidence_band, needs_escalation, needs_follow_up, reason, message_preview, reflection_json")
      .order("created_at", { ascending: false })
      .limit(limit);
    const rows = (data ?? []) as Array<{
      confidence: number;
      confidence_band: string;
      needs_escalation: boolean;
      needs_follow_up: boolean;
      reason: string;
      message_preview: string | null;
      reflection_json: ReflectionResult;
    }>;
    if (!rows.length) return emptyDash();

    const avg = rows.reduce((s, r) => s + Number(r.confidence), 0) / rows.length;
    const esc = rows.filter((r) => r.needs_escalation).length / rows.length;
    const clar = rows.filter((r) => r.needs_follow_up).length / rows.length;
    const completed = rows.filter((r) => r.reflection_json?.goalProgress?.status === "completed").length / rows.length;
    const reflScore =
      rows.reduce((s, r) => s + (r.reflection_json?.evaluation?.reflectionScore ?? r.confidence), 0) / rows.length;

    const dist = { high: 0, medium: 0, low: 0 };
    for (const r of rows) {
      if (r.confidence_band === "high") dist.high += 1;
      else if (r.confidence_band === "medium") dist.medium += 1;
      else dist.low += 1;
    }

    const lowQ = rows
      .filter((r) => r.confidence_band === "low")
      .map((r) => r.message_preview ?? r.reason)
      .slice(0, 12);

    const topicMap = new Map<string, number>();
    for (const r of rows.filter((x) => x.needs_escalation)) {
      const topic = r.reason.split(":")[0] ?? r.reason;
      topicMap.set(topic, (topicMap.get(topic) ?? 0) + 1);
    }

    return {
      averageConfidence: Number(avg.toFixed(3)),
      escalationRate: Number((esc * 100).toFixed(1)),
      clarificationRate: Number((clar * 100).toFixed(1)),
      goalCompletionRate: Number((completed * 100).toFixed(1)),
      averageReflectionScore: Number(reflScore.toFixed(3)),
      confidenceDistribution: dist,
      lowConfidenceQuestions: lowQ,
      mostEscalatedTopics: [...topicMap.entries()]
        .map(([topic, count]) => ({ topic, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
      incompleteConversations: rows.filter((r) => r.reflection_json?.goalProgress?.status === "active").length,
    };
  } catch {
    return emptyDash();
  }
}

function emptyDash() {
  return {
    averageConfidence: 0,
    escalationRate: 0,
    clarificationRate: 0,
    goalCompletionRate: 0,
    averageReflectionScore: 0,
    confidenceDistribution: { high: 0, medium: 0, low: 0 },
    lowConfidenceQuestions: [] as string[],
    mostEscalatedTopics: [] as Array<{ topic: string; count: number }>,
    incompleteConversations: 0,
  };
}
