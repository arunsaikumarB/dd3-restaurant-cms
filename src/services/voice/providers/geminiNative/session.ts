/**
 * Gemini Native Live session — binds mic streaming + Live socket + interruption.
 * Planner is NOT invoked here; session only moves speech. Text turns go through Voice Gateway.
 */

import { startVad } from "../../streaming/vad";
import { encodeMediaStreamChunk } from "./audioEncoder";
import { decodeAndPlayAudio } from "./audioDecoder";
import { createInterruptionController, interruptActiveSpeech } from "./interruption";
import { connectGeminiLiveSocket, type LiveSocketHandle } from "./websocket";
import type { GeminiLiveSessionState, GeminiNativeConfig } from "./types";

export type GeminiNativeSession = {
  id: string;
  state: GeminiLiveSessionState;
  startMic: (stream: MediaStream) => Promise<void>;
  stopMic: () => void;
  speakTextViaLive: (text: string) => void;
  interrupt: () => void;
  close: () => void;
  getPartialTranscript: () => string;
};

export async function openGeminiNativeSession(input: {
  sessionId: string;
  config: GeminiNativeConfig;
  live?: { wsUrl: string; apiKey?: string } | null;
  onState?: (s: GeminiLiveSessionState) => void;
  onPartialTranscript?: (text: string) => void;
  onFinalTranscript?: (text: string) => void;
}): Promise<GeminiNativeSession> {
  let state: GeminiLiveSessionState = "idle";
  let partial = "";
  let vadStop: (() => void) | null = null;
  let audioCtx: AudioContext | null = null;
  let processor: ScriptProcessorNode | null = null;
  const interruption = createInterruptionController();

  const setState = (s: GeminiLiveSessionState) => {
    state = s;
    input.onState?.(s);
  };

  let socket: LiveSocketHandle | null = null;
  if (input.live?.wsUrl && input.config.streamingEnabled) {
    setState("connecting");
    socket = connectGeminiLiveSocket({
      wsUrl: input.live.wsUrl,
      apiKey: input.live.apiKey,
      model: input.config.model,
      voiceName: input.config.voiceName,
      handlers: {
        onState: setState,
        onAudio: (pcm, mime) => {
          void decodeAndPlayAudio({
            audioBase64: pcm,
            mimeType: mime,
            sampleRateHz: input.config.sampleRateHz,
            signal: interruption.signal,
          });
        },
        onTranscript: (text, isPartial) => {
          if (isPartial) {
            partial = text;
            input.onPartialTranscript?.(text);
          } else {
            partial = "";
            input.onFinalTranscript?.(text);
          }
        },
        onError: () => setState("error"),
        onClose: () => setState("closed"),
      },
    });
  } else {
    setState("idle");
  }

  const stopMic = () => {
    vadStop?.();
    vadStop = null;
    try {
      processor?.disconnect();
    } catch {
      /* ignore */
    }
    processor = null;
    void audioCtx?.close();
    audioCtx = null;
  };

  return {
    id: input.sessionId,
    get state() {
      return state;
    },
    async startMic(stream) {
      if (typeof window === "undefined") return;
      audioCtx = new AudioContext({ sampleRate: input.config.sampleRateHz });
      const source = audioCtx.createMediaStreamSource(stream);
      processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (ev) => {
        const data = ev.inputBuffer.getChannelData(0);
        const encoded = encodeMediaStreamChunk(data, input.config.sampleRateHz);
        socket?.sendAudio(encoded.pcmBase64, encoded.mimeType);
      };
      source.connect(processor);
      processor.connect(audioCtx.destination);

      const vad = startVad(stream, {
        silenceTimeoutMs: 1500,
        onEvent: (e) => {
          if (e.type === "speech_start" && state === "speaking") {
            interruptActiveSpeech();
            socket?.interrupt();
            setState("interrupted");
          }
        },
      });
      vadStop = () => vad.stop();
      setState("listening");
    },
    stopMic,
    speakTextViaLive(text) {
      interruption.reset();
      setState("speaking");
      socket?.sendText(text);
    },
    interrupt() {
      interruptActiveSpeech();
      socket?.interrupt();
      setState("interrupted");
    },
    close() {
      stopMic();
      socket?.close();
      setState("closed");
    },
    getPartialTranscript() {
      return partial;
    },
  };
}
