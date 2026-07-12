import { listCallMetrics, listProviderMetrics, listSessions } from "../repository";
import type { VoiceAnalyticsSnapshot } from "../types";

export async function getVoiceAnalytics(locationId: string): Promise<VoiceAnalyticsSnapshot> {
  const [sessions, metrics, providers] = await Promise.all([
    listSessions({ locationId, limit: 200 }),
    listCallMetrics(locationId, 200),
    listProviderMetrics(locationId, 200),
  ]);

  const activeSessions = sessions.filter((s) => !s.endedAt).length;
  const avgDurationMs = sessions.length
    ? Math.round(sessions.reduce((s, x) => s + x.durationMs, 0) / sessions.length)
    : 0;

  const rows = metrics as Array<Record<string, unknown>>;
  const avgRoundtripMs = rows.length
    ? Math.round(
        rows.reduce((s, r) => s + Number(r.total_roundtrip_ms ?? 0), 0) / rows.length,
      )
    : 0;
  const interruptions = rows.reduce((s, r) => s + Number(r.interruptions ?? 0), 0);
  const droppedCalls = rows.filter((r) => r.dropped).length;
  const transferredCalls = rows.filter((r) => r.transferred).length;

  const byChannelMap = new Map<string, number>();
  const byLangMap = new Map<string, number>();
  for (const s of sessions) {
    byChannelMap.set(s.channel, (byChannelMap.get(s.channel) ?? 0) + 1);
    byLangMap.set(s.language, (byLangMap.get(s.language) ?? 0) + 1);
  }

  const providerMap = new Map<string, { ok: number; n: number; lat: number }>();
  for (const p of providers as Array<Record<string, unknown>>) {
    const key = String(p.provider);
    const cur = providerMap.get(key) ?? { ok: 0, n: 0, lat: 0 };
    cur.n += 1;
    if (p.success !== false) cur.ok += 1;
    cur.lat += Number(p.latency_ms ?? 0);
    providerMap.set(key, cur);
  }

  return {
    totalSessions: sessions.length,
    activeSessions,
    avgDurationMs,
    avgRoundtripMs,
    interruptions,
    droppedCalls,
    transferredCalls,
    byChannel: [...byChannelMap.entries()].map(([channel, count]) => ({ channel, count })),
    byLanguage: [...byLangMap.entries()].map(([language, count]) => ({ language, count })),
    providerHealth: [...providerMap.entries()].map(([provider, v]) => ({
      provider,
      successRate: v.n ? Math.round((v.ok / v.n) * 1000) / 10 : 100,
      avgLatencyMs: v.n ? Math.round(v.lat / v.n) : 0,
    })),
  };
}
