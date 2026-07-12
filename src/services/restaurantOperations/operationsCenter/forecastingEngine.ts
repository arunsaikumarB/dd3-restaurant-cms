import { getEventAnalytics } from "../events";
import { getJourneyAnalytics } from "../journey";
import { getReservationAnalytics } from "../reservations";
import { todayIso } from "./client";
import { listForecasts, saveForecast } from "./repository";
import type { ForecastDay } from "./types";

export async function buildForecasts(locationId: string, days = 7): Promise<ForecastDay[]> {
  const [res, events, journey] = await Promise.all([
    getReservationAnalytics(locationId),
    getEventAnalytics(locationId),
    getJourneyAnalytics(locationId),
  ]);

  const base = Math.max(res.todaysCount, 4);
  const busyHours = (res.peakHours ?? []).slice(0, 4).map((p) => p.label);
  const results: ForecastDay[] = [];

  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const date = d.toISOString().slice(0, 10);
    const dow = d.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const isPeakDay = isWeekend || dow === 5;
    const expectedReservations = Math.round(base * (isPeakDay ? 1.28 : dow === 1 ? 0.75 : 1));
    const tableDemand = Math.round(expectedReservations * (res.avgPartySize || 2.5));
    const cateringVolume = Math.round((events.upcomingEvents || 1) * (isPeakDay ? 0.4 : 0.2));
    const staffRequired = Math.max(4, Math.ceil(expectedReservations / 6) + (cateringVolume > 0 ? 2 : 0));
    const returnRate = journey.repeatVisitRate || 40;
    const waitlistProbability = clampPct(isPeakDay ? 35 : 12);

    const day: ForecastDay = {
      date,
      expectedReservations,
      busyHours: busyHours.length ? busyHours : isPeakDay ? ["19:00", "19:30", "20:00"] : ["12:30", "18:30"],
      tableDemand,
      cateringVolume,
      staffRequired,
      returnRate,
      waitlistProbability,
      isPeakDay,
      holidayDemand: false,
    };
    results.push(day);
    void saveForecast({
      locationId,
      forecastDate: date,
      ...day,
    });
  }

  return results;
}

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export async function getStoredForecasts(locationId: string): Promise<ForecastDay[]> {
  const rows = await listForecasts(locationId, 14);
  if (!rows.length) return buildForecasts(locationId);
  return rows.map((r: Record<string, unknown>) => ({
    date: String(r.forecast_date),
    expectedReservations: Number(r.expected_reservations ?? 0),
    busyHours: Array.isArray(r.busy_hours) ? (r.busy_hours as string[]) : [],
    tableDemand: Number(r.table_demand ?? 0),
    cateringVolume: Number(r.catering_volume ?? 0),
    staffRequired: Number(r.staff_required ?? 0),
    returnRate: Number(r.return_rate ?? 0),
    waitlistProbability: Number(r.waitlist_probability ?? 0),
    isPeakDay: Boolean(r.is_peak_day),
    holidayDemand: Boolean(r.holiday_demand),
  }));
}

export function forecastSummary(days: ForecastDay[]): string {
  const peak = days.filter((d) => d.isPeakDay);
  const next = days[0];
  if (!next) return "No forecast available.";
  return `Tomorrow-facing demand starts ${next.date}: ~${next.expectedReservations} reservations, staff ${next.staffRequired}. ${peak.length} peak days in the next ${days.length} days. Baseline from ${todayIso()}.`;
}
