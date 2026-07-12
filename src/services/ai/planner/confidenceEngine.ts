import type { ConfidenceBand, PlanComplexity, PlannerIntent } from "./types";
import type { IntentAnalysis } from "./intentAnalyzer";
import type { ClarificationPlan } from "./types";

export function computeConfidence(input: {
  analysis: IntentAnalysis;
  complexity: PlanComplexity;
  clarification: ClarificationPlan;
  message: string;
}): { score: number; band: ConfidenceBand } {
  let score = 0.55;

  if (input.analysis.primary !== "unknown") score += 0.25;
  else score -= 0.15;

  if (input.analysis.signals.length >= 2) score += 0.05;
  if (input.analysis.secondary.length === 0) score += 0.05;
  else if (input.analysis.secondary.length >= 2) score -= 0.08;

  if (input.complexity === "simple") score += 0.08;
  if (input.complexity === "complex") score -= 0.1;

  if (input.clarification.required) score -= Math.min(0.12, input.clarification.fields.length * 0.03);

  if (input.message.trim().length < 4) score -= 0.2;
  if (input.message.trim().length > 12 && input.analysis.primary !== "unknown") score += 0.05;

  // Strong exact intents
  const strong: PlannerIntent[] = ["hours", "greeting", "gallery", "offers", "cancel_reservation"];
  if (strong.includes(input.analysis.primary)) score += 0.07;

  score = Math.max(0, Math.min(1, Number(score.toFixed(2))));

  const band: ConfidenceBand = score >= 0.85 ? "high" : score >= 0.6 ? "medium" : "low";
  return { score, band };
}
