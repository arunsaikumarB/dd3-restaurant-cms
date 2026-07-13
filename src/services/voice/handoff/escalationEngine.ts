/**
 * Escalation Engine — recommends human involvement; never auto-disconnects AI.
 */

import { listEscalationRules } from "./repository";
import type { EscalationEvaluation, EscalationScenario, TransferMode } from "./types";

const SCENARIO_PATTERNS: Array<{ scenario: EscalationScenario; re: RegExp }> = [
  { scenario: "emergency", re: /\b(emergency|911|ambulance|fire|police)\b/i },
  { scenario: "complaint", re: /\b(complaint|complain|unhappy|disgusted|terrible|awful|worst)\b/i },
  { scenario: "refund", re: /\b(refund|chargeback|money back)\b/i },
  { scenario: "payment_issue", re: /\b(payment|charged|billing|credit card|overcharg)\b/i },
  { scenario: "manager_request", re: /\b(manager|supervisor|speak to (a )?human|talk to (a )?person|real person|staff)\b/i },
  { scenario: "vip", re: /\b(vip|priority guest)\b/i },
  { scenario: "wedding", re: /\b(wedding|reception)\b/i },
  { scenario: "corporate", re: /\b(corporate|company event|business event)\b/i },
  { scenario: "large_party", re: /\b(party of\s*(1[5-9]|[2-9]\d)|\b([2-9]\d)\s*(guests?|people))\b/i },
  { scenario: "accessibility", re: /\b(wheelchair|accessib|ada|mobility)\b/i },
  { scenario: "complex_reservation", re: /\b(private (room|dining)|buyout|exclusive)\b/i },
];

function sentimentFromText(text: string): string {
  const t = text.toLowerCase();
  if (/\b(angry|upset|terrible|worst|complaint|refund|furious)\b/.test(t)) return "negative";
  if (/\b(thank|great|love|wonderful|amazing|perfect)\b/.test(t)) return "positive";
  return "neutral";
}

export async function evaluateEscalation(input: {
  locationId: string;
  message: string;
  confidence?: number;
  misunderstandingCount?: number;
  isVip?: boolean;
  guests?: number;
  reservationTransferRecommended?: boolean;
  reservationTransferReason?: string | null;
  customerRequestedStaff?: boolean;
  noKnowledgeMatch?: boolean;
}): Promise<EscalationEvaluation> {
  const rules = await listEscalationRules(input.locationId);
  const sentiment = sentimentFromText(input.message);
  let scenario: EscalationScenario | null = null;
  let reason = "";

  if (input.customerRequestedStaff) {
    scenario = "staff_requested";
    reason = "Customer requested to speak with staff.";
  } else if (input.reservationTransferRecommended) {
    scenario = "reservation_transfer";
    reason = input.reservationTransferReason ?? "Reservation agent recommended human assistance.";
  } else if ((input.misunderstandingCount ?? 0) >= 2) {
    scenario = "misunderstanding";
    reason = "Repeated misunderstanding during the call.";
  } else if ((input.confidence ?? 1) < 0.45) {
    scenario = "low_confidence";
    reason = "Repeated low speech recognition confidence.";
  } else if (input.noKnowledgeMatch) {
    scenario = "no_knowledge";
    reason = "No matching knowledge for the guest question.";
  } else if (input.isVip) {
    scenario = "vip";
    reason = "VIP guest detected.";
  } else if ((input.guests ?? 0) >= 15) {
    scenario = "large_party";
    reason = `Large party of ${input.guests}.`;
  } else {
    for (const p of SCENARIO_PATTERNS) {
      if (p.re.test(input.message)) {
        scenario = p.scenario;
        reason = `Detected ${p.scenario.replace(/_/g, " ")} intent.`;
        break;
      }
    }
  }

  if (!scenario) {
    return {
      shouldEscalate: false,
      scenario: "other",
      reason: "",
      priority: 5,
      departmentCode: "general",
      transferMode: "warm",
      autoQueue: false,
      sentiment,
    };
  }

  const matched =
    rules.find((r) => r.enabled && r.triggers.includes(scenario!)) ??
    rules.find((r) => r.enabled && r.code === scenario) ??
    null;

  return {
    shouldEscalate: true,
    scenario,
    reason: reason || matched?.name || "Human assistance recommended.",
    priority: matched?.priority ?? (scenario === "emergency" || scenario === "complaint" ? 1 : 4),
    departmentCode: matched?.departmentCode ?? defaultDepartment(scenario),
    transferMode: (matched?.transferMode as TransferMode) ?? (scenario === "emergency" ? "cold" : "warm"),
    autoQueue: matched?.autoQueue ?? true,
    sentiment,
  };
}

function defaultDepartment(scenario: EscalationScenario): string {
  switch (scenario) {
    case "complaint":
    case "emergency":
    case "vip":
    case "manager_request":
      return "manager";
    case "refund":
    case "payment_issue":
      return "support";
    case "corporate":
    case "wedding":
      return "events";
    case "large_party":
    case "complex_reservation":
    case "reservation_transfer":
      return "reservations";
    case "accessibility":
      return "host";
    default:
      return "general";
  }
}

export function buildEscalationSuggestedAction(scenario: EscalationScenario): string {
  switch (scenario) {
    case "complaint":
      return "Listen fully, apologize, and offer recovery options.";
    case "refund":
      return "Verify the charge and open a refund review task.";
    case "vip":
      return "Greet by name and personally own the request.";
    case "corporate":
    case "wedding":
      return "Capture event date, headcount, and budget; route to Events.";
    case "large_party":
      return "Confirm party size and discuss private dining options.";
    case "accessibility":
      return "Confirm accessibility needs and assign an appropriate table.";
    case "emergency":
      return "Stay calm, gather location details, and involve a manager immediately.";
    default:
      return "Review the AI summary and continue without asking the guest to repeat.";
  }
}
