/**
 * Reflection Engine — post-Gemini evaluation only.
 * Never rewrites Gemini output. Never touches Planner / Tool Orchestrator / RAG / Gemini.
 */

import { scoreConfidence } from "./confidenceEngine";
import { buildClarificationQuestion } from "./clarificationEngine";
import { evaluateGoalProgress } from "./goalCompletion";
import { evaluateEscalation } from "./escalationEngine";
import { buildAdditiveSuffix, chooseFallbackAction } from "./fallbackEngine";
import { persistReflection } from "./reflectionLogger";
import {
  DEFAULT_REFLECTION_CONFIG,
  type ReflectionConfig,
  type ReflectionInput,
  type ReflectionResult,
} from "./types";

export function runReflection(input: ReflectionInput): ReflectionResult {
  const config: ReflectionConfig = { ...DEFAULT_REFLECTION_CONFIG, ...input.config };
  const history = input.history ?? [];
  const plan = input.plan ?? null;
  const orch = input.toolOrchestration ?? null;

  const { confidence, band, breakdown } = scoreConfidence({
    plan,
    toolOrchestration: orch,
    geminiResponse: input.geminiResponse,
    message: input.message,
    historyLength: history.length,
    config,
  });

  const goalProgress = evaluateGoalProgress(plan, history);
  const missing = goalProgress.missingFields.length
    ? goalProgress.missingFields
    : plan?.clarification.required
      ? plan.clarification.fields
      : [];

  const toolResults = orch?.toolResults ?? [];
  const actionable = toolResults.filter((r) => String(r.toolId) !== "conversation_memory");
  const toolSuccessRate = actionable.length
    ? actionable.filter((r) => r.status === "success").length / actionable.length
    : 0.6;
  const toolFailureRate = 1 - toolSuccessRate;

  const rag = toolResults.find((r) => String(r.toolId) === "semantic_rag");
  const ragData = rag?.result as { available?: boolean; chunks?: Array<{ similarity?: number }> } | undefined;
  const sims = (ragData?.chunks ?? []).map((c) => c.similarity ?? 0);
  const avgSimilarity = sims.length ? sims.reduce((a, b) => a + b, 0) / sims.length : 0;
  const noKnowledge =
    Boolean(plan?.knowledgeSources.includes("semantic_rag")) &&
    (!ragData?.available || !sims.length) &&
    toolSuccessRate < 0.5;

  const intentsCovered = responseMentionsIntent(input.geminiResponse, plan?.intent);
  const requiredToolsOk = (plan?.requiredTools ?? []).every((t) =>
    toolResults.some((r) => String(r.toolId) === String(t) && r.status === "success"),
  );
  const contextCoverage = breakdown.coverage;
  const ignoredContextRisk =
    Boolean(orch?.contextPackage.rag) &&
    input.geminiResponse.length > 20 &&
    avgSimilarity > 0.7 &&
    !/\b(policy|menu|offer|hour|reserv)/i.test(input.geminiResponse);

  const followUpQuestion = missing.length
    ? buildClarificationQuestion(missing, plan, history)
    : null;
  const needsFollowUp = Boolean(followUpQuestion) && goalProgress.status !== "completed";

  const escalation = evaluateEscalation({
    message: input.message,
    plan,
    confidence,
    clarificationCount: input.clarificationCount ?? 0,
    config,
    toolFailureRate,
    noKnowledge,
  });

  const nextAction = chooseFallbackAction({
    confidence,
    band,
    config,
    needsFollowUp,
    escalation,
    noKnowledge,
  });

  const needsEscalation = nextAction === "suggest_human" || escalation.recommended && band === "low";
  const completed = goalProgress.status === "completed" && !needsFollowUp && band !== "low";

  const reflectionScore = Number(
    (
      confidence * 0.5 +
      (intentsCovered ? 0.15 : 0) +
      (requiredToolsOk ? 0.15 : 0.05) +
      contextCoverage * 0.1 +
      (completed ? 0.1 : 0)
    ).toFixed(2),
  );

  const reason = needsEscalation
    ? escalation.reason
    : needsFollowUp
      ? `Missing information: ${missing.join(", ")}`
      : band === "low"
        ? "Low confidence — safest limited answer"
        : "Response accepted";

  const additiveSuffix = buildAdditiveSuffix({
    nextAction,
    followUpQuestion,
    escalation,
  });

  const result: ReflectionResult = {
    reflectionId: crypto.randomUUID(),
    completed,
    confidence,
    confidenceBand: band,
    breakdown,
    missing,
    needsFollowUp,
    followUpQuestion,
    needsEscalation,
    escalation,
    nextAction,
    goalProgress,
    reason,
    evaluation: {
      intentsCovered,
      goalComplete: goalProgress.status === "completed",
      requiredToolsOk,
      contextCoverage,
      toolSuccessRate: Number(toolSuccessRate.toFixed(2)),
      avgSimilarity: Number(avgSimilarity.toFixed(3)),
      ignoredContextRisk,
      reflectionScore,
    },
    additiveSuffix,
    createdAt: new Date().toISOString(),
  };

  void persistReflection(result, {
    conversationId: input.conversationId,
    locationId: input.locationId,
    message: input.message,
    planId: plan?.planId ?? null,
  });

  return result;
}

/** Compose guest-visible text without rewriting Gemini's answer. */
export function applyReflectionToResponse(geminiResponse: string, reflection: ReflectionResult): string {
  if (!reflection.additiveSuffix) return geminiResponse;
  const base = geminiResponse.trim();
  if (!base) return reflection.additiveSuffix;
  if (base.includes(reflection.additiveSuffix)) return base;
  return `${base}\n\n${reflection.additiveSuffix}`;
}

function responseMentionsIntent(response: string, intent?: string): boolean {
  if (!intent || intent === "unknown" || intent === "greeting") return true;
  const r = response.toLowerCase();
  if (intent.includes("reservation")) return /table|reserv|book|guest|time|date/.test(r);
  if (intent.includes("cater")) return /cater|event|party|quote/.test(r);
  if (intent === "hours") return /open|close|hour|am|pm/.test(r);
  if (intent.includes("offer")) return /offer|deal|special|discount/.test(r);
  return response.trim().length > 30;
}
