import { readToolCache, writeToolCache } from "./toolCache";
import { getToolDefinition } from "./registry";
import { resolveToolPlan } from "./intentResolver";
import { logToolExecution } from "./toolLogger";
import type {
  ToolExecutionContext,
  ToolExecutionResult,
  ToolExecutorOptions,
  ToolName,
} from "./types";

function runWithRetry(
  toolName: ToolName,
  execute: () => ToolExecutionResult,
): { result: ToolExecutionResult; success: boolean } {
  try {
    return { result: execute(), success: true };
  } catch {
    try {
      return { result: execute(), success: true };
    } catch {
      return {
        result: { tool: toolName, available: false, data: null },
        success: false,
      };
    }
  }
}

function executeSingleTool(
  toolName: ToolName,
  ctx: ToolExecutionContext,
  knowledgeVersion: string,
): ToolExecutionResult {
  const definition = getToolDefinition(toolName);
  if (!definition) {
    const failure: ToolExecutionResult = { tool: toolName, available: false, data: null };
    logToolExecution({
      conversationId: ctx.conversationId,
      tool: toolName,
      locationId: ctx.locationId,
      durationMs: 0,
      success: false,
      cached: false,
    });
    return failure;
  }

  if (definition.cacheable) {
    const cached = readToolCache(ctx.locationId, toolName, knowledgeVersion);
    if (cached) {
      logToolExecution({
        conversationId: ctx.conversationId,
        tool: toolName,
        locationId: ctx.locationId,
        durationMs: 0,
        success: cached.available,
        cached: true,
      });
      return cached;
    }
  }

  const started = performance.now();
  const { result: raw, success } = runWithRetry(toolName, () => {
    const output = definition.execute(ctx);
    return { ...output, tool: toolName };
  });

  const durationMs = Math.round(performance.now() - started);
  const result: ToolExecutionResult = {
    ...raw,
    tool: toolName,
    durationMs,
  };

  if (!success) {
    result.available = false;
    result.data = null;
  }

  if (definition.cacheable && result.available) {
    writeToolCache(ctx.locationId, toolName, knowledgeVersion, result);
  }

  logToolExecution({
    conversationId: ctx.conversationId,
    tool: toolName,
    locationId: ctx.locationId,
    durationMs,
    success: success && result.available,
    cached: false,
  });

  return result;
}

/** Executes one or more concierge tools with cache, retry, and structured logging. */
export function executeTools(options: ToolExecutorOptions): ToolExecutionResult[] {
  const { message, knowledge, conversationId, toolNames } = options;
  const plan = toolNames?.length
    ? { intents: resolveToolPlan(message).intents, tools: toolNames }
    : resolveToolPlan(message);

  const ctx: ToolExecutionContext = {
    message,
    knowledge,
    locationId: knowledge.locationId,
    conversationId,
  };

  const version = knowledge.generatedAt;
  return plan.tools.map((name) => executeSingleTool(name, ctx, version));
}
