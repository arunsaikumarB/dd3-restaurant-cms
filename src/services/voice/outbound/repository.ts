/* eslint-disable @typescript-eslint/no-explicit-any */
import { voiceTable, nowIso } from "../client";
import type {
  AudienceFilter,
  CampaignRun,
  CampaignSchedule,
  CampaignTemplate,
  OptOutRecord,
  OutboundCall,
  OutboundCallStatus,
  OutboundCallType,
  OutboundCampaign,
  OutboundCampaignStatus,
  OutboundCampaignType,
  OutboundCompliance,
  OutboundTriggerCode,
  RetryPolicy,
} from "./types";

function mapCampaign(r: any): OutboundCampaign {
  return {
    id: r.id,
    locationId: r.location_id,
    name: r.name,
    description: r.description ?? null,
    campaignType: r.campaign_type as OutboundCampaignType,
    callType: r.call_type as OutboundCallType,
    status: r.status as OutboundCampaignStatus,
    triggerCode: (r.trigger_code as OutboundTriggerCode) ?? null,
    audienceFilter: (r.audience_filter as AudienceFilter) ?? {},
    schedule: (r.schedule as CampaignSchedule) ?? {},
    retryPolicy: (r.retry_policy as RetryPolicy) ?? {
      maxAttempts: 3,
      retryDelayMinutes: 60,
      respectBusinessHours: true,
    },
    templateId: r.template_id ?? null,
    transferMode: r.transfer_mode ?? "warm",
    approvalRequired: r.approval_required !== false,
    approvedBy: r.approved_by ?? null,
    approvedAt: r.approved_at ?? null,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapCall(r: any): OutboundCall {
  return {
    id: r.id,
    campaignId: r.campaign_id ?? null,
    runId: r.run_id ?? null,
    sessionId: r.session_id ?? null,
    locationId: r.location_id,
    customerId: r.customer_id ?? null,
    customerName: r.customer_name ?? null,
    customerPhone: r.customer_phone,
    callType: r.call_type,
    status: r.status as OutboundCallStatus,
    outcome: r.outcome ?? null,
    attempt: Number(r.attempt ?? 1),
    maxAttempts: Number(r.max_attempts ?? 3),
    scheduledFor: r.scheduled_for ?? null,
    startedAt: r.started_at ?? null,
    endedAt: r.ended_at ?? null,
    durationMs: Number(r.duration_ms ?? 0),
    scriptText: r.script_text ?? null,
    voicemailText: r.voicemail_text ?? null,
    reservationId: r.reservation_id ?? null,
    confirmationCode: r.confirmation_code ?? null,
    plannerGoal: r.planner_goal ?? null,
    contextPayload: (r.context_payload as Record<string, unknown>) ?? {},
    createdAt: r.created_at,
  };
}

function mapTemplate(r: any): CampaignTemplate {
  return {
    id: r.id,
    locationId: r.location_id,
    code: r.code,
    name: r.name,
    callType: r.call_type,
    scriptHint: r.script_hint ?? null,
    voicemailHint: r.voicemail_hint ?? null,
    variables: Array.isArray(r.variables) ? r.variables : [],
    active: r.active !== false,
  };
}

function mapRun(r: any): CampaignRun {
  return {
    id: r.id,
    campaignId: r.campaign_id,
    locationId: r.location_id,
    status: r.status,
    audienceCount: Number(r.audience_count ?? 0),
    placedCount: Number(r.placed_count ?? 0),
    answeredCount: Number(r.answered_count ?? 0),
    startedAt: r.started_at ?? null,
    completedAt: r.completed_at ?? null,
    createdAt: r.created_at,
  };
}

export async function listCampaigns(locationId: string, limit = 50): Promise<OutboundCampaign[]> {
  const t = voiceTable("voice_outbound_campaigns");
  if (!t) return [];
  const { data } = await t
    .select("*")
    .eq("location_id", locationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map(mapCampaign);
}

export async function getCampaign(id: string): Promise<OutboundCampaign | null> {
  const t = voiceTable("voice_outbound_campaigns");
  if (!t) return null;
  const { data } = await t.select("*").eq("id", id).maybeSingle();
  return data ? mapCampaign(data) : null;
}

export async function upsertCampaign(input: {
  id?: string;
  locationId: string;
  name: string;
  description?: string | null;
  campaignType?: OutboundCampaignType;
  callType: OutboundCallType;
  status?: OutboundCampaignStatus;
  triggerCode?: OutboundTriggerCode | null;
  audienceFilter?: AudienceFilter;
  schedule?: CampaignSchedule;
  retryPolicy?: RetryPolicy;
  templateId?: string | null;
  transferMode?: string;
  approvalRequired?: boolean;
  createdBy?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<OutboundCampaign | null> {
  const t = voiceTable("voice_outbound_campaigns");
  if (!t) return null;
  const body: Record<string, unknown> = {
    location_id: input.locationId,
    name: input.name,
    description: input.description ?? null,
    campaign_type: input.campaignType ?? "one_time",
    call_type: input.callType,
    status: input.status ?? "draft",
    trigger_code: input.triggerCode ?? null,
    audience_filter: input.audienceFilter ?? {},
    schedule: input.schedule ?? { immediate: true },
    retry_policy: input.retryPolicy ?? {
      maxAttempts: 3,
      retryDelayMinutes: 60,
      respectBusinessHours: true,
    },
    template_id: input.templateId ?? null,
    transfer_mode: input.transferMode ?? "warm",
    approval_required: input.approvalRequired !== false,
    created_by: input.createdBy ?? null,
    metadata: input.metadata ?? {},
    updated_at: nowIso(),
  };
  if (input.id) body.id = input.id;
  const { data, error } = await t.upsert(body).select("*").single();
  if (error || !data) return null;
  return mapCampaign(data);
}

export async function updateCampaignStatus(
  id: string,
  status: OutboundCampaignStatus,
  approvedBy?: string | null,
): Promise<OutboundCampaign | null> {
  const t = voiceTable("voice_outbound_campaigns");
  if (!t) return null;
  const body: Record<string, unknown> = { status, updated_at: nowIso() };
  if (status === "approved") {
    body.approved_by = approvedBy ?? "admin";
    body.approved_at = nowIso();
  }
  const { data, error } = await t.update(body).eq("id", id).select("*").single();
  if (error || !data) return null;
  return mapCampaign(data);
}

export async function listTemplates(locationId: string): Promise<CampaignTemplate[]> {
  const t = voiceTable("voice_campaign_templates");
  if (!t) return [];
  const { data } = await t.select("*").eq("location_id", locationId).eq("active", true);
  return (data ?? []).map(mapTemplate);
}

export async function getTemplateByCallType(
  locationId: string,
  callType: string,
): Promise<CampaignTemplate | null> {
  const templates = await listTemplates(locationId);
  return templates.find((t) => t.callType === callType || t.code === callType) ?? templates[0] ?? null;
}

export async function upsertTemplate(input: {
  locationId: string;
  code: string;
  name: string;
  callType: string;
  scriptHint?: string;
  voicemailHint?: string;
  variables?: string[];
}): Promise<CampaignTemplate | null> {
  const t = voiceTable("voice_campaign_templates");
  if (!t) return null;
  const { data, error } = await t
    .upsert(
      {
        location_id: input.locationId,
        code: input.code,
        name: input.name,
        call_type: input.callType,
        script_hint: input.scriptHint ?? null,
        voicemail_hint: input.voicemailHint ?? null,
        variables: input.variables ?? [],
        updated_at: nowIso(),
      },
      { onConflict: "location_id,code" },
    )
    .select("*")
    .single();
  if (error || !data) return null;
  return mapTemplate(data);
}

export async function insertCampaignRun(input: {
  campaignId: string;
  locationId: string;
  audienceCount: number;
}): Promise<CampaignRun | null> {
  const t = voiceTable("voice_campaign_runs");
  if (!t) return null;
  const { data, error } = await t
    .insert({
      campaign_id: input.campaignId,
      location_id: input.locationId,
      status: "queued",
      audience_count: input.audienceCount,
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return mapRun(data);
}

export async function updateCampaignRun(
  id: string,
  patch: Partial<{
    status: string;
    placedCount: number;
    answeredCount: number;
    startedAt: string | null;
    completedAt: string | null;
  }>,
): Promise<void> {
  const t = voiceTable("voice_campaign_runs");
  if (!t) return;
  const body: Record<string, unknown> = {};
  if (patch.status !== undefined) body.status = patch.status;
  if (patch.placedCount !== undefined) body.placed_count = patch.placedCount;
  if (patch.answeredCount !== undefined) body.answered_count = patch.answeredCount;
  if (patch.startedAt !== undefined) body.started_at = patch.startedAt;
  if (patch.completedAt !== undefined) body.completed_at = patch.completedAt;
  await t.update(body).eq("id", id);
}

export async function listCampaignRuns(locationId: string, limit = 40): Promise<CampaignRun[]> {
  const t = voiceTable("voice_campaign_runs");
  if (!t) return [];
  const { data } = await t
    .select("*")
    .eq("location_id", locationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map(mapRun);
}

export async function insertOutboundCall(input: {
  campaignId?: string | null;
  runId?: string | null;
  locationId: string;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone: string;
  callType: string;
  status?: OutboundCallStatus;
  attempt?: number;
  maxAttempts?: number;
  scheduledFor?: string | null;
  scriptText?: string | null;
  voicemailText?: string | null;
  reservationId?: string | null;
  confirmationCode?: string | null;
  plannerGoal?: string | null;
  contextPayload?: Record<string, unknown>;
}): Promise<OutboundCall | null> {
  const t = voiceTable("voice_outbound_calls");
  if (!t) return null;
  const { data, error } = await t
    .insert({
      campaign_id: input.campaignId ?? null,
      run_id: input.runId ?? null,
      location_id: input.locationId,
      customer_id: input.customerId ?? null,
      customer_name: input.customerName ?? null,
      customer_phone: input.customerPhone,
      call_type: input.callType,
      status: input.status ?? "queued",
      attempt: input.attempt ?? 1,
      max_attempts: input.maxAttempts ?? 3,
      scheduled_for: input.scheduledFor ?? null,
      script_text: input.scriptText ?? null,
      voicemail_text: input.voicemailText ?? null,
      reservation_id: input.reservationId ?? null,
      confirmation_code: input.confirmationCode ?? null,
      planner_goal: input.plannerGoal ?? null,
      context_payload: input.contextPayload ?? {},
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return mapCall(data);
}

export async function updateOutboundCall(
  id: string,
  patch: Partial<{
    sessionId: string | null;
    status: OutboundCallStatus;
    outcome: string | null;
    attempt: number;
    startedAt: string | null;
    endedAt: string | null;
    durationMs: number;
    scriptText: string | null;
    voicemailText: string | null;
    plannerGoal: string | null;
    scheduledFor: string | null;
    contextPayload: Record<string, unknown>;
  }>,
): Promise<OutboundCall | null> {
  const t = voiceTable("voice_outbound_calls");
  if (!t) return null;
  const body: Record<string, unknown> = { updated_at: nowIso() };
  if (patch.sessionId !== undefined) body.session_id = patch.sessionId;
  if (patch.status !== undefined) body.status = patch.status;
  if (patch.outcome !== undefined) body.outcome = patch.outcome;
  if (patch.attempt !== undefined) body.attempt = patch.attempt;
  if (patch.startedAt !== undefined) body.started_at = patch.startedAt;
  if (patch.endedAt !== undefined) body.ended_at = patch.endedAt;
  if (patch.durationMs !== undefined) body.duration_ms = patch.durationMs;
  if (patch.scriptText !== undefined) body.script_text = patch.scriptText;
  if (patch.voicemailText !== undefined) body.voicemail_text = patch.voicemailText;
  if (patch.plannerGoal !== undefined) body.planner_goal = patch.plannerGoal;
  if (patch.scheduledFor !== undefined) body.scheduled_for = patch.scheduledFor;
  if (patch.contextPayload !== undefined) body.context_payload = patch.contextPayload;
  const { data, error } = await t.update(body).eq("id", id).select("*").single();
  if (error || !data) return null;
  return mapCall(data);
}

export async function getOutboundCall(id: string): Promise<OutboundCall | null> {
  const t = voiceTable("voice_outbound_calls");
  if (!t) return null;
  const { data } = await t.select("*").eq("id", id).maybeSingle();
  return data ? mapCall(data) : null;
}

export async function listOutboundCalls(locationId: string, limit = 50): Promise<OutboundCall[]> {
  const t = voiceTable("voice_outbound_calls");
  if (!t) return [];
  const { data } = await t
    .select("*")
    .eq("location_id", locationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map(mapCall);
}

export async function listDueOutboundCalls(locationId: string, now = nowIso()): Promise<OutboundCall[]> {
  const t = voiceTable("voice_outbound_calls");
  if (!t) return [];
  const { data } = await t
    .select("*")
    .eq("location_id", locationId)
    .eq("status", "queued")
    .or(`scheduled_for.is.null,scheduled_for.lte.${now}`)
    .order("scheduled_for", { ascending: true })
    .limit(25);
  return (data ?? []).map(mapCall);
}

export async function insertOutboundOutcome(input: {
  outboundCallId: string;
  locationId: string;
  sessionId?: string | null;
  outcomeType: string;
  reservationAction?: string | null;
  confirmationCode?: string | null;
  summary?: string | null;
  sentiment?: string | null;
  converted?: boolean;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const t = voiceTable("voice_outbound_outcomes");
  if (!t) return;
  await t.insert({
    outbound_call_id: input.outboundCallId,
    location_id: input.locationId,
    session_id: input.sessionId ?? null,
    outcome_type: input.outcomeType,
    reservation_action: input.reservationAction ?? null,
    confirmation_code: input.confirmationCode ?? null,
    summary: input.summary ?? null,
    sentiment: input.sentiment ?? null,
    converted: input.converted ?? false,
    metadata: input.metadata ?? {},
  });
}

export async function listOutboundOutcomes(locationId: string, limit = 50) {
  const t = voiceTable("voice_outbound_outcomes");
  if (!t) return [];
  const { data } = await t
    .select("*")
    .eq("location_id", locationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function enqueueRetry(input: {
  outboundCallId: string;
  locationId: string;
  attempt: number;
  scheduledFor: string;
  reason?: string;
}): Promise<void> {
  const t = voiceTable("voice_retry_queue");
  if (!t) return;
  await t.insert({
    outbound_call_id: input.outboundCallId,
    location_id: input.locationId,
    attempt: input.attempt,
    scheduled_for: input.scheduledFor,
    reason: input.reason ?? null,
  });
}

export async function listRetries(locationId: string, limit = 40) {
  const t = voiceTable("voice_retry_queue");
  if (!t) return [];
  const { data } = await t
    .select("*")
    .eq("location_id", locationId)
    .order("scheduled_for", { ascending: true })
    .limit(limit);
  return data ?? [];
}

export async function listDueRetries(now = nowIso()) {
  const t = voiceTable("voice_retry_queue");
  if (!t) return [];
  const { data } = await t
    .select("*")
    .eq("status", "queued")
    .lte("scheduled_for", now)
    .order("scheduled_for", { ascending: true })
    .limit(25);
  return data ?? [];
}

export async function updateRetryStatus(id: string, status: string): Promise<void> {
  const t = voiceTable("voice_retry_queue");
  if (!t) return;
  await t.update({ status }).eq("id", id);
}

export async function isOptedOut(phone: string): Promise<boolean> {
  const t = voiceTable("voice_opt_outs");
  if (!t) return false;
  const normalized = phone.replace(/\D/g, "");
  const { data } = await t.select("id").eq("active", true).eq("phone", normalized).maybeSingle();
  if (data) return true;
  const { data: alt } = await t.select("id").eq("active", true).eq("phone", phone).maybeSingle();
  return Boolean(alt);
}

export async function addOptOut(input: {
  phone: string;
  locationId?: string | null;
  email?: string | null;
  customerId?: string | null;
  reason?: string | null;
  source?: string;
}): Promise<OptOutRecord | null> {
  const t = voiceTable("voice_opt_outs");
  if (!t) return null;
  const phone = input.phone.replace(/\D/g, "") || input.phone;
  const { data, error } = await t
    .upsert(
      {
        phone,
        location_id: input.locationId ?? null,
        email: input.email ?? null,
        customer_id: input.customerId ?? null,
        reason: input.reason ?? null,
        source: input.source ?? "voice",
        active: true,
      },
      { onConflict: "phone" },
    )
    .select("*")
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    locationId: data.location_id ?? null,
    phone: data.phone,
    email: data.email ?? null,
    reason: data.reason ?? null,
    active: data.active !== false,
    createdAt: data.created_at,
  };
}

export async function listOptOuts(locationId?: string, limit = 50): Promise<OptOutRecord[]> {
  const t = voiceTable("voice_opt_outs");
  if (!t) return [];
  let q = t.select("*").eq("active", true).order("created_at", { ascending: false }).limit(limit);
  if (locationId) q = q.eq("location_id", locationId);
  const { data } = await q;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    locationId: r.location_id ?? null,
    phone: r.phone,
    email: r.email ?? null,
    reason: r.reason ?? null,
    active: r.active !== false,
    createdAt: r.created_at,
  }));
}

export async function getCompliance(locationId: string): Promise<OutboundCompliance | null> {
  const t = voiceTable("voice_outbound_compliance");
  if (!t) return null;
  const { data } = await t.select("*").eq("location_id", locationId).maybeSingle();
  if (!data) {
    return {
      id: "",
      locationId,
      callingHoursStart: "10:00",
      callingHoursEnd: "20:00",
      quietHoursStart: "21:00",
      quietHoursEnd: "09:00",
      timezone: "America/New_York",
      requireConsent: true,
      requireRecordingConsent: false,
      holidayDates: [],
      countryCode: "US",
    };
  }
  return {
    id: data.id,
    locationId: data.location_id,
    callingHoursStart: data.calling_hours_start ?? "10:00",
    callingHoursEnd: data.calling_hours_end ?? "20:00",
    quietHoursStart: data.quiet_hours_start ?? "21:00",
    quietHoursEnd: data.quiet_hours_end ?? "09:00",
    timezone: data.timezone ?? "America/New_York",
    requireConsent: data.require_consent !== false,
    requireRecordingConsent: Boolean(data.require_recording_consent),
    holidayDates: Array.isArray(data.holiday_dates) ? data.holiday_dates : [],
    countryCode: data.country_code ?? "US",
  };
}

export async function upsertCompliance(
  locationId: string,
  patch: Partial<OutboundCompliance>,
): Promise<OutboundCompliance | null> {
  const t = voiceTable("voice_outbound_compliance");
  if (!t) return null;
  const { data, error } = await t
    .upsert(
      {
        location_id: locationId,
        calling_hours_start: patch.callingHoursStart ?? "10:00",
        calling_hours_end: patch.callingHoursEnd ?? "20:00",
        quiet_hours_start: patch.quietHoursStart ?? "21:00",
        quiet_hours_end: patch.quietHoursEnd ?? "09:00",
        timezone: patch.timezone ?? "America/New_York",
        require_consent: patch.requireConsent !== false,
        require_recording_consent: Boolean(patch.requireRecordingConsent),
        holiday_dates: patch.holidayDates ?? [],
        country_code: patch.countryCode ?? "US",
        updated_at: nowIso(),
      },
      { onConflict: "location_id" },
    )
    .select("*")
    .single();
  if (error || !data) return null;
  return getCompliance(locationId);
}

export async function insertSchedulerJob(input: {
  locationId: string;
  jobType: string;
  refId?: string | null;
  runAt: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const t = voiceTable("voice_scheduler_jobs");
  if (!t) return;
  await t.insert({
    location_id: input.locationId,
    job_type: input.jobType,
    ref_id: input.refId ?? null,
    run_at: input.runAt,
    payload: input.payload ?? {},
  });
}

export async function listSchedulerJobs(locationId: string, limit = 40) {
  const t = voiceTable("voice_scheduler_jobs");
  if (!t) return [];
  const { data } = await t
    .select("*")
    .eq("location_id", locationId)
    .order("run_at", { ascending: true })
    .limit(limit);
  return data ?? [];
}

export async function listDueSchedulerJobs(now = nowIso()) {
  const t = voiceTable("voice_scheduler_jobs");
  if (!t) return [];
  const { data } = await t
    .select("*")
    .eq("status", "pending")
    .lte("run_at", now)
    .order("run_at", { ascending: true })
    .limit(25);
  return data ?? [];
}

export async function updateSchedulerJob(id: string, status: string, error?: string | null) {
  const t = voiceTable("voice_scheduler_jobs");
  if (!t) return;
  await t.update({
    status,
    error: error ?? null,
    completed_at: status === "done" || status === "failed" ? nowIso() : null,
    locked_at: status === "running" ? nowIso() : null,
  }).eq("id", id);
}
