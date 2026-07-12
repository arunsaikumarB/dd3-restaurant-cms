import type { AgentExecutionPlan } from "../planner/types";
import type { EscalationRecommendation, ReflectionConfig } from "./types";

export function evaluateEscalation(input: {
  message: string;
  plan?: AgentExecutionPlan | null;
  confidence: number;
  clarificationCount: number;
  config: ReflectionConfig;
  toolFailureRate: number;
  noKnowledge: boolean;
}): EscalationRecommendation {
  const reasons: string[] = [];
  let priority: EscalationRecommendation["priority"] = "low";
  let department = "Guest Services";

  const q = input.message.toLowerCase();

  if (input.plan?.humanEscalation || input.plan?.humanEscalationPlan.recommended) {
    reasons.push(...(input.plan.humanEscalationPlan.reasons.length
      ? input.plan.humanEscalationPlan.reasons
      : ["Planner recommended escalation"]));
    priority = "high";
  }

  if (/\b(human|manager|speak to (a )?person|real person|call me)\b/i.test(q)) {
    reasons.push("Customer requested a human");
    priority = "high";
    department = "Front Desk";
  }
  if (/\b(refund|charge|payment|billing)\b/i.test(q)) {
    reasons.push("Payment / refund language");
    priority = "critical";
    department = "Billing";
  }
  if (/\b(complaint|terrible|unacceptable|angry)\b/i.test(q) || input.plan?.intent === "complaint") {
    reasons.push("Complaint detected");
    priority = "high";
    department = "Guest Relations";
  }
  if (input.plan?.goal === "large_catering" || /\b(corporate|vip|60|50|100)\b/i.test(q)) {
    reasons.push("Large catering / VIP / corporate");
    priority = "high";
    department = "Events & Catering";
  }
  if (/\b(emergency|urgent|asap)\b/i.test(q)) {
    reasons.push("Emergency / urgent language");
    priority = "critical";
    department = "Manager On Duty";
  }
  if (input.confidence < input.config.escalateBelow) {
    reasons.push("Confidence below escalation threshold");
    priority = bump(priority, "medium");
  }
  if (input.clarificationCount >= input.config.maxClarifications) {
    reasons.push("Repeated clarifications");
    priority = bump(priority, "medium");
  }
  if (input.toolFailureRate >= 0.6) {
    reasons.push("High tool failure rate");
    priority = bump(priority, "medium");
  }
  if (input.noKnowledge) {
    reasons.push("No matching knowledge found");
    priority = bump(priority, "medium");
  }

  return {
    recommended: reasons.length > 0,
    reason: reasons[0] ?? "No escalation recommended",
    priority: reasons.length ? priority : "low",
    suggestedDepartment: reasons.length ? department : "Guest Services",
  };
}

function bump(
  current: EscalationRecommendation["priority"],
  min: EscalationRecommendation["priority"],
): EscalationRecommendation["priority"] {
  const order = ["low", "medium", "high", "critical"] as const;
  return order[Math.max(order.indexOf(current), order.indexOf(min))]!;
}
