import type { ChatMessage, ChatRole, MessageStatus } from "./types";

export const HISTORY_LIMIT = 40;

export function createMessage(
  role: ChatRole,
  content: string,
  extra?: Partial<Pick<ChatMessage, "status" | "actions" | "buttons">>,
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: Date.now(),
    status: extra?.status ?? "complete",
    actions: extra?.actions,
    buttons: extra?.buttons,
  };
}

export function trimHistory(messages: ChatMessage[]): ChatMessage[] {
  return messages.slice(-HISTORY_LIMIT);
}

export function appendMessage(messages: ChatMessage[], message: ChatMessage): ChatMessage[] {
  return trimHistory([...messages, message]);
}

export function updateMessage(
  messages: ChatMessage[],
  id: string,
  patch: Partial<ChatMessage>,
): ChatMessage[] {
  return messages.map((m) => (m.id === id ? { ...m, ...patch } : m));
}

export function clearMessages(): ChatMessage[] {
  return [];
}

export function getVisibleMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.filter((m) => m.role !== "system");
}

export function hasUserMessages(messages: ChatMessage[]): boolean {
  return messages.some((m) => m.role === "user");
}

export function lastUserPreview(messages: ChatMessage[]): string | null {
  const last = [...messages].reverse().find((m) => m.role === "user");
  if (!last) return null;
  const t = last.content.trim();
  return t.length > 72 ? `${t.slice(0, 72)}…` : t;
}

export function isMessageStreaming(message: ChatMessage): boolean {
  return message.status === "streaming" || message.status === "pending";
}

export function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = window.setTimeout(() => resolve(), ms);
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export type StreamOptions = {
  charsPerStep?: number;
  delayMs?: number;
  signal?: AbortSignal;
};

/**
 * Streaming-ready chunk emitter. Future AI providers can pipe tokens through this.
 */
export async function streamText(
  fullText: string,
  onChunk: (slice: string, status: MessageStatus) => void,
  options: StreamOptions = {},
): Promise<void> {
  const { charsPerStep = 2, delayMs = 14, signal } = options;
  onChunk("", "streaming");

  let i = 0;
  while (i < fullText.length) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    i = Math.min(fullText.length, i + charsPerStep);
    onChunk(fullText.slice(0, i), i < fullText.length ? "streaming" : "complete");
    if (i < fullText.length) await delay(delayMs, signal);
  }
}
