/* eslint-disable @typescript-eslint/no-explicit-any */
import { journeyTable } from "./client";
import type {
  CustomerJourney,
  JourneyDefinition,
  JourneyEvent,
  JourneyMilestone,
  JourneyRecommendation,
  JourneyRule,
  JourneyScores,
  JourneySegment,
  JourneySettings,
  JourneyStage,
} from "./types";

function row(r: any): any {
  return r ?? {};
}

export function mapStage(r: any): JourneyStage {
  const x = row(r);
  return {
    id: x.id,
    locationId: x.location_id ?? null,
    code: x.code,
    name: x.name,
    description: x.description ?? null,
    sortOrder: Number(x.sort_order ?? 100),
    active: x.active !== false,
  };
}

export function mapRule(r: any): JourneyRule {
  const x = row(r);
  return {
    id: x.id,
    locationId: x.location_id ?? null,
    code: x.code,
    name: x.name,
    fromStage: x.from_stage ?? null,
    toStage: x.to_stage,
    condition: (x.condition ?? {}) as JourneyRule["condition"],
    priority: Number(x.priority ?? 100),
    active: x.active !== false,
  };
}

export function mapJourney(r: any): CustomerJourney {
  const x = row(r);
  const scores: JourneyScores = {
    engagementScore: Number(x.engagement_score ?? 0),
    visitScore: Number(x.visit_score ?? 0),
    loyaltyScore: Number(x.loyalty_score ?? 0),
    aiScore: Number(x.ai_score ?? 0),
    reviewScore: Number(x.review_score ?? 0),
    cancellationRisk: Number(x.cancellation_risk ?? 0),
    churnRisk: Number(x.churn_risk ?? 0),
    retentionScore: Number(x.retention_score ?? 0),
    relationshipScore: Number(x.relationship_score ?? 0),
  };
  return {
    id: x.id,
    locationId: x.location_id,
    customerId: x.customer_id,
    stageCode: x.stage_code ?? "visitor",
    previousStage: x.previous_stage ?? null,
    scores,
    nextBestAction: x.next_best_action ?? null,
    nextBestActionReason: x.next_best_action_reason ?? null,
    segmentCodes: Array.isArray(x.segment_codes) ? x.segment_codes : [],
    metadata: (x.metadata ?? {}) as Record<string, unknown>,
    stageChangedAt: x.stage_changed_at,
    updatedAt: x.updated_at,
  };
}

export function mapMilestone(r: any): JourneyMilestone {
  const x = row(r);
  return {
    id: x.id,
    locationId: x.location_id ?? null,
    customerId: x.customer_id,
    milestoneCode: x.milestone_code,
    title: x.title,
    achievedAt: x.achieved_at,
    metadata: (x.metadata ?? {}) as Record<string, unknown>,
  };
}

export function mapRecommendation(r: any): JourneyRecommendation {
  const x = row(r);
  return {
    id: x.id,
    locationId: x.location_id ?? null,
    customerId: x.customer_id,
    actionCode: x.action_code,
    title: x.title,
    reason: x.reason ?? null,
    priority: Number(x.priority ?? 100),
    status: x.status ?? "open",
    createdAt: x.created_at,
  };
}

export function mapEvent(r: any): JourneyEvent {
  const x = row(r);
  return {
    id: x.id,
    locationId: x.location_id ?? null,
    customerId: x.customer_id ?? null,
    eventType: x.event_type,
    title: x.title,
    summary: x.summary ?? null,
    source: x.source ?? "journey",
    payload: (x.payload ?? {}) as Record<string, unknown>,
    createdAt: x.created_at,
  };
}

export function mapSegment(r: any): JourneySegment {
  const x = row(r);
  return {
    id: x.id,
    locationId: x.location_id ?? null,
    code: x.code,
    name: x.name,
    description: x.description ?? null,
    condition: (x.condition ?? {}) as JourneySegment["condition"],
    active: x.active !== false,
  };
}

export function mapDefinition(r: any): JourneyDefinition {
  const x = row(r);
  return {
    id: x.id,
    locationId: x.location_id ?? null,
    code: x.code,
    name: x.name,
    description: x.description ?? null,
    active: x.active !== false,
    currentVersion: Number(x.current_version ?? 1),
    graph: (x.graph ?? { nodes: [], edges: [] }) as JourneyDefinition["graph"],
  };
}

export function mapSettings(r: any): JourneySettings {
  const x = row(r);
  return {
    id: x.id,
    locationId: x.location_id,
    inactiveDays: Number(x.inactive_days ?? 60),
    atRiskDays: Number(x.at_risk_days ?? 90),
    vipVisitThreshold: Number(x.vip_visit_threshold ?? 8),
    frequentVisitThreshold: Number(x.frequent_visit_threshold ?? 4),
    enableCampaigns: x.enable_campaigns !== false,
  };
}

export async function listStages(locationId?: string): Promise<JourneyStage[]> {
  const t = journeyTable("journey_stages");
  if (!t) return [];
  const { data } = await t.select("*").eq("active", true).order("sort_order");
  const all = (data ?? []).map(mapStage);
  if (!locationId) return all;
  return all.filter((s: JourneyStage) => s.locationId == null || s.locationId === locationId);
}

export async function upsertStage(input: {
  locationId?: string | null;
  code: string;
  name: string;
  description?: string | null;
  sortOrder?: number;
}): Promise<JourneyStage | null> {
  const t = journeyTable("journey_stages");
  if (!t) return null;
  const { data, error } = await t
    .upsert(
      {
        location_id: input.locationId ?? null,
        code: input.code,
        name: input.name,
        description: input.description ?? null,
        sort_order: input.sortOrder ?? 100,
        active: true,
      },
      { onConflict: "location_id,code" },
    )
    .select("*")
    .single();
  if (error || !data) return null;
  return mapStage(data);
}

export async function listRules(locationId?: string): Promise<JourneyRule[]> {
  const t = journeyTable("journey_rules");
  if (!t) return [];
  const { data } = await t.select("*").eq("active", true).order("priority");
  const all = (data ?? []).map(mapRule);
  if (!locationId) return all;
  return all.filter((r: JourneyRule) => r.locationId == null || r.locationId === locationId);
}

export async function upsertRule(input: {
  locationId?: string | null;
  code: string;
  name: string;
  fromStage?: string | null;
  toStage: string;
  condition?: JourneyRule["condition"];
  priority?: number;
}): Promise<JourneyRule | null> {
  const t = journeyTable("journey_rules");
  if (!t) return null;
  const { data, error } = await t
    .upsert(
      {
        location_id: input.locationId ?? null,
        code: input.code,
        name: input.name,
        from_stage: input.fromStage ?? null,
        to_stage: input.toStage,
        condition: input.condition ?? {},
        priority: input.priority ?? 100,
        active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "location_id,code" },
    )
    .select("*")
    .single();
  if (error || !data) return null;
  return mapRule(data);
}

export async function getCustomerJourney(
  locationId: string,
  customerId: string,
): Promise<CustomerJourney | null> {
  const t = journeyTable("customer_journeys");
  if (!t) return null;
  const { data } = await t
    .select("*")
    .eq("location_id", locationId)
    .eq("customer_id", customerId)
    .maybeSingle();
  return data ? mapJourney(data) : null;
}

export async function upsertCustomerJourney(input: {
  locationId: string;
  customerId: string;
  stageCode: string;
  previousStage?: string | null;
  scores: JourneyScores;
  nextBestAction?: string | null;
  nextBestActionReason?: string | null;
  segmentCodes?: string[];
  metadata?: Record<string, unknown>;
  stageChanged?: boolean;
}): Promise<CustomerJourney | null> {
  const t = journeyTable("customer_journeys");
  if (!t) return null;
  const now = new Date().toISOString();
  const body: Record<string, unknown> = {
    location_id: input.locationId,
    customer_id: input.customerId,
    stage_code: input.stageCode,
    previous_stage: input.previousStage ?? null,
    relationship_score: input.scores.relationshipScore,
    engagement_score: input.scores.engagementScore,
    visit_score: input.scores.visitScore,
    loyalty_score: input.scores.loyaltyScore,
    ai_score: input.scores.aiScore,
    review_score: input.scores.reviewScore,
    cancellation_risk: input.scores.cancellationRisk,
    churn_risk: input.scores.churnRisk,
    retention_score: input.scores.retentionScore,
    next_best_action: input.nextBestAction ?? null,
    next_best_action_reason: input.nextBestActionReason ?? null,
    segment_codes: input.segmentCodes ?? [],
    metadata: input.metadata ?? {},
    updated_at: now,
  };
  if (input.stageChanged) body.stage_changed_at = now;
  const { data, error } = await t
    .upsert(body, { onConflict: "location_id,customer_id" })
    .select("*")
    .single();
  if (error || !data) return null;
  return mapJourney(data);
}

export async function listCustomerJourneys(opts: {
  locationId: string;
  stage?: string;
  limit?: number;
}): Promise<CustomerJourney[]> {
  const t = journeyTable("customer_journeys");
  if (!t) return [];
  let q = t.select("*").eq("location_id", opts.locationId).order("updated_at", { ascending: false });
  if (opts.stage) q = q.eq("stage_code", opts.stage);
  const { data } = await q.limit(opts.limit ?? 200);
  return (data ?? []).map(mapJourney);
}

export async function insertHistory(input: {
  customerId: string;
  locationId?: string | null;
  fromStage?: string | null;
  toStage: string;
  reason?: string | null;
}): Promise<void> {
  const t = journeyTable("journey_history");
  if (!t) return;
  await t.insert({
    customer_id: input.customerId,
    location_id: input.locationId ?? null,
    from_stage: input.fromStage ?? null,
    to_stage: input.toStage,
    reason: input.reason ?? null,
  });
}

export async function listHistory(customerId: string, limit = 50) {
  const t = journeyTable("journey_history");
  if (!t) return [];
  const { data } = await t
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function insertMilestone(input: {
  locationId?: string | null;
  customerId: string;
  milestoneCode: string;
  title: string;
  metadata?: Record<string, unknown>;
}): Promise<JourneyMilestone | null> {
  const t = journeyTable("journey_milestones");
  if (!t) return null;
  const { data, error } = await t
    .upsert(
      {
        location_id: input.locationId ?? null,
        customer_id: input.customerId,
        milestone_code: input.milestoneCode,
        title: input.title,
        metadata: input.metadata ?? {},
      },
      { onConflict: "customer_id,milestone_code", ignoreDuplicates: true },
    )
    .select("*")
    .maybeSingle();
  if (error) {
    // already exists
    const { data: existing } = await t
      .select("*")
      .eq("customer_id", input.customerId)
      .eq("milestone_code", input.milestoneCode)
      .maybeSingle();
    return existing ? mapMilestone(existing) : null;
  }
  return data ? mapMilestone(data) : null;
}

export async function listMilestones(customerId: string): Promise<JourneyMilestone[]> {
  const t = journeyTable("journey_milestones");
  if (!t) return [];
  const { data } = await t
    .select("*")
    .eq("customer_id", customerId)
    .order("achieved_at", { ascending: false });
  return (data ?? []).map(mapMilestone);
}

export async function insertScoreSnapshot(input: {
  customerId: string;
  locationId?: string | null;
  scores: JourneyScores;
}): Promise<void> {
  const t = journeyTable("journey_scores");
  if (!t) return;
  await t.insert({
    customer_id: input.customerId,
    location_id: input.locationId ?? null,
    engagement_score: input.scores.engagementScore,
    visit_score: input.scores.visitScore,
    loyalty_score: input.scores.loyaltyScore,
    ai_score: input.scores.aiScore,
    review_score: input.scores.reviewScore,
    cancellation_risk: input.scores.cancellationRisk,
    churn_risk: input.scores.churnRisk,
    retention_score: input.scores.retentionScore,
    relationship_score: input.scores.relationshipScore,
  });
}

export async function insertJourneyEvent(input: {
  locationId?: string | null;
  customerId?: string | null;
  eventType: string;
  title: string;
  summary?: string | null;
  source?: string;
  payload?: Record<string, unknown>;
}): Promise<JourneyEvent | null> {
  const t = journeyTable("journey_events");
  if (!t) return null;
  const { data, error } = await t
    .insert({
      location_id: input.locationId ?? null,
      customer_id: input.customerId ?? null,
      event_type: input.eventType,
      title: input.title,
      summary: input.summary ?? null,
      source: input.source ?? "journey",
      payload: input.payload ?? {},
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return mapEvent(data);
}

export async function listJourneyEvents(opts: {
  customerId?: string;
  locationId?: string;
  limit?: number;
}): Promise<JourneyEvent[]> {
  const t = journeyTable("journey_events");
  if (!t) return [];
  let q = t.select("*").order("created_at", { ascending: false });
  if (opts.customerId) q = q.eq("customer_id", opts.customerId);
  if (opts.locationId) q = q.eq("location_id", opts.locationId);
  const { data } = await q.limit(opts.limit ?? 100);
  return (data ?? []).map(mapEvent);
}

export async function upsertRecommendation(input: {
  locationId?: string | null;
  customerId: string;
  actionCode: string;
  title: string;
  reason?: string | null;
  priority?: number;
}): Promise<JourneyRecommendation | null> {
  const t = journeyTable("journey_recommendations");
  if (!t) return null;
  // close previous open of same action
  await t
    .update({ status: "superseded", resolved_at: new Date().toISOString() })
    .eq("customer_id", input.customerId)
    .eq("action_code", input.actionCode)
    .eq("status", "open");
  const { data, error } = await t
    .insert({
      location_id: input.locationId ?? null,
      customer_id: input.customerId,
      action_code: input.actionCode,
      title: input.title,
      reason: input.reason ?? null,
      priority: input.priority ?? 100,
      status: "open",
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return mapRecommendation(data);
}

export async function listRecommendations(opts: {
  locationId?: string;
  customerId?: string;
  status?: string;
}): Promise<JourneyRecommendation[]> {
  const t = journeyTable("journey_recommendations");
  if (!t) return [];
  let q = t.select("*").order("priority", { ascending: true });
  if (opts.locationId) q = q.eq("location_id", opts.locationId);
  if (opts.customerId) q = q.eq("customer_id", opts.customerId);
  if (opts.status) q = q.eq("status", opts.status);
  const { data } = await q.limit(100);
  return (data ?? []).map(mapRecommendation);
}

export async function insertCampaign(input: {
  locationId?: string | null;
  customerId?: string | null;
  triggerType: string;
  campaignKey: string;
  workflowEventId?: string | null;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const t = journeyTable("journey_campaigns");
  if (!t) return;
  await t.insert({
    location_id: input.locationId ?? null,
    customer_id: input.customerId ?? null,
    trigger_type: input.triggerType,
    campaign_key: input.campaignKey,
    workflow_event_id: input.workflowEventId ?? null,
    payload: input.payload ?? {},
  });
}

export async function listCampaigns(locationId?: string, limit = 100) {
  const t = journeyTable("journey_campaigns");
  if (!t) return [];
  let q = t.select("*").order("created_at", { ascending: false });
  if (locationId) q = q.eq("location_id", locationId);
  const { data } = await q.limit(limit);
  return data ?? [];
}

export async function listSegments(locationId?: string): Promise<JourneySegment[]> {
  const t = journeyTable("journey_segments");
  if (!t) return [];
  const { data } = await t.select("*").eq("active", true);
  const all = (data ?? []).map(mapSegment);
  if (!locationId) return all;
  return all.filter((s: JourneySegment) => s.locationId == null || s.locationId === locationId);
}

export async function listDefinitions(locationId?: string): Promise<JourneyDefinition[]> {
  const t = journeyTable("journey_definitions");
  if (!t) return [];
  const { data } = await t.select("*").order("name");
  const all = (data ?? []).map(mapDefinition);
  if (!locationId) return all;
  return all.filter((d: JourneyDefinition) => d.locationId == null || d.locationId === locationId);
}

export async function upsertDefinition(input: {
  locationId?: string | null;
  code: string;
  name: string;
  description?: string | null;
  graph?: JourneyDefinition["graph"];
  active?: boolean;
}): Promise<JourneyDefinition | null> {
  const t = journeyTable("journey_definitions");
  if (!t) return null;
  const { data, error } = await t
    .upsert(
      {
        location_id: input.locationId ?? null,
        code: input.code,
        name: input.name,
        description: input.description ?? null,
        graph: input.graph ?? { nodes: [], edges: [] },
        active: input.active !== false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "location_id,code" },
    )
    .select("*")
    .single();
  if (error || !data) return null;
  return mapDefinition(data);
}

export async function publishJourneyVersion(input: {
  definitionId: string;
  version: number;
  graph: JourneyDefinition["graph"];
  createdBy?: string;
}): Promise<void> {
  const t = journeyTable("journey_versions");
  if (!t) return;
  await t.insert({
    definition_id: input.definitionId,
    version: input.version,
    graph: input.graph,
    created_by: input.createdBy ?? "admin",
  });
  const d = journeyTable("journey_definitions");
  if (d) {
    await d
      .update({
        current_version: input.version,
        graph: input.graph,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.definitionId);
  }
}

export async function getSettings(locationId: string): Promise<JourneySettings | null> {
  const t = journeyTable("journey_settings");
  if (!t) return null;
  const { data } = await t.select("*").eq("location_id", locationId).maybeSingle();
  return data ? mapSettings(data) : null;
}

export async function upsertSettings(
  locationId: string,
  patch: Partial<JourneySettings>,
): Promise<JourneySettings | null> {
  const t = journeyTable("journey_settings");
  if (!t) return null;
  const existing = await getSettings(locationId);
  const { data, error } = await t
    .upsert(
      {
        location_id: locationId,
        inactive_days: patch.inactiveDays ?? existing?.inactiveDays ?? 60,
        at_risk_days: patch.atRiskDays ?? existing?.atRiskDays ?? 90,
        vip_visit_threshold: patch.vipVisitThreshold ?? existing?.vipVisitThreshold ?? 8,
        frequent_visit_threshold:
          patch.frequentVisitThreshold ?? existing?.frequentVisitThreshold ?? 4,
        enable_campaigns: patch.enableCampaigns ?? existing?.enableCampaigns ?? true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "location_id" },
    )
    .select("*")
    .single();
  if (error || !data) return null;
  return mapSettings(data);
}
