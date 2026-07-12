/* eslint-disable @typescript-eslint/no-explicit-any */
import { voiceTable, nowIso } from "./client";
import type {
  CallState,
  VoiceCallMetrics,
  VoiceChannel,
  VoiceEvent,
  VoiceRecording,
  VoiceSession,
  VoiceSettings,
  VoiceTranscript,
  LatencyBreakdown,
} from "./types";

function mapSettings(r: any): VoiceSettings {
  return {
    id: r.id,
    locationId: r.location_id,
    enabled: r.enabled !== false,
    channelWeb: r.channel_web !== false,
    channelPhone: Boolean(r.channel_phone),
    sttProvider: r.stt_provider ?? "browser",
    ttsProvider: r.tts_provider ?? "browser",
    voiceName: r.voice_name ?? "default",
    voiceGender: r.voice_gender ?? "neutral",
    voiceSpeed: Number(r.voice_speed ?? 1),
    voicePitch: Number(r.voice_pitch ?? 1),
    language: r.language ?? "en",
    autoDetectLanguage: r.auto_detect_language !== false,
    greeting: r.greeting ?? "Hi, this is Cheffy. How can I help?",
    silenceTimeoutMs: Number(r.silence_timeout_ms ?? 2500),
    maxCallLengthSec: Number(r.max_call_length_sec ?? 900),
    allowInterruptions: r.allow_interruptions !== false,
    recordingEnabled: Boolean(r.recording_enabled),
    recordingRetentionDays: Number(r.recording_retention_days ?? 30),
    recordingDisclaimer: r.recording_disclaimer ?? "",
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    updatedAt: r.updated_at,
  };
}

function mapSession(r: any): VoiceSession {
  return {
    id: r.id,
    conversationId: r.conversation_id,
    locationId: r.location_id,
    channel: r.channel ?? "web",
    customerId: r.customer_id ?? null,
    language: r.language ?? "en",
    callState: r.call_state ?? "idle",
    currentIntent: r.current_intent ?? null,
    plannerGoal: r.planner_goal ?? null,
    durationMs: Number(r.duration_ms ?? 0),
    startedAt: r.started_at,
    endedAt: r.ended_at ?? null,
    disconnectReason: r.disconnect_reason ?? null,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function getVoiceSettings(locationId: string): Promise<VoiceSettings | null> {
  const t = voiceTable("voice_settings");
  if (!t) return null;
  const { data } = await t.select("*").eq("location_id", locationId).maybeSingle();
  return data ? mapSettings(data) : null;
}

export async function upsertVoiceSettings(
  locationId: string,
  patch: Partial<Omit<VoiceSettings, "id" | "locationId" | "updatedAt">>,
): Promise<VoiceSettings | null> {
  const t = voiceTable("voice_settings");
  if (!t) return null;
  const existing = await getVoiceSettings(locationId);
  const body = {
    location_id: locationId,
    enabled: patch.enabled ?? existing?.enabled ?? false,
    channel_web: patch.channelWeb ?? existing?.channelWeb ?? true,
    channel_phone: patch.channelPhone ?? existing?.channelPhone ?? false,
    stt_provider: patch.sttProvider ?? existing?.sttProvider ?? "browser",
    tts_provider: patch.ttsProvider ?? existing?.ttsProvider ?? "browser",
    voice_name: patch.voiceName ?? existing?.voiceName ?? "default",
    voice_gender: patch.voiceGender ?? existing?.voiceGender ?? "neutral",
    voice_speed: patch.voiceSpeed ?? existing?.voiceSpeed ?? 1,
    voice_pitch: patch.voicePitch ?? existing?.voicePitch ?? 1,
    language: patch.language ?? existing?.language ?? "en",
    auto_detect_language: patch.autoDetectLanguage ?? existing?.autoDetectLanguage ?? true,
    greeting: patch.greeting ?? existing?.greeting ?? "Hi, this is Cheffy. How can I help?",
    silence_timeout_ms: patch.silenceTimeoutMs ?? existing?.silenceTimeoutMs ?? 2500,
    max_call_length_sec: patch.maxCallLengthSec ?? existing?.maxCallLengthSec ?? 900,
    allow_interruptions: patch.allowInterruptions ?? existing?.allowInterruptions ?? true,
    recording_enabled: patch.recordingEnabled ?? existing?.recordingEnabled ?? false,
    recording_retention_days: patch.recordingRetentionDays ?? existing?.recordingRetentionDays ?? 30,
    recording_disclaimer: patch.recordingDisclaimer ?? existing?.recordingDisclaimer ?? "",
    metadata: patch.metadata ?? existing?.metadata ?? {},
    updated_at: nowIso(),
  };
  const { data, error } = await t.upsert(body, { onConflict: "location_id" }).select("*").single();
  if (error || !data) return null;
  return mapSettings(data);
}

export async function insertSession(input: {
  conversationId: string;
  locationId: string;
  channel: VoiceChannel;
  customerId?: string | null;
  language?: string;
  metadata?: Record<string, unknown>;
}): Promise<VoiceSession | null> {
  const t = voiceTable("voice_sessions");
  if (!t) return null;
  const { data, error } = await t
    .insert({
      conversation_id: input.conversationId,
      location_id: input.locationId,
      channel: input.channel,
      customer_id: input.customerId ?? null,
      language: input.language ?? "en",
      call_state: "incoming",
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return mapSession(data);
}

export async function getSession(id: string): Promise<VoiceSession | null> {
  const t = voiceTable("voice_sessions");
  if (!t) return null;
  const { data } = await t.select("*").eq("id", id).maybeSingle();
  return data ? mapSession(data) : null;
}

export async function updateSession(
  id: string,
  patch: Partial<{
    callState: CallState;
    currentIntent: string | null;
    plannerGoal: string | null;
    language: string;
    durationMs: number;
    endedAt: string | null;
    disconnectReason: string | null;
    metadata: Record<string, unknown>;
    customerId: string | null;
  }>,
): Promise<VoiceSession | null> {
  const t = voiceTable("voice_sessions");
  if (!t) return null;
  const body: Record<string, unknown> = { updated_at: nowIso() };
  if (patch.callState !== undefined) body.call_state = patch.callState;
  if (patch.currentIntent !== undefined) body.current_intent = patch.currentIntent;
  if (patch.plannerGoal !== undefined) body.planner_goal = patch.plannerGoal;
  if (patch.language !== undefined) body.language = patch.language;
  if (patch.durationMs !== undefined) body.duration_ms = patch.durationMs;
  if (patch.endedAt !== undefined) body.ended_at = patch.endedAt;
  if (patch.disconnectReason !== undefined) body.disconnect_reason = patch.disconnectReason;
  if (patch.metadata !== undefined) body.metadata = patch.metadata;
  if (patch.customerId !== undefined) body.customer_id = patch.customerId;
  const { data, error } = await t.update(body).eq("id", id).select("*").single();
  if (error || !data) return null;
  return mapSession(data);
}

export async function listSessions(opts: {
  locationId: string;
  limit?: number;
  channel?: string;
}): Promise<VoiceSession[]> {
  const t = voiceTable("voice_sessions");
  if (!t) return [];
  let q = t.select("*").eq("location_id", opts.locationId).order("started_at", { ascending: false });
  if (opts.channel) q = q.eq("channel", opts.channel);
  const { data } = await q.limit(opts.limit ?? 50);
  return (data ?? []).map(mapSession);
}

export async function insertEvent(
  sessionId: string,
  eventType: string,
  payload: Record<string, unknown> = {},
): Promise<VoiceEvent | null> {
  const t = voiceTable("voice_events");
  if (!t) return null;
  const { data, error } = await t
    .insert({ session_id: sessionId, event_type: eventType, payload })
    .select("*")
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    sessionId: data.session_id,
    eventType: data.event_type,
    payload: (data.payload as Record<string, unknown>) ?? {},
    createdAt: data.created_at,
  };
}

export async function listEvents(sessionId: string, limit = 100): Promise<VoiceEvent[]> {
  const t = voiceTable("voice_events");
  if (!t) return [];
  const { data } = await t
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    sessionId: r.session_id,
    eventType: r.event_type,
    payload: (r.payload as Record<string, unknown>) ?? {},
    createdAt: r.created_at,
  }));
}

export async function insertTranscript(input: {
  sessionId: string;
  role: "user" | "assistant" | "system";
  text: string;
  isFinal?: boolean;
  language?: string | null;
  confidence?: number | null;
  sttProvider?: string | null;
}): Promise<VoiceTranscript | null> {
  const t = voiceTable("voice_transcripts");
  if (!t) return null;
  const { data, error } = await t
    .insert({
      session_id: input.sessionId,
      role: input.role,
      text: input.text,
      is_final: input.isFinal !== false,
      language: input.language ?? null,
      confidence: input.confidence ?? null,
      stt_provider: input.sttProvider ?? null,
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    sessionId: data.session_id,
    role: data.role,
    text: data.text,
    isFinal: data.is_final !== false,
    language: data.language ?? null,
    confidence: data.confidence != null ? Number(data.confidence) : null,
    sttProvider: data.stt_provider ?? null,
    createdAt: data.created_at,
  };
}

export async function listTranscripts(sessionId: string): Promise<VoiceTranscript[]> {
  const t = voiceTable("voice_transcripts");
  if (!t) return [];
  const { data } = await t.select("*").eq("session_id", sessionId).order("created_at", { ascending: true });
  return (data ?? []).map((r: any) => ({
    id: r.id,
    sessionId: r.session_id,
    role: r.role,
    text: r.text,
    isFinal: r.is_final !== false,
    language: r.language ?? null,
    confidence: r.confidence != null ? Number(r.confidence) : null,
    sttProvider: r.stt_provider ?? null,
    createdAt: r.created_at,
  }));
}

export async function insertRecording(input: {
  sessionId: string;
  locationId: string;
  storagePath?: string | null;
  durationMs?: number;
  format?: string;
  disclaimerShown?: boolean;
  expiresAt?: string | null;
}): Promise<VoiceRecording | null> {
  const t = voiceTable("voice_recordings");
  if (!t) return null;
  const { data, error } = await t
    .insert({
      session_id: input.sessionId,
      location_id: input.locationId,
      storage_path: input.storagePath ?? null,
      duration_ms: input.durationMs ?? 0,
      format: input.format ?? "webm",
      disclaimer_shown: input.disclaimerShown ?? false,
      expires_at: input.expiresAt ?? null,
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    sessionId: data.session_id,
    locationId: data.location_id,
    storagePath: data.storage_path ?? null,
    durationMs: Number(data.duration_ms ?? 0),
    format: data.format ?? "webm",
    enabled: data.enabled !== false,
    disclaimerShown: Boolean(data.disclaimer_shown),
    expiresAt: data.expires_at ?? null,
    createdAt: data.created_at,
  };
}

export async function listRecordings(locationId: string, limit = 50): Promise<VoiceRecording[]> {
  const t = voiceTable("voice_recordings");
  if (!t) return [];
  const { data } = await t
    .select("*")
    .eq("location_id", locationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    sessionId: r.session_id,
    locationId: r.location_id,
    storagePath: r.storage_path ?? null,
    durationMs: Number(r.duration_ms ?? 0),
    format: r.format ?? "webm",
    enabled: r.enabled !== false,
    disclaimerShown: Boolean(r.disclaimer_shown),
    expiresAt: r.expires_at ?? null,
    createdAt: r.created_at,
  }));
}

export async function insertProviderMetric(input: {
  locationId?: string | null;
  sessionId?: string | null;
  provider: string;
  providerKind: "stt" | "tts" | "telephony";
  operation: string;
  latencyMs: number;
  success?: boolean;
  error?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const t = voiceTable("voice_provider_metrics");
  if (!t) return;
  await t.insert({
    location_id: input.locationId ?? null,
    session_id: input.sessionId ?? null,
    provider: input.provider,
    provider_kind: input.providerKind,
    operation: input.operation,
    latency_ms: input.latencyMs,
    success: input.success !== false,
    error: input.error ?? null,
    metadata: input.metadata ?? {},
  });
}

export async function insertCallMetrics(input: {
  sessionId: string;
  locationId: string;
  callDurationMs: number;
  wordsPerMinute?: number;
  interruptions?: number;
  avgResponseMs?: number;
  silenceMs?: number;
  transferred?: boolean;
  dropped?: boolean;
  callQuality?: number | null;
  latency: LatencyBreakdown;
}): Promise<VoiceCallMetrics | null> {
  const t = voiceTable("voice_call_metrics");
  if (!t) return null;
  const { data, error } = await t
    .insert({
      session_id: input.sessionId,
      location_id: input.locationId,
      call_duration_ms: input.callDurationMs,
      words_per_minute: input.wordsPerMinute ?? 0,
      interruptions: input.interruptions ?? 0,
      avg_response_ms: input.avgResponseMs ?? 0,
      silence_ms: input.silenceMs ?? 0,
      transferred: input.transferred ?? false,
      dropped: input.dropped ?? false,
      call_quality: input.callQuality ?? null,
      stt_latency_ms: input.latency.sttMs,
      planner_latency_ms: input.latency.plannerMs,
      tool_latency_ms: input.latency.toolMs,
      gemini_latency_ms: input.latency.geminiMs,
      reflection_latency_ms: input.latency.reflectionMs,
      tts_latency_ms: input.latency.ttsMs,
      total_roundtrip_ms: input.latency.totalMs,
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    sessionId: data.session_id,
    locationId: data.location_id,
    callDurationMs: Number(data.call_duration_ms ?? 0),
    wordsPerMinute: Number(data.words_per_minute ?? 0),
    interruptions: Number(data.interruptions ?? 0),
    avgResponseMs: Number(data.avg_response_ms ?? 0),
    silenceMs: Number(data.silence_ms ?? 0),
    transferred: Boolean(data.transferred),
    dropped: Boolean(data.dropped),
    callQuality: data.call_quality != null ? Number(data.call_quality) : null,
    latency: {
      sttMs: Number(data.stt_latency_ms ?? 0),
      plannerMs: Number(data.planner_latency_ms ?? 0),
      toolMs: Number(data.tool_latency_ms ?? 0),
      geminiMs: Number(data.gemini_latency_ms ?? 0),
      reflectionMs: Number(data.reflection_latency_ms ?? 0),
      ttsMs: Number(data.tts_latency_ms ?? 0),
      totalMs: Number(data.total_roundtrip_ms ?? 0),
    },
    createdAt: data.created_at,
  };
}

export async function listCallMetrics(locationId: string, limit = 100) {
  const t = voiceTable("voice_call_metrics");
  if (!t) return [];
  const { data } = await t
    .select("*")
    .eq("location_id", locationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function listProviderMetrics(locationId?: string, limit = 200) {
  const t = voiceTable("voice_provider_metrics");
  if (!t) return [];
  let q = t.select("*").order("created_at", { ascending: false });
  if (locationId) q = q.eq("location_id", locationId);
  const { data } = await q.limit(limit);
  return data ?? [];
}
