import type { OrchestratorToolResult, ToolAdapterContext, ToolOrchestratorTimelineEvent } from "./types";
import { getOrchestratorTool } from "./toolRegistry";
import { executeRegisteredTool } from "./registeredToolRunner";

/** Execute tools concurrently — individual failures never reject the group. */
export async function runParallel(
  toolIds: string[],
  ctx: ToolAdapterContext,
  push: (e: ToolOrchestratorTimelineEvent) => void,
): Promise<OrchestratorToolResult[]> {
  return Promise.all(
    toolIds.map(async (id) => {
      const adapter = getOrchestratorTool(id);
      if (!adapter) {
        return {
          toolId: id,
          status: "unknown_tool" as const,
          executionTimeMs: 0,
          result: null,
          errors: [`Unknown tool: ${id}`],
          metadata: {},
          confidence: 0,
          source: "registry",
          cached: false,
          retries: 0,
        } satisfies OrchestratorToolResult;
      }
      return executeRegisteredTool(adapter, ctx, push);
    }),
  );
}
