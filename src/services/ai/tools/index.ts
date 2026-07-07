import type { CMSKnowledge } from "../../cms/knowledge";
import type { AIToolResult } from "../types";
import { mapLegacyToolName, resolveToolPlan, selectToolsForMessage } from "./intentResolver";
import { LEGACY_TOOL_ALIASES, TOOL_DEFINITIONS, listRegisteredTools } from "./registry";
import { executeTools } from "./toolExecutor";
import type { LegacyToolName, ToolName } from "./types";

/** @deprecated Use ToolName — kept for backward compatibility. */
export type ConciergeToolName = ToolName | LegacyToolName;

export type ToolResult = AIToolResult;

export {
  executeTools,
  resolveToolPlan,
  selectToolsForMessage,
  TOOL_DEFINITIONS,
  listRegisteredTools,
  LEGACY_TOOL_ALIASES,
  mapLegacyToolName,
};

export type {
  ToolName,
  ToolDefinition,
  ToolExecutionResult,
  ToolPlan,
  ToolExecutorOptions,
} from "./types";

export { clearToolCache, invalidateLocationToolCache } from "./toolCache";
export { getRecentToolLogs, logToolExecution } from "./toolLogger";
export type { FutureConciergeTool } from "./futureTools";

function normalizeToolNames(names?: ConciergeToolName[]): ToolName[] | undefined {
  if (!names?.length) return undefined;
  return names.map((name) => mapLegacyToolName(name) ?? (name as ToolName));
}

/**
 * Executes concierge tools against live CMS knowledge (client-side, before AI call).
 * Supports multi-tool plans, per-location cache, retry, and logging.
 */
export function executeConciergeTools(
  message: string,
  knowledge: CMSKnowledge,
  toolNames?: ConciergeToolName[],
  conversationId?: string,
): AIToolResult[] {
  return executeTools({
    message,
    knowledge,
    conversationId,
    toolNames: normalizeToolNames(toolNames),
  });
}
