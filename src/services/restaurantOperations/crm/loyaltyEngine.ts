import { crmTable } from "./client";
import { addTimelineEvent, ensureLoyalty } from "./crmRepository";
import type { CrmLoyalty, LoyaltyTier } from "./types";

function tierForPoints(points: number): LoyaltyTier {
  if (points >= 1000) return "platinum";
  if (points >= 400) return "gold";
  return "silver";
}

export async function awardPoints(
  customerId: string,
  points: number,
  reason: string,
): Promise<CrmLoyalty> {
  const current = await ensureLoyalty(customerId);
  const nextPoints = Math.max(0, current.points + points);
  const tier = tierForPoints(nextPoints);
  const t = crmTable("crm_loyalty");
  if (t) {
    await t.upsert(
      {
        customer_id: customerId,
        points: nextPoints,
        tier,
        rewards: current.rewards,
        coupons: current.coupons,
        benefits: current.benefits,
        referral_points: current.referralPoints,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "customer_id" },
    );
  }
  if (tier !== current.tier) {
    await addTimelineEvent(customerId, "loyalty_change", `Tier → ${tier}`, reason);
  } else {
    await addTimelineEvent(customerId, "loyalty_change", `+${points} points`, reason);
  }
  return { ...current, points: nextPoints, tier };
}

export async function applyBirthdayReward(customerId: string, points = 50): Promise<void> {
  const loyalty = await ensureLoyalty(customerId);
  const coupons = [...(loyalty.coupons as unknown[]), { type: "birthday", points, at: new Date().toISOString() }];
  const t = crmTable("crm_loyalty");
  if (t) {
    await t.update({ coupons, updated_at: new Date().toISOString() }).eq("customer_id", customerId);
  }
  await awardPoints(customerId, points, "Birthday reward");
}

export async function applyAnniversaryReward(customerId: string, points = 75): Promise<void> {
  await awardPoints(customerId, points, "Anniversary reward");
}
