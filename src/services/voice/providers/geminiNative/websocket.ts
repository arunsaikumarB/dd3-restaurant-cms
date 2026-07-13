/**
 * Gemini Live WebSocket client (browser).
 * Connects to Google Live API using a short-lived config from Netlify (key never in repo).
 * When no liveUrl is available, session stays in degraded mode and REST speak/transcribe is used.
 */

import type { GeminiLiveSessionState } from "./types";

export type LiveSocketHandlers = {
  onState?: (state: GeminiLiveSessionState) => void;
  onAudio?: (pcmBase64: string, mimeType: string) => void;
  onTranscript?: (text: string, partial: boolean) => void;
  onError?: (err: Error) => void;
  onClose?: () => void;
};

export type LiveSocketHandle = {
  state: GeminiLiveSessionState;
  sendAudio: (pcmBase64: string, mimeType: string) => void;
  sendText: (text: string) => void;
  interrupt: () => void;
  close: () => void;
};

export function connectGeminiLiveSocket(input: {
  wsUrl: string;
  apiKey?: string;
  model: string;
  voiceName?: string;
  handlers: LiveSocketHandlers;
}): LiveSocketHandle {
  let state: GeminiLiveSessionState = "connecting";
  const setState = (s: GeminiLiveSessionState) => {
    state = s;
    input.handlers.onState?.(s);
  };

  // Browser WebSocket cannot set custom headers; key goes as query param when provided by server proxy URL.
  const url = input.apiKey
    ? `${input.wsUrl}${input.wsUrl.includes("?") ? "&" : "?"}key=${encodeURIComponent(input.apiKey)}`
    : input.wsUrl;

  let ws: WebSocket | null = null;
  try {
    ws = new WebSocket(url);
  } catch (e) {
    setState("error");
    input.handlers.onError?.(e instanceof Error ? e : new Error("websocket failed"));
    return noopHandle(() => state);
  }

  ws.onopen = () => {
    setState("connected");
    const setup = {
      setup: {
        model: `models/${input.model}`,
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: input.voiceName || "Puck" },
            },
          },
        },
      },
    };
    ws?.send(JSON.stringify(setup));
    setState("listening");
  };

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(String(ev.data)) as Record<string, unknown>;
      const serverContent = msg.serverContent as Record<string, unknown> | undefined;
      if (!serverContent) return;
      const modelTurn = serverContent.modelTurn as { parts?: Array<Record<string, unknown>> } | undefined;
      for (const part of modelTurn?.parts ?? []) {
        const inline = part.inlineData as { data?: string; mimeType?: string } | undefined;
        if (inline?.data) {
          setState("speaking");
          input.handlers.onAudio?.(inline.data, inline.mimeType ?? "audio/pcm");
        }
        if (typeof part.text === "string") {
          input.handlers.onTranscript?.(part.text, false);
        }
      }
      if (serverContent.interrupted) {
        setState("interrupted");
      }
      if (serverContent.turnComplete) {
        setState("listening");
      }
    } catch (e) {
      input.handlers.onError?.(e instanceof Error ? e : new Error("bad live message"));
    }
  };

  ws.onerror = () => {
    setState("error");
    input.handlers.onError?.(new Error("Gemini Live socket error"));
  };

  ws.onclose = () => {
    setState("closed");
    input.handlers.onClose?.();
  };

  return {
    get state() {
      return state;
    },
    sendAudio(pcmBase64, mimeType) {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(
        JSON.stringify({
          realtimeInput: {
            mediaChunks: [{ mimeType, data: pcmBase64 }],
          },
        }),
      );
    },
    sendText(text) {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(
        JSON.stringify({
          clientContent: {
            turns: [{ role: "user", parts: [{ text }] }],
            turnComplete: true,
          },
        }),
      );
    },
    interrupt() {
      // Client-side barge-in: close current model audio; Live API treats new input as interrupt.
      setState("interrupted");
    },
    close() {
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
      setState("closed");
    },
  };
}

function noopHandle(getState: () => GeminiLiveSessionState): LiveSocketHandle {
  return {
    get state() {
      return getState();
    },
    sendAudio() {},
    sendText() {},
    interrupt() {},
    close() {},
  };
}
