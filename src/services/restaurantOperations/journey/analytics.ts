import {
  listCampaigns,
  listCustomerJourneys,
  listMilestones,
} from "./repository";
import type { JourneyAnalyticsSnapshot } from "./types";

export async function getJourneyAnalytics(locationId: string): Promise<JourneyAnalyticsSnapshot> {
  const journeys = await listCustomerJourneys({ locationId, limit: 500 });
  const campaigns = await listCampaigns(locationId, 500);

  const totalJourneys = journeys.length;
  const active = journeys.filter((j) => !["inactive", "at_risk"].includes(j.stageCode)).length;
  const retentionRate = totalJourneys ? Math.round((active / totalJourneys) * 1000) / 10 : 0;

  const returning = journeys.filter((j) =>
    ["returning", "frequent", "vip", "loyal", "advocate", "reactivated"].includes(j.stageCode),
  ).length;
  const repeatVisitRate = totalJourneys ? Math.round((returning / totalJourneys) * 1000) / 10 : 0;

  const churnRiskCount = journeys.filter(
    (j) => j.scores.churnRisk >= 50 || ["inactive", "at_risk"].includes(j.stageCode),
  ).length;

  const vipGrowth = journeys.filter((j) => ["vip", "loyal", "advocate"].includes(j.stageCode)).length;

  const stageMap = new Map<string, number>();
  const segMap = new Map<string, number>();
  let relSum = 0;
  for (const j of journeys) {
    stageMap.set(j.stageCode, (stageMap.get(j.stageCode) ?? 0) + 1);
    relSum += j.scores.relationshipScore;
    for (const s of j.segmentCodes) segMap.set(s, (segMap.get(s) ?? 0) + 1);
  }

  let milestoneCompletions = 0;
  for (const j of journeys.slice(0, 100)) {
    const ms = await listMilestones(j.customerId);
    milestoneCompletions += ms.length;
  }

  return {
    totalJourneys,
    retentionRate,
    repeatVisitRate,
    churnRiskCount,
    vipGrowth,
    stageDistribution: [...stageMap.entries()].map(([stage, count]) => ({ stage, count })),
    milestoneCompletions,
    campaignTriggers: campaigns.length,
    avgRelationshipScore: totalJourneys ? Math.round((relSum / totalJourneys) * 10) / 10 : 0,
    topSegments: [...segMap.entries()]
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
  };
}
