/**
 * Human Handoff orchestrator — recommend / queue / continue AI until staff accepts.
 */

import { insertEvent } from "../repository";
import {
  buildEscalationSuggestedAction,
  evaluateEscalation,
} from "./escalationEngine";
import { buildTransferContext } from "./liveAgentBridge";
import { notifyHandoffChannels } from "./notifications";
import {
  getOpenEscalationForSession,
  insertEscalation,
  listEscalations,
  listLiveAgents,
  listTransfers,
  listWaitingTransfers,
  updateEscalation,
} from "./repository";
import { queueTransfer } from "./transferManager";
import type {
  HandoffAnalyticsSnapshot,
  HandoffDashboardSnapshot,
  VoiceEscalation,
} from "./types";

export type HandoffTurnResult = {
  handled: boolean;
  escalated: boolean;
  queued: boolean;
  assistantText: string;
  escalationId: string | null;
  transferId: string | null;
  transferRecommended: boolean;
  reason: string | null;
};

/**
 * Explicit guest request for staff / manager.
 * AI stays on the line — does not disconnect.
 */
export async function handleStaffTransferRequest(input: {
  sessionId: string;
  locationId: string;
  message: string;
  plannerGoal?: string | null;
  customerName?: string | null;
  phone?: string | null;
  language?: string | null;
  confidence?: number;
  misunderstandingCount?: number;
}): Promise<HandoffTurnResult> {
  const evaluation = await evaluateEscalation({
    locationId: input.locationId,
    message: input.message,
    confidence: input.confidence,
    misunderstandingCount: input.misunderstandingCount,
    customerRequestedStaff: true,
  });

  return recommendAndMaybeQueue({
    ...input,
    evaluation,
    forceQueue: true,
  });
}

/**
 * Soft recommendation from reservation agent or policy signals.
 */
export async function maybeRecommendHandoff(input: {
  sessionId: string;
  locationId: string;
  message: string;
  plannerGoal?: string | null;
  customerName?: string | null;
  phone?: string | null;
  language?: string | null;
  confidence?: number;
  misunderstandingCount?: number;
  isVip?: boolean;
  guests?: number;
  reservationTransferRecommended?: boolean;
  reservationTransferReason?: string | null;
  noKnowledgeMatch?: boolean;
  autoQueueOverride?: boolean;
}): Promise<HandoffTurnResult> {
  const evaluation = await evaluateEscalation({
    locationId: input.locationId,
    message: input.message,
    confidence: input.confidence,
    misunderstandingCount: input.misunderstandingCount,
    isVip: input.isVip,
    guests: input.guests,
    reservationTransferRecommended: input.reservationTransferRecommended,
    reservationTransferReason: input.reservationTransferReason,
    noKnowledgeMatch: input.noKnowledgeMatch,
  });

  if (!evaluation.shouldEscalate) {
    return {
      handled: false,
      escalated: false,
      queued: false,
      assistantText: "",
      escalationId: null,
      transferId: null,
      transferRecommended: false,
      reason: null,
    };
  }

  return recommendAndMaybeQueue({
    sessionId: input.sessionId,
    locationId: input.locationId,
    message: input.message,
    plannerGoal: input.plannerGoal,
    customerName: input.customerName,
    phone: input.phone,
    language: input.language,
    evaluation,
    forceQueue: input.autoQueueOverride ?? false,
  });
}

async function recommendAndMaybeQueue(input: {
  sessionId: string;
  locationId: string;
  message: string;
  plannerGoal?: string | null;
  customerName?: string | null;
  phone?: string | null;
  language?: string | null;
  evaluation: Awaited<ReturnType<typeof evaluateEscalation>>;
  forceQueue: boolean;
}): Promise<HandoffTurnResult> {
  const existing = await getOpenEscalationForSession(input.sessionId);
  if (
    existing &&
    (existing.status === "queued" ||
      existing.status === "transferring" ||
      existing.status === "accepted")
  ) {
    return {
      handled: true,
      escalated: true,
      queued: true,
      assistantText:
        "I've already notified our team and shared your details. I'm still here with you until someone joins.",
      escalationId: existing.id,
      transferId: null,
      transferRecommended: true,
      reason: existing.reason,
    };
  }

  const context = await buildTransferContext({
    sessionId: input.sessionId,
    locationId: input.locationId,
    plannerGoal: input.plannerGoal,
    customerName: input.customerName,
    phone: input.phone,
    language: input.language,
    suggestedAction: buildEscalationSuggestedAction(input.evaluation.scenario),
    sentiment: input.evaluation.sentiment,
  });

  const escalation =
    existing ??
    (await insertEscalation({
      sessionId: input.sessionId,
      locationId: input.locationId,
      reason: input.evaluation.reason,
      scenario: input.evaluation.scenario,
      priority: input.evaluation.priority,
      departmentCode: input.evaluation.departmentCode,
      status: "recommended",
      conversationSummary: context.aiSummary,
      plannerGoal: input.plannerGoal ?? context.plannerGoal,
      reservationStatus: context.reservationStatus,
      crmSnapshot: context.crmProfile ?? {},
      customerSentiment: input.evaluation.sentiment,
      knowledgeUsed: context.knowledgeUsed ?? [],
      suggestedAction: buildEscalationSuggestedAction(input.evaluation.scenario),
      transferMode: input.evaluation.transferMode,
      metadata: { message: input.message },
    }));

  if (!escalation) {
    return {
      handled: true,
      escalated: true,
      queued: false,
      assistantText:
        "I've noted that you'd like to speak with our team. I'm still here — how else can I help while we connect you?",
      escalationId: null,
      transferId: null,
      transferRecommended: true,
      reason: input.evaluation.reason,
    };
  }

  await insertEvent(input.sessionId, "handoff_escalation_recommended", {
    escalationId: escalation.id,
    scenario: escalation.scenario,
    priority: escalation.priority,
    department: escalation.departmentCode,
  });

  await notifyHandoffChannels({
    locationId: input.locationId,
    sessionId: input.sessionId,
    escalationId: escalation.id,
    subject: `Escalation · ${escalation.scenario}`,
    body: escalation.reason,
    payload: { priority: escalation.priority, status: "recommended" },
  });

  const shouldQueue = input.forceQueue || input.evaluation.autoQueue;
  if (!shouldQueue) {
    return {
      handled: true,
      escalated: true,
      queued: false,
      assistantText: `I can connect you with our ${escalation.departmentCode} team if you'd like — I've prepared a full summary so you won't need to repeat yourself. Shall I transfer you now, or continue helping?`,
      escalationId: escalation.id,
      transferId: null,
      transferRecommended: true,
      reason: escalation.reason,
    };
  }

  const queued = await queueTransfer({
    escalation,
    transferMode: escalation.transferMode,
    plannerGoal: input.plannerGoal,
    customerName: input.customerName ?? context.customerName,
    phone: input.phone ?? context.phone,
    language: input.language ?? context.language,
  });

  await updateEscalation(escalation.id, { status: queued.transfer ? "queued" : "recommended" });

  return {
    handled: true,
    escalated: true,
    queued: Boolean(queued.transfer),
    assistantText: queued.guestMessage,
    escalationId: escalation.id,
    transferId: queued.transfer?.id ?? null,
    transferRecommended: true,
    reason: escalation.reason,
  };
}

export async function getHandoffDashboard(locationId: string): Promise<HandoffDashboardSnapshot> {
  const [escalations, transfers, waiting, agents] = await Promise.all([
    listEscalations(locationId, 100),
    listTransfers(locationId, 100),
    listWaitingTransfers(locationId),
    listLiveAgents(locationId),
  ]);

  const openEsc = escalations.filter((e) =>
    ["recommended", "queued", "transferring", "accepted"].includes(e.status),
  );
  const completed = transfers.filter((t) => t.status === "completed");
  const waits = transfers.filter((t) => t.waitMs > 0).map((t) => t.waitMs);
  const avgWait = waits.length ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length) : 0;

  return {
    activeCalls: openEsc.length + waiting.length,
    aiHandling: escalations.filter((e) => e.status === "recommended").length,
    escalated: openEsc.length,
    waitingTransfers: waiting.length,
    transferred: transfers.filter((t) => t.status === "accepted").length,
    completed: completed.length,
    averageWaitMs: avgWait,
    agentsAvailable: agents.filter((a) => a.status === "available").length,
    agentsBusy: agents.filter((a) => a.status === "busy").length,
    agentsOffline: agents.filter((a) => a.status === "offline" || a.status === "away").length,
  };
}

export async function getHandoffAnalytics(locationId: string): Promise<HandoffAnalyticsSnapshot> {
  const [escalations, transfers] = await Promise.all([
    listEscalations(locationId, 200),
    listTransfers(locationId, 200),
  ]);
  const totalEsc = escalations.length || 1;
  const totalTr = transfers.length || 1;
  const accepted = transfers.filter((t) => t.status === "accepted" || t.status === "completed");
  const missed = transfers.filter((t) => t.status === "missed" || t.status === "rejected");
  const waits = transfers.map((t) => t.waitMs).filter((n) => n > 0);
  const handles = transfers
    .filter((t) => t.acceptedAt && t.completedAt)
    .map((t) => new Date(t.completedAt!).getTime() - new Date(t.acceptedAt!).getTime());

  const humanResolved = escalations.filter((e) => e.status === "completed").length;
  const recommendedOnly = escalations.filter((e) => e.status === "recommended").length;

  return {
    escalationRate: escalations.length,
    transferRate: transfers.length / totalEsc,
    averageHandleTimeMs: handles.length
      ? Math.round(handles.reduce((a, b) => a + b, 0) / handles.length)
      : 0,
    averageWaitMs: waits.length ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length) : 0,
    transferSuccess: accepted.length / totalTr,
    missedTransfers: missed.length,
    staffResponseMs: waits.length ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length) : 0,
    aiResolutionRate: recommendedOnly / totalEsc,
    humanResolutionRate: humanResolved / totalEsc,
    totalEscalations: escalations.length,
    totalTransfers: transfers.length,
  };
}

export type { VoiceEscalation };
