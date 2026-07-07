import type { AIProviderName, AIRequest, AIResponse, AIStreamChunk, AIToolResult } from "../types";
import {
  fetchConciergeCompletion,
  streamFromConciergeAPI,
  type AIProvider,
} from "./providerTypes";

export class OpenAIProvider implements AIProvider {
  readonly name = "openai" as const satisfies AIProviderName;
  private model: string;

  constructor(model?: string) {
    this.model =
      model ?? (import.meta.env.VITE_OPENAI_MODEL as string | undefined) ?? "gpt-4o-mini";
  }

  getModel(): string {
    return this.model;
  }

  switchModel(model: string): void {
    this.model = model.trim() || this.model;
  }

  async callTools(request: AIRequest): Promise<AIToolResult[]> {
    return request.toolResults ?? [];
  }

  async generateResponse(request: AIRequest): Promise<AIResponse> {
    return fetchConciergeCompletion({ ...request, model: this.model }, "openai");
  }

  async *streamResponse(request: AIRequest): AsyncGenerator<AIStreamChunk> {
    yield* streamFromConciergeAPI({ ...request, model: this.model }, "openai");
  }
}
