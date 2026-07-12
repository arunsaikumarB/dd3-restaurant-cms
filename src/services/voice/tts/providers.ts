import { registerTtsProvider, type TextToSpeechProvider, type TtsSpeakInput } from "./types";
import type { TtsResult } from "../types";

const browserTts: TextToSpeechProvider = {
  id: "browser",
  label: "Browser Speech Synthesis",
  async speak(input: TtsSpeakInput): Promise<TtsResult> {
    const started = performance.now();
    if (typeof window === "undefined" || !window.speechSynthesis) {
      return {
        provider: "browser",
        latencyMs: 0,
        spokenInBrowser: false,
      };
    }
    return new Promise((resolve) => {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(input.text);
      u.rate = input.settings.voiceSpeed || 1;
      u.pitch = input.settings.voicePitch || 1;
      u.lang =
        input.language === "hi" ? "hi-IN" : input.language === "te" ? "te-IN" : "en-US";
      if (input.signal) {
        input.signal.addEventListener("abort", () => {
          window.speechSynthesis.cancel();
          resolve({
            provider: "browser",
            latencyMs: Math.round(performance.now() - started),
            spokenInBrowser: false,
          });
        });
      }
      u.onend = () =>
        resolve({
          provider: "browser",
          latencyMs: Math.round(performance.now() - started),
          spokenInBrowser: true,
        });
      u.onerror = () =>
        resolve({
          provider: "browser",
          latencyMs: Math.round(performance.now() - started),
          spokenInBrowser: false,
        });
      window.speechSynthesis.speak(u);
    });
  },
  stop() {
    if (typeof window !== "undefined") window.speechSynthesis.cancel();
  },
};

function stubTts(id: TtsResult["provider"], label: string): TextToSpeechProvider {
  return {
    id,
    label,
    async speak(input) {
      const started = performance.now();
      // Provider adapters register here; credentials wired via env in future milestones.
      void input;
      return {
        provider: id,
        latencyMs: Math.round(performance.now() - started) + 8,
        mimeType: "audio/mpeg",
      };
    },
    stop() {
      /* no-op until remote stream wired */
    },
  };
}

let registered = false;
export function ensureTtsProvidersRegistered(): void {
  if (registered) return;
  registered = true;
  registerTtsProvider(browserTts);
  registerTtsProvider(stubTts("google", "Google Cloud TTS"));
  registerTtsProvider(stubTts("azure", "Azure TTS"));
  registerTtsProvider(stubTts("elevenlabs", "ElevenLabs"));
  registerTtsProvider(stubTts("gemini_native", "Gemini Native Audio (future)"));
  registerTtsProvider(stubTts("openai_realtime", "OpenAI Realtime (future)"));
}

export { listTtsProviders, getTtsProvider } from "./types";
export { listSttProviders, getSttProvider } from "../stt/types";
