/* eslint-disable @typescript-eslint/no-explicit-any */
import { wfTable } from "./client";
import type {
  DeadLetterItem,
  DomainEvent,
  EventRegistryEntry,
  WorkflowApproval,
  WorkflowDefinition,
  WorkflowGraph,
  WorkflowInstance,
  WorkflowNotification,
  WorkflowRule,
  WorkflowSettings,
  WorkflowStep,
  WorkflowTask,
  WorkflowVersion,
} from "./types";

function row(r: any): any {
  return r ?? {};
}

export function mapEvent(r: any): DomainEvent {
  const x = row(r);
  return {
    id: x.id,
    eventType: x.event_type,
    source: x.source,
    entityType: x.entity_type ?? null,
    entityId: x.entity_id ?? null,
    locationId: x.location_id ?? null,
    payload: (x.payload ?? {}) as Record<string, unknown>,
    version: Number(x.version ?? 1),
    correlationId: x.correlation_id ?? null,
    idempotencyKey: x.idempotency_key ?? null,
    status: x.status ?? "received",
    processedAt: x.processed_at ?? null,
    createdAt: x.created_at,
  };
}

export function mapDefinition(r: any): WorkflowDefinition {
  const x = row(r);
  return {
    id: x.id,
    locationId: x.location_id ?? null,
    code: x.code,
    name: x.name,
    description: x.description ?? null,
    triggerEvent: x.trigger_event,
    active: x.active !== false,
    currentVersion: Number(x.current_version ?? 1),
    metadata: (x.metadata ?? {}) as Record<string, unknown>,
    createdAt: x.created_at,
    updatedAt: x.updated_at,
  };
}

export function mapVersion(r: any): WorkflowVersion {
  const x = row(r);
  const graph = (x.graph ?? { nodes: [], edges: [] }) as WorkflowGraph;
  if (!Array.isArray(graph.nodes)) graph.nodes = [];
  if (!Array.isArray(graph.edges)) graph.edges = [];
  return {
    id: x.id,
    definitionId: x.definition_id,
    version: Number(x.version ?? 1),
    graph,
    rules: Array.isArray(x.rules) ? x.rules : [],
    published: x.published !== false,
    createdBy: x.created_by ?? null,
    createdAt: x.created_at,
  };
}

export function mapInstance(r: any): WorkflowInstance {
  const x = row(r);
  return {
    id: x.id,
    definitionId: x.definition_id,
    versionId: x.version_id ?? null,
    eventId: x.event_id ?? null,
    locationId: x.location_id ?? null,
    status: x.status ?? "running",
    currentNode: x.current_node ?? null,
    context: (x.context ?? {}) as Record<string, unknown>,
    startedAt: x.started_at,
    completedAt: x.completed_at ?? null,
    error: x.error ?? null,
    retryCount: Number(x.retry_count ?? 0),
  };
}

export function mapStep(r: any): WorkflowStep {
  const x = row(r);
  return {
    id: x.id,
    instanceId: x.instance_id,
    nodeId: x.node_id,
    nodeType: x.node_type,
    status: x.status ?? "pending",
    input: (x.input ?? {}) as Record<string, unknown>,
    output: (x.output ?? {}) as Record<string, unknown>,
    attempt: Number(x.attempt ?? 1),
    startedAt: x.started_at ?? null,
    completedAt: x.completed_at ?? null,
    error: x.error ?? null,
    createdAt: x.created_at,
  };
}

export function mapTask(r: any): WorkflowTask {
  const x = row(r);
  return {
    id: x.id,
    instanceId: x.instance_id ?? null,
    locationId: x.location_id ?? null,
    title: x.title,
    description: x.description ?? null,
    department: x.department ?? "manager",
    ownerName: x.owner_name ?? null,
    priority: x.priority ?? "medium",
    status: x.status ?? "open",
    dueAt: x.due_at ?? null,
    dependsOn: Array.isArray(x.depends_on) ? x.depends_on : [],
    metadata: (x.metadata ?? {}) as Record<string, unknown>,
    createdAt: x.created_at,
    completedAt: x.completed_at ?? null,
  };
}

export function mapApproval(r: any): WorkflowApproval {
  const x = row(r);
  return {
    id: x.id,
    instanceId: x.instance_id ?? null,
    locationId: x.location_id ?? null,
    title: x.title,
    stage: x.stage ?? "manager",
    status: x.status ?? "pending",
    actor: x.actor ?? null,
    comment: x.comment ?? null,
    timeoutAt: x.timeout_at ?? null,
    createdAt: x.created_at,
    resolvedAt: x.resolved_at ?? null,
  };
}

export function mapNotification(r: any): WorkflowNotification {
  const x = row(r);
  return {
    id: x.id,
    instanceId: x.instance_id ?? null,
    locationId: x.location_id ?? null,
    channel: x.channel ?? "in_app",
    templateKey: x.template_key ?? null,
    recipient: x.recipient ?? null,
    subject: x.subject ?? null,
    body: x.body ?? null,
    status: x.status ?? "queued",
    scheduledAt: x.scheduled_at ?? null,
    sentAt: x.sent_at ?? null,
    retryCount: Number(x.retry_count ?? 0),
    error: x.error ?? null,
    createdAt: x.created_at,
  };
}

export function mapRule(r: any): WorkflowRule {
  const x = row(r);
  return {
    id: x.id,
    locationId: x.location_id ?? null,
    code: x.code,
    name: x.name,
    description: x.description ?? null,
    eventType: x.event_type ?? null,
    condition: (x.condition ?? {}) as WorkflowRule["condition"],
    action: (x.action ?? {}) as Record<string, unknown>,
    active: x.active !== false,
    priority: Number(x.priority ?? 100),
  };
}

export function mapDeadLetter(r: any): DeadLetterItem {
  const x = row(r);
  return {
    id: x.id,
    instanceId: x.instance_id ?? null,
    eventId: x.event_id ?? null,
    locationId: x.location_id ?? null,
    reason: x.reason ?? null,
    payload: (x.payload ?? {}) as Record<string, unknown>,
    status: x.status ?? "open",
    retryCount: Number(x.retry_count ?? 0),
    createdAt: x.created_at,
    resolvedAt: x.resolved_at ?? null,
  };
}

export function mapRegistry(r: any): EventRegistryEntry {
  const x = row(r);
  return {
    id: x.id,
    eventType: x.event_type,
    source: x.source,
    description: x.description ?? null,
    active: x.active !== false,
  };
}

export function mapSettings(r: any): WorkflowSettings {
  const x = row(r);
  return {
    id: x.id,
    locationId: x.location_id,
    maxRetries: Number(x.max_retries ?? 3),
    defaultTimeoutMinutes: Number(x.default_timeout_minutes ?? 60),
    enableAutomation: x.enable_automation !== false,
    metadata: (x.metadata ?? {}) as Record<string, unknown>,
  };
}

export async function insertEvent(input: {
  eventType: string;
  source: string;
  entityType?: string | null;
  entityId?: string | null;
  locationId?: string | null;
  payload?: Record<string, unknown>;
  version?: number;
  correlationId?: string | null;
  idempotencyKey?: string | null;
  status?: string;
}): Promise<DomainEvent | null> {
  const t = wfTable("workflow_events");
  if (!t) return null;
  const { data, error } = await t
    .insert({
      event_type: input.eventType,
      source: input.source,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      location_id: input.locationId ?? null,
      payload: input.payload ?? {},
      version: input.version ?? 1,
      correlation_id: input.correlationId ?? null,
      idempotency_key: input.idempotencyKey ?? null,
      status: input.status ?? "received",
    })
    .select("*")
    .single();
  if (error) {
    if (String(error.message ?? "").includes("duplicate") || error.code === "23505") {
      if (input.idempotencyKey) {
        const { data: existing } = await t
          .select("*")
          .eq("idempotency_key", input.idempotencyKey)
          .maybeSingle();
        if (existing) return { ...mapEvent(existing), status: "duplicate" };
      }
    }
    return null;
  }
  return data ? mapEvent(data) : null;
}

export async function updateEventStatus(
  id: string,
  status: string,
  processed = false,
): Promise<void> {
  const t = wfTable("workflow_events");
  if (!t) return;
  const body: Record<string, unknown> = { status };
  if (processed) body.processed_at = new Date().toISOString();
  await t.update(body).eq("id", id);
}

export async function listEvents(opts: {
  locationId?: string;
  eventType?: string;
  limit?: number;
}): Promise<DomainEvent[]> {
  const t = wfTable("workflow_events");
  if (!t) return [];
  let q = t.select("*").order("created_at", { ascending: false });
  if (opts.locationId) q = q.eq("location_id", opts.locationId);
  if (opts.eventType) q = q.eq("event_type", opts.eventType);
  const { data } = await q.limit(opts.limit ?? 100);
  return (data ?? []).map(mapEvent);
}

export async function listRegistry(): Promise<EventRegistryEntry[]> {
  const t = wfTable("workflow_event_registry");
  if (!t) return [];
  const { data } = await t.select("*").order("event_type");
  return (data ?? []).map(mapRegistry);
}

export async function registerEventType(input: {
  eventType: string;
  source: string;
  description?: string;
}): Promise<EventRegistryEntry | null> {
  const t = wfTable("workflow_event_registry");
  if (!t) return null;
  const { data, error } = await t
    .upsert(
      {
        event_type: input.eventType,
        source: input.source,
        description: input.description ?? null,
        active: true,
      },
      { onConflict: "event_type" },
    )
    .select("*")
    .single();
  if (error || !data) return null;
  return mapRegistry(data);
}

export async function listDefinitions(locationId?: string): Promise<WorkflowDefinition[]> {
  const t = wfTable("workflow_definitions");
  if (!t) return [];
  const { data } = await t.select("*").order("name");
  const all = (data ?? []).map(mapDefinition);
  if (!locationId) return all;
  return all.filter((d: WorkflowDefinition) => d.locationId == null || d.locationId === locationId);
}

export async function getDefinition(id: string): Promise<WorkflowDefinition | null> {
  const t = wfTable("workflow_definitions");
  if (!t) return null;
  const { data } = await t.select("*").eq("id", id).maybeSingle();
  return data ? mapDefinition(data) : null;
}

export async function upsertDefinition(input: {
  id?: string;
  locationId?: string | null;
  code: string;
  name: string;
  description?: string | null;
  triggerEvent: string;
  active?: boolean;
}): Promise<WorkflowDefinition | null> {
  const t = wfTable("workflow_definitions");
  if (!t) return null;
  const body = {
    id: input.id,
    location_id: input.locationId ?? null,
    code: input.code,
    name: input.name,
    description: input.description ?? null,
    trigger_event: input.triggerEvent,
    active: input.active !== false,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await t.upsert(body, { onConflict: "location_id,code" }).select("*").single();
  if (error || !data) return null;
  return mapDefinition(data);
}

export async function setDefinitionActive(id: string, active: boolean): Promise<void> {
  const t = wfTable("workflow_definitions");
  if (!t) return;
  await t.update({ active, updated_at: new Date().toISOString() }).eq("id", id);
}

export async function getLatestVersion(definitionId: string): Promise<WorkflowVersion | null> {
  const t = wfTable("workflow_versions");
  if (!t) return null;
  const { data } = await t
    .select("*")
    .eq("definition_id", definitionId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? mapVersion(data) : null;
}

export async function insertVersion(input: {
  definitionId: string;
  version: number;
  graph: WorkflowGraph;
  rules?: unknown[];
  createdBy?: string | null;
}): Promise<WorkflowVersion | null> {
  const t = wfTable("workflow_versions");
  if (!t) return null;
  const { data, error } = await t
    .insert({
      definition_id: input.definitionId,
      version: input.version,
      graph: input.graph,
      rules: input.rules ?? [],
      published: true,
      created_by: input.createdBy ?? "admin",
    })
    .select("*")
    .single();
  if (error || !data) return null;
  const def = wfTable("workflow_definitions");
  if (def) {
    await def
      .update({ current_version: input.version, updated_at: new Date().toISOString() })
      .eq("id", input.definitionId);
  }
  return mapVersion(data);
}

export async function insertInstance(input: {
  definitionId: string;
  versionId?: string | null;
  eventId?: string | null;
  locationId?: string | null;
  status?: string;
  currentNode?: string | null;
  context?: Record<string, unknown>;
}): Promise<WorkflowInstance | null> {
  const t = wfTable("workflow_instances");
  if (!t) return null;
  const { data, error } = await t
    .insert({
      definition_id: input.definitionId,
      version_id: input.versionId ?? null,
      event_id: input.eventId ?? null,
      location_id: input.locationId ?? null,
      status: input.status ?? "running",
      current_node: input.currentNode ?? null,
      context: input.context ?? {},
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505" && input.eventId) {
      const { data: existing } = await t
        .select("*")
        .eq("event_id", input.eventId)
        .eq("definition_id", input.definitionId)
        .maybeSingle();
      return existing ? mapInstance(existing) : null;
    }
    return null;
  }
  return data ? mapInstance(data) : null;
}

export async function updateInstance(
  id: string,
  patch: Partial<{
    status: string;
    currentNode: string | null;
    context: Record<string, unknown>;
    completedAt: string | null;
    error: string | null;
    retryCount: number;
  }>,
): Promise<WorkflowInstance | null> {
  const t = wfTable("workflow_instances");
  if (!t) return null;
  const body: Record<string, unknown> = {};
  if (patch.status !== undefined) body.status = patch.status;
  if (patch.currentNode !== undefined) body.current_node = patch.currentNode;
  if (patch.context !== undefined) body.context = patch.context;
  if (patch.completedAt !== undefined) body.completed_at = patch.completedAt;
  if (patch.error !== undefined) body.error = patch.error;
  if (patch.retryCount !== undefined) body.retry_count = patch.retryCount;
  const { data, error } = await t.update(body).eq("id", id).select("*").single();
  if (error || !data) return null;
  return mapInstance(data);
}

export async function getInstance(id: string): Promise<WorkflowInstance | null> {
  const t = wfTable("workflow_instances");
  if (!t) return null;
  const { data } = await t.select("*").eq("id", id).maybeSingle();
  return data ? mapInstance(data) : null;
}

export async function listInstances(opts: {
  locationId?: string;
  status?: string;
  limit?: number;
}): Promise<WorkflowInstance[]> {
  const t = wfTable("workflow_instances");
  if (!t) return [];
  let q = t.select("*").order("started_at", { ascending: false });
  if (opts.locationId) q = q.eq("location_id", opts.locationId);
  if (opts.status) q = q.eq("status", opts.status);
  const { data } = await q.limit(opts.limit ?? 100);
  return (data ?? []).map(mapInstance);
}

export async function insertStep(input: {
  instanceId: string;
  nodeId: string;
  nodeType: string;
  status?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  attempt?: number;
  error?: string | null;
}): Promise<WorkflowStep | null> {
  const t = wfTable("workflow_steps");
  if (!t) return null;
  const now = new Date().toISOString();
  const { data, error } = await t
    .insert({
      instance_id: input.instanceId,
      node_id: input.nodeId,
      node_type: input.nodeType,
      status: input.status ?? "completed",
      input: input.input ?? {},
      output: input.output ?? {},
      attempt: input.attempt ?? 1,
      started_at: now,
      completed_at: input.status === "pending" || input.status === "waiting" ? null : now,
      error: input.error ?? null,
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return mapStep(data);
}

export async function listSteps(instanceId: string): Promise<WorkflowStep[]> {
  const t = wfTable("workflow_steps");
  if (!t) return [];
  const { data } = await t
    .select("*")
    .eq("instance_id", instanceId)
    .order("created_at", { ascending: true });
  return (data ?? []).map(mapStep);
}

export async function insertTask(input: {
  instanceId?: string | null;
  locationId?: string | null;
  title: string;
  description?: string | null;
  department?: string;
  ownerName?: string | null;
  priority?: string;
  dueAt?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<WorkflowTask | null> {
  const t = wfTable("workflow_tasks");
  if (!t) return null;
  const { data, error } = await t
    .insert({
      instance_id: input.instanceId ?? null,
      location_id: input.locationId ?? null,
      title: input.title,
      description: input.description ?? null,
      department: input.department ?? "manager",
      owner_name: input.ownerName ?? null,
      priority: input.priority ?? "medium",
      due_at: input.dueAt ?? null,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return mapTask(data);
}

export async function listTasks(opts: {
  locationId?: string;
  status?: string;
  limit?: number;
}): Promise<WorkflowTask[]> {
  const t = wfTable("workflow_tasks");
  if (!t) return [];
  let q = t.select("*").order("created_at", { ascending: false });
  if (opts.locationId) q = q.eq("location_id", opts.locationId);
  if (opts.status) q = q.eq("status", opts.status);
  const { data } = await q.limit(opts.limit ?? 200);
  return (data ?? []).map(mapTask);
}

export async function updateTaskStatus(id: string, status: string): Promise<WorkflowTask | null> {
  const t = wfTable("workflow_tasks");
  if (!t) return null;
  const body: Record<string, unknown> = { status };
  if (status === "done" || status === "completed") body.completed_at = new Date().toISOString();
  const { data, error } = await t.update(body).eq("id", id).select("*").single();
  if (error || !data) return null;
  return mapTask(data);
}

export async function insertApproval(input: {
  instanceId?: string | null;
  locationId?: string | null;
  title: string;
  stage?: string;
  status?: string;
  timeoutAt?: string | null;
}): Promise<WorkflowApproval | null> {
  const t = wfTable("workflow_approvals");
  if (!t) return null;
  const { data, error } = await t
    .insert({
      instance_id: input.instanceId ?? null,
      location_id: input.locationId ?? null,
      title: input.title,
      stage: input.stage ?? "manager",
      status: input.status ?? "pending",
      timeout_at: input.timeoutAt ?? null,
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return mapApproval(data);
}

export async function listApprovals(opts: {
  locationId?: string;
  status?: string;
}): Promise<WorkflowApproval[]> {
  const t = wfTable("workflow_approvals");
  if (!t) return [];
  let q = t.select("*").order("created_at", { ascending: false });
  if (opts.locationId) q = q.eq("location_id", opts.locationId);
  if (opts.status) q = q.eq("status", opts.status);
  const { data } = await q.limit(100);
  return (data ?? []).map(mapApproval);
}

export async function resolveApproval(
  id: string,
  status: string,
  actor?: string,
  comment?: string,
): Promise<WorkflowApproval | null> {
  const t = wfTable("workflow_approvals");
  if (!t) return null;
  const { data, error } = await t
    .update({
      status,
      actor: actor ?? null,
      comment: comment ?? null,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) return null;
  return mapApproval(data);
}

export async function insertNotification(input: {
  instanceId?: string | null;
  locationId?: string | null;
  channel?: string;
  templateKey?: string | null;
  recipient?: string | null;
  subject?: string | null;
  body?: string | null;
  status?: string;
  scheduledAt?: string | null;
}): Promise<WorkflowNotification | null> {
  const t = wfTable("workflow_notifications");
  if (!t) return null;
  const { data, error } = await t
    .insert({
      instance_id: input.instanceId ?? null,
      location_id: input.locationId ?? null,
      channel: input.channel ?? "in_app",
      template_key: input.templateKey ?? null,
      recipient: input.recipient ?? null,
      subject: input.subject ?? null,
      body: input.body ?? null,
      status: input.status ?? "queued",
      scheduled_at: input.scheduledAt ?? null,
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return mapNotification(data);
}

export async function updateNotification(
  id: string,
  patch: Partial<{ status: string; sentAt: string | null; error: string | null; retryCount: number }>,
): Promise<void> {
  const t = wfTable("workflow_notifications");
  if (!t) return;
  const body: Record<string, unknown> = {};
  if (patch.status !== undefined) body.status = patch.status;
  if (patch.sentAt !== undefined) body.sent_at = patch.sentAt;
  if (patch.error !== undefined) body.error = patch.error;
  if (patch.retryCount !== undefined) body.retry_count = patch.retryCount;
  await t.update(body).eq("id", id);
}

export async function listNotifications(opts: {
  locationId?: string;
  status?: string;
}): Promise<WorkflowNotification[]> {
  const t = wfTable("workflow_notifications");
  if (!t) return [];
  let q = t.select("*").order("created_at", { ascending: false });
  if (opts.locationId) q = q.eq("location_id", opts.locationId);
  if (opts.status) q = q.eq("status", opts.status);
  const { data } = await q.limit(100);
  return (data ?? []).map(mapNotification);
}

export async function listRules(locationId?: string): Promise<WorkflowRule[]> {
  const t = wfTable("workflow_rules");
  if (!t) return [];
  const { data } = await t.select("*").eq("active", true).order("priority");
  const all = (data ?? []).map(mapRule);
  if (!locationId) return all;
  return all.filter((r: WorkflowRule) => r.locationId == null || r.locationId === locationId);
}

export async function upsertRule(input: {
  id?: string;
  locationId?: string | null;
  code: string;
  name: string;
  description?: string | null;
  eventType?: string | null;
  condition?: WorkflowRule["condition"];
  action?: Record<string, unknown>;
  active?: boolean;
  priority?: number;
}): Promise<WorkflowRule | null> {
  const t = wfTable("workflow_rules");
  if (!t) return null;
  const { data, error } = await t
    .upsert(
      {
        id: input.id,
        location_id: input.locationId ?? null,
        code: input.code,
        name: input.name,
        description: input.description ?? null,
        event_type: input.eventType ?? null,
        condition: input.condition ?? {},
        action: input.action ?? {},
        active: input.active !== false,
        priority: input.priority ?? 100,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "location_id,code" },
    )
    .select("*")
    .single();
  if (error || !data) return null;
  return mapRule(data);
}

export async function insertDeadLetter(input: {
  instanceId?: string | null;
  eventId?: string | null;
  locationId?: string | null;
  reason?: string;
  payload?: Record<string, unknown>;
}): Promise<DeadLetterItem | null> {
  const t = wfTable("workflow_dead_letter");
  if (!t) return null;
  const { data, error } = await t
    .insert({
      instance_id: input.instanceId ?? null,
      event_id: input.eventId ?? null,
      location_id: input.locationId ?? null,
      reason: input.reason ?? "max retries exceeded",
      payload: input.payload ?? {},
      status: "open",
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return mapDeadLetter(data);
}

export async function listDeadLetters(opts: {
  locationId?: string;
  status?: string;
}): Promise<DeadLetterItem[]> {
  const t = wfTable("workflow_dead_letter");
  if (!t) return [];
  let q = t.select("*").order("created_at", { ascending: false });
  if (opts.locationId) q = q.eq("location_id", opts.locationId);
  if (opts.status) q = q.eq("status", opts.status);
  const { data } = await q.limit(100);
  return (data ?? []).map(mapDeadLetter);
}

export async function updateDeadLetter(
  id: string,
  patch: Partial<{ status: string; retryCount: number; resolvedAt: string | null }>,
): Promise<DeadLetterItem | null> {
  const t = wfTable("workflow_dead_letter");
  if (!t) return null;
  const body: Record<string, unknown> = {};
  if (patch.status !== undefined) body.status = patch.status;
  if (patch.retryCount !== undefined) body.retry_count = patch.retryCount;
  if (patch.resolvedAt !== undefined) body.resolved_at = patch.resolvedAt;
  const { data, error } = await t.update(body).eq("id", id).select("*").single();
  if (error || !data) return null;
  return mapDeadLetter(data);
}

export async function getSettings(locationId: string): Promise<WorkflowSettings | null> {
  const t = wfTable("workflow_settings");
  if (!t) return null;
  const { data } = await t.select("*").eq("location_id", locationId).maybeSingle();
  return data ? mapSettings(data) : null;
}

export async function upsertSettings(
  locationId: string,
  patch: Partial<WorkflowSettings>,
): Promise<WorkflowSettings | null> {
  const t = wfTable("workflow_settings");
  if (!t) return null;
  const existing = await getSettings(locationId);
  const { data, error } = await t
    .upsert(
      {
        location_id: locationId,
        max_retries: patch.maxRetries ?? existing?.maxRetries ?? 3,
        default_timeout_minutes: patch.defaultTimeoutMinutes ?? existing?.defaultTimeoutMinutes ?? 60,
        enable_automation: patch.enableAutomation ?? existing?.enableAutomation ?? true,
        metadata: patch.metadata ?? existing?.metadata ?? {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "location_id" },
    )
    .select("*")
    .single();
  if (error || !data) return null;
  return mapSettings(data);
}
