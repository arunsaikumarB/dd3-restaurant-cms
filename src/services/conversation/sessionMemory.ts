import type { ChatMessage } from "./types";
import type { CheffyAction } from "../ai/actions";

export const HISTORY_KEY = "cheffy_history";
export const ENTERED_KEY = "cheffy_has_entered";
export const LAST_NUDGE_KEY = "cheffy_last_nudge";

function migrateLegacyButtons(message: ChatMessage): ChatMessage {
  if (message.actions?.length || !message.buttons?.length) {
    return message;
  }

  const actions: CheffyAction[] = message.buttons.map((btn) => ({
    id: `button:${btn.label}:${btn.path}`,
    type: "button",
    label: btn.label,
    value: btn.path,
  }));

  return { ...message, actions, buttons: undefined };
}

export function readConversationHistory(): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatMessage[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((m) =>
      migrateLegacyButtons({
        ...m,
        status: m.status ?? "complete",
      }),
    );
  } catch {
    return [];
  }
}

export function writeConversationHistory(messages: ChatMessage[]): void {
  try {
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(messages));
  } catch {
    /* ignore quota / private mode */
  }
}

export function readSessionFlag(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

export function writeSessionFlag(key: string, value: boolean): void {
  try {
    sessionStorage.setItem(key, value ? "true" : "false");
  } catch {
    /* ignore */
  }
}

export function readSessionNumber(key: string): number {
  try {
    return Number(sessionStorage.getItem(key) ?? 0);
  } catch {
    return 0;
  }
}

export function writeSessionNumber(key: string, value: number): void {
  try {
    sessionStorage.setItem(key, String(value));
  } catch {
    /* ignore */
  }
}
