/**
 * Approval engine — approve / reject / escalate / request changes.
 */

import { insertApproval, listApprovals, resolveApproval, updateInstance } from "./repository";
import type { WorkflowApproval } from "./types";

export async function requestApproval(input: {
  instanceId?: string | null;
  locationId?: string | null;
  title: string;
  stage?: string;
  timeoutMinutes?: number;
}): Promise<WorkflowApproval | null> {
  const timeoutAt = input.timeoutMinutes
    ? new Date(Date.now() + input.timeoutMinutes * 60_000).toISOString()
    : null;
  const approval = await insertApproval({
    instanceId: input.instanceId ?? null,
    locationId: input.locationId ?? null,
    title: input.title,
    stage: input.stage ?? "manager",
    timeoutAt,
  });
  if (input.instanceId) {
    await updateInstance(input.instanceId, { status: "waiting_approval" });
  }
  return approval;
}

export async function decideApproval(input: {
  approvalId: string;
  decision: "approved" | "rejected" | "changes_requested" | "escalated";
  actor?: string;
  comment?: string;
}): Promise<WorkflowApproval | null> {
  return resolveApproval(input.approvalId, input.decision, input.actor, input.comment);
}

export async function getPendingApprovals(locationId?: string): Promise<WorkflowApproval[]> {
  return listApprovals({ locationId, status: "pending" });
}

export async function listAllApprovals(locationId?: string): Promise<WorkflowApproval[]> {
  return listApprovals({ locationId });
}
