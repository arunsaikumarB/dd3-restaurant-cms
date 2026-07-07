import type { AIProviderName, AIRequest, AIToolResult } from "../types";
import type { AIProvider } from "./providerTypes";

abstract class BaseMockProvider implements AIProvider {
  abstract readonly name: AIProviderName;
  protected model = "mock";

  getModel(): string {
    return this.model;
  }

  switchModel(model: string): void {
    this.model = model.trim() || this.model;
  }

  async callTools(request: AIRequest): Promise<AIToolResult[]> {
    return request.toolResults ?? [];
  }

  async generateResponse(request: AIRequest) {
    await delay(450, request.signal);
    return { content: buildMockReply(this.name, request) };
  }

  async *streamResponse(request: AIRequest) {
    await delay(450, request.signal);
    const fullText = buildMockReply(this.name, request);
    let accumulated = "";
    for (let i = 0; i < fullText.length; i += 3) {
      if (request.signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const delta = fullText.slice(i, i + 3);
      accumulated += delta;
      yield { content: accumulated, delta, done: false };
      if (accumulated.length < fullText.length) await delay(12, request.signal);
    }
    yield { content: fullText, delta: "", done: true };
  }
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = window.setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      window.clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}

function buildMockReply(provider: AIProviderName, request: AIRequest): string {
  const preview = request.message.trim().slice(0, 80);
  const tools = request.toolResults?.map((t) => t.tool).join(", ") ?? "none";
  return `Mock ${provider}: "${preview}" (tools: ${tools})`;
}

export class MockClaudeProvider extends BaseMockProvider {
  readonly name = "claude" as const;
}

export class MockOpenAIProvider extends BaseMockProvider {
  readonly name = "openai" as const;
}

export class MockDefaultProvider extends BaseMockProvider {
  readonly name = "mock" as const;
}
