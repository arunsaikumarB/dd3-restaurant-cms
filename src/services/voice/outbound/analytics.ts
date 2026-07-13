import {
  listOptOuts,
  listOutboundCalls,
  listOutboundOutcomes,
  listRetries,
} from "./repository";
import type { OutboundAnalyticsSnapshot } from "./types";

export async function getOutboundAnalytics(locationId: string): Promise<OutboundAnalyticsSnapshot> {
  const [calls, outcomes, retries, optOuts] = await Promise.all([
    listOutboundCalls(locationId, 300),
    listOutboundOutcomes(locationId, 300),
    listRetries(locationId, 100),
    listOptOuts(locationId, 100),
  ]);

  const placed = calls.filter((c) =>
    !["queued", "compliance_blocked", "opted_out"].includes(c.status),
  ).length;
  const answered = calls.filter((c) =>
    ["answered", "completed", "transferred"].includes(c.status),
  ).length;
  const voicemails = calls.filter((c) => c.status === "voicemail").length;
  const durations = calls.filter((c) => c.durationMs > 0).map((c) => c.durationMs);

  const outcomeRows = outcomes as Array<Record<string, unknown>>;
  const confirmations = outcomeRows.filter((o) =>
    String(o.reservation_action ?? o.outcome_type ?? "").includes("confirm"),
  ).length;
  const modifications = outcomeRows.filter((o) =>
    String(o.reservation_action ?? "").includes("modify"),
  ).length;
  const cancellations = outcomeRows.filter((o) =>
    String(o.reservation_action ?? "").includes("cancel"),
  ).length;
  const conversions = outcomeRows.filter((o) => o.converted === true).length;

  return {
    callsPlaced: placed || calls.length,
    callsAnswered: answered,
    answerRate: placed ? answered / placed : 0,
    confirmations,
    modifications,
    cancellations,
    conversions,
    voicemails,
    retries: retries.length,
    optOuts: optOuts.length,
    averageDurationMs: durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0,
    campaignSuccessRate: placed ? (answered + conversions) / (placed * 2) : 0,
  };
}
