/**
 * Gemini Native Audio (Live API) — types.
 * Speech transport only; Planner / Tools / Ops remain unchanged.
 */

export type GeminiNativeModel =
  | "gemini-2.5-flash-preview-native-audio-dialog"
  | "gemini-2.0-flash-live-001"
  | "gemini-2.5-flash-preview-tts"
  | string;

export type GeminiNativeConfig = {
  enabled: boolean;
  model: GeminiNativeModel;
  voiceName: string;
  temperature: number;
  streamingEnabled: boolean;
  autoDetectLanguage: boolean;
  speakingSpeed: number;
  responseStyle: "natural" | "concise" | "warm";
  fallbackTtsProvider: "browser" | "google" | "azure" | "elevenlabs";
  sampleRateHz: number;
};

export type GeminiNativeHealth = {
  ok: boolean;
  status: "healthy" | "degraded" | "down" | "unconfigured";
  model: string;
  streaming: boolean;
  latencyMs: number | null;
  message: string;
  checkedAt: string;
};

export type GeminiLiveSessionState =
  | "idle"
  | "connecting"
  | "connected"
  | "listening"
  | "speaking"
  | "interrupted"
  | "reconnecting"
  | "closed"
  | "error";

export type GeminiAudioChunk = {
  pcmBase64: string;
  mimeType: string;
  sampleRateHz: number;
  sequence: number;
};

export type GeminiSpeakResult = {
  ok: boolean;
  provider: "gemini_native";
  latencyMs: number;
  audioBase64?: string | null;
  mimeType?: string | null;
  spokenInBrowser?: boolean;
  fallbackUsed?: boolean;
  fallbackProvider?: string | null;
  error?: string | null;
};

export type GeminiTranscribeResult = {
  ok: boolean;
  text: string;
  language: string | null;
  confidence: number;
  latencyMs: number;
  partial?: boolean;
  error?: string | null;
};

export const DEFAULT_GEMINI_NATIVE_CONFIG: GeminiNativeConfig = {
  enabled: true,
  model: "gemini-2.5-flash-preview-native-audio-dialog",
  voiceName: "Puck",
  temperature: 0.7,
  streamingEnabled: true,
  autoDetectLanguage: true,
  speakingSpeed: 1,
  responseStyle: "warm",
  fallbackTtsProvider: "browser",
  sampleRateHz: 24000,
};
