/**
 * Voice AI Layer — types.
 * Transport + session only. Planner / Tool Orchestrator / Gemini remain intelligence.
 */

export type VoiceChannel = "web" | "phone" | "whatsapp" | "mobile" | "kiosk" | "drive_thru";

export type CallState =
  | "idle"
  | "incoming"
  | "greeting"
  | "listening"
  | "thinking"
  | "speaking"
  | "waiting"
  | "clarification"
  | "escalation"
  | "completed"
  | "disconnected";

export type VoiceLanguage = "en" | "hi" | "te" | "auto";

export type SttProviderId = "browser" | "google" | "deepgram" | "azure" | "assemblyai";
export type TtsProviderId = "browser" | "google" | "azure" | "elevenlabs" | "gemini_native" | "openai_realtime";

export type VoiceSettings = {
  id: string;
  locationId: string;
  enabled: boolean;
  channelWeb: boolean;
  channelPhone: boolean;
  sttProvider: SttProviderId;
  ttsProvider: TtsProviderId;
  voiceName: string;
  voiceGender: string;
  voiceSpeed: number;
  voicePitch: number;
  language: VoiceLanguage;
  autoDetectLanguage: boolean;
  greeting: string;
  silenceTimeoutMs: number;
  maxCallLengthSec: number;
  allowInterruptions: boolean;
  recordingEnabled: boolean;
  recordingRetentionDays: number;
  recordingDisclaimer: string;
  metadata: Record<string, unknown>;
  updatedAt: string;
};

export type VoiceSession = {
  id: string;
  conversationId: string;
  locationId: string;
  channel: VoiceChannel;
  customerId: string | null;
  language: string;
  callState: CallState;
  currentIntent: string | null;
  plannerGoal: string | null;
  durationMs: number;
  startedAt: string;
  endedAt: string | null;
  disconnectReason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type VoiceEvent = {
  id: string;
  sessionId: string;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type VoiceTranscript = {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  text: string;
  isFinal: boolean;
  language: string | null;
  confidence: number | null;
  sttProvider: string | null;
  createdAt: string;
};

export type VoiceRecording = {
  id: string;
  sessionId: string;
  locationId: string;
  storagePath: string | null;
  durationMs: number;
  format: string;
  enabled: boolean;
  disclaimerShown: boolean;
  expiresAt: string | null;
  createdAt: string;
};

export type LatencyBreakdown = {
  sttMs: number;
  plannerMs: number;
  toolMs: number;
  geminiMs: number;
  reflectionMs: number;
  ttsMs: number;
  totalMs: number;
};

export type VoiceCallMetrics = {
  id: string;
  sessionId: string;
  locationId: string;
  callDurationMs: number;
  wordsPerMinute: number;
  interruptions: number;
  avgResponseMs: number;
  silenceMs: number;
  transferred: boolean;
  dropped: boolean;
  callQuality: number | null;
  latency: LatencyBreakdown;
  createdAt: string;
};

export type PartialTranscript = {
  text: string;
  isFinal: boolean;
  confidence?: number;
  language?: string;
};

export type SttResult = {
  text: string;
  isFinal: boolean;
  confidence: number;
  language: string;
  provider: SttProviderId;
  latencyMs: number;
};

export type TtsResult = {
  audioUrl?: string;
  audioBase64?: string;
  mimeType?: string;
  provider: TtsProviderId;
  latencyMs: number;
  /** Browser providers may speak directly without returning audio bytes. */
  spokenInBrowser?: boolean;
};

export type VoiceTurnResult = {
  sessionId: string;
  userText: string;
  assistantText: string;
  planId: string | null;
  intent: string | null;
  latency: LatencyBreakdown;
  tts: TtsResult | null;
};

export type VadEvent =
  | { type: "speech_start" }
  | { type: "speech_end" }
  | { type: "silence_timeout"; ms: number }
  | { type: "noise"; level: number }
  | { type: "speaking_indicator"; speaking: boolean };

export type VoiceAnalyticsSnapshot = {
  totalSessions: number;
  activeSessions: number;
  avgDurationMs: number;
  avgRoundtripMs: number;
  interruptions: number;
  droppedCalls: number;
  transferredCalls: number;
  byChannel: Array<{ channel: string; count: number }>;
  byLanguage: Array<{ language: string; count: number }>;
  providerHealth: Array<{ provider: string; successRate: number; avgLatencyMs: number }>;
};
