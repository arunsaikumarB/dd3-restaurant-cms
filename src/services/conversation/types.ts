import type { CheffyAction } from "../ai/actions";

export type ChatRole = "user" | "assistant" | "system";

export type MessageStatus = "pending" | "streaming" | "complete" | "error";

/** @deprecated Use CheffyAction — kept for persisted session migration. */
export type ReplyButton = { label: string; path: string };

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  status: MessageStatus;
  actions?: CheffyAction[];
  /** @deprecated Migrated to `actions` on read. */
  buttons?: ReplyButton[];
};

export type ConversationStatus = "idle" | "typing" | "streaming";
