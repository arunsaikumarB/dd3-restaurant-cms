/**
 * Cross-stage workflow + timeline logger.
 * Called from the guest path only — never modifies Planner / Orchestrator / Reflection.
 */

import { opsTable } from "./client";
import type { WorkflowRecord, WorkflowTimelineEvent } from "./types";

export type PersistWorkflowInput = {
  conversationId?: string | null;
  locationId?: string | null;
  planId?: string | null;
  packageId?: string | null;
  reflectionId?: string | null;
  message?: string;
  intent?: string;
  goal?: string;
  complexity?: string;
  status?: WorkflowRecord["status"];
  success?: boolean;
  timings: WorkflowRecord["timings"];
  confidence?: number | null;
  confidenceBand?: string | null;
  nextAction?: string | null;
  needsFollowUp?: boolean;
  needsEscalation?: boolean;
  toolSuccessCount?: number;
  toolFailureCount?: number;
  timeline: WorkflowTimelineEvent[];
  stages?: string[];
  geminiPreview?: string;
  finalPreview?: string;
  raw?: Record<string, unknown>;
};

export async function persistWorkflow(input: PersistWorkflowInput): Promise<string | null> {
  const workflowId = crypto.randomUUID();
  try {
    const workflows = opsTable("agent_workflows");
    if (!workflows) return null;

    const record: WorkflowRecord = {
      workflowId,
      conversationId: input.conversationId ?? null,
      locationId: input.locationId ?? null,
      planId: input.planId ?? null,
      packageId: input.packageId ?? null,
      reflectionId: input.reflectionId ?? null,
      messagePreview: (input.message ?? "").slice(0, 280),
      intent: input.intent ?? "unknown",
      goal: input.goal ?? "unknown",
      complexity: input.complexity ?? "simple",
      status: input.status ?? "completed",
      success: input.success ?? true,
      timings: input.timings,
      confidence: input.confidence ?? null,
      confidenceBand: input.confidenceBand ?? null,
      nextAction: input.nextAction ?? null,
      needsFollowUp: Boolean(input.needsFollowUp),
      needsEscalation: Boolean(input.needsEscalation),
      toolSuccessCount: input.toolSuccessCount ?? 0,
      toolFailureCount: input.toolFailureCount ?? 0,
      timeline: input.timeline,
      stages: input.stages ?? defaultStages(input),
      geminiPreview: (input.geminiPreview ?? "").slice(0, 2000),
      finalPreview: (input.finalPreview ?? "").slice(0, 2000),
      createdAt: new Date().toISOString(),
      raw: input.raw,
    };

    await workflows.insert({
      id: workflowId,
      conversation_id: record.conversationId,
      location_id: record.locationId,
      plan_id: record.planId,
      package_id: record.packageId,
      reflection_id: record.reflectionId,
      message_preview: record.messagePreview,
      intent: record.intent,
      goal: record.goal,
      complexity: record.complexity,
      status: record.status,
      success: record.success,
      total_ms: record.timings.totalMs,
      planner_ms: record.timings.plannerMs,
      tool_ms: record.timings.toolMs,
      retrieval_ms: record.timings.retrievalMs,
      aggregation_ms: record.timings.aggregationMs,
      gemini_ms: record.timings.geminiMs,
      reflection_ms: record.timings.reflectionMs,
      confidence: record.confidence,
      confidence_band: record.confidenceBand,
      next_action: record.nextAction,
      needs_follow_up: record.needsFollowUp,
      needs_escalation: record.needsEscalation,
      tool_success_count: record.toolSuccessCount,
      tool_failure_count: record.toolFailureCount,
      workflow_json: record,
    });

    const timelines = opsTable("agent_timelines");
    if (timelines && record.timeline.length) {
      await timelines.insert(
        record.timeline.map((ev) => ({
          workflow_id: workflowId,
          conversation_id: record.conversationId,
          event_type: ev.type,
          label: ev.label,
          status: ev.status,
          duration_ms: ev.durationMs,
          payload: ev.payload ?? {},
          occurred_at: ev.at,
        })),
      );
    }

    const perf = opsTable("agent_performance");
    if (perf) {
      const stages: Array<[string, number]> = [
        ["planner", record.timings.plannerMs],
        ["tools", record.timings.toolMs],
        ["retrieval", record.timings.retrievalMs],
        ["aggregation", record.timings.aggregationMs],
        ["gemini", record.timings.geminiMs],
        ["reflection", record.timings.reflectionMs],
        ["total", record.timings.totalMs],
      ];
      await perf.insert(
        stages.map(([stage, duration_ms]) => ({
          workflow_id: workflowId,
          location_id: record.locationId,
          stage,
          duration_ms,
        })),
      );
    }

    const quality = opsTable("agent_quality");
    if (quality) {
      const coverage =
        record.toolSuccessCount + record.toolFailureCount > 0
          ? record.toolSuccessCount / (record.toolSuccessCount + record.toolFailureCount)
          : 0.5;
      const hallRisk = record.confidence != null ? Number((1 - record.confidence).toFixed(2)) : 0.3;
      await quality.insert({
        workflow_id: workflowId,
        conversation_id: record.conversationId,
        location_id: record.locationId,
        confidence: record.confidence,
        reflection_score: record.confidence,
        knowledge_coverage: Number(coverage.toFixed(2)),
        hallucination_risk: hallRisk,
        completed: record.success && !record.needsFollowUp,
        metrics: {
          nextAction: record.nextAction,
          band: record.confidenceBand,
        },
      });
    }

    return workflowId;
  } catch {
    return null;
  }
}

function defaultStages(input: PersistWorkflowInput): string[] {
  const stages = [
    "Customer",
    "Planner",
    "Execution Plan",
    "Tool Orchestrator",
    "Context Aggregation",
    "Gemini",
    "Reflection",
  ];
  if (input.needsFollowUp) stages.push("Clarification");
  if (input.needsEscalation) stages.push("Escalation");
  stages.push("Final Response");
  return stages;
}

export function buildTimelineFromRun(input: {
  message: string;
  planIntent?: string;
  planGoal?: string;
  toolMs?: number;
  geminiMs?: number;
  reflectionMs?: number;
  toolResults?: Array<{ toolId: string; status: string; executionTimeMs: number }>;
  needsFollowUp?: boolean;
  needsEscalation?: boolean;
  escalationReason?: string;
  followUpQuestion?: string | null;
}): WorkflowTimelineEvent[] {
  const now = Date.now();
  const events: WorkflowTimelineEvent[] = [
    {
      type: "customer_message",
      label: "Customer",
      status: "ok",
      durationMs: 0,
      at: new Date(now).toISOString(),
      payload: { message: input.message.slice(0, 200) },
    },
    {
      type: "planner_finished",
      label: "Planner / Execution Plan",
      status: "ok",
      durationMs: 0,
      at: new Date(now + 1).toISOString(),
      payload: { intent: input.planIntent, goal: input.planGoal },
    },
    {
      type: "tool_orchestrator_started",
      label: "Tool Orchestrator",
      status: "ok",
      durationMs: input.toolMs ?? 0,
      at: new Date(now + 2).toISOString(),
    },
  ];

  for (const t of input.toolResults ?? []) {
    events.push({
      type: "tool_finished",
      label: `Tool: ${t.toolId}`,
      status: t.status === "success" ? "ok" : t.status === "timeout" ? "warn" : "error",
      durationMs: t.executionTimeMs,
      at: new Date(now + 3).toISOString(),
      payload: { toolId: t.toolId, status: t.status },
    });
    if (String(t.toolId) === "semantic_rag") {
      events.push({
        type: "retrieval",
        label: "Semantic RAG",
        status: t.status === "success" ? "ok" : "warn",
        durationMs: t.executionTimeMs,
        at: new Date(now + 4).toISOString(),
      });
    }
  }

  events.push(
    {
      type: "context_aggregation",
      label: "Context Aggregation",
      status: "ok",
      durationMs: 0,
      at: new Date(now + 5).toISOString(),
    },
    {
      type: "gemini_finished",
      label: "Gemini",
      status: "ok",
      durationMs: input.geminiMs ?? 0,
      at: new Date(now + 6).toISOString(),
    },
    {
      type: "reflection_finished",
      label: "Reflection",
      status: "ok",
      durationMs: input.reflectionMs ?? 0,
      at: new Date(now + 7).toISOString(),
    },
  );

  if (input.needsFollowUp) {
    events.push({
      type: "clarification",
      label: "Clarification",
      status: "warn",
      durationMs: 0,
      at: new Date(now + 8).toISOString(),
      payload: { question: input.followUpQuestion },
    });
  }
  if (input.needsEscalation) {
    events.push({
      type: "escalation",
      label: "Escalation",
      status: "warn",
      durationMs: 0,
      at: new Date(now + 9).toISOString(),
      payload: { reason: input.escalationReason },
    });
  }

  events.push({
    type: "final_response",
    label: "Final Response",
    status: "ok",
    durationMs: 0,
    at: new Date(now + 10).toISOString(),
  });

  return events;
}
