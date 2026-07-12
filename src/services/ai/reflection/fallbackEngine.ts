import type { ReflectionNextAction, ReflectionConfig, ConfidenceBand } from "./types";
import type { EscalationRecommendation } from "./types";

export function chooseFallbackAction(input: {
  confidence: number;
  band: ConfidenceBand;
  config: ReflectionConfig;
  needsFollowUp: boolean;
  escalation: EscalationRecommendation;
  noKnowledge: boolean;
}): ReflectionNextAction {
  if (input.escalation.recommended && (input.band === "low" || input.escalation.priority === "critical" || input.escalation.priority === "high")) {
    return "suggest_human";
  }
  if (input.needsFollowUp) return "ask_follow_up";
  if (input.band === "low" && input.noKnowledge) return "recommend_call";
  if (input.confidence < input.config.escalateBelow) return "limited_answer";
  if (input.band === "low") return "ask_follow_up";
  return "accept";
}

export function buildAdditiveSuffix(input: {
  nextAction: ReflectionNextAction;
  followUpQuestion: string | null;
  escalation: EscalationRecommendation;
}): string | null {
  if (input.nextAction === "ask_follow_up" && input.followUpQuestion) {
    return input.followUpQuestion;
  }
  if (input.nextAction === "suggest_human") {
    return `If you'd like, I can connect you with our ${input.escalation.suggestedDepartment} team — just say the word.`;
  }
  if (input.nextAction === "recommend_call") {
    return "I may not have the full details on this one — calling the restaurant is the safest next step, or tell me more and I'll keep helping.";
  }
  return null;
}
