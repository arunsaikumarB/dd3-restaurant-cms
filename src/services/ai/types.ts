/** Provider identifiers — used only inside the service layer, never exposed to UI. */
export type AIProviderName = "openai" | "claude" | "gemini" | "mock";

export type AIRole = "user" | "assistant" | "system";

export type AIMessage = {
  role: AIRole;
  content: string;
};

export type AICMSContext = {
  intent: string;
  modules: string[];
  context: Record<string, unknown>;
};

export type AIToolResult = {
  tool: string;
  available: boolean;
  data: unknown;
};

import type { GuestSessionProfile } from "./personality/types";

export type AISessionContext = {
  locationId: string;
  locationName: string;
  preferences?: GuestSessionProfile;
};

export type AIRequest = {
  message: string;
  history: AIMessage[];
  cmsContext?: AICMSContext;
  toolResults?: AIToolResult[];
  session?: AISessionContext;
  conversationId?: string;
  model?: string;
  signal?: AbortSignal;
};

export type AIResponse = {
  content: string;
};

export type AIStreamChunk = {
  content: string;
  delta: string;
  done: boolean;
};

export type StreamResponseHandler = (chunk: AIStreamChunk) => void;

export type StreamResponseOptions = {
  signal?: AbortSignal;
  onChunk: StreamResponseHandler;
};

export type ConciergeAPIBody = {
  provider?: AIProviderName;
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  cmsContext?: AICMSContext;
  toolResults?: AIToolResult[];
  session?: AISessionContext;
  conversationId?: string;
  model?: string;
  stream?: boolean;
};

export type ConciergeStreamEvent =
  | { type: "delta"; delta: string; content: string }
  | { type: "done"; content: string; done: true }
  | { type: "error"; error: string };
