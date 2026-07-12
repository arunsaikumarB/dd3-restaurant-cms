import type { PlanComplexity, PlannerIntent } from "./types";
import type { IntentAnalysis } from "./intentAnalyzer";

export function analyzeComplexity(message: string, analysis: IntentAnalysis): PlanComplexity {
  const q = message.toLowerCase();
  const intentCount = 1 + analysis.secondary.length;
  const hasAnd = /\band\b|,|\balso\b|\bplus\b/.test(q);
  const multiDomain =
    intentCount >= 3 ||
    (intentCount >= 2 &&
      hasAnd &&
      overlapsDomains(analysis.primary, analysis.secondary));

  if (multiDomain || /catering.+party|party.+catering|decorat|vip|refund/.test(q)) {
    return "complex";
  }

  if (
    intentCount >= 2 ||
    analysis.primary === "reservation" ||
    analysis.primary === "modify_reservation" ||
    analysis.primary === "cancel_reservation" ||
    analysis.primary === "catering" ||
    analysis.primary === "party_booking" ||
    analysis.primary === "dish_recommendation" ||
    analysis.primary === "complaint"
  ) {
    return "medium";
  }

  const simpleIntents: PlannerIntent[] = [
    "greeting",
    "hours",
    "contact",
    "directions",
    "gallery",
    "offers",
    "reviews",
    "menu_inquiry",
  ];
  if (simpleIntents.includes(analysis.primary) && intentCount === 1) return "simple";

  return analysis.primary === "unknown" ? "medium" : "simple";
}

function overlapsDomains(primary: PlannerIntent, secondary: PlannerIntent[]): boolean {
  const domains = new Set(secondary.map(domainOf).concat(domainOf(primary)));
  return domains.size >= 2;
}

function domainOf(intent: PlannerIntent): string {
  if (intent.includes("reservation")) return "reservation";
  if (intent === "catering" || intent === "party_booking") return "events";
  if (["menu_inquiry", "dish_recommendation", "vegetarian", "vegan", "kids_menu"].includes(intent)) {
    return "menu";
  }
  if (intent === "complaint" || intent === "feedback") return "support";
  return "info";
}
