import type { TtsProviderId, TtsResult, VoiceSettings } from "../types";

export type TtsSpeakInput = {
  text: string;
  language: string;
  settings: Pick<VoiceSettings, "voiceName" | "voiceGender" | "voiceSpeed" | "voicePitch">;
  signal?: AbortSignal;
};

export interface TextToSpeechProvider {
  id: TtsProviderId;
  label: string;
  speak(input: TtsSpeakInput): Promise<TtsResult>;
  /** Stop current utterance (interruptions). */
  stop?(): void;
}

const registry = new Map<TtsProviderId, TextToSpeechProvider>();

export function registerTtsProvider(provider: TextToSpeechProvider): void {
  registry.set(provider.id, provider);
}

export function getTtsProvider(id: TtsProviderId): TextToSpeechProvider | null {
  return registry.get(id) ?? null;
}

export function listTtsProviders(): TextToSpeechProvider[] {
  return [...registry.values()];
}
