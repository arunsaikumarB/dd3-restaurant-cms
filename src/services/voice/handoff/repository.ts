/* eslint-disable @typescript-eslint/no-explicit-any */
import { voiceTable, nowIso } from "../client";
import type {
  AgentAvailability,
  CallbackQueueItem,
  EscalationRule,
  EscalationScenario,
  EscalationStatus,
  HandoffStaffRole,
  TransferContextPayload,
  TransferMode,
  TransferStatus,
  VoiceCallTask,
  VoiceDepartment,
  VoiceEscalation,
  VoiceLiveAgent,
  VoiceStaffNote,
  VoiceTransfer,
  TaskType,
} from "./types";

function mapDept(r: any): VoiceDepartment {
  return {
    id: r.id,
    locationId: r.location_id,
    code: r.code,
    name: r.name,
    description: r.description ?? null,
    priorityDefault: Number(r.priority_default ?? 5),
    active: r.active !== false,
  };
}

function mapAgent(r: any): VoiceLiveAgent {
  return {
    id: r.id,
    locationId: r.location_id,
    userId: r.user_id ?? null,
    displayName: r.display_name,
    email: r.email ?? null,
    phone: r.phone ?? null,
    departmentCode: r.department_code ?? "general",
    role: (r.role as HandoffStaffRole) ?? "staff",
    status: (r.status as AgentAvailability) ?? "offline",
    maxConcurrent: Number(r.max_concurrent ?? 1),
    activeCalls: Number(r.active_calls ?? 0),
    lastHeartbeatAt: r.last_heartbeat_at ?? null,
  };
}

function mapRule(r: any): EscalationRule {
  return {
    id: r.id,
    locationId: r.location_id,
    code: r.code,
    name: r.name,
    triggers: Array.isArray(r.triggers) ? r.triggers : [],
    departmentCode: r.department_code ?? "general",
    priority: Number(r.priority ?? 5),
    transferMode: (r.transfer_mode as TransferMode) ?? "warm",
    autoQueue: r.auto_queue !== false,
    enabled: r.enabled !== false,
  };
}

function mapEscalation(r: any): VoiceEscalation {
  return {
    id: r.id,
    sessionId: r.session_id,
    locationId: r.location_id,
    reason: r.reason,
    scenario: r.scenario as EscalationScenario,
    priority: Number(r.priority ?? 5),
    departmentCode: r.department_code ?? "general",
    status: r.status as EscalationStatus,
    conversationSummary: r.conversation_summary ?? null,
    plannerGoal: r.planner_goal ?? null,
    reflectionConfidence: r.reflection_confidence != null ? Number(r.reflection_confidence) : null,
    reservationStatus: r.reservation_status ?? null,
    crmSnapshot: (r.crm_snapshot as Record<string, unknown>) ?? {},
    customerSentiment: r.customer_sentiment ?? null,
    knowledgeUsed: Array.isArray(r.knowledge_used) ? r.knowledge_used : [],
    suggestedAction: r.suggested_action ?? null,
    transferMode: (r.transfer_mode as TransferMode) ?? "warm",
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    resolvedAt: r.resolved_at ?? null,
  };
}

function mapTransfer(r: any): VoiceTransfer {
  return {
    id: r.id,
    escalationId: r.escalation_id,
    sessionId: r.session_id,
    locationId: r.location_id,
    departmentCode: r.department_code,
    transferMode: (r.transfer_mode as TransferMode) ?? "warm",
    status: r.status as TransferStatus,
    fromAgent: r.from_agent ?? "cheffy",
    toAgentId: r.to_agent_id ?? null,
    acceptedBy: r.accepted_by ?? null,
    queuedAt: r.queued_at,
    acceptedAt: r.accepted_at ?? null,
    completedAt: r.completed_at ?? null,
    waitMs: Number(r.wait_ms ?? 0),
    contextPayload: (r.context_payload as TransferContextPayload) ?? {},
    audit: Array.isArray(r.audit) ? r.audit : [],
  };
}

export async function listDepartments(locationId: string): Promise<VoiceDepartment[]> {
  const t = voiceTable("voice_departments");
  if (!t) return [];
  const { data } = await t.select("*").eq("location_id", locationId).eq("active", true).order("priority_default");
  return (data ?? []).map(mapDept);
}

export async function upsertDepartment(input: {
  locationId: string;
  code: string;
  name: string;
  description?: string;
  priorityDefault?: number;
  active?: boolean;
}): Promise<VoiceDepartment | null> {
  const t = voiceTable("voice_departments");
  if (!t) return null;
  const { data, error } = await t
    .upsert(
      {
        location_id: input.locationId,
        code: input.code,
        name: input.name,
        description: input.description ?? null,
        priority_default: input.priorityDefault ?? 5,
        active: input.active !== false,
        updated_at: nowIso(),
      },
      { onConflict: "location_id,code" },
    )
    .select("*")
    .single();
  if (error || !data) return null;
  return mapDept(data);
}

export async function listLiveAgents(locationId: string): Promise<VoiceLiveAgent[]> {
  const t = voiceTable("voice_live_agents");
  if (!t) return [];
  const { data } = await t.select("*").eq("location_id", locationId).order("display_name");
  return (data ?? []).map(mapAgent);
}

export async function upsertLiveAgent(input: {
  id?: string;
  locationId: string;
  userId?: string | null;
  displayName: string;
  email?: string | null;
  phone?: string | null;
  departmentCode?: string;
  role?: HandoffStaffRole;
  status?: AgentAvailability;
  maxConcurrent?: number;
}): Promise<VoiceLiveAgent | null> {
  const t = voiceTable("voice_live_agents");
  if (!t) return null;
  const body: Record<string, unknown> = {
    location_id: input.locationId,
    user_id: input.userId ?? null,
    display_name: input.displayName,
    email: input.email ?? null,
    phone: input.phone ?? null,
    department_code: input.departmentCode ?? "general",
    role: input.role ?? "staff",
    status: input.status ?? "offline",
    max_concurrent: input.maxConcurrent ?? 1,
    updated_at: nowIso(),
  };
  if (input.id) body.id = input.id;
  const { data, error } = await t.upsert(body).select("*").single();
  if (error || !data) return null;
  return mapAgent(data);
}

export async function updateAgentStatus(
  agentId: string,
  status: AgentAvailability,
  activeCalls?: number,
): Promise<VoiceLiveAgent | null> {
  const t = voiceTable("voice_live_agents");
  if (!t) return null;
  const body: Record<string, unknown> = {
    status,
    last_heartbeat_at: nowIso(),
    updated_at: nowIso(),
  };
  if (activeCalls !== undefined) body.active_calls = activeCalls;
  const { data, error } = await t.update(body).eq("id", agentId).select("*").single();
  if (error || !data) return null;
  return mapAgent(data);
}

export async function listEscalationRules(locationId: string): Promise<EscalationRule[]> {
  const t = voiceTable("voice_escalation_rules");
  if (!t) return [];
  const { data } = await t.select("*").eq("location_id", locationId).order("priority");
  return (data ?? []).map(mapRule);
}

export async function upsertEscalationRule(input: {
  id?: string;
  locationId: string;
  code: string;
  name: string;
  triggers: string[];
  departmentCode: string;
  priority?: number;
  transferMode?: TransferMode;
  autoQueue?: boolean;
  enabled?: boolean;
}): Promise<EscalationRule | null> {
  const t = voiceTable("voice_escalation_rules");
  if (!t) return null;
  const body: Record<string, unknown> = {
    location_id: input.locationId,
    code: input.code,
    name: input.name,
    triggers: input.triggers,
    department_code: input.departmentCode,
    priority: input.priority ?? 5,
    transfer_mode: input.transferMode ?? "warm",
    auto_queue: input.autoQueue !== false,
    enabled: input.enabled !== false,
    updated_at: nowIso(),
  };
  if (input.id) body.id = input.id;
  const { data, error } = await t
    .upsert(body, { onConflict: "location_id,code" })
    .select("*")
    .single();
  if (error || !data) return null;
  return mapRule(data);
}

export async function insertEscalation(input: {
  sessionId: string;
  locationId: string;
  reason: string;
  scenario: EscalationScenario;
  priority: number;
  departmentCode: string;
  status?: EscalationStatus;
  conversationSummary?: string | null;
  plannerGoal?: string | null;
  reflectionConfidence?: number | null;
  reservationStatus?: string | null;
  crmSnapshot?: Record<string, unknown>;
  customerSentiment?: string | null;
  knowledgeUsed?: string[];
  suggestedAction?: string | null;
  transferMode?: TransferMode;
  metadata?: Record<string, unknown>;
}): Promise<VoiceEscalation | null> {
  const t = voiceTable("voice_escalations");
  if (!t) return null;
  const { data, error } = await t
    .insert({
      session_id: input.sessionId,
      location_id: input.locationId,
      reason: input.reason,
      scenario: input.scenario,
      priority: input.priority,
      department_code: input.departmentCode,
      status: input.status ?? "recommended",
      conversation_summary: input.conversationSummary ?? null,
      planner_goal: input.plannerGoal ?? null,
      reflection_confidence: input.reflectionConfidence ?? null,
      reservation_status: input.reservationStatus ?? null,
      crm_snapshot: input.crmSnapshot ?? {},
      customer_sentiment: input.customerSentiment ?? null,
      knowledge_used: input.knowledgeUsed ?? [],
      suggested_action: input.suggestedAction ?? null,
      transfer_mode: input.transferMode ?? "warm",
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return mapEscalation(data);
}

export async function updateEscalation(
  id: string,
  patch: Partial<{
    status: EscalationStatus;
    conversationSummary: string | null;
    suggestedAction: string | null;
    resolvedAt: string | null;
    metadata: Record<string, unknown>;
  }>,
): Promise<VoiceEscalation | null> {
  const t = voiceTable("voice_escalations");
  if (!t) return null;
  const body: Record<string, unknown> = { updated_at: nowIso() };
  if (patch.status !== undefined) body.status = patch.status;
  if (patch.conversationSummary !== undefined) body.conversation_summary = patch.conversationSummary;
  if (patch.suggestedAction !== undefined) body.suggested_action = patch.suggestedAction;
  if (patch.resolvedAt !== undefined) body.resolved_at = patch.resolvedAt;
  if (patch.metadata !== undefined) body.metadata = patch.metadata;
  const { data, error } = await t.update(body).eq("id", id).select("*").single();
  if (error || !data) return null;
  return mapEscalation(data);
}

export async function listEscalations(locationId: string, limit = 50): Promise<VoiceEscalation[]> {
  const t = voiceTable("voice_escalations");
  if (!t) return [];
  const { data } = await t
    .select("*")
    .eq("location_id", locationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map(mapEscalation);
}

export async function getOpenEscalationForSession(sessionId: string): Promise<VoiceEscalation | null> {
  const t = voiceTable("voice_escalations");
  if (!t) return null;
  const { data } = await t
    .select("*")
    .eq("session_id", sessionId)
    .in("status", ["recommended", "queued", "transferring", "accepted"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? mapEscalation(data) : null;
}

export async function insertTransfer(input: {
  escalationId: string;
  sessionId: string;
  locationId: string;
  departmentCode: string;
  transferMode: TransferMode;
  contextPayload: TransferContextPayload;
  toAgentId?: string | null;
  status?: TransferStatus;
}): Promise<VoiceTransfer | null> {
  const t = voiceTable("voice_transfers");
  if (!t) return null;
  const { data, error } = await t
    .insert({
      escalation_id: input.escalationId,
      session_id: input.sessionId,
      location_id: input.locationId,
      department_code: input.departmentCode,
      transfer_mode: input.transferMode,
      status: input.status ?? "waiting",
      to_agent_id: input.toAgentId ?? null,
      context_payload: input.contextPayload,
      audit: [{ at: nowIso(), event: "queued", by: "cheffy" }],
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return mapTransfer(data);
}

export async function updateTransfer(
  id: string,
  patch: Partial<{
    status: TransferStatus;
    toAgentId: string | null;
    acceptedBy: string | null;
    acceptedAt: string | null;
    completedAt: string | null;
    waitMs: number;
    contextPayload: TransferContextPayload;
    audit: Array<Record<string, unknown>>;
  }>,
): Promise<VoiceTransfer | null> {
  const t = voiceTable("voice_transfers");
  if (!t) return null;
  const body: Record<string, unknown> = { updated_at: nowIso() };
  if (patch.status !== undefined) body.status = patch.status;
  if (patch.toAgentId !== undefined) body.to_agent_id = patch.toAgentId;
  if (patch.acceptedBy !== undefined) body.accepted_by = patch.acceptedBy;
  if (patch.acceptedAt !== undefined) body.accepted_at = patch.acceptedAt;
  if (patch.completedAt !== undefined) body.completed_at = patch.completedAt;
  if (patch.waitMs !== undefined) body.wait_ms = patch.waitMs;
  if (patch.contextPayload !== undefined) body.context_payload = patch.contextPayload;
  if (patch.audit !== undefined) body.audit = patch.audit;
  const { data, error } = await t.update(body).eq("id", id).select("*").single();
  if (error || !data) return null;
  return mapTransfer(data);
}

export async function getTransfer(id: string): Promise<VoiceTransfer | null> {
  const t = voiceTable("voice_transfers");
  if (!t) return null;
  const { data } = await t.select("*").eq("id", id).maybeSingle();
  return data ? mapTransfer(data) : null;
}

export async function listTransfers(locationId: string, limit = 50): Promise<VoiceTransfer[]> {
  const t = voiceTable("voice_transfers");
  if (!t) return [];
  const { data } = await t
    .select("*")
    .eq("location_id", locationId)
    .order("queued_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map(mapTransfer);
}

export async function listWaitingTransfers(locationId: string): Promise<VoiceTransfer[]> {
  const t = voiceTable("voice_transfers");
  if (!t) return [];
  const { data } = await t
    .select("*")
    .eq("location_id", locationId)
    .in("status", ["waiting", "ringing"])
    .order("queued_at", { ascending: true });
  return (data ?? []).map(mapTransfer);
}

export async function insertCallTask(input: {
  sessionId?: string | null;
  locationId: string;
  escalationId?: string | null;
  transferId?: string | null;
  taskType: TaskType;
  title: string;
  description?: string | null;
  priority?: number;
}): Promise<VoiceCallTask | null> {
  const t = voiceTable("voice_call_tasks");
  if (!t) return null;
  const { data, error } = await t
    .insert({
      session_id: input.sessionId ?? null,
      location_id: input.locationId,
      escalation_id: input.escalationId ?? null,
      transfer_id: input.transferId ?? null,
      task_type: input.taskType,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority ?? 5,
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    sessionId: data.session_id ?? null,
    locationId: data.location_id,
    escalationId: data.escalation_id ?? null,
    transferId: data.transfer_id ?? null,
    taskType: data.task_type,
    title: data.title,
    description: data.description ?? null,
    status: data.status,
    priority: Number(data.priority ?? 5),
    createdAt: data.created_at,
  };
}

export async function listCallTasks(locationId: string, limit = 50): Promise<VoiceCallTask[]> {
  const t = voiceTable("voice_call_tasks");
  if (!t) return [];
  const { data } = await t
    .select("*")
    .eq("location_id", locationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    sessionId: r.session_id ?? null,
    locationId: r.location_id,
    escalationId: r.escalation_id ?? null,
    transferId: r.transfer_id ?? null,
    taskType: r.task_type,
    title: r.title,
    description: r.description ?? null,
    status: r.status,
    priority: Number(r.priority ?? 5),
    createdAt: r.created_at,
  }));
}

export async function insertStaffNote(input: {
  sessionId: string;
  locationId: string;
  escalationId?: string | null;
  transferId?: string | null;
  authorId?: string | null;
  authorName?: string | null;
  note: string;
}): Promise<VoiceStaffNote | null> {
  const t = voiceTable("voice_staff_notes");
  if (!t) return null;
  const { data, error } = await t
    .insert({
      session_id: input.sessionId,
      location_id: input.locationId,
      escalation_id: input.escalationId ?? null,
      transfer_id: input.transferId ?? null,
      author_id: input.authorId ?? null,
      author_name: input.authorName ?? null,
      note: input.note,
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    sessionId: data.session_id,
    locationId: data.location_id,
    authorName: data.author_name ?? null,
    note: data.note,
    createdAt: data.created_at,
  };
}

export async function listStaffNotes(sessionId: string): Promise<VoiceStaffNote[]> {
  const t = voiceTable("voice_staff_notes");
  if (!t) return [];
  const { data } = await t.select("*").eq("session_id", sessionId).order("created_at", { ascending: true });
  return (data ?? []).map((r: any) => ({
    id: r.id,
    sessionId: r.session_id,
    locationId: r.location_id,
    authorName: r.author_name ?? null,
    note: r.note,
    createdAt: r.created_at,
  }));
}

export async function insertCallback(input: {
  locationId: string;
  sessionId?: string | null;
  escalationId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  reason?: string | null;
  departmentCode?: string;
  priority?: number;
  scheduledFor?: string | null;
  notes?: string | null;
}): Promise<CallbackQueueItem | null> {
  const t = voiceTable("voice_callback_queue");
  if (!t) return null;
  const { data, error } = await t
    .insert({
      location_id: input.locationId,
      session_id: input.sessionId ?? null,
      escalation_id: input.escalationId ?? null,
      customer_name: input.customerName ?? null,
      customer_phone: input.customerPhone ?? null,
      customer_email: input.customerEmail ?? null,
      reason: input.reason ?? null,
      department_code: input.departmentCode ?? "general",
      priority: input.priority ?? 5,
      scheduled_for: input.scheduledFor ?? null,
      notes: input.notes ?? null,
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    locationId: data.location_id,
    sessionId: data.session_id ?? null,
    escalationId: data.escalation_id ?? null,
    customerName: data.customer_name ?? null,
    customerPhone: data.customer_phone ?? null,
    reason: data.reason ?? null,
    departmentCode: data.department_code,
    priority: Number(data.priority ?? 5),
    status: data.status,
    scheduledFor: data.scheduled_for ?? null,
    createdAt: data.created_at,
  };
}

export async function listCallbacks(locationId: string, limit = 50): Promise<CallbackQueueItem[]> {
  const t = voiceTable("voice_callback_queue");
  if (!t) return [];
  const { data } = await t
    .select("*")
    .eq("location_id", locationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    locationId: r.location_id,
    sessionId: r.session_id ?? null,
    escalationId: r.escalation_id ?? null,
    customerName: r.customer_name ?? null,
    customerPhone: r.customer_phone ?? null,
    reason: r.reason ?? null,
    departmentCode: r.department_code,
    priority: Number(r.priority ?? 5),
    status: r.status,
    scheduledFor: r.scheduled_for ?? null,
    createdAt: r.created_at,
  }));
}

export async function updateCallbackStatus(
  id: string,
  status: string,
  assignedAgentId?: string | null,
): Promise<void> {
  const t = voiceTable("voice_callback_queue");
  if (!t) return;
  const body: Record<string, unknown> = { status, updated_at: nowIso() };
  if (assignedAgentId !== undefined) body.assigned_agent_id = assignedAgentId;
  if (status === "completed" || status === "cancelled") body.completed_at = nowIso();
  await t.update(body).eq("id", id);
}

export async function insertTransferMetric(input: {
  locationId: string;
  sessionId?: string | null;
  escalationId?: string | null;
  transferId?: string | null;
  metricType: string;
  value: number;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const t = voiceTable("voice_transfer_metrics");
  if (!t) return;
  await t.insert({
    location_id: input.locationId,
    session_id: input.sessionId ?? null,
    escalation_id: input.escalationId ?? null,
    transfer_id: input.transferId ?? null,
    metric_type: input.metricType,
    value: input.value,
    metadata: input.metadata ?? {},
  });
}

export async function insertHandoffNotification(input: {
  locationId: string;
  sessionId?: string | null;
  escalationId?: string | null;
  transferId?: string | null;
  channel: string;
  recipient?: string | null;
  subject?: string | null;
  body?: string | null;
  status?: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const t = voiceTable("voice_handoff_notifications");
  if (!t) return;
  await t.insert({
    location_id: input.locationId,
    session_id: input.sessionId ?? null,
    escalation_id: input.escalationId ?? null,
    transfer_id: input.transferId ?? null,
    channel: input.channel,
    recipient: input.recipient ?? null,
    subject: input.subject ?? null,
    body: input.body ?? null,
    status: input.status ?? "queued",
    payload: input.payload ?? {},
    sent_at: input.status === "sent" ? nowIso() : null,
  });
}

export async function listHandoffNotifications(locationId: string, limit = 40) {
  const t = voiceTable("voice_handoff_notifications");
  if (!t) return [];
  const { data } = await t
    .select("*")
    .eq("location_id", locationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
