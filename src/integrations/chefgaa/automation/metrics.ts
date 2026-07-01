import { createChefGaaSyncClient } from "../supabaseClient";

export type SyncMonitoringStats = {
  averageSyncDurationMs: number;
  averageApiResponseMs: number;
  failedSyncPercent: number;
  successPercent: number;
  todaySyncCount: number;
  weeklySyncCount: number;
  monthlySyncCount: number;
};

type SyncRunRow = {
  status: string;
  duration_ms: number | null;
  started_at: string;
};

type HealthRow = {
  response_time_ms: number | null;
};

function startOfDay(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export async function computeSyncMonitoringStats(): Promise<SyncMonitoringStats> {
  const supabase = createChefGaaSyncClient();
  const monthAgo = daysAgo(30);

  const [{ data: runs }, { data: health }] = await Promise.all([
    supabase
      .from("chefgaa_sync_runs")
      .select("status, duration_ms, started_at")
      .gte("started_at", monthAgo)
      .order("started_at", { ascending: false }),
    supabase
      .from("chefgaa_api_health_checks")
      .select("response_time_ms")
      .gte("checked_at", monthAgo)
      .order("checked_at", { ascending: false })
      .limit(200),
  ]);

  const runRows = (runs ?? []) as SyncRunRow[];
  const healthRows = (health ?? []) as HealthRow[];

  const finished = runRows.filter((row) => row.status !== "running");
  const successes = finished.filter((row) => row.status === "success").length;
  const failures = finished.filter((row) => row.status === "failed").length;
  const total = finished.length || 1;

  const durations = finished
    .map((row) => row.duration_ms)
    .filter((value): value is number => typeof value === "number");
  const averageSyncDurationMs =
    durations.length > 0
      ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
      : 0;

  const responseTimes = healthRows
    .map((row) => row.response_time_ms)
    .filter((value): value is number => typeof value === "number");
  const averageApiResponseMs =
    responseTimes.length > 0
      ? Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length)
      : 0;

  const today = startOfDay();
  const weekAgo = daysAgo(7);

  return {
    averageSyncDurationMs,
    averageApiResponseMs,
    failedSyncPercent: Math.round((failures / total) * 100),
    successPercent: Math.round((successes / total) * 100),
    todaySyncCount: runRows.filter((row) => row.started_at >= today).length,
    weeklySyncCount: runRows.filter((row) => row.started_at >= weekAgo).length,
    monthlySyncCount: runRows.length,
  };
}
