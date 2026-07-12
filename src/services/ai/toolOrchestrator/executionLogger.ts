import { createClientIfConfigured } from "../../../lib/supabase/client";
import type { ToolOrchestratorResult, ToolOrchestratorTimelineEvent } from "./types";

function table(name: string) {
  const c = createClientIfConfigured();
  if (!c) return null;
  return (c as unknown as { from: (t: string) => ReturnType<NonNullable<ReturnType<typeof createClientIfConfigured>>["from"]> }).from(
    name,
  );
}

export async function persistOrchestratorRun(
  result: ToolOrchestratorResult,
  meta?: { conversationId?: string | null; locationId?: string | null },
): Promise<void> {
  try {
    const exec = table("agent_tool_executions");
    if (exec) {
      const rows = result.toolResults.map((r) => ({
        package_id: result.packageId,
        plan_id: result.planId,
        conversation_id: meta?.conversationId ?? null,
        location_id: meta?.locationId ?? null,
        tool_id: String(r.toolId),
        status: r.status,
        execution_time_ms: r.executionTimeMs,
        retries: r.retries,
        cached: r.cached,
        errors: r.errors,
        result_preview: JSON.stringify(r.result)?.slice(0, 2000) ?? null,
        metadata: r.metadata,
      }));
      if (rows.length) await exec.insert(rows);
    }

    const pkg = table("agent_context_packages");
    if (pkg) {
      await pkg.insert({
        id: result.packageId,
        plan_id: result.planId,
        conversation_id: meta?.conversationId ?? null,
        location_id: meta?.locationId ?? null,
        mode: result.schedule.mode,
        duration_ms: result.durationMs,
        package_json: result.contextPackage,
        timeline_json: result.timeline,
        success_count: result.contextPackage.meta.successCount,
        failure_count: result.contextPackage.meta.failureCount,
      });
    }

    const metrics = table("agent_execution_metrics");
    if (metrics) {
      await metrics.insert({
        metric_key: "orchestrator_run",
        metric_value: 1,
        plan_id: result.planId,
        duration_ms: result.durationMs,
        tool_count: result.toolResults.length,
        mode: result.schedule.mode,
        location_id: meta?.locationId ?? null,
        dimensions: {
          success: result.contextPackage.meta.successCount,
          failures: result.contextPackage.meta.failureCount,
          cacheHits: result.contextPackage.meta.cacheHits,
        },
      });
    }

    const cache = table("agent_cache_metrics");
    if (cache) {
      await cache.insert([
        {
          metric_key: "cache_hit",
          metric_value: result.contextPackage.meta.cacheHits,
          location_id: meta?.locationId ?? null,
        },
        {
          metric_key: "cache_miss",
          metric_value: result.contextPackage.meta.cacheMisses,
          location_id: meta?.locationId ?? null,
        },
      ]);
    }

    const failures = result.toolResults.filter((r) =>
      ["failed", "timeout", "circuit_open", "unknown_tool"].includes(r.status),
    );
    if (failures.length) {
      const failTable = table("agent_failures");
      if (failTable) {
        await failTable.insert(
          failures.map((f) => ({
            package_id: result.packageId,
            plan_id: result.planId,
            tool_id: String(f.toolId),
            status: f.status,
            errors: f.errors,
            location_id: meta?.locationId ?? null,
          })),
        );
      }
    }
  } catch {
    /* never block guest path */
  }
}

export function createTimelinePusher(events: ToolOrchestratorTimelineEvent[]) {
  return (event: ToolOrchestratorTimelineEvent) => {
    events.push(event);
  };
}
