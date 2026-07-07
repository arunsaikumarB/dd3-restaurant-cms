import type { AISessionContext } from "./types";

const PREFS_KEY = "cheffy_session_prefs";
const CONVERSATION_KEY = "cheffy_conversation_id";

export function getOrCreateConversationId(): string {
  try {
    const existing = sessionStorage.getItem(CONVERSATION_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(CONVERSATION_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function readSessionPreferences(): AISessionContext["preferences"] {
  try {
    const raw = sessionStorage.getItem(PREFS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as AISessionContext["preferences"];
  } catch {
    return {};
  }
}

export function writeSessionPreferences(prefs: AISessionContext["preferences"]): void {
  try {
    sessionStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

export type { GuestSessionProfile } from "./personality/types";
