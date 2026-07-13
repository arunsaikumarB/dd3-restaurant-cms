import type { GeminiLiveSessionState } from "./types";

export type InterruptionController = {
  interrupted: boolean;
  abortController: AbortController;
  interrupt: () => void;
  reset: () => void;
  signal: AbortSignal;
};

let active: InterruptionController | null = null;

export function createInterruptionController(): InterruptionController {
  const abortController = new AbortController();
  const ctrl: InterruptionController = {
    interrupted: false,
    abortController,
    signal: abortController.signal,
    interrupt() {
      this.interrupted = true;
      try {
        this.abortController.abort();
      } catch {
        /* ignore */
      }
    },
    reset() {
      this.interrupted = false;
      this.abortController = new AbortController();
      this.signal = this.abortController.signal;
    },
  };
  active = ctrl;
  return ctrl;
}

export function getActiveInterruption(): InterruptionController | null {
  return active;
}

export function interruptActiveSpeech(): void {
  active?.interrupt();
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export function mapStateAfterInterrupt(prev: GeminiLiveSessionState): GeminiLiveSessionState {
  if (prev === "speaking") return "interrupted";
  return "listening";
}
