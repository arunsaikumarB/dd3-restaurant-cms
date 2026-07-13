/**
 * Places outbound calls via existing Voice Gateway — no separate voice engine.
 * Live PSTN dial is represented as a phone-channel session with outbound metadata;
 * admin testing can simulate answer / voicemail / no-answer outcomes.
 */

import { nowIso } from "../client";
import { startVoiceSession } from "../gateway/gateway";
import { insertEvent } from "../repository";
import { maybeRecommendHandoff } from "../handoff";
import { runReservationEngine } from "../../restaurantOperations/reservations";
import { syncCrmAfterConversation } from "../../restaurantOperations/crm";
import { validateOutboundCompliance } from "./complianceEngine";
import { generateOutboundScript, outletDisplayName } from "./campaignBuilder";
import { generateVoicemail } from "./voicemailEngine";
import { scheduleRetry } from "./retryManager";
import {
  getOutboundCall,
  getTemplateByCallType,
  insertOutboundOutcome,
  updateOutboundCall,
} from "./repository";
import type { OutboundCall, OutboundCallStatus, RetryPolicy } from "./types";

export type DialSimulation =
  | "answered"
  | "voicemail"
  | "busy"
  | "rejected"
  | "no_answer";

export async function placeOutboundCall(input: {
  callId: string;
  simulate?: DialSimulation;
  hasMarketingConsent?: boolean;
}): Promise<{
  ok: boolean;
  call: OutboundCall | null;
  sessionId: string | null;
  message: string;
  scriptText: string | null;
}> {
  const call = await getOutboundCall(input.callId);
  if (!call) return { ok: false, call: null, sessionId: null, message: "Outbound call not found.", scriptText: null };

  const compliance = await validateOutboundCompliance({
    locationId: call.locationId,
    phone: call.customerPhone,
    hasMarketingConsent: input.hasMarketingConsent,
  });

  if (!compliance.allowed) {
    const blocked = await updateOutboundCall(call.id, {
      status: compliance.reason?.includes("opt-out") ? "opted_out" : "compliance_blocked",
      outcome: compliance.reason,
      endedAt: nowIso(),
    });
    await insertOutboundOutcome({
      outboundCallId: call.id,
      locationId: call.locationId,
      outcomeType: blocked?.status ?? "compliance_blocked",
      summary: compliance.reason,
    });
    return {
      ok: false,
      call: blocked,
      sessionId: null,
      message: compliance.reason ?? "Compliance blocked.",
      scriptText: call.scriptText,
    };
  }

  const template = await getTemplateByCallType(call.locationId, String(call.callType));
  const vars = (call.contextPayload.vars as Record<string, string>) ?? {};
  const scriptText =
    call.scriptText ||
    generateOutboundScript({
      name: call.customerName ?? "there",
      outlet: outletDisplayName(call.locationId),
      date: vars.date ?? (call.contextPayload.reservationDate as string | undefined),
      time: vars.time ?? (call.contextPayload.reservationTime as string | undefined),
      guests: vars.guests ?? (call.contextPayload.guests as number | undefined),
      confirmationCode: call.confirmationCode ?? undefined,
      offer: vars.offer,
      callType: String(call.callType),
      scriptHint: template?.scriptHint,
      language: (call.contextPayload.language as string) ?? "en",
    });

  const voicemailText =
    call.voicemailText ||
    generateVoicemail({
      name: call.customerName ?? "there",
      locationId: call.locationId,
      callType: String(call.callType),
      template,
      vars,
    });

  await updateOutboundCall(call.id, {
    status: "dialing",
    startedAt: nowIso(),
    scriptText,
    voicemailText,
    plannerGoal: `outbound_${call.callType}`,
  });

  const simulate = input.simulate ?? "answered";

  if (simulate === "busy" || simulate === "rejected" || simulate === "no_answer") {
    const status: OutboundCallStatus = simulate;
    const updated = await updateOutboundCall(call.id, {
      status,
      outcome: simulate,
      endedAt: nowIso(),
    });
    await insertOutboundOutcome({
      outboundCallId: call.id,
      locationId: call.locationId,
      outcomeType: simulate,
      summary: `Call ${simulate}`,
    });

    const policy = (call.contextPayload.retryPolicy as RetryPolicy) ?? {
      maxAttempts: call.maxAttempts,
      retryDelayMinutes: 60,
      respectBusinessHours: true,
    };
    if (updated) await scheduleRetry({ call: updated, policy, reason: simulate });

    return {
      ok: false,
      call: updated,
      sessionId: null,
      message: `Call ${simulate}. Retry scheduled if attempts remain.`,
      scriptText,
    };
  }

  if (simulate === "voicemail") {
    const updated = await updateOutboundCall(call.id, {
      status: "voicemail",
      outcome: "voicemail_left",
      endedAt: nowIso(),
      durationMs: 20_000,
    });
    await insertOutboundOutcome({
      outboundCallId: call.id,
      locationId: call.locationId,
      outcomeType: "voicemail",
      summary: voicemailText,
    });
    return {
      ok: true,
      call: updated,
      sessionId: null,
      message: "Voicemail left.",
      scriptText: voicemailText,
    };
  }

  // Answered — open Voice Gateway phone session for AI conversation
  let sessionId: string | null = null;
  try {
    const { session } = await startVoiceSession({
      locationId: call.locationId,
      channel: "phone",
      customerId: call.customerId,
      language: (call.contextPayload.language as string) ?? "en",
      metadata: {
        direction: "outbound",
        outboundCallId: call.id,
        callType: call.callType,
        callerPhone: call.customerPhone,
        phone: call.customerPhone,
        scriptText,
        confirmationCode: call.confirmationCode,
        reservationId: call.reservationId,
      },
    });
    sessionId = session.id;
    await insertEvent(session.id, "outbound_call_started", {
      outboundCallId: call.id,
      callType: call.callType,
      phone: call.customerPhone,
    });
  } catch (e) {
    const updated = await updateOutboundCall(call.id, {
      status: "failed",
      outcome: e instanceof Error ? e.message : "gateway_failed",
      endedAt: nowIso(),
    });
    return {
      ok: false,
      call: updated,
      sessionId: null,
      message: e instanceof Error ? e.message : "Voice Gateway failed.",
      scriptText,
    };
  }

  const updated = await updateOutboundCall(call.id, {
    sessionId,
    status: "answered",
    outcome: "in_progress",
    scriptText,
    voicemailText,
  });

  await insertOutboundOutcome({
    outboundCallId: call.id,
    locationId: call.locationId,
    sessionId,
    outcomeType: "answered",
    summary: scriptText.slice(0, 240),
  });

  return {
    ok: true,
    call: updated,
    sessionId,
    message: "Outbound call answered — Voice Gateway session started.",
    scriptText,
  };
}

/**
 * Apply guest response during outbound reservation reminder using Reservation Engine.
 */
export async function handleOutboundReservationIntent(input: {
  callId: string;
  locationId: string;
  message: string;
  phone?: string | null;
  confirmationCode?: string | null;
}): Promise<{ message: string; action: string }> {
  const lower = input.message.toLowerCase();
  let action: "confirm" | "modify" | "cancel" | "lookup" = "lookup";
  if (/\b(confirm|yes|still good|looks good)\b/.test(lower)) action = "confirm";
  else if (/\b(cancel|can't make|cannot make)\b/.test(lower)) action = "cancel";
  else if (/\b(modify|change|reschedule|move)\b/.test(lower)) action = "modify";
  else if (/\b(staff|manager|human|person)\b/.test(lower)) {
    const call = await getOutboundCall(input.callId);
    if (call?.sessionId) {
      await maybeRecommendHandoff({
        sessionId: call.sessionId,
        locationId: input.locationId,
        message: input.message,
        phone: input.phone,
        autoQueueOverride: true,
        reservationTransferRecommended: true,
        reservationTransferReason: "Outbound guest requested staff.",
      });
      await updateOutboundCall(input.callId, { status: "transferred", outcome: "handoff" });
    }
    return { message: "I'll connect you with our team and share your details.", action: "transfer" };
  }

  const result = await runReservationEngine({
    action,
    locationId: input.locationId,
    message: input.message,
    fields: {
      locationId: input.locationId,
      phone: input.phone ?? undefined,
      confirmationCode: input.confirmationCode ?? undefined,
      source: "voice_outbound",
    },
  });

  await insertOutboundOutcome({
    outboundCallId: input.callId,
    locationId: input.locationId,
    outcomeType: result.ok ? `reservation_${action}` : `reservation_${action}_failed`,
    reservationAction: action,
    confirmationCode: result.reservation?.confirmationCode ?? input.confirmationCode,
    summary: result.message,
    converted: result.ok && (action === "confirm" || action === "modify"),
  });

  if (result.ok && result.reservation) {
    try {
      await syncCrmAfterConversation({
        locationId: input.locationId,
        message: input.message,
        reply: result.message,
        phone: input.phone ?? result.reservation.phone,
        customerName: result.reservation.customerName,
      });
    } catch {
      /* CRM soft */
    }
  }

  return { message: result.message, action };
}

export async function completeOutboundCall(input: {
  callId: string;
  outcome: string;
  summary?: string;
  durationMs?: number;
}): Promise<OutboundCall | null> {
  const updated = await updateOutboundCall(input.callId, {
    status: "completed",
    outcome: input.outcome,
    endedAt: nowIso(),
    durationMs: input.durationMs ?? 0,
  });
  if (updated) {
    await insertOutboundOutcome({
      outboundCallId: input.callId,
      locationId: updated.locationId,
      sessionId: updated.sessionId,
      outcomeType: input.outcome,
      summary: input.summary ?? input.outcome,
      converted: /confirm|book|accept/i.test(input.outcome),
    });
  }
  return updated;
}
