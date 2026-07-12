import type { AgentExecutionPlan, AgentGoalProgress, ClarificationField } from "./types";
import { createClientIfConfigured } from "../../../lib/supabase/client";

function client() {
  return createClientIfConfigured();
}

function table(name: string) {
  const c = client();
  if (!c) return null;
  return (c as unknown as { from: (t: string) => ReturnType<NonNullable<ReturnType<typeof createClientIfConfigured>>["from"]> }).from(
    name,
  );
}

/** Persist plan + reasoning for admin observability. Never throws to callers. */
export async function logExecutionPlan(plan: AgentExecutionPlan, meta?: {
  conversationId?: string | null;
  locationId?: string | null;
  message?: string;
}): Promise<void> {
  try {
    const t = table("agent_execution_plans");
    if (!t) return;
    await t.insert({
      id: plan.planId,
      conversation_id: meta?.conversationId ?? null,
      location_id: meta?.locationId ?? null,
      message_preview: (meta?.message ?? "").slice(0, 280),
      intent: plan.intent,
      secondary_intents: plan.secondaryIntents,
      goal: plan.goal,
      complexity: plan.complexity,
      confidence: plan.confidence,
      plan_json: plan,
      human_escalation: plan.humanEscalation,
      clarification_required: plan.clarification.required,
    });

    const r = table("agent_reasoning_logs");
    if (r) {
      await r.insert({
        plan_id: plan.planId,
        conversation_id: meta?.conversationId ?? null,
        detected_intent: plan.reasoning.detectedIntent,
        confidence: plan.reasoning.confidence,
        complexity: plan.reasoning.complexity,
        why_tools: plan.reasoning.whyToolsSelected,
        why_knowledge: plan.reasoning.whyKnowledgeSelected,
        clarification_reasons: plan.reasoning.clarificationReasons,
        escalation_reasons: plan.reasoning.escalationReasons,
        notes: plan.reasoning.notes,
        reasoning_json: plan.reasoning,
      });
    }

    const m = table("agent_planner_metrics");
    if (m) {
      await m.insert({
        metric_key: "plan_created",
        metric_value: 1,
        intent: plan.intent,
        complexity: plan.complexity,
        confidence: plan.confidence,
        location_id: meta?.locationId ?? null,
        dimensions: {
          escalation: plan.humanEscalation,
          clarification: plan.clarification.required,
        },
      });
    }
  } catch {
    /* migration may be pending — never block guest path */
  }
}

export async function upsertAgentGoal(input: {
  conversationId?: string | null;
  plan: AgentExecutionPlan;
  collectedFields?: ClarificationField[];
}): Promise<AgentGoalProgress | null> {
  try {
    const t = table("agent_goals");
    if (!t) return null;
    const required = input.plan.clarification.fields;
    const collected = input.collectedFields ?? [];
    const progress =
      required.length === 0
        ? 100
        : Math.round((collected.filter((f) => required.includes(f)).length / required.length) * 100);

    const row = {
      conversation_id: input.conversationId ?? null,
      goal: input.plan.goal,
      progress_percent: progress,
      required_fields: required,
      collected_fields: collected,
      status: input.plan.humanEscalation ? "escalated" : progress >= 100 ? "completed" : "active",
      plan_id: input.plan.planId,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await t.insert(row).select("*").single();
    if (error || !data) return null;
    const d = data as Record<string, unknown>;
    return {
      goalId: String(d.id),
      conversationId: (d.conversation_id as string | null) ?? null,
      goal: input.plan.goal,
      progressPercent: Number(d.progress_percent ?? progress),
      requiredFields: (d.required_fields as ClarificationField[]) ?? required,
      collectedFields: (d.collected_fields as ClarificationField[]) ?? collected,
      status: (d.status as AgentGoalProgress["status"]) ?? "active",
      planId: input.plan.planId,
    };
  } catch {
    return null;
  }
}

export async function listRecentPlans(limit = 30): Promise<AgentExecutionPlan[]> {
  try {
    const t = table("agent_execution_plans");
    if (!t) return [];
    const { data, error } = await t
      .select("plan_json")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    return ((data ?? []) as Array<{ plan_json: AgentExecutionPlan }>).map((r) => r.plan_json);
  } catch {
    return [];
  }
}
