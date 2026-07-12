import { evtTable, normalizePhone } from "./client";
import type {
  EventApproval,
  EventCommunication,
  EventDocument,
  EventLead,
  EventLeadPriority,
  EventLeadSource,
  EventLeadStatus,
  EventMenu,
  EventPackage,
  EventQuote,
  EventRecord,
  EventSettings,
  EventTask,
  EventWorkflowStage,
  QuoteLineItem,
} from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
function row(r: any): any {
  return r ?? {};
}

export function mapLead(r: any): EventLead {
  const x = row(r);
  return {
    id: x.id,
    locationId: x.location_id,
    customerId: x.customer_id ?? null,
    customerName: x.customer_name ?? "",
    phone: x.phone ?? null,
    email: x.email ?? null,
    source: (x.source ?? "website") as EventLeadSource,
    salesOwner: x.sales_owner ?? null,
    priority: (x.priority ?? "medium") as EventLeadPriority,
    status: (x.status ?? "new") as EventLeadStatus,
    eventType: x.event_type ?? null,
    messagePreview: x.message_preview ?? null,
    conversationId: x.conversation_id ?? null,
    metadata: (x.metadata ?? {}) as Record<string, unknown>,
    createdAt: x.created_at,
    updatedAt: x.updated_at,
  };
}

export function mapPackage(r: any): EventPackage {
  const x = row(r);
  return {
    id: x.id,
    locationId: x.location_id,
    code: x.code,
    name: x.name,
    description: x.description ?? null,
    tier: x.tier ?? "silver",
    menuJson: (x.menu_json ?? {}) as Record<string, unknown>,
    decorJson: (x.decor_json ?? {}) as Record<string, unknown>,
    staffJson: (x.staff_json ?? {}) as Record<string, unknown>,
    equipmentJson: (x.equipment_json ?? {}) as Record<string, unknown>,
    durationHours: Number(x.duration_hours ?? 3),
    minGuests: Number(x.min_guests ?? 20),
    basePrice: Number(x.base_price ?? 0),
    pricePerGuest: Number(x.price_per_guest ?? 0),
    addons: Array.isArray(x.addons) ? x.addons : [],
    active: x.active !== false,
  };
}

export function mapEvent(r: any): EventRecord {
  const x = row(r);
  return {
    id: x.id,
    leadId: x.lead_id ?? null,
    locationId: x.location_id,
    customerId: x.customer_id ?? null,
    title: x.title,
    eventType: x.event_type ?? "custom",
    workflowStage: (x.workflow_stage ?? "inquiry") as EventWorkflowStage,
    eventDate: x.event_date ?? null,
    eventTime: x.event_time ?? null,
    guestCount: x.guest_count != null ? Number(x.guest_count) : null,
    budget: x.budget != null ? Number(x.budget) : null,
    venueType: x.venue_type ?? null,
    venueAddress: x.venue_address ?? null,
    cuisine: x.cuisine ?? null,
    dietary: Array.isArray(x.dietary) ? x.dietary : [],
    servingStyle: x.serving_style ?? null,
    serviceMode: x.service_mode ?? null,
    needs: (x.needs ?? {}) as EventRecord["needs"],
    specialRequests: x.special_requests ?? null,
    packageId: x.package_id ?? null,
    depositRequired: Number(x.deposit_required ?? 0),
    depositReceived: Number(x.deposit_received ?? 0),
    status: x.status ?? "active",
    progressPercent: Number(x.progress_percent ?? 0),
    conversationId: x.conversation_id ?? null,
    metadata: (x.metadata ?? {}) as Record<string, unknown>,
    createdAt: x.created_at,
    updatedAt: x.updated_at,
  };
}

export function mapMenu(r: any): EventMenu {
  const x = row(r);
  return {
    id: x.id,
    eventId: x.event_id ?? null,
    locationId: x.location_id ?? null,
    name: x.name ?? "Custom Menu",
    starters: Array.isArray(x.starters) ? x.starters : [],
    mains: Array.isArray(x.mains) ? x.mains : [],
    rice: Array.isArray(x.rice) ? x.rice : [],
    breads: Array.isArray(x.breads) ? x.breads : [],
    desserts: Array.isArray(x.desserts) ? x.desserts : [],
    drinks: Array.isArray(x.drinks) ? x.drinks : [],
    liveCounters: Array.isArray(x.live_counters) ? x.live_counters : [],
    kidsMenu: Array.isArray(x.kids_menu) ? x.kids_menu : [],
    notes: x.notes ?? null,
  };
}

export function mapQuote(r: any): EventQuote {
  const x = row(r);
  return {
    id: x.id,
    eventId: x.event_id,
    locationId: x.location_id,
    version: Number(x.version ?? 1),
    packageId: x.package_id ?? null,
    lineItems: (Array.isArray(x.line_items) ? x.line_items : []) as QuoteLineItem[],
    subtotal: Number(x.subtotal ?? 0),
    tax: Number(x.tax ?? 0),
    serviceCharge: Number(x.service_charge ?? 0),
    deliveryFee: Number(x.delivery_fee ?? 0),
    discount: Number(x.discount ?? 0),
    grandTotal: Number(x.grand_total ?? 0),
    approvalStatus: x.approval_status ?? "draft",
    notes: x.notes ?? null,
    createdAt: x.created_at,
    updatedAt: x.updated_at,
  };
}

export function mapTask(r: any): EventTask {
  const x = row(r);
  return {
    id: x.id,
    eventId: x.event_id,
    locationId: x.location_id ?? null,
    department: x.department ?? "manager",
    title: x.title,
    description: x.description ?? null,
    ownerName: x.owner_name ?? null,
    status: x.status ?? "open",
    dueDate: x.due_date ?? null,
    completedAt: x.completed_at ?? null,
    createdAt: x.created_at,
  };
}

export function mapApproval(r: any): EventApproval {
  const x = row(r);
  return {
    id: x.id,
    eventId: x.event_id,
    quoteId: x.quote_id ?? null,
    stage: x.stage,
    status: x.status ?? "pending",
    actor: x.actor ?? null,
    comment: x.comment ?? null,
    createdAt: x.created_at,
  };
}

export function mapComm(r: any): EventCommunication {
  const x = row(r);
  return {
    id: x.id,
    eventId: x.event_id ?? null,
    leadId: x.lead_id ?? null,
    locationId: x.location_id ?? null,
    channel: x.channel ?? "ai_chat",
    direction: x.direction ?? "inbound",
    subject: x.subject ?? null,
    body: x.body ?? null,
    summary: x.summary ?? null,
    conversationId: x.conversation_id ?? null,
    createdAt: x.created_at,
  };
}

export function mapDocument(r: any): EventDocument {
  const x = row(r);
  return {
    id: x.id,
    eventId: x.event_id ?? null,
    docType: x.doc_type ?? "quote",
    title: x.title,
    content: x.content ?? null,
    url: x.url ?? null,
    version: Number(x.version ?? 1),
    createdAt: x.created_at,
  };
}

export function mapSettings(r: any): EventSettings {
  const x = row(r);
  return {
    id: x.id,
    locationId: x.location_id,
    taxRate: Number(x.tax_rate ?? 0.06625),
    serviceChargeRate: Number(x.service_charge_rate ?? 0.18),
    minGuests: Number(x.min_guests ?? 20),
    depositPercent: Number(x.deposit_percent ?? 0.3),
    defaultDurationHours: Number(x.default_duration_hours ?? 3),
    metadata: (x.metadata ?? {}) as Record<string, unknown>,
  };
}

export async function findLeadByPhone(
  locationId: string,
  phone: string,
): Promise<EventLead | null> {
  const t = evtTable("event_leads");
  if (!t) return null;
  const normalized = normalizePhone(phone);
  const { data } = await t
    .select("*")
    .eq("location_id", locationId)
    .eq("phone", normalized)
    .not("status", "in", '("completed","cancelled","lost")')
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? mapLead(data) : null;
}

export async function insertLead(input: {
  locationId: string;
  customerId?: string | null;
  customerName: string;
  phone?: string | null;
  email?: string | null;
  source?: EventLeadSource;
  salesOwner?: string | null;
  priority?: EventLeadPriority;
  status?: EventLeadStatus;
  eventType?: string | null;
  messagePreview?: string | null;
  conversationId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<EventLead | null> {
  const t = evtTable("event_leads");
  if (!t) return null;
  const { data, error } = await t
    .insert({
      location_id: input.locationId,
      customer_id: input.customerId ?? null,
      customer_name: input.customerName,
      phone: input.phone ? normalizePhone(input.phone) : null,
      email: input.email ?? null,
      source: input.source ?? "website",
      sales_owner: input.salesOwner ?? null,
      priority: input.priority ?? "medium",
      status: input.status ?? "new",
      event_type: input.eventType ?? null,
      message_preview: input.messagePreview ?? null,
      conversation_id: input.conversationId ?? null,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return mapLead(data);
}

export async function updateLead(
  id: string,
  patch: Partial<{
    customerId: string | null;
    customerName: string;
    phone: string | null;
    email: string | null;
    status: EventLeadStatus;
    priority: EventLeadPriority;
    salesOwner: string | null;
    eventType: string | null;
    messagePreview: string | null;
    metadata: Record<string, unknown>;
  }>,
): Promise<EventLead | null> {
  const t = evtTable("event_leads");
  if (!t) return null;
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.customerId !== undefined) body.customer_id = patch.customerId;
  if (patch.customerName !== undefined) body.customer_name = patch.customerName;
  if (patch.phone !== undefined) body.phone = patch.phone ? normalizePhone(patch.phone) : null;
  if (patch.email !== undefined) body.email = patch.email;
  if (patch.status !== undefined) body.status = patch.status;
  if (patch.priority !== undefined) body.priority = patch.priority;
  if (patch.salesOwner !== undefined) body.sales_owner = patch.salesOwner;
  if (patch.eventType !== undefined) body.event_type = patch.eventType;
  if (patch.messagePreview !== undefined) body.message_preview = patch.messagePreview;
  if (patch.metadata !== undefined) body.metadata = patch.metadata;
  const { data, error } = await t.update(body).eq("id", id).select("*").single();
  if (error || !data) return null;
  return mapLead(data);
}

export async function listLeads(opts: {
  locationId: string;
  status?: string;
  limit?: number;
}): Promise<EventLead[]> {
  const t = evtTable("event_leads");
  if (!t) return [];
  let q = t.select("*").eq("location_id", opts.locationId).order("created_at", { ascending: false });
  if (opts.status) q = q.eq("status", opts.status);
  const { data } = await q.limit(opts.limit ?? 100);
  return (data ?? []).map(mapLead);
}

export async function listPackages(locationId: string, activeOnly = true): Promise<EventPackage[]> {
  const t = evtTable("event_packages");
  if (!t) return [];
  let q = t.select("*").eq("location_id", locationId).order("base_price", { ascending: true });
  if (activeOnly) q = q.eq("active", true);
  const { data } = await q;
  return (data ?? []).map(mapPackage);
}

export async function getPackageByCode(
  locationId: string,
  code: string,
): Promise<EventPackage | null> {
  const t = evtTable("event_packages");
  if (!t) return null;
  const { data } = await t
    .select("*")
    .eq("location_id", locationId)
    .eq("code", code.toUpperCase())
    .maybeSingle();
  return data ? mapPackage(data) : null;
}

export async function getPackageById(id: string): Promise<EventPackage | null> {
  const t = evtTable("event_packages");
  if (!t) return null;
  const { data } = await t.select("*").eq("id", id).maybeSingle();
  return data ? mapPackage(data) : null;
}

export async function upsertPackage(input: Partial<EventPackage> & {
  locationId: string;
  code: string;
  name: string;
}): Promise<EventPackage | null> {
  const t = evtTable("event_packages");
  if (!t) return null;
  const { data, error } = await t
    .upsert(
      {
        id: input.id,
        location_id: input.locationId,
        code: input.code.toUpperCase(),
        name: input.name,
        description: input.description ?? null,
        tier: input.tier ?? "silver",
        menu_json: input.menuJson ?? {},
        decor_json: input.decorJson ?? {},
        staff_json: input.staffJson ?? {},
        equipment_json: input.equipmentJson ?? {},
        duration_hours: input.durationHours ?? 3,
        min_guests: input.minGuests ?? 20,
        base_price: input.basePrice ?? 0,
        price_per_guest: input.pricePerGuest ?? 0,
        addons: input.addons ?? [],
        active: input.active !== false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "location_id,code" },
    )
    .select("*")
    .single();
  if (error || !data) return null;
  return mapPackage(data);
}

export async function insertEvent(input: {
  leadId?: string | null;
  locationId: string;
  customerId?: string | null;
  title: string;
  eventType?: string;
  workflowStage?: EventWorkflowStage;
  eventDate?: string | null;
  eventTime?: string | null;
  guestCount?: number | null;
  budget?: number | null;
  venueType?: string | null;
  venueAddress?: string | null;
  cuisine?: string | null;
  dietary?: string[];
  servingStyle?: string | null;
  serviceMode?: string | null;
  needs?: Record<string, unknown>;
  specialRequests?: string | null;
  packageId?: string | null;
  depositRequired?: number;
  conversationId?: string | null;
  progressPercent?: number;
  metadata?: Record<string, unknown>;
}): Promise<EventRecord | null> {
  const t = evtTable("events");
  if (!t) return null;
  const { data, error } = await t
    .insert({
      lead_id: input.leadId ?? null,
      location_id: input.locationId,
      customer_id: input.customerId ?? null,
      title: input.title,
      event_type: input.eventType ?? "custom",
      workflow_stage: input.workflowStage ?? "inquiry",
      event_date: input.eventDate ?? null,
      event_time: input.eventTime ?? null,
      guest_count: input.guestCount ?? null,
      budget: input.budget ?? null,
      venue_type: input.venueType ?? "restaurant",
      venue_address: input.venueAddress ?? null,
      cuisine: input.cuisine ?? null,
      dietary: input.dietary ?? [],
      serving_style: input.servingStyle ?? null,
      service_mode: input.serviceMode ?? null,
      needs: input.needs ?? {},
      special_requests: input.specialRequests ?? null,
      package_id: input.packageId ?? null,
      deposit_required: input.depositRequired ?? 0,
      conversation_id: input.conversationId ?? null,
      progress_percent: input.progressPercent ?? 0,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return mapEvent(data);
}

export async function updateEvent(
  id: string,
  patch: Record<string, unknown>,
): Promise<EventRecord | null> {
  const t = evtTable("events");
  if (!t) return null;
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const map: Record<string, string> = {
    leadId: "lead_id",
    customerId: "customer_id",
    title: "title",
    eventType: "event_type",
    workflowStage: "workflow_stage",
    eventDate: "event_date",
    eventTime: "event_time",
    guestCount: "guest_count",
    budget: "budget",
    venueType: "venue_type",
    venueAddress: "venue_address",
    cuisine: "cuisine",
    dietary: "dietary",
    servingStyle: "serving_style",
    serviceMode: "service_mode",
    needs: "needs",
    specialRequests: "special_requests",
    packageId: "package_id",
    depositRequired: "deposit_required",
    depositReceived: "deposit_received",
    status: "status",
    progressPercent: "progress_percent",
    metadata: "metadata",
  };
  for (const [k, col] of Object.entries(map)) {
    if (k in patch) body[col] = patch[k];
  }
  const { data, error } = await t.update(body).eq("id", id).select("*").single();
  if (error || !data) return null;
  return mapEvent(data);
}

export async function getEvent(id: string): Promise<EventRecord | null> {
  const t = evtTable("events");
  if (!t) return null;
  const { data } = await t.select("*").eq("id", id).maybeSingle();
  return data ? mapEvent(data) : null;
}

export async function findOpenEventByLead(leadId: string): Promise<EventRecord | null> {
  const t = evtTable("events");
  if (!t) return null;
  const { data } = await t
    .select("*")
    .eq("lead_id", leadId)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? mapEvent(data) : null;
}

export async function listEvents(opts: {
  locationId: string;
  from?: string;
  to?: string;
  stage?: string;
  eventType?: string;
  limit?: number;
}): Promise<EventRecord[]> {
  const t = evtTable("events");
  if (!t) return [];
  let q = t.select("*").eq("location_id", opts.locationId).order("event_date", { ascending: true });
  if (opts.from) q = q.gte("event_date", opts.from);
  if (opts.to) q = q.lte("event_date", opts.to);
  if (opts.stage) q = q.eq("workflow_stage", opts.stage);
  if (opts.eventType) q = q.eq("event_type", opts.eventType);
  const { data } = await q.limit(opts.limit ?? 200);
  return (data ?? []).map(mapEvent);
}

export async function insertMenu(input: {
  eventId?: string | null;
  locationId?: string | null;
  name?: string;
  starters?: string[];
  mains?: string[];
  rice?: string[];
  breads?: string[];
  desserts?: string[];
  drinks?: string[];
  liveCounters?: string[];
  kidsMenu?: string[];
  notes?: string | null;
}): Promise<EventMenu | null> {
  const t = evtTable("event_menus");
  if (!t) return null;
  const { data, error } = await t
    .insert({
      event_id: input.eventId ?? null,
      location_id: input.locationId ?? null,
      name: input.name ?? "Custom Menu",
      starters: input.starters ?? [],
      mains: input.mains ?? [],
      rice: input.rice ?? [],
      breads: input.breads ?? [],
      desserts: input.desserts ?? [],
      drinks: input.drinks ?? [],
      live_counters: input.liveCounters ?? [],
      kids_menu: input.kidsMenu ?? [],
      notes: input.notes ?? null,
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return mapMenu(data);
}

export async function listMenusForEvent(eventId: string): Promise<EventMenu[]> {
  const t = evtTable("event_menus");
  if (!t) return [];
  const { data } = await t.select("*").eq("event_id", eventId).order("created_at", { ascending: false });
  return (data ?? []).map(mapMenu);
}

export async function insertQuote(input: {
  eventId: string;
  locationId: string;
  version?: number;
  packageId?: string | null;
  lineItems: QuoteLineItem[];
  subtotal: number;
  tax: number;
  serviceCharge: number;
  deliveryFee: number;
  discount: number;
  grandTotal: number;
  approvalStatus?: string;
  notes?: string | null;
}): Promise<EventQuote | null> {
  const t = evtTable("event_quotes");
  if (!t) return null;
  const { data, error } = await t
    .insert({
      event_id: input.eventId,
      location_id: input.locationId,
      version: input.version ?? 1,
      package_id: input.packageId ?? null,
      line_items: input.lineItems,
      subtotal: input.subtotal,
      tax: input.tax,
      service_charge: input.serviceCharge,
      delivery_fee: input.deliveryFee,
      discount: input.discount,
      grand_total: input.grandTotal,
      approval_status: input.approvalStatus ?? "draft",
      notes: input.notes ?? null,
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return mapQuote(data);
}

export async function updateQuote(
  id: string,
  patch: Partial<{
    version: number;
    lineItems: QuoteLineItem[];
    subtotal: number;
    tax: number;
    serviceCharge: number;
    deliveryFee: number;
    discount: number;
    grandTotal: number;
    approvalStatus: string;
    notes: string | null;
    packageId: string | null;
  }>,
): Promise<EventQuote | null> {
  const t = evtTable("event_quotes");
  if (!t) return null;
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.version !== undefined) body.version = patch.version;
  if (patch.lineItems !== undefined) body.line_items = patch.lineItems;
  if (patch.subtotal !== undefined) body.subtotal = patch.subtotal;
  if (patch.tax !== undefined) body.tax = patch.tax;
  if (patch.serviceCharge !== undefined) body.service_charge = patch.serviceCharge;
  if (patch.deliveryFee !== undefined) body.delivery_fee = patch.deliveryFee;
  if (patch.discount !== undefined) body.discount = patch.discount;
  if (patch.grandTotal !== undefined) body.grand_total = patch.grandTotal;
  if (patch.approvalStatus !== undefined) body.approval_status = patch.approvalStatus;
  if (patch.notes !== undefined) body.notes = patch.notes;
  if (patch.packageId !== undefined) body.package_id = patch.packageId;
  const { data, error } = await t.update(body).eq("id", id).select("*").single();
  if (error || !data) return null;
  return mapQuote(data);
}

export async function getLatestQuote(eventId: string): Promise<EventQuote | null> {
  const t = evtTable("event_quotes");
  if (!t) return null;
  const { data } = await t
    .select("*")
    .eq("event_id", eventId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? mapQuote(data) : null;
}

export async function listQuotes(eventId?: string, locationId?: string): Promise<EventQuote[]> {
  const t = evtTable("event_quotes");
  if (!t) return [];
  let q = t.select("*").order("created_at", { ascending: false });
  if (eventId) q = q.eq("event_id", eventId);
  if (locationId) q = q.eq("location_id", locationId);
  const { data } = await q.limit(100);
  return (data ?? []).map(mapQuote);
}

export async function insertQuoteVersion(input: {
  quoteId: string;
  version: number;
  snapshot: Record<string, unknown>;
  comment?: string | null;
  createdBy?: string | null;
}): Promise<void> {
  const t = evtTable("event_quote_versions");
  if (!t) return;
  await t.insert({
    quote_id: input.quoteId,
    version: input.version,
    snapshot: input.snapshot,
    comment: input.comment ?? null,
    created_by: input.createdBy ?? null,
  });
}

export async function insertTask(input: {
  eventId: string;
  locationId?: string | null;
  department: string;
  title: string;
  description?: string | null;
  ownerName?: string | null;
  dueDate?: string | null;
}): Promise<EventTask | null> {
  const t = evtTable("event_tasks");
  if (!t) return null;
  const { data, error } = await t
    .insert({
      event_id: input.eventId,
      location_id: input.locationId ?? null,
      department: input.department,
      title: input.title,
      description: input.description ?? null,
      owner_name: input.ownerName ?? null,
      due_date: input.dueDate ?? null,
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return mapTask(data);
}

export async function listTasks(opts: {
  eventId?: string;
  locationId?: string;
  status?: string;
}): Promise<EventTask[]> {
  const t = evtTable("event_tasks");
  if (!t) return [];
  let q = t.select("*").order("created_at", { ascending: false });
  if (opts.eventId) q = q.eq("event_id", opts.eventId);
  if (opts.locationId) q = q.eq("location_id", opts.locationId);
  if (opts.status) q = q.eq("status", opts.status);
  const { data } = await q.limit(200);
  return (data ?? []).map(mapTask);
}

export async function updateTaskStatus(
  id: string,
  status: string,
): Promise<EventTask | null> {
  const t = evtTable("event_tasks");
  if (!t) return null;
  const body: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "done" || status === "completed") {
    body.completed_at = new Date().toISOString();
  }
  const { data, error } = await t.update(body).eq("id", id).select("*").single();
  if (error || !data) return null;
  return mapTask(data);
}

export async function insertApproval(input: {
  eventId: string;
  quoteId?: string | null;
  stage: string;
  status?: string;
  actor?: string | null;
  comment?: string | null;
}): Promise<EventApproval | null> {
  const t = evtTable("event_approvals");
  if (!t) return null;
  const { data, error } = await t
    .insert({
      event_id: input.eventId,
      quote_id: input.quoteId ?? null,
      stage: input.stage,
      status: input.status ?? "pending",
      actor: input.actor ?? null,
      comment: input.comment ?? null,
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return mapApproval(data);
}

export async function listApprovals(eventId?: string, locationEvents?: string[]): Promise<EventApproval[]> {
  const t = evtTable("event_approvals");
  if (!t) return [];
  let q = t.select("*").order("created_at", { ascending: false });
  if (eventId) q = q.eq("event_id", eventId);
  const { data } = await q.limit(100);
  let rows = (data ?? []).map(mapApproval);
  if (locationEvents?.length) {
    rows = rows.filter((a: EventApproval) => locationEvents.includes(a.eventId));
  }
  return rows;
}

export async function insertCommunication(input: {
  eventId?: string | null;
  leadId?: string | null;
  locationId?: string | null;
  channel: string;
  direction?: string;
  subject?: string | null;
  body?: string | null;
  summary?: string | null;
  conversationId?: string | null;
}): Promise<EventCommunication | null> {
  const t = evtTable("event_communications");
  if (!t) return null;
  const { data, error } = await t
    .insert({
      event_id: input.eventId ?? null,
      lead_id: input.leadId ?? null,
      location_id: input.locationId ?? null,
      channel: input.channel,
      direction: input.direction ?? "inbound",
      subject: input.subject ?? null,
      body: input.body ?? null,
      summary: input.summary ?? null,
      conversation_id: input.conversationId ?? null,
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return mapComm(data);
}

export async function listCommunications(opts: {
  eventId?: string;
  leadId?: string;
  locationId?: string;
}): Promise<EventCommunication[]> {
  const t = evtTable("event_communications");
  if (!t) return [];
  let q = t.select("*").order("created_at", { ascending: false });
  if (opts.eventId) q = q.eq("event_id", opts.eventId);
  if (opts.leadId) q = q.eq("lead_id", opts.leadId);
  if (opts.locationId) q = q.eq("location_id", opts.locationId);
  const { data } = await q.limit(100);
  return (data ?? []).map(mapComm);
}

export async function insertDocument(input: {
  eventId?: string | null;
  docType: string;
  title: string;
  content?: string | null;
  url?: string | null;
  version?: number;
}): Promise<EventDocument | null> {
  const t = evtTable("event_documents");
  if (!t) return null;
  const { data, error } = await t
    .insert({
      event_id: input.eventId ?? null,
      doc_type: input.docType,
      title: input.title,
      content: input.content ?? null,
      url: input.url ?? null,
      version: input.version ?? 1,
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return mapDocument(data);
}

export async function listDocuments(eventId?: string): Promise<EventDocument[]> {
  const t = evtTable("event_documents");
  if (!t) return [];
  let q = t.select("*").order("created_at", { ascending: false });
  if (eventId) q = q.eq("event_id", eventId);
  const { data } = await q.limit(100);
  return (data ?? []).map(mapDocument);
}

export async function getSettings(locationId: string): Promise<EventSettings | null> {
  const t = evtTable("event_settings");
  if (!t) return null;
  const { data } = await t.select("*").eq("location_id", locationId).maybeSingle();
  return data ? mapSettings(data) : null;
}

export async function upsertSettings(
  locationId: string,
  patch: Partial<EventSettings>,
): Promise<EventSettings | null> {
  const t = evtTable("event_settings");
  if (!t) return null;
  const existing = await getSettings(locationId);
  const body = {
    location_id: locationId,
    tax_rate: patch.taxRate ?? existing?.taxRate ?? 0.06625,
    service_charge_rate: patch.serviceChargeRate ?? existing?.serviceChargeRate ?? 0.18,
    min_guests: patch.minGuests ?? existing?.minGuests ?? 20,
    deposit_percent: patch.depositPercent ?? existing?.depositPercent ?? 0.3,
    default_duration_hours: patch.defaultDurationHours ?? existing?.defaultDurationHours ?? 3,
    metadata: patch.metadata ?? existing?.metadata ?? {},
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await t.upsert(body, { onConflict: "location_id" }).select("*").single();
  if (error || !data) return null;
  return mapSettings(data);
}
