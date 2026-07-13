/* eslint-disable @typescript-eslint/no-explicit-any */
import { voiceTable, nowIso } from "../client";
import type { CollectedReservation, VoiceReservationCall, VoiceReservationStage, VoiceReservationWorkflow } from "./types";

function mapCall(r: any): VoiceReservationCall {
  return {
    id: r.id,
    sessionId: r.session_id,
    locationId: r.location_id,
    conversationId: r.conversation_id ?? null,
    workflow: r.workflow ?? "create",
    stage: r.stage ?? "collecting",
    collected: (r.collected as CollectedReservation) ?? { locationId: r.location_id },
    pendingConfirmation: Boolean(r.pending_confirmation),
    reservationId: r.reservation_id ?? null,
    confirmationCode: r.confirmation_code ?? null,
    outcome: r.outcome ?? null,
    transferRecommended: Boolean(r.transfer_recommended),
    transferReason: r.transfer_reason ?? null,
    startedAt: r.started_at,
    completedAt: r.completed_at ?? null,
  };
}

export async function insertReservationCall(input: {
  sessionId: string;
  locationId: string;
  conversationId?: string | null;
  workflow: VoiceReservationWorkflow;
  collected?: CollectedReservation;
}): Promise<VoiceReservationCall | null> {
  const t = voiceTable("voice_reservation_calls");
  if (!t) return null;
  const { data, error } = await t
    .insert({
      session_id: input.sessionId,
      location_id: input.locationId,
      conversation_id: input.conversationId ?? null,
      workflow: input.workflow,
      stage: "collecting",
      collected: input.collected ?? { locationId: input.locationId },
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return mapCall(data);
}

export async function getActiveReservationCall(sessionId: string): Promise<VoiceReservationCall | null> {
  const t = voiceTable("voice_reservation_calls");
  if (!t) return null;
  const { data } = await t
    .select("*")
    .eq("session_id", sessionId)
    .is("completed_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? mapCall(data) : null;
}

export async function updateReservationCall(
  id: string,
  patch: Partial<{
    stage: VoiceReservationStage;
    workflow: VoiceReservationWorkflow;
    collected: CollectedReservation;
    pendingConfirmation: boolean;
    reservationId: string | null;
    confirmationCode: string | null;
    outcome: string | null;
    transferRecommended: boolean;
    transferReason: string | null;
    completedAt: string | null;
    locationId: string;
  }>,
): Promise<VoiceReservationCall | null> {
  const t = voiceTable("voice_reservation_calls");
  if (!t) return null;
  const body: Record<string, unknown> = { updated_at: nowIso() };
  if (patch.stage !== undefined) body.stage = patch.stage;
  if (patch.workflow !== undefined) body.workflow = patch.workflow;
  if (patch.collected !== undefined) body.collected = patch.collected;
  if (patch.pendingConfirmation !== undefined) body.pending_confirmation = patch.pendingConfirmation;
  if (patch.reservationId !== undefined) body.reservation_id = patch.reservationId;
  if (patch.confirmationCode !== undefined) body.confirmation_code = patch.confirmationCode;
  if (patch.outcome !== undefined) body.outcome = patch.outcome;
  if (patch.transferRecommended !== undefined) body.transfer_recommended = patch.transferRecommended;
  if (patch.transferReason !== undefined) body.transfer_reason = patch.transferReason;
  if (patch.completedAt !== undefined) body.completed_at = patch.completedAt;
  if (patch.locationId !== undefined) body.location_id = patch.locationId;
  const { data, error } = await t.update(body).eq("id", id).select("*").single();
  if (error || !data) return null;
  return mapCall(data);
}

export async function listReservationCalls(locationId: string, limit = 50): Promise<VoiceReservationCall[]> {
  const t = voiceTable("voice_reservation_calls");
  if (!t) return [];
  const { data } = await t
    .select("*")
    .eq("location_id", locationId)
    .order("started_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map(mapCall);
}

export async function insertReservationEvent(
  callId: string,
  sessionId: string,
  eventType: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  const t = voiceTable("voice_reservation_events");
  if (!t) return;
  await t.insert({ call_id: callId, session_id: sessionId, event_type: eventType, payload });
}

export async function listReservationEvents(callId: string) {
  const t = voiceTable("voice_reservation_events");
  if (!t) return [];
  const { data } = await t.select("*").eq("call_id", callId).order("created_at", { ascending: true });
  return data ?? [];
}

export async function insertReservationMetric(input: {
  locationId: string;
  sessionId?: string;
  callId?: string;
  workflow?: string;
  outcome?: string;
  turns?: number;
  durationMs?: number;
  success?: boolean;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const t = voiceTable("voice_reservation_metrics");
  if (!t) return;
  await t.insert({
    location_id: input.locationId,
    session_id: input.sessionId ?? null,
    call_id: input.callId ?? null,
    workflow: input.workflow ?? null,
    outcome: input.outcome ?? null,
    turns: input.turns ?? 0,
    duration_ms: input.durationMs ?? 0,
    success: input.success ?? false,
    metadata: input.metadata ?? {},
  });
}

export async function insertWaitlistEvent(input: {
  sessionId?: string;
  locationId: string;
  waitlistId?: string;
  guestName?: string;
  phone?: string;
  partySize?: number;
  eventType?: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const t = voiceTable("voice_waitlist_events");
  if (!t) return;
  await t.insert({
    session_id: input.sessionId ?? null,
    location_id: input.locationId,
    waitlist_id: input.waitlistId ?? null,
    guest_name: input.guestName ?? null,
    phone: input.phone ?? null,
    party_size: input.partySize ?? null,
    event_type: input.eventType ?? "joined",
    payload: input.payload ?? {},
  });
}

export async function insertCallOutcome(input: {
  sessionId: string;
  locationId: string;
  outcomeType: string;
  reservationId?: string | null;
  confirmationCode?: string | null;
  summary?: string;
  plannerGoal?: string | null;
  confidence?: number | null;
  escalationRecommendation?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const t = voiceTable("voice_call_outcomes");
  if (!t) return;
  await t.insert({
    session_id: input.sessionId,
    location_id: input.locationId,
    outcome_type: input.outcomeType,
    reservation_id: input.reservationId ?? null,
    confirmation_code: input.confirmationCode ?? null,
    summary: input.summary ?? null,
    planner_goal: input.plannerGoal ?? null,
    confidence: input.confidence ?? null,
    escalation_recommendation: input.escalationRecommendation ?? null,
    metadata: input.metadata ?? {},
  });
}

export async function listCallOutcomes(locationId: string, limit = 50) {
  const t = voiceTable("voice_call_outcomes");
  if (!t) return [];
  const { data } = await t
    .select("*")
    .eq("location_id", locationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getReservationAnalyticsSnapshot(locationId: string) {
  const calls = await listReservationCalls(locationId, 200);
  const completed = calls.filter((c) => c.stage === "completed").length;
  const waitlisted = calls.filter((c) => c.stage === "waitlisted").length;
  const cancelled = calls.filter((c) => c.stage === "cancelled" || c.workflow === "cancel").length;
  const transfer = calls.filter((c) => c.transferRecommended).length;
  return {
    totalCalls: calls.length,
    completed,
    waitlisted,
    cancelled,
    transferRecommended: transfer,
    active: calls.filter((c) => !c.completedAt).length,
  };
}
