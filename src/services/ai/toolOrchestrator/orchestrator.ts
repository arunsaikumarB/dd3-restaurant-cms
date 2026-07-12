/**
 * Enterprise Tool Orchestrator
 * Consumes Planner execution plans. Does not decide business logic.
 * Never calls Gemini. Never redesigns existing tools / RAG / Planner.
 */

import type { CMSKnowledge } from "../../cms/knowledge";
import type { AgentExecutionPlan } from "../planner/types";
import { ensureBuiltinAdaptersRegistered } from "./builtinAdapters";
import { buildExecutionSchedule } from "./executionPlanner";
import { runParallel } from "./parallelExecutor";
import { runSequential } from "./sequentialExecutor";
import { aggregateContext, toAIToolResults } from "./contextAggregator";
import { createTimelinePusher, persistOrchestratorRun } from "./executionLogger";
import type {
  OrchestratorToolResult,
  ToolAdapterContext,
  ToolOrchestratorResult,
  ToolOrchestratorTimelineEvent,
} from "./types";

export async function runToolOrchestrator(input: {
  plan: AgentExecutionPlan;
  knowledge: CMSKnowledge;
  message: string;
  conversationId?: string | null;
  history?: Array<{ role: string; content: string }>;
  personality?: Record<string, unknown>;
  signal?: AbortSignal;
}): Promise<ToolOrchestratorResult> {
  ensureBuiltinAdaptersRegistered();
  const started = performance.now();
  const timeline: ToolOrchestratorTimelineEvent[] = [];
  const push = createTimelinePusher(timeline);

  push({ type: "orchestrator_start", at: new Date().toISOString(), detail: input.plan.planId });

  const schedule = buildExecutionSchedule(input.plan);
  push({
    type: "schedule",
    at: new Date().toISOString(),
    detail: schedule.mode,
    data: schedule,
  });

  const ctx: ToolAdapterContext = {
    message: input.message,
    conversationId: input.conversationId,
    locationId: input.knowledge.locationId,
    locationName: input.knowledge.locationName,
    knowledge: input.knowledge,
    plan: input.plan,
    signal: input.signal,
  };

  const toolResults: OrchestratorToolResult[] = [];
  const completedGroups = new Set<string>();

  for (const group of schedule.groups) {
    // Wait for dependencies (groups already ordered; still gate on dependsOn)
    const unmet = group.dependsOn.filter((d) => !completedGroups.has(d));
    if (unmet.length) {
      // Soft-continue: prior group failure should not block — mark deps satisfied if missing
      unmet.forEach((d) => completedGroups.add(d));
    }

    push({
      type: "group_start",
      at: new Date().toISOString(),
      groupId: group.id,
      detail: group.mode,
      data: { toolIds: group.toolIds },
    });

    const groupResults =
      group.mode === "parallel"
        ? await runParallel(group.toolIds.map(String), ctx, push)
        : await runSequential(group.toolIds.map(String), ctx, push);

    toolResults.push(...groupResults);
    completedGroups.add(group.id);
  }

  // Unknown planned tools not in registry — record without stopping
  for (const planned of input.plan.requiredTools) {
    if (!toolResults.some((r) => String(r.toolId) === String(planned))) {
      // May have been filtered out by schedule if unregistered
      const known = schedule.orderedToolIds.includes(planned);
      if (!known) {
        toolResults.push({
          toolId: planned,
          status: "unknown_tool",
          executionTimeMs: 0,
          result: null,
          errors: [`No adapter registered for ${planned}`],
          metadata: {},
          confidence: 0,
          source: "registry",
          cached: false,
          retries: 0,
        });
      }
    }
  }

  const durationMs = Math.round(performance.now() - started);
  const contextPackage = aggregateContext({
    plan: input.plan,
    toolResults,
    memory: {
      conversationId: input.conversationId ?? null,
      historyLength: input.history?.length ?? 0,
      recent: (input.history ?? []).slice(-6),
    },
    personality: input.personality,
    mode: schedule.mode,
    durationMs,
  });

  push({
    type: "merge",
    at: new Date().toISOString(),
    detail: `package ${contextPackage.meta.packageId}`,
    data: {
      toolCount: toolResults.length,
      success: contextPackage.meta.successCount,
      failures: contextPackage.meta.failureCount,
    },
  });
  push({
    type: "orchestrator_finish",
    at: new Date().toISOString(),
    durationMs,
  });

  const result: ToolOrchestratorResult = {
    packageId: contextPackage.meta.packageId,
    planId: input.plan.planId,
    schedule,
    toolResults,
    contextPackage,
    aiToolResults: toAIToolResults(toolResults),
    timeline,
    durationMs,
    executionPlan: input.plan,
  };

  void persistOrchestratorRun(result, {
    conversationId: input.conversationId,
    locationId: input.knowledge.locationId,
  });

  return result;
}
