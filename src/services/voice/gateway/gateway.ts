/**
 * Voice Gateway — session management, heartbeat, reconnect, call state.
 * Does not own AI intelligence.
 */

import { newConversationId, nowIso } from "../client";
import {
  getSession,
  getVoiceSettings,
  insertEvent,
  insertSession,
  listSessions,
  updateSession,
} from "../repository";
import type { CallState, VoiceChannel, VoiceSession, VoiceSettings } from "../types";

export type StartVoiceSessionInput = {
  locationId: string;
  channel: VoiceChannel;
  customerId?: string | null;
  language?: string;
  conversationId?: string;
  metadata?: Record<string, unknown>;
};

export async function startVoiceSession(input: StartVoiceSessionInput): Promise<{
  session: VoiceSession;
  settings: VoiceSettings | null;
}> {
  const settings = await getVoiceSettings(input.locationId);
  if (settings && !settings.enabled) {
    throw new Error("Voice AI is disabled for this outlet");
  }
  if (input.channel === "web" && settings && !settings.channelWeb) {
    throw new Error("Web voice channel is disabled");
  }
  if (input.channel === "phone" && settings && !settings.channelPhone) {
    throw new Error("Phone voice channel is disabled");
  }

  const conversationId = input.conversationId || newConversationId(input.channel);
  const language =
    input.language ||
    (settings?.language === "auto" ? "en" : settings?.language) ||
    "en";

  const session = await insertSession({
    conversationId,
    locationId: input.locationId,
    channel: input.channel,
    customerId: input.customerId,
    language,
    metadata: input.metadata,
  });
  if (!session) throw new Error("Could not create voice session (database unavailable)");

  await insertEvent(session.id, "session_started", {
    channel: input.channel,
    conversationId,
  });
  await setCallState(session.id, "greeting");

  return { session: (await getSession(session.id))!, settings };
}

export async function setCallState(sessionId: string, callState: CallState): Promise<VoiceSession | null> {
  const updated = await updateSession(sessionId, { callState });
  await insertEvent(sessionId, "call_state", { callState });
  return updated;
}

export async function heartbeat(sessionId: string): Promise<VoiceSession | null> {
  const session = await getSession(sessionId);
  if (!session || session.endedAt) return session;
  const durationMs = Date.now() - new Date(session.startedAt).getTime();
  const settings = await getVoiceSettings(session.locationId);
  if (settings && durationMs > settings.maxCallLengthSec * 1000) {
    return endVoiceSession(sessionId, "max_call_length");
  }
  await insertEvent(sessionId, "heartbeat", { durationMs });
  return updateSession(sessionId, { durationMs });
}

export async function reconnectVoiceSession(sessionId: string): Promise<VoiceSession | null> {
  const session = await getSession(sessionId);
  if (!session) return null;
  if (session.endedAt) {
    await insertEvent(sessionId, "reconnect_failed", { reason: "session_ended" });
    return session;
  }
  await insertEvent(sessionId, "reconnected", {});
  return setCallState(sessionId, "listening");
}

export async function interruptSpeaking(sessionId: string): Promise<void> {
  await insertEvent(sessionId, "interrupted", {});
  await setCallState(sessionId, "listening");
}

export async function endVoiceSession(
  sessionId: string,
  reason: string = "completed",
): Promise<VoiceSession | null> {
  const session = await getSession(sessionId);
  if (!session) return null;
  const durationMs = Date.now() - new Date(session.startedAt).getTime();
  const ended = await updateSession(sessionId, {
    callState: reason === "dropped" || reason === "disconnected" ? "disconnected" : "completed",
    endedAt: nowIso(),
    disconnectReason: reason,
    durationMs,
  });
  await insertEvent(sessionId, "session_ended", { reason, durationMs });
  return ended;
}

export async function listVoiceSessions(locationId: string, limit = 50) {
  return listSessions({ locationId, limit });
}

export type TelephonyIngressEvent = {
  provider: string;
  callSid: string;
  from?: string;
  to?: string;
  locationId: string;
  event: "incoming" | "answered" | "hangup" | "dtmf";
  payload?: Record<string, unknown>;
};

/** Phone ingress adapter — creates/ends sessions; media streamed via provider webhooks later. */
export async function handleTelephonyEvent(evt: TelephonyIngressEvent): Promise<VoiceSession | null> {
  if (evt.event === "incoming" || evt.event === "answered") {
    const { session } = await startVoiceSession({
      locationId: evt.locationId,
      channel: "phone",
      metadata: { provider: evt.provider, callSid: evt.callSid, from: evt.from, to: evt.to },
    });
    return session;
  }
  if (evt.event === "hangup") {
    const sessions = await listSessions({ locationId: evt.locationId, limit: 20, channel: "phone" });
    const match = sessions.find((s) => !s.endedAt && s.metadata.callSid === evt.callSid);
    if (match) return endVoiceSession(match.id, "hangup");
  }
  return null;
}
