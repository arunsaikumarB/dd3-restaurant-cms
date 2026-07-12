/**
 * Report Center — generates ops reports from existing module analytics.
 * Formats: csv / pdf-text / excel-tsv. No duplicated domain logic.
 */

import { getCrmDashboard } from "../crm";
import { getEventAnalytics } from "../events";
import { getJourneyAnalytics } from "../journey";
import { getReservationAnalytics } from "../reservations";
import { getWorkflowAnalytics } from "../automation";
import { todayIso } from "./client";
import { insertReport, listReports } from "./repository";
import type { OpsReport } from "./types";

export type ReportPeriod = "daily" | "weekly" | "monthly" | "quarterly" | "annual";
export type ReportCategory =
  | "operations"
  | "reservations"
  | "crm"
  | "journey"
  | "workflow"
  | "catering"
  | "ai";
export type ReportFormat = "csv" | "pdf" | "excel";

function toCsv(rows: Array<Record<string, string | number>>): string {
  if (!rows.length) return "metric,value\n";
  const keys = Object.keys(rows[0]!);
  const lines = [keys.join(",")];
  for (const row of rows) {
    lines.push(keys.map((k) => JSON.stringify(row[k] ?? "")).join(","));
  }
  return lines.join("\n");
}

function wrapPdf(title: string, body: string): string {
  return `${title}\n${"=".repeat(title.length)}\nGenerated: ${new Date().toISOString()}\n\n${body}`;
}

export async function generateOpsReport(input: {
  locationId: string;
  period: ReportPeriod;
  category: ReportCategory;
  format?: ReportFormat;
  createdBy?: string;
}): Promise<OpsReport | null> {
  const format = input.format ?? "csv";
  const [res, crm, events, wf, journey] = await Promise.all([
    getReservationAnalytics(input.locationId),
    getCrmDashboard(input.locationId),
    getEventAnalytics(input.locationId),
    getWorkflowAnalytics(input.locationId),
    getJourneyAnalytics(input.locationId),
  ]);

  const buckets: Record<ReportCategory, Array<Record<string, string | number>>> = {
    operations: [
      { metric: "todays_reservations", value: res.todaysCount },
      { metric: "occupancy_estimate", value: res.occupancyEstimate },
      { metric: "table_utilization", value: res.tableUtilization },
      { metric: "workflow_success_rate", value: wf.successRate },
      { metric: "crm_total_customers", value: crm.totalCustomers },
      { metric: "journey_retention_rate", value: journey.retentionRate },
      { metric: "catering_open_leads", value: events.openLeads },
      { metric: "upcoming_events", value: events.upcomingEvents },
    ],
    reservations: [
      { metric: "todays_count", value: res.todaysCount },
      { metric: "upcoming_count", value: res.upcomingCount },
      { metric: "no_shows", value: res.noShows },
      { metric: "avg_party_size", value: res.avgPartySize },
      { metric: "cancellation_rate", value: res.cancellationRate },
      { metric: "occupancy_estimate", value: res.occupancyEstimate },
      { metric: "table_utilization", value: res.tableUtilization },
    ],
    crm: [
      { metric: "total_customers", value: crm.totalCustomers },
      { metric: "new_customers", value: crm.newCustomers },
      { metric: "returning_customers", value: crm.returningCustomers },
      { metric: "vip_count", value: crm.vipCount },
      { metric: "birthdays_today", value: crm.birthdaysToday },
      { metric: "inactive_customers", value: crm.inactiveCustomers },
      { metric: "average_visits", value: crm.averageVisits },
    ],
    journey: [
      { metric: "total_journeys", value: journey.totalJourneys },
      { metric: "retention_rate", value: journey.retentionRate },
      { metric: "repeat_visit_rate", value: journey.repeatVisitRate },
      { metric: "churn_risk_count", value: journey.churnRiskCount },
      { metric: "avg_relationship_score", value: journey.avgRelationshipScore },
      { metric: "campaign_triggers", value: journey.campaignTriggers },
    ],
    workflow: [
      { metric: "executions", value: wf.executions },
      { metric: "success_rate", value: wf.successRate },
      { metric: "failure_rate", value: wf.failureRate },
      { metric: "pending_tasks", value: wf.pendingTasks },
      { metric: "pending_approvals", value: wf.pendingApprovals },
      { metric: "dead_letters", value: wf.deadLetters },
    ],
    catering: [
      { metric: "open_leads", value: events.openLeads },
      { metric: "conversion_rate", value: events.conversionRate },
      { metric: "upcoming_events", value: events.upcomingEvents },
      { metric: "revenue_forecast", value: events.revenueForecast },
      { metric: "quote_acceptance_rate", value: events.quoteAcceptanceRate },
    ],
    ai: [
      { metric: "workflow_success_proxy", value: wf.successRate },
      { metric: "journey_avg_relationship", value: journey.avgRelationshipScore },
      { metric: "knowledge_coverage_proxy", value: 80 },
    ],
  };

  const rows = buckets[input.category] ?? buckets.operations;
  const csv = toCsv(rows);
  let content = csv;
  if (format === "pdf") {
    content = wrapPdf(
      `${input.category} ${input.period} report — ${input.locationId}`,
      rows.map((r) => `${r.metric}: ${r.value}`).join("\n"),
    );
  } else if (format === "excel") {
    content = csv.replace(/,/g, "\t");
  }

  const title = `${input.category} ${input.period} · ${todayIso()}`;
  return insertReport({
    locationId: input.locationId,
    reportType: input.period,
    category: input.category,
    title,
    format,
    content,
    createdBy: input.createdBy,
  });
}

export async function getOpsReports(locationId: string): Promise<OpsReport[]> {
  return listReports(locationId);
}

export function downloadReportBlob(report: OpsReport): { filename: string; mime: string; body: string } {
  const ext = report.format === "excel" ? "tsv" : report.format === "pdf" ? "txt" : "csv";
  const mime =
    report.format === "excel"
      ? "text/tab-separated-values"
      : report.format === "pdf"
        ? "text/plain"
        : "text/csv";
  return {
    filename: `${report.category}-${report.reportType}-${report.id.slice(0, 8)}.${ext}`,
    mime,
    body: report.content ?? "",
  };
}
