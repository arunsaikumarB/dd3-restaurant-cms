/**
 * Catering & Events analytics snapshot.
 */

import { listEvents, listLeads, listPackages, listQuotes } from "./repository";
import type { EventAnalyticsSnapshot } from "./types";

export async function getEventAnalytics(locationId: string): Promise<EventAnalyticsSnapshot> {
  const [leads, events, quotes, packages] = await Promise.all([
    listLeads({ locationId, limit: 500 }),
    listEvents({ locationId, limit: 500 }),
    listQuotes(undefined, locationId),
    listPackages(locationId, false),
  ]);

  const openLeads = leads.filter((l) =>
    !["completed", "cancelled", "lost"].includes(l.status),
  ).length;
  const confirmed = leads.filter((l) =>
    ["confirmed", "completed"].includes(l.status),
  ).length;
  const conversionRate = leads.length ? confirmed / leads.length : 0;
  const lostOpportunities = leads.filter((l) => l.status === "lost" || l.status === "cancelled").length;

  const sized = events.filter((e) => e.guestCount != null && e.guestCount > 0);
  const avgEventSize = sized.length
    ? sized.reduce((s, e) => s + (e.guestCount ?? 0), 0) / sized.length
    : 0;

  const accepted = quotes.filter((q) =>
    ["accepted", "approved", "customer_approved"].includes(q.approvalStatus),
  );
  const avgRevenue = accepted.length
    ? accepted.reduce((s, q) => s + q.grandTotal, 0) / accepted.length
    : quotes.length
      ? quotes.reduce((s, q) => s + q.grandTotal, 0) / quotes.length
      : 0;

  const quoteAcceptanceRate = quotes.length ? accepted.length / quotes.length : 0;

  const pkgCounts = new Map<string, number>();
  for (const e of events) {
    if (!e.packageId) continue;
    pkgCounts.set(e.packageId, (pkgCounts.get(e.packageId) ?? 0) + 1);
  }
  const popularPackages = packages
    .map((p) => ({ code: p.code, name: p.name, count: pkgCounts.get(p.id) ?? 0 }))
    .filter((p) => p.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const sourceMap = new Map<string, number>();
  for (const l of leads) {
    sourceMap.set(l.source, (sourceMap.get(l.source) ?? 0) + 1);
  }
  const leadSources = [...sourceMap.entries()].map(([source, count]) => ({ source, count }));

  const today = new Date().toISOString().slice(0, 10);
  const upcomingEvents = events.filter(
    (e) => e.eventDate && e.eventDate >= today && e.status !== "cancelled",
  ).length;

  const forecastQuotes = quotes.filter((q) =>
    ["draft", "sent", "pending_manager", "pending_owner", "pending_customer"].includes(
      q.approvalStatus,
    ),
  );
  const revenueForecast =
    accepted.reduce((s, q) => s + q.grandTotal, 0) +
    forecastQuotes.reduce((s, q) => s + q.grandTotal * 0.45, 0);

  const stageMap = new Map<string, number>();
  for (const e of events) {
    if (e.status === "cancelled") continue;
    stageMap.set(e.workflowStage, (stageMap.get(e.workflowStage) ?? 0) + 1);
  }
  const byStage = [...stageMap.entries()].map(([stage, count]) => ({ stage, count }));

  return {
    openLeads,
    conversionRate: Math.round(conversionRate * 1000) / 10,
    avgEventSize: Math.round(avgEventSize * 10) / 10,
    avgRevenue: Math.round(avgRevenue * 100) / 100,
    popularPackages,
    leadSources,
    quoteAcceptanceRate: Math.round(quoteAcceptanceRate * 1000) / 10,
    lostOpportunities,
    upcomingEvents,
    revenueForecast: Math.round(revenueForecast * 100) / 100,
    byStage,
  };
}
