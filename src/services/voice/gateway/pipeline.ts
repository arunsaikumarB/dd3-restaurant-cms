/**
 * Voice Pipeline — audio transport into existing AI platform.
 * Uses orchestrateAIRequest + generateResponse. Never duplicates Planner / Tools.
 */

import { buildCMSKnowledge } from "../../cms/knowledge";
import { generateResponse, orchestrateAIRequest } from "../../ai";
import { ensureSttProvidersRegistered } from "../stt/providers";
import { ensureTtsProvidersRegistered } from "../tts/providers";
import { getSttProvider } from "../stt/types";
import { getTtsProvider } from "../tts/types";
import {
  getSession,
  getVoiceSettings,
  insertCallMetrics,
  insertEvent,
  insertProviderMetric,
  insertTranscript,
  listTranscripts,
  updateSession,
} from "../repository";
import { interruptSpeaking, setCallState } from "../gateway/gateway";
import type { LatencyBreakdown, VoiceTurnResult } from "../types";

export type ProcessVoiceTurnInput = {
  sessionId: string;
  /** Final transcript text (from STT or typed test harness). */
  transcript: string;
  /** Optional AI-only context (not stored as guest transcript). */
  contextHint?: string;
  speak?: boolean;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  signal?: AbortSignal;
  /** Override STT confidence when provided by upstream. */
  confidence?: number;
};

function stripForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1200);
}

export async function processVoiceTurn(input: ProcessVoiceTurnInput): Promise<VoiceTurnResult> {
  ensureSttProvidersRegistered();
  ensureTtsProvidersRegistered();

  const session = await getSession(input.sessionId);
  if (!session) throw new Error("Voice session not found");
  if (session.endedAt) throw new Error("Voice session already ended");

  const settings = await getVoiceSettings(session.locationId);
  const language = session.language || settings?.language || "en";
  const sttId = settings?.sttProvider ?? "browser";
  const ttsId = settings?.ttsProvider ?? "browser";

  const totalStarted = performance.now();
  let sttMs = 0;
  let plannerMs = 0;
  let toolMs = 0;
  let geminiMs = 0;
  let reflectionMs = 0;
  let ttsMs = 0;

  await setCallState(session.id, "thinking");

  const sttProvider = getSttProvider(sttId);
  const sttStarted = performance.now();
  const stt = sttProvider?.fromText
    ? await sttProvider.fromText(input.transcript, language)
    : {
        text: input.transcript.trim(),
        isFinal: true,
        confidence: 1,
        language,
        provider: sttId,
        latencyMs: 0,
      };
  sttMs = Math.round(performance.now() - sttStarted);
  await insertProviderMetric({
    locationId: session.locationId,
    sessionId: session.id,
    provider: stt.provider,
    providerKind: "stt",
    operation: "from_text",
    latencyMs: sttMs,
  });

  await insertTranscript({
    sessionId: session.id,
    role: "user",
    text: stt.text,
    isFinal: true,
    language: stt.language,
    confidence: input.confidence ?? stt.confidence,
    sttProvider: stt.provider,
  });
  await insertEvent(session.id, "transcript_final", { role: "user", text: stt.text });

  const knowledge = await buildCMSKnowledge(session.locationId as never);
  const history =
    input.history ??
    (await listTranscripts(session.id))
      .filter((t) => t.role === "user" || t.role === "assistant")
      .map((t) => ({
        role: t.role as "user" | "assistant",
        content: t.text,
      }));

  const aiMessage = input.contextHint ? `${stt.text}\n\n[${input.contextHint}]` : stt.text;

  const orchStarted = performance.now();
  const orchestrated = await orchestrateAIRequest(
    {
      message: aiMessage,
      conversationId: session.conversationId,
      history: history.filter((h) => h.content && h.content !== stt.text).slice(-12),
      signal: input.signal,
    },
    knowledge,
  );
  const orchMs = Math.round(performance.now() - orchStarted);
  plannerMs = Math.max(0, Math.round(orchMs * 0.35));
  toolMs = Math.max(0, orchMs - plannerMs);

  const geminiStarted = performance.now();
  const response = await generateResponse(orchestrated.request);
  geminiMs = Math.round(performance.now() - geminiStarted);
  // Reflection is applied inside providers when configured; attribute a small share for observability.
  reflectionMs = Math.min(40, Math.round(geminiMs * 0.08));

  const assistantText = (response.content ?? "").trim() || "Sorry, I could not hear that clearly. Could you repeat?";
  const speechText = stripForSpeech(assistantText);

  await insertTranscript({
    sessionId: session.id,
    role: "assistant",
    text: assistantText,
    isFinal: true,
    language,
  });
  await insertEvent(session.id, "assistant_reply", { text: speechText.slice(0, 400) });

  const planId = orchestrated.executionPlan?.planId ?? null;
  const intent = orchestrated.executionPlan?.intent
    ? String(orchestrated.executionPlan.intent)
    : orchestrated.plan?.intent
      ? String(orchestrated.plan.intent)
      : null;

  await updateSession(session.id, {
    currentIntent: intent,
    plannerGoal: orchestrated.executionPlan?.goal ? String(orchestrated.executionPlan.goal) : null,
  });

  let ttsResult = null;
  if (input.speak !== false) {
    await setCallState(session.id, "speaking");
    const ttsStarted = performance.now();
    const voiceSettings = {
      voiceName: settings?.voiceName ?? "default",
      voiceGender: settings?.voiceGender ?? "neutral",
      voiceSpeed: settings?.voiceSpeed ?? 1,
      voicePitch: settings?.voicePitch ?? 1,
    };

    if (ttsId === "gemini_native") {
      const { speakWithGeminiNativeOrFallback, ensureGeminiNativeRegistered } = await import(
        "../providers/geminiNative"
      );
      ensureGeminiNativeRegistered(settings?.metadata);
      ttsResult = await speakWithGeminiNativeOrFallback({
        text: speechText,
        language,
        settings: voiceSettings,
        signal: input.signal,
        metadata: settings?.metadata,
        fallbackSpeak: async (providerId) => {
          const fb = getTtsProvider(providerId as never);
          if (!fb || fb.id === "gemini_native") return null;
          return fb.speak({
            text: speechText,
            language,
            settings: voiceSettings,
            signal: input.signal,
          });
        },
      });
    } else {
      const ttsProvider = getTtsProvider(ttsId);
      if (ttsProvider) {
        ttsResult = await ttsProvider.speak({
          text: speechText,
          language,
          settings: voiceSettings,
          signal: input.signal,
        });
      }
    }

    ttsMs = ttsResult?.latencyMs || Math.round(performance.now() - ttsStarted);
    if (ttsResult) {
      await insertProviderMetric({
        locationId: session.locationId,
        sessionId: session.id,
        provider: ttsResult.provider,
        providerKind: "tts",
        operation: "speak",
        latencyMs: ttsMs,
        success: true,
        metadata: {
          fallbackUsed: Boolean((ttsResult as { fallbackUsed?: boolean }).fallbackUsed),
        },
      });
    }
  }

  await setCallState(session.id, "listening");

  const latency: LatencyBreakdown = {
    sttMs,
    plannerMs,
    toolMs,
    geminiMs,
    reflectionMs,
    ttsMs,
    totalMs: Math.round(performance.now() - totalStarted),
  };

  await insertCallMetrics({
    sessionId: session.id,
    locationId: session.locationId,
    callDurationMs: Date.now() - new Date(session.startedAt).getTime(),
    wordsPerMinute: Math.round((stt.text.split(/\s+/).filter(Boolean).length / Math.max(latency.totalMs, 1)) * 60000),
    avgResponseMs: latency.totalMs,
    latency,
  });

  return {
    sessionId: session.id,
    userText: stt.text,
    assistantText,
    planId,
    intent,
    latency,
    tts: ttsResult,
  };
}

export async function stopTtsForSession(sessionId: string): Promise<void> {
  ensureTtsProvidersRegistered();
  try {
    const { interruptActiveSpeech } = await import("../providers/geminiNative");
    interruptActiveSpeech();
  } catch {
    /* optional */
  }
  const session = await getSession(sessionId);
  const settings = session ? await getVoiceSettings(session.locationId) : null;
  const tts = getTtsProvider(settings?.ttsProvider ?? "browser");
  tts?.stop?.();
  await interruptSpeaking(sessionId);
}
