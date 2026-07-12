/**
 * Milestone detection — unique per customer (DB unique constraint).
 */

import { insertJourneyEvent, insertMilestone, listMilestones } from "./repository";
import type { JourneyMilestone, JourneySignals } from "./types";

const CHECKS: Array<{
  code: string;
  title: string;
  test: (s: JourneySignals) => boolean;
}> = [
  { code: "first_visit", title: "First Visit", test: (s) => s.visitCount >= 1 },
  { code: "visits_5", title: "5 Visits", test: (s) => s.visitCount >= 5 },
  { code: "visits_10", title: "10 Visits", test: (s) => s.visitCount >= 10 },
  { code: "visits_12", title: "12 Visits", test: (s) => s.visitCount >= 12 },
  {
    code: "loyalty_100",
    title: "100 Loyalty Points",
    test: (s) => s.loyaltyPoints >= 100,
  },
  {
    code: "gold_tier",
    title: "Gold Tier",
    test: (s) => /gold|platinum|vip/i.test(s.loyaltyTier),
  },
  {
    code: "first_catering",
    title: "First Catering",
    test: (s) => s.cateringCount >= 1,
  },
  {
    code: "positive_review",
    title: "Positive Review",
    test: (s) => s.positiveReviews >= 1,
  },
  {
    code: "birthday",
    title: "Birthday",
    test: (s) => s.birthdayInDays != null && s.birthdayInDays <= 0,
  },
  {
    code: "anniversary",
    title: "Anniversary",
    test: (s) => s.anniversaryInDays != null && s.anniversaryInDays <= 0,
  },
];

export async function syncMilestones(
  signals: JourneySignals,
): Promise<{ achieved: JourneyMilestone[]; newCodes: string[] }> {
  const before = await listMilestones(signals.customerId);
  const beforeCodes = new Set(before.map((m) => m.milestoneCode));
  const achieved: JourneyMilestone[] = [];
  const newCodes: string[] = [];

  for (const check of CHECKS) {
    if (!check.test(signals)) continue;
    const row = await insertMilestone({
      locationId: signals.locationId,
      customerId: signals.customerId,
      milestoneCode: check.code,
      title: check.title,
      metadata: { visitCount: signals.visitCount, loyaltyPoints: signals.loyaltyPoints },
    });
    if (row) {
      achieved.push(row);
      if (!beforeCodes.has(check.code)) {
        newCodes.push(check.code);
        await insertJourneyEvent({
          locationId: signals.locationId,
          customerId: signals.customerId,
          eventType: "milestone",
          title: `Milestone: ${check.title}`,
          summary: check.code,
          source: "journey",
          payload: { milestoneCode: check.code },
        });
      }
    }
  }

  return { achieved, newCodes };
}

export function upcomingMilestones(signals: JourneySignals): string[] {
  const upcoming: string[] = [];
  if (signals.visitCount < 5) upcoming.push("5 Visits");
  else if (signals.visitCount < 10) upcoming.push("10 Visits");
  else if (signals.visitCount < 12) upcoming.push("12 Visits");
  if (signals.loyaltyPoints < 100) upcoming.push("100 Loyalty Points");
  if (signals.cateringCount < 1) upcoming.push("First Catering");
  if (signals.birthdayInDays != null && signals.birthdayInDays > 0 && signals.birthdayInDays <= 14) {
    upcoming.push(`Birthday in ${signals.birthdayInDays} days`);
  }
  return upcoming;
}
