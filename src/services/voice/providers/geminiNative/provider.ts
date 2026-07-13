/**
 * Gemini Native Audio provider — registers into existing STT/TTS registries.
 * On failure, callers should failover to configured fallback (browser/google/azure/elevenlabs).
 */

import { registerTtsProvider, type TextToSpeechProvider, type TtsSpeakInput } from "../../tts/types";
import { registerSttProvider, type SpeechToTextProvider } from "../../stt/types";
import type { TtsResult } from "../../types";
import { decodeAndPlayAudio } from "./audioDecoder";
import { createInterruptionController, interruptActiveSpeech } from "./interruption";
import { fetchGeminiNativeHealth, readGeminiNativeConfigFromMetadata } from "./health";
import { DEFAULT_GEMINI_NATIVE_CONFIG, type GeminiNativeConfig, type GeminiSpeakResult } from "./types";

const FUNCTION_PATH = "/.netlify/functions/gemini-live";

let lastConfig: GeminiNativeConfig = DEFAULT_GEMINI_NATIVE_CONFIG;
let speakAbort: AbortController | null = null;

export function setGeminiNativeRuntimeConfig(config: Partial<GeminiNativeConfig>) {
  lastConfig = { ...lastConfig, ...config };
}

export function getGeminiNativeRuntimeConfig(): GeminiNativeConfig {
  return lastConfig;
}

async function callSpeakApi(input: {
  text: string;
  language: string;
  config: GeminiNativeConfig;
  signal?: AbortSignal;
}): Promise<GeminiSpeakResult> {
  const started = performance.now();
  try {
    const res = await fetch(FUNCTION_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "speak",
        text: input.text,
        language: input.language,
        config: input.config,
      }),
      signal: input.signal,
    });
    const data = (await res.json()) as GeminiSpeakResult & { error?: string };
    if (!res.ok || data.ok === false) {
      return {
        ok: false,
        provider: "gemini_native",
        latencyMs: Math.round(performance.now() - started),
        error: data.error ?? `HTTP ${res.status}`,
      };
    }
    return {
      ...data,
      ok: true,
      provider: "gemini_native",
      latencyMs: data.latencyMs ?? Math.round(performance.now() - started),
    };
  } catch (e) {
    return {
      ok: false,
      provider: "gemini_native",
      latencyMs: Math.round(performance.now() - started),
      error: e instanceof Error ? e.message : "speak failed",
    };
  }
}

const geminiNativeTts: TextToSpeechProvider = {
  id: "gemini_native",
  label: "Gemini Native Audio",
  async speak(input: TtsSpeakInput): Promise<TtsResult> {
    const started = performance.now();
    speakAbort?.abort();
    const ctrl = createInterruptionController();
    speakAbort = ctrl.abortController;
    if (input.signal) {
      input.signal.addEventListener("abort", () => ctrl.interrupt(), { once: true });
    }

    const config: GeminiNativeConfig = {
      ...lastConfig,
      voiceName: input.settings.voiceName && input.settings.voiceName !== "default"
        ? input.settings.voiceName
        : lastConfig.voiceName,
      speakingSpeed: input.settings.voiceSpeed || lastConfig.speakingSpeed,
    };

    const result = await callSpeakApi({
      text: input.text,
      language: input.language,
      config,
      signal: ctrl.signal,
    });

    if (!result.ok || ctrl.interrupted) {
      return {
        provider: "gemini_native",
        latencyMs: Math.round(performance.now() - started),
        spokenInBrowser: false,
        mimeType: undefined,
      };
    }

    if (result.audioBase64) {
      const played = await decodeAndPlayAudio({
        audioBase64: result.audioBase64,
        mimeType: result.mimeType,
        sampleRateHz: config.sampleRateHz,
        signal: ctrl.signal,
      });
      return {
        provider: "gemini_native",
        latencyMs: result.latencyMs || played.latencyMs || Math.round(performance.now() - started),
        spokenInBrowser: played.played,
        mimeType: result.mimeType ?? "audio/pcm",
        audioBase64: result.audioBase64,
      };
    }

    // Server returned ok without audio (degraded) — mark failure so pipeline can failover
    return {
      provider: "gemini_native",
      latencyMs: Math.round(performance.now() - started),
      spokenInBrowser: false,
    };
  },
  stop() {
    interruptActiveSpeech();
    speakAbort?.abort();
  },
};

const geminiNativeStt: SpeechToTextProvider = {
  id: "gemini_native",
  label: "Gemini Native Audio",
  async fromText(text, language) {
    return {
      text: text.trim(),
      isFinal: true,
      confidence: 0.95,
      language,
      provider: "gemini_native",
      latencyMs: 0,
    };
  },
  async recognize(audio, language) {
    const started = performance.now();
    try {
      let audioBase64 = "";
      if (audio instanceof ArrayBuffer) {
        const bytes = new Uint8Array(audio);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
        audioBase64 = btoa(binary);
      } else {
        const buf = await audio.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
        audioBase64 = btoa(binary);
      }
      const res = await fetch(FUNCTION_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "transcribe",
          audioBase64,
          language,
          config: lastConfig,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        text?: string;
        confidence?: number;
        language?: string;
        error?: string;
      };
      return {
        text: (data.text ?? "").trim(),
        isFinal: true,
        confidence: data.confidence ?? 0.8,
        language: data.language ?? language,
        provider: "gemini_native",
        latencyMs: Math.round(performance.now() - started),
      };
    } catch {
      return {
        text: "",
        isFinal: true,
        confidence: 0,
        language,
        provider: "gemini_native",
        latencyMs: Math.round(performance.now() - started),
      };
    }
  },
  async startStream(stream, language, handlers) {
    const { getSttProvider } = await import("../../stt/types");
    const browser = getSttProvider("browser");
    if (browser?.startStream) {
      return browser.startStream(stream, language, handlers);
    }
    handlers.onError?.(new Error("Streaming STT unavailable"));
    return { stop: () => undefined };
  },
};

let registered = false;

export function ensureGeminiNativeRegistered(metadata?: Record<string, unknown> | null): void {
  if (metadata) {
    lastConfig = readGeminiNativeConfigFromMetadata(metadata);
  }
  if (registered) return;
  registered = true;
  registerTtsProvider(geminiNativeTts);
  registerSttProvider(geminiNativeStt);
}

export async function speakWithGeminiNativeOrFallback(input: {
  text: string;
  language: string;
  settings: TtsSpeakInput["settings"];
  signal?: AbortSignal;
  metadata?: Record<string, unknown> | null;
  fallbackSpeak: (providerId: string) => Promise<TtsResult | null>;
}): Promise<TtsResult & { fallbackUsed?: boolean; primaryError?: string | null }> {
  ensureGeminiNativeRegistered(input.metadata);
  const config = readGeminiNativeConfigFromMetadata(input.metadata);
  lastConfig = config;

  const primary = await geminiNativeTts.speak({
    text: input.text,
    language: input.language,
    settings: input.settings,
    signal: input.signal,
  });

  const failed = !primary.spokenInBrowser && !primary.audioBase64;
  if (!failed) return { ...primary, fallbackUsed: false };

  const fb = await input.fallbackSpeak(config.fallbackTtsProvider);
  if (fb) {
    return { ...fb, fallbackUsed: true, primaryError: "gemini_native_unavailable" };
  }
  // Last resort browser
  const browser = await input.fallbackSpeak("browser");
  return {
    ...(browser ?? primary),
    fallbackUsed: true,
    primaryError: "gemini_native_unavailable",
  };
}

export { fetchGeminiNativeHealth, readGeminiNativeConfigFromMetadata };
export type { GeminiNativeConfig, GeminiNativeHealth } from "./types";
export { DEFAULT_GEMINI_NATIVE_CONFIG } from "./types";
export { openGeminiNativeSession } from "./session";
export { interruptActiveSpeech } from "./interruption";
