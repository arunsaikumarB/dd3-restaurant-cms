import type { AgentExecutionPlan } from "../planner/types";
import type { ToolOrchestratorResult } from "../toolOrchestrator/types";
import type { ConfidenceBreakdown, ConfidenceBand, ReflectionConfig } from "./types";

export function scoreConfidence(input: {
  plan?: AgentExecutionPlan | null;
  toolOrchestration?: ToolOrchestratorResult | null;
  geminiResponse: string;
  message: string;
  historyLength: number;
  config: ReflectionConfig;
}): { confidence: number; band: ConfidenceBand; breakdown: ConfidenceBreakdown } {
  const weights = {
    planner: 0.3,
    rag: 0.25,
    tools: 0.2,
    businessRules: 0.1,
    history: 0.1,
    freshness: 0.05,
  };

  const plannerScore = clamp(input.plan?.confidence ?? 0.5);

  const rag = extractRagSignals(input.toolOrchestration);
  const ragScore = clamp(
    rag.available ? 0.45 + rag.avgSimilarity * 0.55 : input.plan?.knowledgeSources.includes("semantic_rag") ? 0.25 : 0.55,
  );

  const tools = extractToolSignals(input.toolOrchestration);
  const toolScore = clamp(tools.successRate);

  const rulesScore = input.plan?.businessRulesNeeded?.length
    ? tools.hadBusinessRules
      ? 0.9
      : 0.55
    : 0.75;

  const historyScore = clamp(0.5 + Math.min(input.historyLength, 8) * 0.05);

  const freshnessScore = rag.freshness;

  let coveragePenalty = 0;
  if (input.plan?.clarification.required) coveragePenalty += 0.12 * input.plan.clarification.fields.length;
  if (!input.geminiResponse.trim()) coveragePenalty += 0.4;
  if (input.geminiResponse.length < 40 && input.message.length > 20) coveragePenalty += 0.08;

  const raw =
    plannerScore * weights.planner +
    ragScore * weights.rag +
    toolScore * weights.tools +
    rulesScore * weights.businessRules +
    historyScore * weights.history +
    freshnessScore * weights.freshness -
    coveragePenalty;

  const confidence = clamp(Number(raw.toFixed(2)));
  const band: ConfidenceBand =
    confidence >= input.config.highConfidenceMin
      ? "high"
      : confidence >= input.config.mediumConfidenceMin
        ? "medium"
        : "low";

  return {
    confidence,
    band,
    breakdown: {
      planner: plannerScore,
      rag: ragScore,
      tools: toolScore,
      businessRules: rulesScore,
      history: historyScore,
      freshness: freshnessScore,
      coverage: clamp(1 - coveragePenalty),
      clarification: input.plan?.clarification.required ? 0.4 : 1,
      weights,
    },
  };
}

function extractRagSignals(orch?: ToolOrchestratorResult | null): {
  available: boolean;
  avgSimilarity: number;
  freshness: number;
} {
  const rag = orch?.toolResults.find((r) => String(r.toolId) === "semantic_rag");
  if (!rag || rag.status !== "success" || !rag.result || typeof rag.result !== "object") {
    return { available: false, avgSimilarity: 0, freshness: 0.7 };
  }
  const result = rag.result as { available?: boolean; chunks?: Array<{ similarity?: number }> };
  const sims = (result.chunks ?? []).map((c) => c.similarity ?? 0);
  const avg = sims.length ? sims.reduce((a, b) => a + b, 0) / sims.length : 0;
  return {
    available: Boolean(result.available && sims.length),
    avgSimilarity: avg,
    freshness: 0.75,
  };
}

function extractToolSignals(orch?: ToolOrchestratorResult | null): {
  successRate: number;
  hadBusinessRules: boolean;
} {
  if (!orch?.toolResults.length) return { successRate: 0.6, hadBusinessRules: false };
  const actionable = orch.toolResults.filter(
    (r) => !["conversation_memory"].includes(String(r.toolId)),
  );
  const success = actionable.filter((r) => r.status === "success").length;
  const rate = actionable.length ? success / actionable.length : 0.6;
  return {
    successRate: rate,
    hadBusinessRules: actionable.some((r) => String(r.toolId) === "business_rules" && r.status === "success"),
  };
}

function clamp(n: number): number {
  return Math.max(0, Math.min(1, n));
}
