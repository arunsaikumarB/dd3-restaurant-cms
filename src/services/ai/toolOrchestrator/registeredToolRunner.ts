import type { OrchestratorToolResult, ToolAdapter, ToolAdapterContext, ToolOrchestratorTimelineEvent } from "./types";
import { isCircuitOpen, recordCircuitFailure, recordCircuitSuccess } from "./circuitBreaker";
import { cacheKey, readOrchestratorCache, writeOrchestratorCache } from "./cacheManager";
import { DEFAULT_RETRY, withRetry, withTimeout } from "./retryPolicy";

export async function executeRegisteredTool(
  adapter: ToolAdapter,
  ctx: ToolAdapterContext,
  push: (e: ToolOrchestratorTimelineEvent) => void,
): Promise<OrchestratorToolResult> {
  const started = performance.now();
  push({ type: "tool_start", at: new Date().toISOString(), toolId: String(adapter.id) });

  if (isCircuitOpen(adapter.id)) {
    const result: OrchestratorToolResult = {
      toolId: adapter.id,
      status: "circuit_open",
      executionTimeMs: 0,
      result: null,
      errors: ["Circuit breaker open"],
      metadata: {},
      confidence: 0,
      source: adapter.source,
      cached: false,
      retries: 0,
    };
    push({
      type: "tool_failure",
      at: new Date().toISOString(),
      toolId: String(adapter.id),
      detail: "circuit_open",
    });
    return result;
  }

  if (adapter.cacheable) {
    const key = cacheKey([adapter.id, ctx.locationId, ctx.message.slice(0, 80)]);
    const cached = readOrchestratorCache(key);
    if (cached != null) {
      push({ type: "cache_hit", at: new Date().toISOString(), toolId: String(adapter.id) });
      return {
        toolId: adapter.id,
        status: "success",
        executionTimeMs: Math.round(performance.now() - started),
        result: cached,
        errors: [],
        metadata: { cache: true },
        confidence: 0.9,
        source: adapter.source,
        cached: true,
        retries: 0,
      };
    }
    push({ type: "cache_miss", at: new Date().toISOString(), toolId: String(adapter.id) });
  }

  try {
    const { value, retries } = await withRetry(
      { ...DEFAULT_RETRY, maxRetries: adapter.maxRetries },
      () =>
        withTimeout(
          adapter.execute(ctx),
          adapter.timeoutMs,
        ),
      (attempt) =>
        push({
          type: "tool_retry",
          at: new Date().toISOString(),
          toolId: String(adapter.id),
          detail: `retry ${attempt}`,
        }),
    );

    recordCircuitSuccess(adapter.id);
    if (adapter.cacheable) {
      writeOrchestratorCache(cacheKey([adapter.id, ctx.locationId, ctx.message.slice(0, 80)]), value.result);
    }

    const durationMs = Math.round(performance.now() - started);
    push({
      type: "tool_finish",
      at: new Date().toISOString(),
      toolId: String(adapter.id),
      durationMs,
      detail: "success",
    });

    return {
      toolId: adapter.id,
      status: "success",
      executionTimeMs: durationMs,
      result: value.result,
      errors: [],
      metadata: value.metadata ?? {},
      confidence: value.confidence ?? 0.85,
      source: adapter.source,
      cached: false,
      retries,
    };
  } catch (err) {
    recordCircuitFailure(adapter.id);
    const message = err instanceof Error ? err.message : String(err);
    const isTimeout = /timeout/i.test(message);
    const durationMs = Math.round(performance.now() - started);
    push({
      type: isTimeout ? "tool_timeout" : "tool_failure",
      at: new Date().toISOString(),
      toolId: String(adapter.id),
      durationMs,
      detail: message,
    });
    return {
      toolId: adapter.id,
      status: isTimeout ? "timeout" : "failed",
      executionTimeMs: durationMs,
      result: null,
      errors: [message],
      metadata: {},
      confidence: 0,
      source: adapter.source,
      cached: false,
      retries: adapter.maxRetries,
    };
  }
}
