import { opsTable, pct } from "./client";
import { getOpsOverview, listWorkflows } from "./workflowAnalytics";
import { getToolAnalytics } from "./toolAnalytics";
import { getPerformanceAnalytics } from "./performanceAnalytics";
import type { HealthDashboard, HealthComponent } from "./types";

function statusFor(score: number): HealthComponent["status"] {
  if (score >= 80) return "healthy";
  if (score >= 55) return "degraded";
  return "critical";
}

export async function getHealthDashboard(): Promise<HealthDashboard> {
  const [overview, tools, perf, workflows] = await Promise.all([
    getOpsOverview(),
    getToolAnalytics(400),
    getPerformanceAnalytics(150),
    listWorkflows(100),
  ]);

  const failRate = workflows.length
    ? pct(workflows.filter((w) => !w.success).length, workflows.length)
    : 0;
  const lowConf = workflows.length
    ? pct(workflows.filter((w) => (w.confidence ?? 1) < 0.45).length, workflows.length)
    : 0;

  const components: HealthComponent[] = [
    {
      component: "Planner",
      healthScore: Math.max(0, 100 - overview.clarificationRate * 0.2),
      availability: 100 - failRate * 0.3,
      failureRate: failRate * 0.2,
      avgLatencyMs: perf.avgPlannerMs,
      warnings: overview.clarificationRate > 40 ? 1 : 0,
      status: statusFor(Math.max(0, 100 - overview.clarificationRate * 0.2)),
    },
    {
      component: "Orchestrator",
      healthScore: tools.overallSuccessRate,
      availability: 100 - tools.overallFailureRate,
      failureRate: tools.overallFailureRate,
      avgLatencyMs: tools.avgDurationMs,
      warnings: tools.overallFailureRate > 15 ? 1 : 0,
      status: statusFor(tools.overallSuccessRate),
    },
    {
      component: "Semantic RAG",
      healthScore: Math.max(0, 100 - lowConf * 0.8),
      availability: 100 - lowConf * 0.4,
      failureRate: lowConf * 0.5,
      avgLatencyMs: perf.avgRetrievalMs,
      warnings: lowConf > 25 ? 1 : 0,
      status: statusFor(Math.max(0, 100 - lowConf)),
    },
    {
      component: "Tools",
      healthScore: tools.overallSuccessRate,
      availability: 100 - tools.overallFailureRate,
      failureRate: tools.overallFailureRate,
      avgLatencyMs: tools.avgDurationMs,
      warnings: tools.perTool.filter((t) => t.failureRate > 20).length,
      status: statusFor(tools.overallSuccessRate),
    },
    {
      component: "Reflection",
      healthScore: Math.min(100, overview.avgConfidence * 100),
      availability: 100,
      failureRate: 0,
      avgLatencyMs: perf.avgReflectionMs,
      warnings: overview.escalationRate > 20 ? 1 : 0,
      status: statusFor(Math.min(100, overview.avgConfidence * 100)),
    },
    {
      component: "Knowledge",
      healthScore: Math.max(0, 100 - lowConf),
      availability: 100 - lowConf * 0.3,
      failureRate: lowConf * 0.4,
      avgLatencyMs: perf.avgRetrievalMs,
      warnings: lowConf > 20 ? 1 : 0,
      status: statusFor(Math.max(0, 100 - lowConf)),
    },
  ];

  const overallScore = Number(
    (components.reduce((s, c) => s + c.healthScore, 0) / components.length).toFixed(1),
  );

  const snapshot: HealthDashboard = {
    overallScore,
    overallStatus: statusFor(overallScore),
    components,
  };

  void persistHealthSnapshot(snapshot);
  return snapshot;
}

async function persistHealthSnapshot(dash: HealthDashboard): Promise<void> {
  try {
    const t = opsTable("agent_health");
    if (!t) return;
    await t.insert(
      dash.components.map((c) => ({
        component: c.component,
        health_score: c.healthScore,
        availability: c.availability,
        failure_rate: c.failureRate,
        avg_latency_ms: c.avgLatencyMs,
        warnings: c.warnings,
        status: c.status,
        details: { overall: dash.overallScore },
      })),
    );
  } catch {
    /* optional */
  }
}
