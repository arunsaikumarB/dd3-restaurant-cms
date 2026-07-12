import { resTable } from "./client";
import { mapReservationRow } from "./reservationRepository";
import { listWaitlist } from "./waitlistEngine";
import { listTables } from "./reservationRepository";
import type { ReservationAnalyticsSummary } from "./types";

export async function getReservationAnalytics(locationId: string): Promise<ReservationAnalyticsSummary> {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const t = resTable("reservations");
    if (!t) return empty();
    const { data } = await t
      .select("*")
      .eq("location_id", locationId)
      .gte("date", today)
      .order("date", { ascending: true })
      .limit(500);
    const rows = ((data ?? []) as Record<string, unknown>[]).map(mapReservationRow);
    const todays = rows.filter((r) => r.date === today && r.status !== "cancelled");
    const upcoming = rows.filter((r) => r.date > today && r.status !== "cancelled");
    const cancelled = rows.filter((r) => r.status === "cancelled").length;
    const noShows = rows.filter((r) => r.noShow || r.status === "no_show").length;
    const active = rows.filter((r) => r.status !== "cancelled");
    const avgParty = active.length
      ? Number((active.reduce((s, r) => s + r.guests, 0) / active.length).toFixed(1))
      : 0;

    const hourMap = new Map<string, number>();
    for (const r of todays) {
      hourMap.set(r.time, (hourMap.get(r.time) ?? 0) + 1);
    }
    const sourceMap = new Map<string, number>();
    for (const r of rows) {
      const src = r.source ?? "website";
      sourceMap.set(src, (sourceMap.get(src) ?? 0) + 1);
    }

    const waitlist = await listWaitlist(locationId);
    const tables = await listTables(locationId);
    const capacity = tables.reduce((s, x) => s + x.capacity, 0) || 1;
    const coversToday = todays.reduce((s, r) => s + r.guests, 0);
    const reservedTables = todays.filter((r) => r.tableId).length;

    return {
      todaysCount: todays.length,
      upcomingCount: upcoming.length,
      noShows,
      avgPartySize: avgParty,
      cancellationRate: rows.length ? Number(((cancelled / rows.length) * 100).toFixed(1)) : 0,
      occupancyEstimate: Number(((coversToday / capacity) * 100).toFixed(1)),
      waitlistConversion: waitlist.length ? 0 : 0,
      peakHours: [...hourMap.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
      sources: [...sourceMap.entries()].map(([label, value]) => ({ label, value })),
      tableUtilization: tables.length
        ? Number(((reservedTables / tables.length) * 100).toFixed(1))
        : 0,
    };
  } catch {
    return empty();
  }
}

function empty(): ReservationAnalyticsSummary {
  return {
    todaysCount: 0,
    upcomingCount: 0,
    noShows: 0,
    avgPartySize: 0,
    cancellationRate: 0,
    occupancyEstimate: 0,
    waitlistConversion: 0,
    peakHours: [],
    sources: [],
    tableUtilization: 0,
  };
}
