import { getProviderByName, listProviderNames, type AIProvider } from "./provider";
import type { AIProviderName, AIRequest, AIResponse, StreamResponseOptions } from "./types";

export type {
  AIProviderName,
  AIMessage,
  AIRequest,
  AIResponse,
  AICMSContext,
  AISessionContext,
  AIToolResult,
  AIRole,
  AIStreamChunk,
  StreamResponseHandler,
  StreamResponseOptions,
} from "./types";

export type { AIProvider } from "./provider";
export { getProviderByName, listProviderNames };
export {
  buildRelevantCMSContext,
  buildSessionContext,
  buildToolResults,
  enrichAIRequest,
} from "./context";
export {
  orchestrateAIRequest,
  enrichAIRequestWithOrchestrator,
} from "./orchestrator";
export {
  createExecutionPlan,
  createAndLogExecutionPlan,
  summarizePlan,
} from "./planner";
export type { AgentExecutionPlan, PlannerInput, PlannerIntent } from "./planner";
export { runToolOrchestrator, registerOrchestratorTool } from "./toolOrchestrator";
export type { ToolOrchestratorResult, UnifiedContextPackage } from "./toolOrchestrator";
export {
  AIProviderError,
  CHEFFY_KITCHEN_ERROR,
  isAbortError,
  isProviderUnavailable,
  toGuestErrorMessage,
} from "./errors";
export { buildCheffySystemPrompt, CHEFFY_SYSTEM_PROMPT_CORE } from "./systemPrompt";
export {
  parseMessageActions,
  stripActionMarkup,
  resolveActionTarget,
  type CheffyAction,
  type CheffyActionType,
} from "./actions";
export { executeConciergeTools, selectToolsForMessage, TOOL_DEFINITIONS } from "./tools";

const ENV_PROVIDER_KEY = "VITE_AI_PROVIDER";

function readConfiguredProvider(): AIProviderName {
  const raw = import.meta.env[ENV_PROVIDER_KEY] as string | undefined;
  const normalized = raw?.trim().toLowerCase() as AIProviderName | undefined;
  if (normalized && listProviderNames().includes(normalized)) {
    return normalized;
  }
  return "gemini";
}

let activeProvider: AIProvider | null = null;

function resolveProvider(): AIProvider {
  if (!activeProvider) {
    activeProvider = getProviderByName(readConfiguredProvider());
  }
  return activeProvider;
}

export function setActiveProvider(name: AIProviderName): void {
  activeProvider = getProviderByName(name);
}

export function getActiveProviderName(): AIProviderName {
  return resolveProvider().name;
}

export function switchModel(model: string): void {
  resolveProvider().switchModel(model);
}

export function getActiveModel(): string {
  return resolveProvider().getModel();
}

export async function generateResponse(request: AIRequest): Promise<AIResponse> {
  return resolveProvider().generateResponse(request);
}

export async function streamResponse(
  request: AIRequest,
  options: StreamResponseOptions,
): Promise<AIResponse> {
  const { onChunk, signal } = options;
  const mergedRequest: AIRequest = { ...request, signal: signal ?? request.signal };

  let finalContent = "";

  for await (const chunk of resolveProvider().streamResponse(mergedRequest)) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    finalContent = chunk.content;
    onChunk(chunk);
    if (chunk.done) break;
  }

  return { content: finalContent };
}

export async function callTools(request: AIRequest): Promise<import("./types").AIToolResult[]> {
  return resolveProvider().callTools(request);
}
