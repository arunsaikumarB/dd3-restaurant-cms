/**
 * AI Planner & Decision Engine
 * ----------------------------
 * Produces deterministic execution plans only.
 * NEVER calls Gemini. NEVER executes tools. NEVER retrieves knowledge.
 */

import { analyzeIntents } from "./intentAnalyzer";
import { conversationGoalFrom, detectCustomerGoal } from "./goalDetector";
import { analyzeComplexity } from "./complexityAnalyzer";
import { detectClarification } from "./clarificationDetector";
import { computeConfidence } from "./confidenceEngine";
import {
  detectTaskType,
  planBusinessRules,
  planKnowledgeSources,
  planTools,
  planWorkflow,
} from "./workflowPlanner";
import { buildExecutionPlan, summarizePlan } from "./executionPlan";
import { logExecutionPlan, upsertAgentGoal } from "./plannerLogger";
import type { AgentExecutionPlan, PlannerInput, PlannerReasoning } from "./types";

export function createExecutionPlan(input: PlannerInput): AgentExecutionPlan {
  const message = input.message?.trim() ?? "";
  const analysis = analyzeIntents(message);
  const goal = detectCustomerGoal(message, analysis);
  const conversationGoal = conversationGoalFrom(goal, input.history?.length ?? 0);
  const complexity = analyzeComplexity(message, analysis);
  const clarification = detectClarification({
    message,
    intent: analysis.primary,
    goal,
    knownFields: input.knownFields,
    hasLocation: Boolean(input.locationId),
  });
  const { score, band } = computeConfidence({ analysis, complexity, clarification, message });
  const knowledge = planKnowledgeSources(analysis.primary, goal);
  const tools = planTools(analysis.primary, goal);
  const rules = planBusinessRules(analysis.primary, message);
  const taskType = detectTaskType(analysis.primary, complexity);

  const escalationReasons: string[] = [];
  if (analysis.primary === "complaint") escalationReasons.push("Complaint detected");
  if (goal === "large_catering") escalationReasons.push("Large catering request");
  if (/\bvip\b|manager|refund|emergency|urgent\b/i.test(message)) {
    escalationReasons.push("VIP / refund / emergency language");
  }
  if (band === "low") escalationReasons.push("Low planner confidence");
  if (complexity === "complex" && clarification.required && clarification.fields.length >= 3) {
    escalationReasons.push("Complex multi-missing slots");
  }
  // Repeated failure signal from history (simple heuristic)
  const repeats =
    input.history?.filter((h) => h.role === "user" && similar(h.content, message)).length ?? 0;
  if (repeats >= 2) escalationReasons.push("Repeated similar questions");

  const humanEscalation = escalationReasons.length > 0 && (
    analysis.primary === "complaint" ||
    goal === "large_catering" ||
    /\brefund|emergency\b/i.test(message) ||
    band === "low" ||
    repeats >= 2
  );

  const workflow = planWorkflow({
    intent: analysis.primary,
    goal,
    clarification,
    humanEscalation,
    complexity,
  });

  const reasoning: PlannerReasoning = {
    detectedIntent: analysis.primary,
    secondaryIntents: analysis.secondary,
    confidence: score,
    confidenceBand: band,
    complexity,
    whyToolsSelected: tools.reasons,
    whyKnowledgeSelected: knowledge.reasons,
    clarificationReasons: clarification.required
      ? clarification.fields.map((f) => `Missing ${f}`)
      : ["No clarification required"],
    escalationReasons: escalationReasons.length ? escalationReasons : ["No escalation recommended"],
    notes: [
      `signals=${analysis.signals.join(",") || "none"}`,
      `taskType=${taskType}`,
      summarizePlanHints(analysis.primary, goal),
    ],
  };

  return buildExecutionPlan({
    intent: analysis.primary,
    secondaryIntents: analysis.secondary,
    goal,
    conversationGoal,
    taskType,
    complexity,
    confidence: score,
    confidenceBand: band,
    knowledgeSources: knowledge.sources,
    requiredTools: tools.tools,
    businessRulesNeeded: rules.rules,
    clarification,
    humanEscalation,
    humanEscalationPlan: {
      recommended: humanEscalation,
      reasons: escalationReasons,
    },
    workflow,
    reasoning,
  });
}

function summarizePlanHints(intent: string, goal: string): string {
  return `Mapped ${intent} → goal ${goal}`;
}

function similar(a: string, b: string): boolean {
  const na = a.toLowerCase().replace(/\W+/g, " ").trim();
  const nb = b.toLowerCase().replace(/\W+/g, " ").trim();
  if (!na || !nb) return false;
  if (na === nb) return true;
  return na.includes(nb.slice(0, 24)) || nb.includes(na.slice(0, 24));
}

/**
 * Create plan and best-effort persist for admin observability.
 * Persistence failures never affect the returned plan.
 */
export async function createAndLogExecutionPlan(
  input: PlannerInput,
): Promise<AgentExecutionPlan> {
  const plan = createExecutionPlan(input);
  void logExecutionPlan(plan, {
    conversationId: input.conversationId,
    locationId: input.locationId,
    message: input.message,
  });
  void upsertAgentGoal({
    conversationId: input.conversationId,
    plan,
  });
  return plan;
}

export { summarizePlan };
