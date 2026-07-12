/**
 * Event workflow — visual progress across the catering lifecycle.
 */

import { updateEvent, updateLead, insertApproval } from "./repository";
import type { EventLeadStatus, EventRecord, EventWorkflowStage } from "./types";
import { WORKFLOW_STAGES } from "./types";

export function progressForStage(stage: EventWorkflowStage): number {
  const idx = WORKFLOW_STAGES.indexOf(stage);
  if (idx < 0) return 0;
  return Math.round((idx / (WORKFLOW_STAGES.length - 1)) * 100);
}

export function nextStage(current: EventWorkflowStage): EventWorkflowStage | null {
  const idx = WORKFLOW_STAGES.indexOf(current);
  if (idx < 0 || idx >= WORKFLOW_STAGES.length - 1) return null;
  return WORKFLOW_STAGES[idx + 1]!;
}

const LEAD_STATUS_BY_STAGE: Partial<Record<EventWorkflowStage, EventLeadStatus>> = {
  inquiry: "new",
  qualification: "qualified",
  proposal: "proposal_sent",
  customer_review: "proposal_sent",
  negotiation: "negotiation",
  approval: "negotiation",
  deposit_pending: "negotiation",
  deposit_received: "confirmed",
  confirmed: "confirmed",
  preparation: "confirmed",
  execution: "confirmed",
  completed: "completed",
  feedback: "completed",
};

export async function advanceWorkflow(
  event: EventRecord,
  toStage?: EventWorkflowStage,
  opts?: { actor?: string; comment?: string; quoteId?: string },
): Promise<EventRecord | null> {
  const target = toStage ?? nextStage(event.workflowStage);
  if (!target) return event;

  const updated = await updateEvent(event.id, {
    workflowStage: target,
    progressPercent: progressForStage(target),
    status: target === "completed" || target === "feedback" ? "completed" : event.status,
  });

  if (event.leadId && LEAD_STATUS_BY_STAGE[target]) {
    await updateLead(event.leadId, { status: LEAD_STATUS_BY_STAGE[target]! });
  }

  if (
    target === "approval" ||
    target === "proposal" ||
    target === "customer_review" ||
    target === "confirmed"
  ) {
    await insertApproval({
      eventId: event.id,
      quoteId: opts?.quoteId ?? null,
      stage: target,
      status: target === "confirmed" ? "approved" : "pending",
      actor: opts?.actor ?? null,
      comment: opts?.comment ?? null,
    });
  }

  return updated;
}

export async function cancelEventWorkflow(
  event: EventRecord,
  reason?: string,
): Promise<EventRecord | null> {
  const updated = await updateEvent(event.id, {
    status: "cancelled",
    workflowStage: event.workflowStage,
    metadata: { ...event.metadata, cancelReason: reason ?? "cancelled" },
  });
  if (event.leadId) {
    await updateLead(event.leadId, { status: "cancelled" });
  }
  await insertApproval({
    eventId: event.id,
    stage: "cancelled",
    status: "rejected",
    comment: reason ?? "Event cancelled",
  });
  return updated;
}

export function workflowVisual(stage: EventWorkflowStage): {
  stages: Array<{ id: EventWorkflowStage; label: string; done: boolean; current: boolean }>;
  percent: number;
} {
  const idx = WORKFLOW_STAGES.indexOf(stage);
  return {
    percent: progressForStage(stage),
    stages: WORKFLOW_STAGES.map((s, i) => ({
      id: s,
      label: s.replace(/_/g, " "),
      done: i < idx,
      current: i === idx,
    })),
  };
}
