import { clamp } from "./client";
import { getCrmDashboard } from "../crm";
import { getJourneyAnalytics } from "../journey";
import { getReservationAnalytics } from "../reservations";
import { getWorkflowAnalytics, listApprovals } from "../automation";
import { saveHealth } from "./repository";
import type { HealthReport } from "./types";

export async function computeRestaurantHealth(locationId: string): Promise<HealthReport> {
  const [res, crm, wf, journey, approvals] = await Promise.all([
    getReservationAnalytics(locationId),
    getCrmDashboard(locationId),
    getWorkflowAnalytics(locationId),
    getJourneyAnalytics(locationId),
    listApprovals({ locationId, status: "pending" }),
  ]);

  const reservation = clamp(100 - res.cancellationRate - res.noShows * 2 + res.occupancyEstimate * 0.2);
  const workflow = clamp(wf.successRate);
  const satisfaction = clamp(70 + (crm.averageVisits > 2 ? 10 : 0) + (crm.vipCount > 0 ? 5 : 0));
  const journeyScore = clamp(journey.avgRelationshipScore);
  const retention = clamp(journey.retentionRate);
  const waitlist = clamp(100 - Math.min(50, res.waitlistConversion === 0 ? 10 : 0));
  const utilization = clamp(res.tableUtilization || res.occupancyEstimate);
  const approvalSla = clamp(100 - Math.min(40, approvals.length * 5));
  const aiConfidence = clamp(75 + (wf.executions > 0 ? 5 : 0));
  const knowledge = 80;

  const overallScore = clamp(
    reservation * 0.15 +
      workflow * 0.12 +
      satisfaction * 0.1 +
      journeyScore * 0.12 +
      retention * 0.12 +
      waitlist * 0.08 +
      utilization * 0.1 +
      approvalSla * 0.08 +
      aiConfidence * 0.07 +
      knowledge * 0.06,
  );

  const suggestions: string[] = [];
  if (res.cancellationRate > 15) suggestions.push("Review cancellation patterns and confirmation reminders.");
  if (wf.failureRate > 10) suggestions.push("Investigate workflow failures in the Dead Letter Queue.");
  if (journey.churnRiskCount > 5) suggestions.push("Launch win-back campaigns for at-risk journey customers.");
  if (utilization < 40) suggestions.push("Consider lunch promotions to improve table utilization.");
  if (approvals.length > 3) suggestions.push("Clear pending approvals to improve SLA score.");
  if (!suggestions.length) suggestions.push("Operations look healthy — maintain staffing for peak dinner hours.");

  const report: HealthReport = {
    overallScore,
    subscores: {
      reservation,
      workflow,
      satisfaction,
      journey: journeyScore,
      retention,
      waitlist,
      utilization,
      approvalSla,
      aiConfidence,
      knowledge,
    },
    suggestions,
    recordedAt: new Date().toISOString(),
  };

  void saveHealth({
    locationId,
    overallScore,
    subscores: report.subscores,
    suggestions,
  });

  return report;
}
