/**
 * Real-time event stream — aggregates recent domain activity from existing modules.
 * Poll-based (10–15s); does not own event producers.
 */

import {
  getRecentDomainEvents,
  listApprovals,
  listInstances,
  listTasks,
} from "../automation";
import { listReservationsForDate } from "../reservations";
import { listCustomerJourneys } from "../journey";
import { listEvents as listCateringEvents } from "../events";
import { todayIso } from "./client";
import type { RealtimeEvent } from "./types";

export async function buildRealtimeFeed(locationId: string, limit = 40): Promise<RealtimeEvent[]> {
  const today = todayIso();
  const events: RealtimeEvent[] = [];

  try {
    const domain = await getRecentDomainEvents({ locationId, limit });
    for (const e of domain) {
      events.push({
        id: `domain-${e.id}`,
        at: e.createdAt,
        type: String(e.eventType),
        title: `${e.eventType}${e.entityId ? ` · ${e.entityId.slice(0, 8)}` : ""}`,
        source: e.source,
      });
    }
  } catch {
    /* optional when bus empty */
  }

  const [reservations, instances, approvals, tasks, catering, journeys] = await Promise.all([
    listReservationsForDate(locationId, today),
    listInstances({ locationId, limit: 20 }),
    listApprovals({ locationId }),
    listTasks({ locationId, limit: 20 }),
    listCateringEvents({ locationId, from: today, limit: 20 }),
    listCustomerJourneys({ locationId, limit: 20 }),
  ]);

  for (const r of reservations) {
    events.push({
      id: `res-${r.id}`,
      at: r.createdAt,
      type: r.status === "confirmed" || r.status === "completed" ? "Customer Checked In" : "Reservation Created",
      title: `${r.customerName} · ${r.time} · ${r.status}`,
      source: "reservations",
    });
  }

  for (const i of instances) {
    events.push({
      id: `wf-${i.id}`,
      at: i.startedAt,
      type: i.status === "completed" ? "Workflow Completed" : "Workflow Started",
      title: `Instance ${i.id.slice(0, 8)} · ${i.status}`,
      source: "workflow",
    });
  }

  for (const a of approvals) {
    events.push({
      id: `appr-${a.id}`,
      at: a.createdAt,
      type: a.status === "approved" || a.status === "rejected" ? "Approval Completed" : "Approval Pending",
      title: a.title,
      source: "workflow",
    });
  }

  for (const t of tasks) {
    if (t.status === "done" || t.status === "completed") {
      events.push({
        id: `task-${t.id}`,
        at: t.completedAt ?? t.createdAt,
        type: "Task Completed",
        title: t.title,
        source: "workflow",
      });
    }
  }

  for (const e of catering) {
    events.push({
      id: `evt-${e.id}`,
      at: e.updatedAt || e.createdAt,
      type: e.workflowStage === "qualification" ? "Lead Qualified" : "Event Progress",
      title: `${e.title} · ${e.workflowStage}`,
      source: "catering",
    });
  }

  for (const j of journeys) {
    events.push({
      id: `jour-${j.id}`,
      at: j.updatedAt || j.stageChangedAt,
      type: "Journey Updated",
      title: `Stage ${j.stageCode} · score ${j.scores.relationshipScore}`,
      source: "journey",
    });
  }

  return events
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);
}
