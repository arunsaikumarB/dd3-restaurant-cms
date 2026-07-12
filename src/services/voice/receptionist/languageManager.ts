import { listEnabledLanguages } from "./repository";
import { getOrCreateMemory } from "./conversationManager";

export type LanguageSwitch = {
  switched: boolean;
  language: string;
  ack: string | null;
};

export function detectLanguageSwitchRequest(text: string): string | null {
  const t = text.toLowerCase();
  if (/\b(telugu|తెలుగు)\b/.test(t) && /\b(speak|continue|switch|in|please)\b/.test(t)) return "te";
  if (/\b(hindi|हिंदी|हिन्दी)\b/.test(t) && /\b(speak|continue|switch|in|please)\b/.test(t)) return "hi";
  if (/\b(english)\b/.test(t) && /\b(speak|continue|switch|in|please)\b/.test(t)) return "en";
  if (/can we continue in telugu/.test(t)) return "te";
  if (/can we continue in hindi/.test(t)) return "hi";
  return null;
}

export async function applyLanguageSwitch(
  sessionId: string,
  locationId: string,
  currentLanguage: string,
  text: string,
): Promise<LanguageSwitch> {
  const requested = detectLanguageSwitchRequest(text);
  if (!requested || requested === currentLanguage) {
    return { switched: false, language: currentLanguage, ack: null };
  }
  const enabled = await listEnabledLanguages(locationId);
  const ok = enabled.some((l: { language_code?: string }) => String(l.language_code) === requested);
  if (!ok) {
    return {
      switched: false,
      language: currentLanguage,
      ack: "I can continue in English for now. Hindi and Telugu can be enabled by the restaurant.",
    };
  }
  const mem = getOrCreateMemory(sessionId, locationId, requested);
  mem.language = requested;
  mem.languageSwitches += 1;
  const ack =
    requested === "hi"
      ? "ज़रूर, हम हिंदी में बात जारी रख सकते हैं।"
      : requested === "te"
        ? "సరే, తెలుగులో కొనసాగిద్దాం."
        : "Of course — we can continue in English.";
  return { switched: true, language: requested, ack };
}
