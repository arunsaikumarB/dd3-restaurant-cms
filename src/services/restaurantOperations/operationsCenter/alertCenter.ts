import { getCrmDashboard } from "../crm";
import { getEventAnalytics, listEvents } from "../events";
import { listCustomerJourneys } from "../journey";
import { getReservationAnalytics, listReservationsForDate, listWaitlist } from "../reservations";
import { getWorkflowAnalytics, listApprovals, listDeadLetters } from "../automation";
import { todayIso } from "./client";
import { insertAlert, listAlerts, updateAlert } from "./repository";
import type { OpsAlert } from "./types";

export async function syncOperationalAlerts(locationId: string): Promise<OpsAlert[]> {
  const existing = await listAlerts({ locationId, status: "open", limit: 50 });
  if (existing.length > 0) return existing;

  const [res, crm, events, wf, approvals, dead, reservations, waitlist, journeys] =
    await Promise.all([
      getReservationAnalytics(locationId),
      getCrmDashboard(locationId),
      getEventAnalytics(locationId),
      getWorkflowAnalytics(locationId),
      listApprovals({ locationId, status: "pending" }),
      listDeadLetters({ locationId, status: "open" }),
      listReservationsForDate(locationId, todayIso()),
      listWaitlist(locationId),
      listCustomerJourneys({ locationId, limit: 50 }),
    ]);

  const created: OpsAlert[] = [];
  const push = async (
    severity: string,
    title: string,
    body: string,
    category: string,
    sourceModule: string,
  ) => {
    const row = await insertAlert({
      locationId,
      severity,
      title,
      body,
      category,
      sourceModule,
    });
    if (row) created.push(row);
  };

  if (crm.vipCount > 0) {
    await push("high", "VIP arriving", `${crm.vipCount} VIP profiles in CRM — review seating.`, "customers", "crm");
  }
  if (dead.length > 0) {
    await push("critical", "Workflow failure", `${dead.length} dead-letter item(s).`, "workflow", "workflow");
  }
  if (approvals.length > 0) {
    await push("high", "Approval pending", `${approvals.length} approval(s) waiting.`, "approvals", "workflow");
  }
  const large = reservations.filter((r) => (r.guests ?? 0) >= 8);
  if (large.length) {
    await push("medium", "Large reservation", `${large.length} party(ies) of 8+ today.`, "reservations", "reservations");
  }
  if (res.noShows >= 2) {
    await push("high", "No-show spike", `${res.noShows} no-shows in recent window.`, "reservations", "reservations");
  }
  const unavailable = waitlist.length > 5;
  if (unavailable) {
    await push("medium", "Table pressure / waitlist", `${waitlist.length} guests waiting.`, "floor", "reservations");
  }
  const overdue = (await listEvents({ locationId, limit: 30 })).filter(
    (e) => e.eventDate && e.eventDate < todayIso() && !["completed", "cancelled"].includes(e.status),
  );
  if (overdue.length) {
    await push("high", "Event overdue", `${overdue.length} catering event(s) past date still open.`, "catering", "catering");
  }
  if (wf.failureRate > 10) {
    await push("critical", "Escalation pending", `Workflow failure rate ${wf.failureRate}%.`, "workflow", "workflow");
  }
  const atRisk = journeys.filter((j) => j.stageCode === "at_risk").length;
  if (atRisk > 0) {
    await push("medium", "Churn risk customers", `${atRisk} guests in at-risk journey stage.`, "journey", "journey");
  }
  void events;
  return created.length ? created : listAlerts({ locationId, limit: 50 });
}

export async function acknowledgeAlert(id: string): Promise<OpsAlert | null> {
  return updateAlert(id, { status: "acknowledged" });
}

export async function assignAlert(id: string, assignee: string): Promise<OpsAlert | null> {
  return updateAlert(id, { status: "assigned", assignedTo: assignee });
}

export async function resolveAlert(id: string): Promise<OpsAlert | null> {
  return updateAlert(id, { status: "resolved" });
}

export async function getOpenAlerts(locationId: string): Promise<OpsAlert[]> {
  return listAlerts({ locationId, status: "open" });
}
