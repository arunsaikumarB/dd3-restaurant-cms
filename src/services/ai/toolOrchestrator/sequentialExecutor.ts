import type { OrchestratorToolResult, ToolAdapterContext, ToolOrchestratorTimelineEvent } from "./types";
import { getOrchestratorTool } from "./toolRegistry";
import { executeRegisteredTool } from "./registeredToolRunner";

/** Execute tools one after another — never abort the queue on failure. */
export async function runSequential(
  toolIds: string[],
  ctx: ToolAdapterContext,
  push: (e: ToolOrchestratorTimelineEvent) => void,
): Promise<OrchestratorToolResult[]> {
  const results: OrchestratorToolResult[] = [];
  for (const id of toolIds) {
    const adapter = getOrchestratorTool(id);
    if (!adapter) {
      results.push(unknownTool(id));
      continue;
    }
    results.push(await executeRegisteredTool(adapter, ctx, push));
  }
  return results;
}

function unknownTool(id: string): OrchestratorToolResult {
  return {
    toolId: id,
    status: "unknown_tool",
    executionTimeMs: 0,
    result: null,
    errors: [`Unknown tool: ${id}`],
    metadata: {},
    confidence: 0,
    source: "registry",
    cached: false,
    retries: 0,
  };
}
