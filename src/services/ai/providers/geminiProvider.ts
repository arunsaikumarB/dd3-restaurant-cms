import type { AIProviderName, AIRequest, AIResponse, AIStreamChunk, AIToolResult } from "../types";
import {
  fetchConciergeCompletion,
  streamFromConciergeAPI,
  type AIProvider,
} from "./providerTypes";

export class GeminiProvider implements AIProvider {
  readonly name = "gemini" as const satisfies AIProviderName;
  private model: string;

  constructor(model?: string) {
    this.model =
      model ??
      (import.meta.env.VITE_GEMINI_MODEL as string | undefined) ??
      "gemini-2.0-flash";
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
    return fetchConciergeCompletion({ ...request, model: this.model }, "gemini");
  }

  async *streamResponse(request: AIRequest): AsyncGenerator<AIStreamChunk> {
    yield* streamFromConciergeAPI({ ...request, model: this.model }, "gemini");
  }
}
