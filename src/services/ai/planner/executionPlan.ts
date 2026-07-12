import type { AgentExecutionPlan, PlannerReasoning } from "./types";

/** Build the strongly typed execution plan object (pure). */
export function buildExecutionPlan(partial: Omit<AgentExecutionPlan, "planId" | "createdAt" | "reasoning"> & {
  reasoning: PlannerReasoning;
}): AgentExecutionPlan {
  return {
    planId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

export function summarizePlan(plan: AgentExecutionPlan): string {
  return [
    `intent=${plan.intent}`,
    `goal=${plan.goal}`,
    `complexity=${plan.complexity}`,
    `confidence=${plan.confidence}`,
    `tools=${plan.requiredTools.join("|") || "none"}`,
    `clarify=${plan.clarification.required ? plan.clarification.fields.join(",") : "no"}`,
    `escalate=${plan.humanEscalation}`,
  ].join(" · ");
}
