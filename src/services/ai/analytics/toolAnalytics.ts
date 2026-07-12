import { avg, opsTable, pct } from "./client";
import type { ToolAnalytics } from "./types";

export async function getToolAnalytics(limit = 800): Promise<ToolAnalytics> {
  try {
    const t = opsTable("agent_tool_executions");
    if (!t) return empty();
    const { data } = await t
      .select("tool_id, status, execution_time_ms, retries, cached")
      .order("created_at", { ascending: false })
      .limit(limit);
    const rows = (data ?? []) as Array<{
      tool_id: string;
      status: string;
      execution_time_ms: number;
      retries: number;
      cached: boolean;
    }>;
    if (!rows.length) return empty();

    const byTool = new Map<string, typeof rows>();
    for (const r of rows) {
      const list = byTool.get(r.tool_id) ?? [];
      list.push(r);
      byTool.set(r.tool_id, list);
    }

    const perTool = [...byTool.entries()].map(([toolId, list]) => {
      const ok = list.filter((x) => x.status === "success").length;
      const fail = list.filter((x) => x.status !== "success" && x.status !== "skipped").length;
      return {
        toolId,
        executions: list.length,
        successRate: pct(ok, list.length),
        failureRate: pct(fail, list.length),
        avgDurationMs: Math.round(avg(list.map((x) => Number(x.execution_time_ms)))),
        timeouts: list.filter((x) => x.status === "timeout").length,
        retries: list.reduce((s, x) => s + Number(x.retries ?? 0), 0),
        cacheHits: list.filter((x) => x.cached).length,
        cacheMisses: list.filter((x) => !x.cached).length,
      };
    }).sort((a, b) => b.executions - a.executions);

    const packages = opsTable("agent_context_packages");
    let parallel = 0;
    let sequential = 0;
    if (packages) {
      const { data: pkgs } = await packages.select("mode").order("created_at", { ascending: false }).limit(200);
      for (const p of (pkgs ?? []) as Array<{ mode: string }>) {
        if (p.mode === "parallel") parallel += 1;
        else if (p.mode === "sequential") sequential += 1;
        else {
          parallel += 0.5;
          sequential += 0.5;
        }
      }
    }

    const ok = rows.filter((r) => r.status === "success").length;
    const fail = rows.filter((r) => r.status !== "success" && r.status !== "skipped").length;
    const hits = rows.filter((r) => r.cached).length;

    return {
      totalExecutions: rows.length,
      overallSuccessRate: pct(ok, rows.length),
      overallFailureRate: pct(fail, rows.length),
      avgDurationMs: Math.round(avg(rows.map((r) => Number(r.execution_time_ms)))),
      cacheHitRate: pct(hits, rows.length),
      parallelFrequency: Math.round(parallel),
      sequentialFrequency: Math.round(sequential),
      mostUsed: perTool[0]?.toolId ?? null,
      leastUsed: perTool[perTool.length - 1]?.toolId ?? null,
      perTool,
    };
  } catch {
    return empty();
  }
}

function empty(): ToolAnalytics {
  return {
    totalExecutions: 0,
    overallSuccessRate: 0,
    overallFailureRate: 0,
    avgDurationMs: 0,
    cacheHitRate: 0,
    parallelFrequency: 0,
    sequentialFrequency: 0,
    mostUsed: null,
    leastUsed: null,
    perTool: [],
  };
}
