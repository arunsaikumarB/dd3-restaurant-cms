import { avg, countBy, dayLabel, opsTable, pct } from "./client";
import type { WorkflowRecord, WorkflowSearchFilters } from "./types";
import type { PersistWorkflowInput } from "./timelineEngine";

export { persistWorkflow, buildTimelineFromRun } from "./timelineEngine";
export type { PersistWorkflowInput };

function mapRow(row: Record<string, unknown>): WorkflowRecord {
  const json = (row.workflow_json as WorkflowRecord | undefined) ?? null;
  if (json?.workflowId) return json;
  return {
    workflowId: String(row.id),
    conversationId: (row.conversation_id as string | null) ?? null,
    locationId: (row.location_id as string | null) ?? null,
    planId: (row.plan_id as string | null) ?? null,
    packageId: (row.package_id as string | null) ?? null,
    reflectionId: (row.reflection_id as string | null) ?? null,
    messagePreview: String(row.message_preview ?? ""),
    intent: String(row.intent ?? "unknown"),
    goal: String(row.goal ?? "unknown"),
    complexity: String(row.complexity ?? "simple"),
    status: (row.status as WorkflowRecord["status"]) ?? "completed",
    success: Boolean(row.success),
    timings: {
      totalMs: Number(row.total_ms ?? 0),
      plannerMs: Number(row.planner_ms ?? 0),
      toolMs: Number(row.tool_ms ?? 0),
      retrievalMs: Number(row.retrieval_ms ?? 0),
      aggregationMs: Number(row.aggregation_ms ?? 0),
      geminiMs: Number(row.gemini_ms ?? 0),
      reflectionMs: Number(row.reflection_ms ?? 0),
    },
    confidence: row.confidence != null ? Number(row.confidence) : null,
    confidenceBand: (row.confidence_band as string | null) ?? null,
    nextAction: (row.next_action as string | null) ?? null,
    needsFollowUp: Boolean(row.needs_follow_up),
    needsEscalation: Boolean(row.needs_escalation),
    toolSuccessCount: Number(row.tool_success_count ?? 0),
    toolFailureCount: Number(row.tool_failure_count ?? 0),
    timeline: [],
    stages: [],
    geminiPreview: "",
    finalPreview: "",
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export async function listWorkflows(limit = 80): Promise<WorkflowRecord[]> {
  try {
    const t = opsTable("agent_workflows");
    if (!t) return [];
    const { data } = await t.select("*").order("created_at", { ascending: false }).limit(limit);
    return ((data ?? []) as Record<string, unknown>[]).map(mapRow);
  } catch {
    return [];
  }
}

export async function getWorkflow(id: string): Promise<WorkflowRecord | null> {
  try {
    const t = opsTable("agent_workflows");
    if (!t) return null;
    const { data } = await t.select("*").eq("id", id).maybeSingle();
    if (!data) return null;
    const record = mapRow(data as Record<string, unknown>);
    if (!record.timeline.length) {
      const tl = opsTable("agent_timelines");
      if (tl) {
        const { data: events } = await tl
          .select("*")
          .eq("workflow_id", id)
          .order("occurred_at", { ascending: true });
        record.timeline = ((events ?? []) as Array<Record<string, unknown>>).map((e) => ({
          type: e.event_type as WorkflowRecord["timeline"][number]["type"],
          label: String(e.label ?? e.event_type),
          status: (e.status as "ok" | "warn" | "error" | "skip") ?? "ok",
          durationMs: Number(e.duration_ms ?? 0),
          at: String(e.occurred_at),
          payload: (e.payload as Record<string, unknown>) ?? {},
        }));
      }
    }
    return record;
  } catch {
    return null;
  }
}

export async function searchWorkflows(filters: WorkflowSearchFilters): Promise<WorkflowRecord[]> {
  const rows = await listWorkflows(filters.limit ?? 200);
  return rows.filter((w) => {
    if (filters.query) {
      const q = filters.query.toLowerCase();
      const hay = `${w.messagePreview} ${w.intent} ${w.goal} ${w.conversationId ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.intent && w.intent !== filters.intent) return false;
    if (filters.goal && w.goal !== filters.goal) return false;
    if (filters.locationId && w.locationId !== filters.locationId) return false;
    if (filters.confidenceBand && w.confidenceBand !== filters.confidenceBand) return false;
    if (filters.escalation === true && !w.needsEscalation) return false;
    if (filters.escalation === false && w.needsEscalation) return false;
    if (filters.tool) {
      const hit = w.timeline.some(
        (ev) => String(ev.payload?.toolId ?? "").toLowerCase() === filters.tool!.toLowerCase(),
      );
      if (!hit) return false;
    }
    if (filters.from && w.createdAt < filters.from) return false;
    if (filters.to && w.createdAt > filters.to) return false;
    return true;
  });
}

export async function getOpsOverview(): Promise<import("./types").OpsOverview> {
  const recent = await listWorkflows(100);
  const success = recent.filter((w) => w.success).length;
  return {
    totalWorkflows: recent.length,
    successRate: pct(success, recent.length),
    avgConfidence: avg(recent.map((w) => w.confidence ?? 0).filter(Boolean)),
    avgTotalMs: Math.round(avg(recent.map((w) => w.timings.totalMs))),
    escalationRate: pct(recent.filter((w) => w.needsEscalation).length, recent.length),
    clarificationRate: pct(recent.filter((w) => w.needsFollowUp).length, recent.length),
    activeConversations: new Set(recent.slice(0, 20).map((w) => w.conversationId).filter(Boolean)).size,
    healthScore: Math.max(
      0,
      Math.min(
        100,
        Number(
          (
            pct(success, recent.length) * 0.5 +
            (avg(recent.map((w) => w.confidence ?? 0.5)) * 100) * 0.3 +
            (100 - Math.min(avg(recent.map((w) => w.timings.totalMs)) / 50, 40)) * 0.2
          ).toFixed(1),
        ),
      ),
    ),
    recentWorkflows: recent.slice(0, 12),
  };
}

export function workflowStageGraph(record: WorkflowRecord): Array<{ label: string; status: string; ms: number }> {
  const stages = record.stages.length
    ? record.stages
    : ["Customer", "Planner", "Tools", "Gemini", "Reflection", "Final Response"];
  return stages.map((label) => {
    const ev = record.timeline.find((t) => t.label.toLowerCase().includes(label.toLowerCase().split(" ")[0]!));
    return {
      label,
      status: ev?.status ?? "ok",
      ms: ev?.durationMs ?? 0,
    };
  });
}

export function intentTrend(workflows: WorkflowRecord[]): Array<{ label: string; value: number }> {
  return countBy(workflows.map((w) => dayLabel(w.createdAt))).slice(-14);
}
