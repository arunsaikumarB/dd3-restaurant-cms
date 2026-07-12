/* eslint-disable @typescript-eslint/no-explicit-any */
import { opsTable, todayIso } from "./client";
import type { OpsAlert, OpsAnnouncement, OpsReport } from "./types";

function row(r: any): any {
  return r ?? {};
}

export function mapAlert(r: any): OpsAlert {
  const x = row(r);
  return {
    id: x.id,
    locationId: x.location_id,
    severity: x.severity ?? "medium",
    category: x.category ?? "operations",
    title: x.title,
    body: x.body ?? null,
    status: x.status ?? "open",
    assignedTo: x.assigned_to ?? null,
    sourceModule: x.source_module ?? null,
    sourceEntityId: x.source_entity_id ?? null,
    createdAt: x.created_at,
    acknowledgedAt: x.acknowledged_at ?? null,
    resolvedAt: x.resolved_at ?? null,
  };
}

export async function insertAlert(input: {
  locationId: string;
  severity: string;
  category?: string;
  title: string;
  body?: string | null;
  sourceModule?: string | null;
  sourceEntityId?: string | null;
}): Promise<OpsAlert | null> {
  const t = opsTable("operations_alerts");
  if (!t) return null;
  const { data, error } = await t
    .insert({
      location_id: input.locationId,
      severity: input.severity,
      category: input.category ?? "operations",
      title: input.title,
      body: input.body ?? null,
      source_module: input.sourceModule ?? null,
      source_entity_id: input.sourceEntityId ?? null,
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return mapAlert(data);
}

export async function listAlerts(opts: {
  locationId: string;
  status?: string;
  limit?: number;
}): Promise<OpsAlert[]> {
  const t = opsTable("operations_alerts");
  if (!t) return [];
  let q = t.select("*").eq("location_id", opts.locationId).order("created_at", { ascending: false });
  if (opts.status) q = q.eq("status", opts.status);
  const { data } = await q.limit(opts.limit ?? 100);
  return (data ?? []).map(mapAlert);
}

export async function updateAlert(
  id: string,
  patch: Partial<{ status: string; assignedTo: string | null }>,
): Promise<OpsAlert | null> {
  const t = opsTable("operations_alerts");
  if (!t) return null;
  const body: Record<string, unknown> = {};
  if (patch.status !== undefined) {
    body.status = patch.status;
    if (patch.status === "acknowledged") body.acknowledged_at = new Date().toISOString();
    if (patch.status === "resolved") body.resolved_at = new Date().toISOString();
  }
  if (patch.assignedTo !== undefined) body.assigned_to = patch.assignedTo;
  const { data, error } = await t.update(body).eq("id", id).select("*").single();
  if (error || !data) return null;
  return mapAlert(data);
}

export async function saveSnapshot(input: {
  locationId: string;
  period?: string;
  kpis: Record<string, unknown>;
  healthScore: number;
}): Promise<void> {
  const t = opsTable("operations_snapshots");
  if (!t) return;
  await t.insert({
    location_id: input.locationId,
    snapshot_date: todayIso(),
    period: input.period ?? "today",
    kpis: input.kpis,
    health_score: input.healthScore,
  });
}

export async function listSnapshots(locationId: string, limit = 30) {
  const t = opsTable("operations_snapshots");
  if (!t) return [];
  const { data } = await t
    .select("*")
    .eq("location_id", locationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function saveHealth(input: {
  locationId: string;
  overallScore: number;
  subscores: Record<string, number>;
  suggestions: string[];
}): Promise<void> {
  const t = opsTable("operations_health");
  if (!t) return;
  await t.insert({
    location_id: input.locationId,
    overall_score: input.overallScore,
    reservation_score: input.subscores.reservation ?? 0,
    workflow_score: input.subscores.workflow ?? 0,
    satisfaction_score: input.subscores.satisfaction ?? 0,
    journey_score: input.subscores.journey ?? 0,
    retention_score: input.subscores.retention ?? 0,
    waitlist_score: input.subscores.waitlist ?? 0,
    utilization_score: input.subscores.utilization ?? 0,
    approval_sla_score: input.subscores.approvalSla ?? 0,
    ai_confidence_score: input.subscores.aiConfidence ?? 0,
    knowledge_score: input.subscores.knowledge ?? 0,
    suggestions: input.suggestions,
  });
}

export async function latestHealth(locationId: string) {
  const t = opsTable("operations_health");
  if (!t) return null;
  const { data } = await t
    .select("*")
    .eq("location_id", locationId)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function saveForecast(input: {
  locationId: string;
  forecastDate: string;
  expectedReservations: number;
  busyHours: string[];
  tableDemand: number;
  cateringVolume: number;
  staffRequired: number;
  returnRate: number;
  waitlistProbability: number;
  isPeakDay: boolean;
  holidayDemand: boolean;
}): Promise<void> {
  const t = opsTable("operations_forecasts");
  if (!t) return;
  await t.insert({
    location_id: input.locationId,
    forecast_date: input.forecastDate,
    expected_reservations: input.expectedReservations,
    busy_hours: input.busyHours,
    table_demand: input.tableDemand,
    catering_volume: input.cateringVolume,
    staff_required: input.staffRequired,
    return_rate: input.returnRate,
    waitlist_probability: input.waitlistProbability,
    is_peak_day: input.isPeakDay,
    holiday_demand: input.holidayDemand,
  });
}

export async function listForecasts(locationId: string, limit = 14) {
  const t = opsTable("operations_forecasts");
  if (!t) return [];
  const { data } = await t
    .select("*")
    .eq("location_id", locationId)
    .order("forecast_date", { ascending: true })
    .limit(limit);
  return data ?? [];
}

export async function insertReport(input: {
  locationId?: string | null;
  reportType: string;
  category: string;
  title: string;
  format: string;
  content: string;
  createdBy?: string;
}): Promise<OpsReport | null> {
  const t = opsTable("operations_reports");
  if (!t) return null;
  const { data, error } = await t
    .insert({
      location_id: input.locationId ?? null,
      report_type: input.reportType,
      category: input.category,
      title: input.title,
      format: input.format,
      content: input.content,
      status: "ready",
      created_by: input.createdBy ?? "admin",
    })
    .select("*")
    .single();
  if (error || !data) return null;
  const x = data as any;
  return {
    id: x.id,
    locationId: x.location_id,
    reportType: x.report_type,
    category: x.category,
    title: x.title,
    format: x.format,
    content: x.content,
    status: x.status,
    createdAt: x.created_at,
  };
}

export async function listReports(locationId?: string, limit = 50): Promise<OpsReport[]> {
  const t = opsTable("operations_reports");
  if (!t) return [];
  let q = t.select("*").order("created_at", { ascending: false });
  if (locationId) q = q.eq("location_id", locationId);
  const { data } = await q.limit(limit);
  return (data ?? []).map((x: any) => ({
    id: x.id,
    locationId: x.location_id,
    reportType: x.report_type,
    category: x.category,
    title: x.title,
    format: x.format,
    content: x.content,
    status: x.status,
    createdAt: x.created_at,
  }));
}

export async function insertAnnouncement(input: {
  locationId?: string | null;
  title: string;
  body: string;
  createdBy?: string;
}): Promise<OpsAnnouncement | null> {
  const t = opsTable("operations_announcements");
  if (!t) return null;
  const { data, error } = await t
    .insert({
      location_id: input.locationId ?? null,
      title: input.title,
      body: input.body,
      created_by: input.createdBy ?? "admin",
    })
    .select("*")
    .single();
  if (error || !data) return null;
  const x = data as any;
  return {
    id: x.id,
    locationId: x.location_id,
    title: x.title,
    body: x.body,
    active: x.active !== false,
    createdAt: x.created_at,
  };
}

export async function listAnnouncements(locationId?: string): Promise<OpsAnnouncement[]> {
  const t = opsTable("operations_announcements");
  if (!t) return [];
  let q = t.select("*").eq("active", true).order("created_at", { ascending: false });
  if (locationId) q = q.eq("location_id", locationId);
  const { data } = await q.limit(20);
  return (data ?? []).map((x: any) => ({
    id: x.id,
    locationId: x.location_id,
    title: x.title,
    body: x.body,
    active: x.active !== false,
    createdAt: x.created_at,
  }));
}

export async function getOpsSettings(locationId: string) {
  const t = opsTable("operations_settings");
  if (!t) return null;
  const { data } = await t.select("*").eq("location_id", locationId).maybeSingle();
  return data;
}

export async function upsertOpsSettings(
  locationId: string,
  patch: { liveRefreshSeconds?: number; enableAlerts?: boolean; enableForecasts?: boolean },
) {
  const t = opsTable("operations_settings");
  if (!t) return null;
  const existing = await getOpsSettings(locationId);
  const { data } = await t
    .upsert(
      {
        location_id: locationId,
        live_refresh_seconds: patch.liveRefreshSeconds ?? existing?.live_refresh_seconds ?? 12,
        enable_alerts: patch.enableAlerts ?? existing?.enable_alerts ?? true,
        enable_forecasts: patch.enableForecasts ?? existing?.enable_forecasts ?? true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "location_id" },
    )
    .select("*")
    .single();
  return data;
}
