import { opsTable, avg } from "./client";
import { getHealthDashboard } from "./healthEngine";
import type { RealtimeSnapshot } from "./types";

const WINDOW_MS = 15 * 60 * 1000;

export async function getRealtimeSnapshot(): Promise<RealtimeSnapshot> {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  let recentPlannerJobs = 0;
  let recentToolExecutions = 0;
  let recentRagQueries = 0;
  let recentEscalations = 0;
  let recentFailures = 0;
  let avgResponseMs = 0;
  let currentConversations = 0;

  try {
    const workflows = opsTable("agent_workflows");
    if (workflows) {
      const { data } = await workflows
        .select("conversation_id, total_ms, success, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(200);
      const rows = (data ?? []) as Array<{
        conversation_id: string | null;
        total_ms: number;
        success: boolean;
      }>;
      currentConversations = new Set(rows.map((r) => r.conversation_id).filter(Boolean)).size;
      avgResponseMs = Math.round(avg(rows.map((r) => Number(r.total_ms))));
      recentFailures = rows.filter((r) => !r.success).length;
    }

    const plans = opsTable("agent_execution_plans");
    if (plans) {
      const { count } = await plans.select("id", { count: "exact", head: true }).gte("created_at", since);
      recentPlannerJobs = count ?? 0;
    }

    const tools = opsTable("agent_tool_executions");
    if (tools) {
      const { data } = await tools
        .select("tool_id, status")
        .gte("created_at", since)
        .limit(500);
      const rows = (data ?? []) as Array<{ tool_id: string; status: string }>;
      recentToolExecutions = rows.length;
      recentRagQueries = rows.filter((r) => r.tool_id === "semantic_rag").length;
      recentFailures += rows.filter((r) => r.status !== "success" && r.status !== "skipped").length;
    }

    const esc = opsTable("agent_escalations");
    if (esc) {
      const { count } = await esc.select("id", { count: "exact", head: true }).gte("created_at", since);
      recentEscalations = count ?? 0;
    }
  } catch {
    /* soft fail */
  }

  const health = await getHealthDashboard().catch(() => ({
    overallScore: 0,
    overallStatus: "degraded" as const,
    components: [],
  }));

  return {
    currentConversations,
    recentPlannerJobs,
    recentToolExecutions,
    recentRagQueries,
    recentEscalations,
    recentFailures,
    avgResponseMs,
    healthScore: health.overallScore,
    updatedAt: new Date().toISOString(),
  };
}
