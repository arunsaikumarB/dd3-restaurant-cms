import type { JourneyScores, JourneySignals } from "./types";

export type RetentionInsight = {
  inactive: boolean;
  declining: boolean;
  repeatedCancellations: boolean;
  noShows: boolean;
  lowLoyalty: boolean;
  lowEngagement: boolean;
  actions: string[];
};

export function evaluateRetention(input: {
  signals: JourneySignals;
  scores: JourneyScores;
  inactiveDays: number;
}): RetentionInsight {
  const { signals, scores, inactiveDays } = input;
  const inactive = (signals.daysSinceLastVisit ?? 0) >= inactiveDays;
  const declining = scores.visitScore < 30 && signals.visitCount > 0;
  const repeatedCancellations = signals.cancelCount >= 3;
  const noShows = signals.noShowCount >= 2;
  const lowLoyalty = scores.loyaltyScore < 25;
  const lowEngagement = scores.engagementScore < 30;

  const actions: string[] = [];
  if (inactive) actions.push("Launch win-back email / SMS campaign");
  if (declining) actions.push("Send personalized re-engagement offer");
  if (repeatedCancellations) actions.push("Manager personal outreach call");
  if (noShows) actions.push("Require deposit on next reservation");
  if (lowLoyalty) actions.push("Highlight loyalty enrollment benefits");
  if (lowEngagement) actions.push("Invite to seasonal tasting event");

  return {
    inactive,
    declining,
    repeatedCancellations,
    noShows,
    lowLoyalty,
    lowEngagement,
    actions,
  };
}
