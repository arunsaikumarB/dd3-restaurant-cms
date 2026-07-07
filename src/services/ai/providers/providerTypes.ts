import type {
  AIProviderName,
  AIRequest,
  AIResponse,
  AIStreamChunk,
  AIToolResult,
  ConciergeAPIBody,
  ConciergeStreamEvent,
} from "../types";
import { AIProviderError, CHEFFY_KITCHEN_ERROR } from "../errors";

const GUEST_SAFE_ERROR = CHEFFY_KITCHEN_ERROR;

export const CONCIERGE_API_PATH = "/.netlify/functions/ai-concierge";

export interface AIProvider {
  readonly name: AIProviderName;
  getModel(): string;
  switchModel(model: string): void;
  generateResponse(request: AIRequest): Promise<AIResponse>;
  streamResponse(request: AIRequest): AsyncGenerator<AIStreamChunk>;
  callTools(request: AIRequest): Promise<AIToolResult[]>;
}

export function toConciergeBody(request: AIRequest, provider: AIProviderName, stream: boolean): ConciergeAPIBody {
  return {
    provider,
    message: request.message,
    history: request.history
      .filter((m): m is { role: "user" | "assistant"; content: string } =>
        m.role === "user" || m.role === "assistant",
      )
      .slice(-12)
      .map(({ role, content }) => ({ role, content })),
    cmsContext: request.cmsContext,
    toolResults: request.toolResults,
    session: request.session,
    conversationId: request.conversationId,
    stream,
  };
}

export async function parseProviderError(response: Response): Promise<AIProviderError> {
  let code = "upstream_error";
  try {
    const data = (await response.json()) as { code?: string };
    if (data.code) code = data.code;
  } catch {
    /* ignore */
  }
  return new AIProviderError(GUEST_SAFE_ERROR, code, response.status);
}

export async function* readConciergeStream(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<ConciergeStreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const line = part.split("\n").find((entry) => entry.startsWith("data: "));
        if (!line) continue;
        try {
          yield JSON.parse(line.slice(6)) as ConciergeStreamEvent;
        } catch {
          /* skip malformed chunk */
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function* streamFromConciergeAPI(
  request: AIRequest,
  provider: AIProviderName,
): AsyncGenerator<AIStreamChunk> {
  const response = await fetch(CONCIERGE_API_PATH, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(toConciergeBody(request, provider, true)),
    signal: request.signal,
  });

  if (!response.ok) throw await parseProviderError(response);
  if (!response.body) throw new AIProviderError("No stream body", "no_stream", 502);

  let accumulated = "";
  for await (const event of readConciergeStream(response.body, request.signal)) {
    if (event.type === "error") {
      throw new AIProviderError(GUEST_SAFE_ERROR, "stream_error", 502);
    }
    if (event.type === "delta") {
      accumulated = event.content;
      yield { content: accumulated, delta: event.delta, done: false };
    }
    if (event.type === "done") {
      accumulated = event.content;
      yield { content: accumulated, delta: "", done: true };
      return;
    }
  }

  if (accumulated) {
    yield { content: accumulated, delta: "", done: true };
  }
}

export async function fetchConciergeCompletion(
  request: AIRequest,
  provider: AIProviderName,
): Promise<AIResponse> {
  const response = await fetch(CONCIERGE_API_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toConciergeBody(request, provider, false)),
    signal: request.signal,
  });

  if (!response.ok) throw await parseProviderError(response);

  const data = (await response.json()) as { content?: string };
  if (!data.content?.trim()) {
    throw new AIProviderError("Empty AI response", "empty_response", 502);
  }

  return { content: data.content.trim() };
}
