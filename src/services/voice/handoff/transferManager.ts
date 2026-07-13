/**
 * Transfer Manager — queue, accept, reject, complete transfers with audit.
 */

import { nowIso } from "../client";
import { insertEvent, setCallStateSafe } from "./sessionHooks";
import {
  getTransfer,
  insertTransfer,
  insertTransferMetric,
  updateAgentStatus,
  updateEscalation,
  updateTransfer,
} from "./repository";
import { buildTransferContext } from "./liveAgentBridge";
import { canAcceptTransfer, findBestAgent, unavailableStaffMessage, warmTransferIntro, coldTransferHold } from "./routingEngine";
import { listLiveAgents } from "./repository";
import { notifyHandoffChannels } from "./notifications";
import { enqueueCallback } from "./callbackManager";
import { generateWrapUp } from "./wrapUpGenerator";
import { createTasksFromWrapUp } from "./callbackManager";
import type {
  TransferMode,
  VoiceEscalation,
  VoiceTransfer,
  TransferContextPayload,
} from "./types";

export async function queueTransfer(input: {
  escalation: VoiceEscalation;
  transferMode?: TransferMode;
  plannerGoal?: string | null;
  customerName?: string | null;
  phone?: string | null;
  language?: string | null;
  reflectionConfidence?: number | null;
}): Promise<{
  transfer: VoiceTransfer | null;
  agentFound: boolean;
  guestMessage: string;
  context: TransferContextPayload;
}> {
  const context = await buildTransferContext({
    sessionId: input.escalation.sessionId,
    locationId: input.escalation.locationId,
    plannerGoal: input.plannerGoal ?? input.escalation.plannerGoal,
    customerName: input.customerName,
    phone: input.phone,
    language: input.language,
    suggestedAction: input.escalation.suggestedAction,
    sentiment: input.escalation.customerSentiment,
    reflectionConfidence: input.reflectionConfidence ?? input.escalation.reflectionConfidence,
    knowledgeUsed: input.escalation.knowledgeUsed,
  });

  const mode = input.transferMode ?? input.escalation.transferMode;
  const agent = await findBestAgent(input.escalation.locationId, input.escalation.departmentCode);

  const transfer = await insertTransfer({
    escalationId: input.escalation.id,
    sessionId: input.escalation.sessionId,
    locationId: input.escalation.locationId,
    departmentCode: input.escalation.departmentCode,
    transferMode: mode,
    contextPayload: context,
    toAgentId: agent?.id ?? null,
    status: agent ? "ringing" : "waiting",
  });

  await updateEscalation(input.escalation.id, {
    status: "queued",
    conversationSummary: context.aiSummary ?? input.escalation.conversationSummary,
  });

  await insertEvent(input.escalation.sessionId, "handoff_transfer_queued", {
    transferId: transfer?.id,
    department: input.escalation.departmentCode,
    agentId: agent?.id ?? null,
    mode,
  });

  await setCallStateSafe(input.escalation.sessionId, "waiting");

  await notifyHandoffChannels({
    locationId: input.escalation.locationId,
    sessionId: input.escalation.sessionId,
    escalationId: input.escalation.id,
    transferId: transfer?.id ?? null,
    subject: `Transfer waiting · ${input.escalation.departmentCode}`,
    body: `${context.customerName ?? "Guest"} · ${input.escalation.reason}`,
    payload: { priority: input.escalation.priority, scenario: input.escalation.scenario },
  });

  if (!transfer) {
    return {
      transfer: null,
      agentFound: false,
      guestMessage: unavailableStaffMessage(),
      context,
    };
  }

  if (!agent) {
    await insertTransferMetric({
      locationId: input.escalation.locationId,
      sessionId: input.escalation.sessionId,
      escalationId: input.escalation.id,
      transferId: transfer.id,
      metricType: "staff_unavailable",
      value: 1,
    });
    return {
      transfer,
      agentFound: false,
      guestMessage: unavailableStaffMessage(),
      context,
    };
  }

  const guestMessage =
    mode === "cold"
      ? coldTransferHold()
      : warmTransferIntro(agent.displayName, input.escalation.departmentCode);

  return { transfer, agentFound: true, guestMessage, context };
}

export async function acceptTransfer(input: {
  transferId: string;
  agentId: string;
  acceptedBy: string;
}): Promise<{ ok: boolean; transfer: VoiceTransfer | null; message: string }> {
  const transfer = await getTransfer(input.transferId);
  if (!transfer) return { ok: false, transfer: null, message: "Transfer not found." };
  if (transfer.status !== "waiting" && transfer.status !== "ringing") {
    return { ok: false, transfer, message: `Transfer is already ${transfer.status}.` };
  }

  const agents = await listLiveAgents(transfer.locationId);
  const agent = agents.find((a) => a.id === input.agentId);
  if (!agent) return { ok: false, transfer, message: "Agent not found." };
  if (!canAcceptTransfer(agent, transfer.departmentCode) && agent.status === "available") {
    // still allow manager/super_admin override if they force-accept while busy? stick to canAccept
  }
  if (agent.role !== "super_admin" && agent.role !== "manager" && !canAcceptTransfer(agent, transfer.departmentCode)) {
    return { ok: false, transfer, message: "Not authorized to accept this department transfer." };
  }

  const waitMs = Math.max(0, Date.now() - new Date(transfer.queuedAt).getTime());
  const audit = [
    ...transfer.audit,
    { at: nowIso(), event: "accepted", by: input.acceptedBy, agentId: input.agentId },
  ];

  const updated = await updateTransfer(input.transferId, {
    status: "accepted",
    toAgentId: input.agentId,
    acceptedBy: input.acceptedBy,
    acceptedAt: nowIso(),
    waitMs,
    audit,
  });

  await updateEscalation(transfer.escalationId, { status: "accepted" });
  await updateAgentStatus(input.agentId, "busy", agent.activeCalls + 1);
  await setCallStateSafe(transfer.sessionId, "escalation");
  await insertEvent(transfer.sessionId, "handoff_transfer_accepted", {
    transferId: transfer.id,
    agentId: input.agentId,
    waitMs,
  });
  await insertTransferMetric({
    locationId: transfer.locationId,
    sessionId: transfer.sessionId,
    escalationId: transfer.escalationId,
    transferId: transfer.id,
    metricType: "wait_ms",
    value: waitMs,
  });
  await insertTransferMetric({
    locationId: transfer.locationId,
    sessionId: transfer.sessionId,
    transferId: transfer.id,
    metricType: "transfer_accepted",
    value: 1,
  });

  return { ok: true, transfer: updated, message: "Transfer accepted." };
}

export async function rejectTransfer(input: {
  transferId: string;
  reason?: string;
}): Promise<VoiceTransfer | null> {
  const transfer = await getTransfer(input.transferId);
  if (!transfer) return null;
  const audit = [
    ...transfer.audit,
    { at: nowIso(), event: "rejected", reason: input.reason ?? "declined" },
  ];
  const updated = await updateTransfer(input.transferId, { status: "rejected", audit });
  await insertEvent(transfer.sessionId, "handoff_transfer_rejected", {
    transferId: transfer.id,
    reason: input.reason,
  });
  return updated;
}

export async function completeTransfer(input: {
  transferId: string;
  outcome: string;
  agentNotes?: string | null;
  agentId?: string | null;
}): Promise<{ transfer: VoiceTransfer | null; wrapUp: Awaited<ReturnType<typeof generateWrapUp>> }> {
  const transfer = await getTransfer(input.transferId);
  if (!transfer) return { transfer: null, wrapUp: generateWrapUp({ outcome: "failed", context: {} }) };

  const handleMs = transfer.acceptedAt
    ? Math.max(0, Date.now() - new Date(transfer.acceptedAt).getTime())
    : 0;

  const audit = [
    ...transfer.audit,
    { at: nowIso(), event: "completed", outcome: input.outcome, notes: input.agentNotes },
  ];

  const updated = await updateTransfer(input.transferId, {
    status: "completed",
    completedAt: nowIso(),
    audit,
  });

  await updateEscalation(transfer.escalationId, {
    status: "completed",
    resolvedAt: nowIso(),
  });

  if (input.agentId) {
    const agents = await listLiveAgents(transfer.locationId);
    const agent = agents.find((a) => a.id === input.agentId);
    if (agent) {
      await updateAgentStatus(input.agentId, "available", Math.max(0, agent.activeCalls - 1));
    }
  }

  const wrapUp = generateWrapUp({
    outcome: input.outcome,
    context: transfer.contextPayload,
    agentNotes: input.agentNotes,
    reservationStatus: transfer.contextPayload.reservationStatus,
    sentiment: transfer.contextPayload.sentiment,
  });

  await createTasksFromWrapUp({
    locationId: transfer.locationId,
    sessionId: transfer.sessionId,
    escalationId: transfer.escalationId,
    transferId: transfer.id,
    wrapUp,
    context: transfer.contextPayload,
  });

  await insertTransferMetric({
    locationId: transfer.locationId,
    sessionId: transfer.sessionId,
    transferId: transfer.id,
    metricType: "handle_ms",
    value: handleMs,
  });
  await insertTransferMetric({
    locationId: transfer.locationId,
    sessionId: transfer.sessionId,
    transferId: transfer.id,
    metricType: "transfer_completed",
    value: 1,
  });

  await insertEvent(transfer.sessionId, "handoff_transfer_completed", {
    transferId: transfer.id,
    outcome: input.outcome,
  });

  await setCallStateSafe(transfer.sessionId, "listening");

  return { transfer: updated, wrapUp };
}

export async function missTransferAndCallback(input: {
  transferId: string;
}): Promise<{ transfer: VoiceTransfer | null; callbackId: string | null }> {
  const transfer = await getTransfer(input.transferId);
  if (!transfer) return { transfer: null, callbackId: null };

  const updated = await updateTransfer(input.transferId, {
    status: "missed",
    audit: [...transfer.audit, { at: nowIso(), event: "missed" }],
  });

  await insertTransferMetric({
    locationId: transfer.locationId,
    transferId: transfer.id,
    metricType: "transfer_missed",
    value: 1,
  });

  const cb = await enqueueCallback({
    locationId: transfer.locationId,
    sessionId: transfer.sessionId,
    escalationId: transfer.escalationId,
    customerName: transfer.contextPayload.customerName ?? null,
    customerPhone: transfer.contextPayload.phone ?? null,
    reason: "Missed live transfer — callback requested",
    departmentCode: transfer.departmentCode,
    priority: 3,
  });

  await updateEscalation(transfer.escalationId, { status: "callback" });

  return { transfer: updated, callbackId: cb?.id ?? null };
}
