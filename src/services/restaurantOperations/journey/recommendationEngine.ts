import { upsertRecommendation } from "./repository";
import type { JourneyRecommendation, JourneyScores, JourneySignals } from "./types";

export type NextBestAction = {
  actionCode: string;
  title: string;
  reason: string;
  priority: number;
  offers: string[];
};

export function calculateNextBestAction(input: {
  stage: string;
  signals: JourneySignals;
  scores: JourneyScores;
}): NextBestAction {
  const { stage, signals, scores } = input;

  if (signals.birthdayInDays != null && signals.birthdayInDays >= 0 && signals.birthdayInDays <= 7) {
    return {
      actionCode: "birthday_coupon",
      title: "Offer birthday coupon",
      reason: `Birthday in ${signals.birthdayInDays} day(s)`,
      priority: 10,
      offers: ["Complimentary dessert", "Birthday table setup"],
    };
  }

  if (signals.anniversaryInDays != null && signals.anniversaryInDays >= 0 && signals.anniversaryInDays <= 7) {
    return {
      actionCode: "anniversary_offer",
      title: "Anniversary celebration offer",
      reason: `Anniversary in ${signals.anniversaryInDays} day(s)`,
      priority: 15,
      offers: ["Complimentary dessert tasting"],
    };
  }

  if (stage === "inactive" || stage === "at_risk" || (signals.daysSinceLastVisit ?? 0) >= 60) {
    return {
      actionCode: "win_back",
      title: "Win-back campaign",
      reason: `Inactive ${signals.daysSinceLastVisit ?? "?"} days · churn risk ${scores.churnRisk}`,
      priority: 20,
      offers: ["Welcome-back discount", "Chef special invite"],
    };
  }

  if (signals.cancelCount >= 3) {
    return {
      actionCode: "personal_call",
      title: "Call personally",
      reason: `${signals.cancelCount} cancellations — relationship recovery`,
      priority: 25,
      offers: [],
    };
  }

  if (signals.isVip || stage === "vip" || stage === "loyal") {
    return {
      actionCode: "preferred_table",
      title: "Assign preferred VIP table",
      reason: "VIP / loyal guest recognition",
      priority: 30,
      offers: ["Preferred seating", "Complimentary appetizer"],
    };
  }

  if (signals.cateringCount >= 1 || signals.occasionHints.includes("corporate")) {
    return {
      actionCode: "suggest_catering",
      title: "Suggest catering / corporate event",
      reason: "Corporate or catering affinity",
      priority: 40,
      offers: ["Corporate lunch package", "Event discount"],
    };
  }

  if (signals.familyVisits >= 2) {
    return {
      actionCode: "kids_package",
      title: "Offer kids package",
      reason: "Frequent family visits",
      priority: 45,
      offers: ["Kids meal package", "Family combo"],
    };
  }

  if (signals.visitCount >= 12) {
    return {
      actionCode: "upgrade_platinum",
      title: "Upgrade to Platinum",
      reason: "12+ visits — loyalty upgrade candidate",
      priority: 35,
      offers: ["Platinum loyalty upgrade"],
    };
  }

  if (signals.visitCount >= 1 && signals.daysSinceLastVisit != null && signals.daysSinceLastVisit <= 14) {
    return {
      actionCode: "weekend_booking",
      title: "Invite weekend booking",
      reason: "Customer likely to book again this weekend",
      priority: 50,
      offers: ["Weekend family combo"],
    };
  }

  if (stage === "visitor" || stage === "first_reservation") {
    return {
      actionCode: "welcome_offer",
      title: "Welcome offer",
      reason: "Early lifecycle engagement",
      priority: 60,
      offers: ["First-visit dessert"],
    };
  }

  return {
    actionCode: "nurture",
    title: "Nurture relationship",
    reason: `Stage ${stage} · relationship ${scores.relationshipScore}`,
    priority: 100,
    offers: [],
  };
}

export async function persistRecommendation(
  locationId: string,
  customerId: string,
  nba: NextBestAction,
): Promise<JourneyRecommendation | null> {
  return upsertRecommendation({
    locationId,
    customerId,
    actionCode: nba.actionCode,
    title: nba.title,
    reason: nba.reason,
    priority: nba.priority,
  });
}

export function generateAiRecommendations(input: {
  stage: string;
  signals: JourneySignals;
  scores: JourneyScores;
  nba: NextBestAction;
}): string[] {
  const lines: string[] = [];
  if (input.signals.daysSinceLastVisit != null && input.signals.daysSinceLastVisit <= 10) {
    lines.push("Customer likely to book again this weekend. Offer family combo.");
  }
  if (input.signals.birthdayInDays != null && input.signals.birthdayInDays <= 5) {
    lines.push(`Customer birthday in ${input.signals.birthdayInDays} days. Generate birthday campaign.`);
  }
  if (input.signals.visitCount >= 12) {
    lines.push("Customer has visited 12+ times. Upgrade to Platinum.");
  }
  if (input.signals.cancelCount >= 3) {
    lines.push("Customer cancelled three reservations. Call personally.");
  }
  lines.push(`${input.nba.title} — ${input.nba.reason}`);
  return lines;
}
