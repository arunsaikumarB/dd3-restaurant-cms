/**
 * Receptionist call lifecycle — wraps Voice Gateway + AI pipeline.
 * Does not duplicate Planner / Restaurant Operations / Gemini.
 */

import { getLocationConfig, type LocationId } from "../../../config/locations";
import {
  endVoiceSession,
  setCallState,
  startVoiceSession,
  type StartVoiceSessionInput,
} from "../gateway/gateway";
import { processVoiceTurn, stopTtsForSession } from "../gateway/pipeline";
import { ensureTtsProvidersRegistered } from "../tts/providers";
import { getTtsProvider } from "../tts/types";
import { getVoiceSettings, insertEvent, insertTranscript, updateSession } from "../repository";
import { buildGreeting } from "./greetingEngine";
import {
  detectLocalControl,
  getOrCreateMemory,
  hintIntentFromText,
  rememberAssistantTurn,
  rememberUserTurn,
} from "./conversationManager";
import { handleInterruption } from "./interruptionManager";
import { evaluateSilence } from "./silenceManager";
import {
  misunderstandingPrompt,
  noteMisunderstanding,
  shouldRecoverMisunderstanding,
} from "./misunderstandingRecovery";
import { closingLine, hospitalitySystemHint, polishForSpeech, transferAck } from "./hospitalityEngine";
import { applyLanguageSwitch } from "./languageManager";
import { generateCallSummary } from "./summaryGenerator";
import { getPersonality } from "./repository";
import { processReservationTurn } from "../reservation";
import { handleStaffTransferRequest, maybeRecommendHandoff } from "../handoff";
import type { ReceptionistLiveState, ReceptionistTurnResult, VoiceMemory } from "./types";

async function speakText(
  sessionId: string,
  locationId: string,
  language: string,
  text: string,
): Promise<number> {
  ensureTtsProvidersRegistered();
  const settings = await getVoiceSettings(locationId);
  const personality = await getPersonality(locationId);
  const voiceSettings = {
    voiceName: settings?.voiceName ?? "default",
    voiceGender: settings?.voiceGender ?? "neutral",
    voiceSpeed: personality?.speakingSpeed ?? settings?.voiceSpeed ?? 1,
    voicePitch: settings?.voicePitch ?? 1,
  };
  const polished = polishForSpeech(text, personality?.pauseDurationMs ?? 350);
  await setCallState(sessionId, "speaking");
  const started = performance.now();

  if (settings?.ttsProvider === "gemini_native") {
    const { speakWithGeminiNativeOrFallback, ensureGeminiNativeRegistered } = await import(
      "../providers/geminiNative"
    );
    ensureGeminiNativeRegistered(settings.metadata);
    await speakWithGeminiNativeOrFallback({
      text: polished,
      language,
      settings: voiceSettings,
      metadata: settings.metadata,
      fallbackSpeak: async (providerId) => {
        const fb = getTtsProvider(providerId as never);
        if (!fb || fb.id === "gemini_native") return null;
        return fb.speak({ text: polished, language, settings: voiceSettings });
      },
    });
  } else {
    const tts = getTtsProvider(settings?.ttsProvider ?? "browser");
    if (!tts) {
      await setCallState(sessionId, "listening");
      return 0;
    }
    await tts.speak({ text: polished, language, settings: voiceSettings });
  }

  await setCallState(sessionId, "listening");
  return Math.round(performance.now() - started);
}

export async function startReceptionistCall(input: StartVoiceSessionInput & {
  returningCustomer?: boolean;
  speakGreeting?: boolean;
}) {
  const { session, settings } = await startVoiceSession(input);
  const loc = getLocationConfig(input.locationId as LocationId);
  const greeting = await buildGreeting({
    locationId: input.locationId,
    locationName: loc?.name ?? input.locationId,
    language: session.language,
    returningCustomer: input.returningCustomer,
    customerName: null,
  });

  const mem = getOrCreateMemory(session.id, session.locationId, session.language);
  rememberAssistantTurn(mem, greeting.text, null);

  await insertTranscript({
    sessionId: session.id,
    role: "assistant",
    text: greeting.text,
    isFinal: true,
    language: greeting.language,
  });
  await insertEvent(session.id, "receptionist_greeting", {
    code: greeting.code,
    timeOfDay: greeting.timeOfDay,
  });

  if (input.speakGreeting !== false) {
    await speakText(session.id, session.locationId, session.language, greeting.text);
  } else {
    await setCallState(session.id, "listening");
  }

  return { session, settings, greeting, memory: mem };
}

export async function processReceptionistTurn(input: {
  sessionId: string;
  transcript: string;
  confidence?: number;
  speak?: boolean;
  signal?: AbortSignal;
}): Promise<ReceptionistTurnResult> {
  const { getSession } = await import("../repository");
  const session = await getSession(input.sessionId);
  if (!session) throw new Error("Voice session not found");
  if (session.endedAt) throw new Error("Voice session already ended");

  let language = session.language;
  const mem = getOrCreateMemory(session.id, session.locationId, language);

  if (mem.muted) {
    return localResult(session.id, mem, input.transcript, "I'm muted right now. Say resume when you're ready.", language, "mute");
  }

  const control = detectLocalControl(input.transcript);
  if (control === "end_call") {
    const bye = await closingLine(session.locationId, language);
    rememberUserTurn(mem, input.transcript, "end_call");
    rememberAssistantTurn(mem, bye, mem.plannerGoal);
    if (input.speak !== false) await speakText(session.id, session.locationId, language, bye);
    await endReceptionistCall(session.id, "guest_goodbye");
    return localResult(session.id, mem, input.transcript, bye, language, "end_call", "end_call");
  }
  if (control === "mute") {
    mem.muted = true;
    const msg = "Okay, I've muted myself. Say resume whenever you'd like to continue.";
    if (input.speak !== false) await speakText(session.id, session.locationId, language, msg);
    return localResult(session.id, mem, input.transcript, msg, language, "mute", "mute");
  }
  if (control === "resume") {
    mem.muted = false;
    const msg = "I'm listening again. How can I help?";
    if (input.speak !== false) await speakText(session.id, session.locationId, language, msg);
    return localResult(session.id, mem, input.transcript, msg, language, "resume", "resume");
  }
  if (control === "repeat") {
    mem.repeatRequests += 1;
    const msg = mem.lastAssistantText || "I haven't shared anything yet — how can I help you?";
    if (input.speak !== false) await speakText(session.id, session.locationId, language, msg);
    return localResult(session.id, mem, input.transcript, msg, language, "repeat", "repeat");
  }
  if (control === "restart") {
    const loc = getLocationConfig(session.locationId as LocationId);
    const greeting = await buildGreeting({
      locationId: session.locationId,
      locationName: loc?.name ?? session.locationId,
      language,
      customerName: mem.customerName,
    });
    mem.previousQuestions = [];
    mem.detectedIntents = [];
    mem.currentGoal = null;
    rememberAssistantTurn(mem, greeting.text, null);
    await insertTranscript({
      sessionId: session.id,
      role: "assistant",
      text: greeting.text,
      isFinal: true,
      language,
    });
    if (input.speak !== false) await speakText(session.id, session.locationId, language, greeting.text);
    return localResult(session.id, mem, input.transcript, greeting.text, language, "restart", "restart");
  }

  if (control === "transfer_request") {
    const handoff = await handleStaffTransferRequest({
      sessionId: session.id,
      locationId: session.locationId,
      message: input.transcript,
      plannerGoal: mem.plannerGoal,
      customerName: mem.customerName,
      language,
      confidence: input.confidence,
      misunderstandingCount: mem.misunderstandings,
      phone:
        (typeof session.metadata?.callerPhone === "string" ? session.metadata.callerPhone : null) ??
        (typeof session.metadata?.phone === "string" ? session.metadata.phone : null),
    });
    const msg = handoff.assistantText || (await transferAck(session.locationId));
    rememberUserTurn(mem, input.transcript, "speak_to_manager");
    rememberAssistantTurn(mem, msg, mem.plannerGoal);
    await setCallState(session.id, handoff.queued ? "waiting" : "escalation");
    await insertTranscript({
      sessionId: session.id,
      role: "user",
      text: input.transcript,
      isFinal: true,
      confidence: input.confidence ?? null,
      language,
    });
    await insertTranscript({
      sessionId: session.id,
      role: "assistant",
      text: msg,
      isFinal: true,
      language,
    });
    await insertEvent(session.id, "handoff_staff_request", {
      escalationId: handoff.escalationId,
      transferId: handoff.transferId,
      reason: handoff.reason,
    });
    if (input.speak !== false) await speakText(session.id, session.locationId, language, msg);
    // AI stays on the line — return to listening while transfer waits
    await setCallState(session.id, "listening");
    return localResult(session.id, mem, input.transcript, msg, language, "speak_to_manager", "transfer_request");
  }

  if (shouldRecoverMisunderstanding(input.confidence)) {
    noteMisunderstanding(session.id, session.locationId, language);
    const msg = misunderstandingPrompt(language);
    rememberUserTurn(mem, input.transcript, "unknown");
    rememberAssistantTurn(mem, msg, mem.plannerGoal);
    await insertTranscript({
      sessionId: session.id,
      role: "user",
      text: input.transcript,
      isFinal: true,
      confidence: input.confidence ?? null,
      language,
    });
    await insertTranscript({
      sessionId: session.id,
      role: "assistant",
      text: msg,
      isFinal: true,
      language,
    });
    if (input.speak !== false) await speakText(session.id, session.locationId, language, msg);
    return localResult(session.id, mem, input.transcript, msg, language, "unknown", null, input.confidence ?? 0);
  }

  const langSwitch = await applyLanguageSwitch(session.id, session.locationId, language, input.transcript);
  if (langSwitch.switched && langSwitch.ack) {
    language = langSwitch.language;
    await updateSession(session.id, { language });
    rememberUserTurn(mem, input.transcript, "language_switch");
    rememberAssistantTurn(mem, langSwitch.ack, mem.plannerGoal);
    if (input.speak !== false) await speakText(session.id, session.locationId, language, langSwitch.ack);
    return localResult(session.id, mem, input.transcript, langSwitch.ack, language, "language_switch");
  }

  const hint = hintIntentFromText(input.transcript);

  // Voice Reservation Agent — owns booking conversation; reuses Reservation Engine
  const history = mem.previousQuestions
    .flatMap((q, i) => {
      const a = mem.lastAssistantText && i === mem.previousQuestions.length - 1 ? mem.lastAssistantText : null;
      return [
        { role: "user", content: q },
        ...(a ? [{ role: "assistant", content: a }] : []),
      ];
    })
    .slice(-12);

  const reservationTurn = await processReservationTurn({
    sessionId: session.id,
    locationId: session.locationId,
    conversationId: session.conversationId ?? null,
    message: input.transcript,
    history,
    callerPhone:
      (typeof session.metadata?.callerPhone === "string" ? session.metadata.callerPhone : null) ??
      (typeof session.metadata?.phone === "string" ? session.metadata.phone : null),
    turns: mem.turns,
  });

  if (reservationTurn.handled) {
    let assistantText = reservationTurn.assistantText;

    if (reservationTurn.transferRecommended) {
      const soft = await maybeRecommendHandoff({
        sessionId: session.id,
        locationId: session.locationId,
        message: input.transcript,
        plannerGoal: `reservation_${reservationTurn.workflow}`,
        customerName: mem.customerName,
        language,
        confidence: input.confidence,
        misunderstandingCount: mem.misunderstandings,
        reservationTransferRecommended: true,
        reservationTransferReason: reservationTurn.transferReason,
        phone:
          (typeof session.metadata?.callerPhone === "string" ? session.metadata.callerPhone : null) ??
          (typeof session.metadata?.phone === "string" ? session.metadata.phone : null),
      });
      if (soft.escalated && soft.assistantText && !reservationTurn.awaitingConfirmation) {
        // Soft recommend only — append unless already covered
        if (!/team|staff|manager|transfer/i.test(assistantText)) {
          assistantText = `${assistantText} ${soft.assistantText}`.trim();
        }
      }
    }

    await insertTranscript({
      sessionId: session.id,
      role: "user",
      text: input.transcript,
      isFinal: true,
      confidence: input.confidence ?? null,
      language,
    });
    await insertTranscript({
      sessionId: session.id,
      role: "assistant",
      text: assistantText,
      isFinal: true,
      language,
    });
    await insertEvent(session.id, "voice_reservation_turn", {
      stage: reservationTurn.stage,
      workflow: reservationTurn.workflow,
      callId: reservationTurn.callId,
      confirmationCode: reservationTurn.confirmationCode,
      transferRecommended: reservationTurn.transferRecommended,
    });

    const personality = await getPersonality(session.locationId);
    const spokenText = polishForSpeech(assistantText, personality?.pauseDurationMs ?? 350);
    rememberUserTurn(mem, input.transcript, `reservation_${reservationTurn.workflow}`);
    rememberAssistantTurn(mem, spokenText, `reservation_${reservationTurn.workflow}`);
    mem.currentGoal = `reservation_${reservationTurn.workflow}`;
    mem.plannerGoal = `reservation_${reservationTurn.workflow}`;

    if (input.speak !== false) {
      await speakText(session.id, session.locationId, language, spokenText);
    } else {
      await setCallState(session.id, "listening");
    }

    return {
      sessionId: session.id,
      handledLocally: true,
      control: null,
      userText: input.transcript,
      assistantText,
      spokenText,
      intent: `reservation_${reservationTurn.workflow}`,
      plannerGoal: `reservation_${reservationTurn.workflow}`,
      planId: null,
      confidence: input.confidence ?? 1,
      language,
      memory: { ...mem },
      callState: "listening",
    };
  }

  const hospitality = await hospitalitySystemHint(session.locationId);

  // Soft escalation signals on FAQ path (complaint / refund / etc.) — recommend only
  const softEsc = await maybeRecommendHandoff({
    sessionId: session.id,
    locationId: session.locationId,
    message: input.transcript,
    plannerGoal: mem.plannerGoal,
    customerName: mem.customerName,
    language,
    confidence: input.confidence,
    misunderstandingCount: mem.misunderstandings,
  });

  const turn = await processVoiceTurn({
    sessionId: session.id,
    transcript: input.transcript,
    contextHint: hospitality,
    confidence: input.confidence,
    speak: false,
    signal: input.signal,
  });

  let assistantText = turn.assistantText;
  if (softEsc.escalated && softEsc.assistantText && !softEsc.queued) {
    if (!/team|staff|manager|transfer/i.test(assistantText.slice(-120))) {
      assistantText = `${assistantText} ${softEsc.assistantText}`.trim();
    }
  }

  const personality = await getPersonality(session.locationId);
  const spokenText = polishForSpeech(assistantText, personality?.pauseDurationMs ?? 350);
  rememberUserTurn(mem, input.transcript, turn.intent || hint);
  rememberAssistantTurn(mem, spokenText, turn.intent);

  if (input.speak !== false) {
    await speakText(session.id, session.locationId, language, spokenText);
  } else {
    await setCallState(session.id, "listening");
  }

  return {
    sessionId: session.id,
    handledLocally: false,
    control: null,
    userText: input.transcript,
    assistantText,
    spokenText,
    intent: turn.intent || hint,
    plannerGoal: turn.intent,
    planId: turn.planId,
    confidence: input.confidence ?? 1,
    language,
    memory: { ...mem },
    latency: turn.latency,
    callState: "listening",
  };
}

export async function handleReceptionistSilence(
  sessionId: string,
  silenceMs: number,
  speak = true,
): Promise<{ prompt: string; ended: boolean; stage: string }> {
  const { getSession } = await import("../repository");
  const session = await getSession(sessionId);
  if (!session || session.endedAt) return { prompt: "", ended: true, stage: "end" };
  const result = await evaluateSilence(sessionId, session.locationId, session.language, silenceMs);
  if (result.stage === "none") return { prompt: "", ended: false, stage: "none" };
  if (speak && result.text) {
    await speakText(sessionId, session.locationId, session.language, result.text);
    await insertTranscript({
      sessionId,
      role: "assistant",
      text: result.text,
      isFinal: true,
      language: session.language,
    });
  }
  if (result.shouldEndCall) {
    await endReceptionistCall(sessionId, "silence_timeout");
    return { prompt: result.text, ended: true, stage: result.stage };
  }
  return { prompt: result.text, ended: false, stage: result.stage };
}

export async function interruptReceptionist(sessionId: string): Promise<void> {
  const { getSession } = await import("../repository");
  const session = await getSession(sessionId);
  if (!session) return;
  await handleInterruption(sessionId, session.locationId, session.language);
}

export async function endReceptionistCall(sessionId: string, reason = "completed") {
  await stopTtsForSession(sessionId).catch(() => undefined);
  const ended = await endVoiceSession(sessionId, reason);
  const summary = await generateCallSummary(sessionId);
  return { session: ended, summary };
}

export function getReceptionistLiveState(
  sessionId: string,
  locationId: string,
  language: string,
  callState: string,
  durationMs: number,
): ReceptionistLiveState {
  const mem = getOrCreateMemory(sessionId, locationId, language);
  return {
    sessionId,
    callState,
    listening: callState === "listening" || callState === "waiting",
    speaking: callState === "speaking" || callState === "greeting",
    intent: mem.detectedIntents[mem.detectedIntents.length - 1] ?? null,
    plannerGoal: mem.plannerGoal,
    confidence: null,
    language: mem.language,
    durationMs,
    memory: { ...mem },
  };
}

function localResult(
  sessionId: string,
  mem: VoiceMemory,
  userText: string,
  assistantText: string,
  language: string,
  intent: string | null,
  control: ReceptionistTurnResult["control"] = null,
  confidence = 1,
): ReceptionistTurnResult {
  return {
    sessionId,
    handledLocally: true,
    control,
    userText,
    assistantText,
    spokenText: assistantText,
    intent,
    plannerGoal: mem.plannerGoal,
    planId: null,
    confidence,
    language,
    memory: { ...mem },
    callState: control === "end_call" ? "completed" : "listening",
  };
}
