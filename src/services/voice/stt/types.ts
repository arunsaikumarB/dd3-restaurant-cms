import type { PartialTranscript, SttProviderId, SttResult } from "../types";

export type SttStreamHandlers = {
  onPartial?: (t: PartialTranscript) => void;
  onFinal?: (t: PartialTranscript) => void;
  onError?: (err: Error) => void;
};

export interface SpeechToTextProvider {
  id: SttProviderId;
  label: string;
  /** Streaming transcription from MediaStream when supported. */
  startStream?(
    stream: MediaStream,
    language: string,
    handlers: SttStreamHandlers,
  ): Promise<{ stop: () => void }>;
  /** One-shot recognize from audio blob / pcm. */
  recognize?(
    audio: Blob | ArrayBuffer,
    language: string,
  ): Promise<SttResult>;
  /** Browser / mock: accept a final text as if STT produced it. */
  fromText?(text: string, language: string): Promise<SttResult>;
}

const registry = new Map<SttProviderId, SpeechToTextProvider>();

export function registerSttProvider(provider: SpeechToTextProvider): void {
  registry.set(provider.id, provider);
}

export function getSttProvider(id: SttProviderId): SpeechToTextProvider | null {
  return registry.get(id) ?? null;
}

export function listSttProviders(): SpeechToTextProvider[] {
  return [...registry.values()];
}
