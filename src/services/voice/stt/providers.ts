import { registerSttProvider, type SpeechToTextProvider } from "./types";
import type { SttResult } from "../types";

function textResult(text: string, language: string, provider: SttResult["provider"], latencyMs: number): SttResult {
  return {
    text: text.trim(),
    isFinal: true,
    confidence: 0.9,
    language,
    provider,
    latencyMs,
  };
}

const browserStt: SpeechToTextProvider = {
  id: "browser",
  label: "Browser Web Speech",
  async fromText(text, language) {
    return textResult(text, language, "browser", 0);
  },
  async startStream(_stream, language, handlers) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = typeof window !== "undefined" ? (window as any) : null;
    const SpeechRecognitionCtor = w?.SpeechRecognition || w?.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      handlers.onError?.(new Error("Web Speech API not available in this browser"));
      return { stop: () => undefined };
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language === "hi" ? "hi-IN" : language === "te" ? "te-IN" : "en-US";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (!res) continue;
        const transcript = res[0]?.transcript ?? "";
        if (res.isFinal) final += transcript;
        else interim += transcript;
      }
      if (interim) handlers.onPartial?.({ text: interim, isFinal: false, language });
      if (final) handlers.onFinal?.({ text: final, isFinal: true, language, confidence: 0.85 });
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (e: any) => {
      handlers.onError?.(new Error(e?.error || "speech recognition error"));
    };
    recognition.start();
    return {
      stop: () => {
        try {
          recognition.stop();
        } catch {
          /* ignore */
        }
      },
    };
  },
};

function stubStt(id: SttResult["provider"], label: string): SpeechToTextProvider {
  return {
    id,
    label,
    async fromText(text, language) {
      return textResult(text, language, id, 12);
    },
    async recognize(_audio, language) {
      return textResult("", language, id, 0);
    },
  };
}

let registered = false;
export function ensureSttProvidersRegistered(): void {
  if (registered) return;
  registered = true;
  registerSttProvider(browserStt);
  registerSttProvider(stubStt("google", "Google Cloud STT"));
  registerSttProvider(stubStt("deepgram", "Deepgram"));
  registerSttProvider(stubStt("azure", "Azure Speech"));
  registerSttProvider(stubStt("assemblyai", "AssemblyAI"));
}
