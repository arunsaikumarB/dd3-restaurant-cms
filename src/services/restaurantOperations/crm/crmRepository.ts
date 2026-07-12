import { crmTable, displayName, normalizePhone, splitName } from "./client";
import type { CrmCustomer, CrmLoyalty, CrmPreference, CustomerStatus } from "./types";

export function mapCustomer(row: Record<string, unknown>): CrmCustomer {
  return {
    id: String(row.id),
    locationId: (row.location_id as string | null) ?? null,
    firstName: String(row.first_name ?? ""),
    lastName: String(row.last_name ?? ""),
    preferredName: (row.preferred_name as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    dateOfBirth: row.date_of_birth ? String(row.date_of_birth) : null,
    anniversary: row.anniversary ? String(row.anniversary) : null,
    gender: (row.gender as string | null) ?? null,
    preferredLanguage: String(row.preferred_language ?? "en"),
    address: (row.address as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    state: (row.state as string | null) ?? null,
    country: (row.country as string | null) ?? null,
    timezone: (row.timezone as string | null) ?? null,
    profilePhotoUrl: (row.profile_photo_url as string | null) ?? null,
    status: (row.status as CustomerStatus) ?? "active",
    isVip: Boolean(row.is_vip),
    visitCount: Number(row.visit_count ?? 0),
    lastVisit: row.last_visit ? String(row.last_visit) : null,
    lifetimeValue: Number(row.lifetime_value ?? 0),
    avgPartySize: row.avg_party_size != null ? Number(row.avg_party_size) : null,
    avgSpend: row.avg_spend != null ? Number(row.avg_spend) : null,
    marketingConsent: Boolean(row.marketing_consent),
    aiPersonalizationConsent: row.ai_personalization_consent !== false,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

export async function findCustomerByIdentity(input: {
  locationId?: string | null;
  phone?: string | null;
  email?: string | null;
  customerId?: string | null;
}): Promise<CrmCustomer | null> {
  try {
    const t = crmTable("crm_customers");
    if (!t) return null;
    if (input.customerId) {
      const { data } = await t.select("*").eq("id", input.customerId).maybeSingle();
      return data ? mapCustomer(data as Record<string, unknown>) : null;
    }
    if (input.phone) {
      const phone = normalizePhone(input.phone);
      let q = t.select("*").eq("phone", phone).neq("status", "duplicate").limit(1);
      if (input.locationId) q = q.eq("location_id", input.locationId);
      const { data } = await q.maybeSingle();
      if (data) return mapCustomer(data as Record<string, unknown>);
    }
    if (input.email) {
      let q = t.select("*").ilike("email", input.email.trim()).neq("status", "duplicate").limit(1);
      if (input.locationId) q = q.eq("location_id", input.locationId);
      const { data } = await q.maybeSingle();
      if (data) return mapCustomer(data as Record<string, unknown>);
    }
    return null;
  } catch {
    return null;
  }
}

export async function upsertCustomer(input: {
  locationId?: string | null;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  preferredName?: string;
  phone?: string | null;
  email?: string | null;
  dateOfBirth?: string | null;
  anniversary?: string | null;
  marketingConsent?: boolean;
  aiPersonalizationConsent?: boolean;
}): Promise<CrmCustomer | null> {
  try {
    const existing = await findCustomerByIdentity({
      locationId: input.locationId,
      phone: input.phone,
      email: input.email,
    });
    const names =
      input.firstName || input.lastName
        ? { firstName: input.firstName ?? "", lastName: input.lastName ?? "" }
        : splitName(input.fullName ?? "Guest");

    const t = crmTable("crm_customers");
    if (!t) return null;

    if (existing) {
      const { data } = await t
        .update({
          first_name: names.firstName || existing.firstName,
          last_name: names.lastName || existing.lastName,
          preferred_name: input.preferredName ?? existing.preferredName,
          email: input.email ?? existing.email,
          phone: input.phone ? normalizePhone(input.phone) : existing.phone,
          date_of_birth: input.dateOfBirth ?? existing.dateOfBirth,
          anniversary: input.anniversary ?? existing.anniversary,
          marketing_consent: input.marketingConsent ?? existing.marketingConsent,
          ai_personalization_consent: input.aiPersonalizationConsent ?? existing.aiPersonalizationConsent,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select("*")
        .single();
      return data ? mapCustomer(data as Record<string, unknown>) : existing;
    }

    const { data } = await t
      .insert({
        location_id: input.locationId ?? null,
        first_name: names.firstName,
        last_name: names.lastName,
        preferred_name: input.preferredName ?? null,
        phone: input.phone ? normalizePhone(input.phone) : null,
        email: input.email ?? null,
        date_of_birth: input.dateOfBirth ?? null,
        anniversary: input.anniversary ?? null,
        marketing_consent: Boolean(input.marketingConsent),
        ai_personalization_consent: input.aiPersonalizationConsent !== false,
        status: "active",
      })
      .select("*")
      .single();

    if (!data) return null;
    const customer = mapCustomer(data as Record<string, unknown>);
    await ensureLoyalty(customer.id);
    await addTimelineEvent(customer.id, "profile_created", "Profile created", `Customer ${displayName(customer)} created`);
    return customer;
  } catch {
    return null;
  }
}

export async function listCustomers(input?: {
  locationId?: string;
  query?: string;
  segment?: string;
  vipOnly?: boolean;
  limit?: number;
}): Promise<CrmCustomer[]> {
  try {
    const t = crmTable("crm_customers");
    if (!t) return [];
    let q = t.select("*").neq("status", "duplicate").order("updated_at", { ascending: false }).limit(input?.limit ?? 100);
    if (input?.locationId) q = q.eq("location_id", input.locationId);
    if (input?.vipOnly) q = q.eq("is_vip", true);
    const { data } = await q;
    let rows = ((data ?? []) as Record<string, unknown>[]).map(mapCustomer);
    if (input?.query) {
      const needle = input.query.toLowerCase();
      rows = rows.filter(
        (c) =>
          displayName(c).toLowerCase().includes(needle) ||
          (c.phone ?? "").includes(needle) ||
          (c.email ?? "").toLowerCase().includes(needle),
      );
    }
    if (input?.segment) {
      const segs = crmTable("crm_segments");
      if (segs) {
        const { data: segRows } = await segs.select("customer_id").eq("segment_key", input.segment);
        const ids = new Set(((segRows ?? []) as Array<{ customer_id: string }>).map((r) => r.customer_id));
        rows = rows.filter((c) => ids.has(c.id));
      }
    }
    return rows;
  } catch {
    return [];
  }
}

export async function getCustomer(id: string): Promise<CrmCustomer | null> {
  return findCustomerByIdentity({ customerId: id });
}

export async function ensureLoyalty(customerId: string): Promise<CrmLoyalty> {
  const defaults: CrmLoyalty = {
    points: 0,
    tier: "silver",
    rewards: [],
    coupons: [],
    benefits: [],
    referralPoints: 0,
  };
  try {
    const t = crmTable("crm_loyalty");
    if (!t) return defaults;
    const { data: existing } = await t.select("*").eq("customer_id", customerId).maybeSingle();
    if (existing) {
      const row = existing as Record<string, unknown>;
      return {
        points: Number(row.points ?? 0),
        tier: (row.tier as CrmLoyalty["tier"]) ?? "silver",
        rewards: (row.rewards as unknown[]) ?? [],
        coupons: (row.coupons as unknown[]) ?? [],
        benefits: (row.benefits as unknown[]) ?? [],
        referralPoints: Number(row.referral_points ?? 0),
      };
    }
    await t.insert({ customer_id: customerId, points: 0, tier: "silver" });
    return defaults;
  } catch {
    return defaults;
  }
}

export async function listPreferences(customerId: string): Promise<CrmPreference[]> {
  try {
    const t = crmTable("crm_preferences");
    if (!t) return [];
    const { data } = await t.select("*").eq("customer_id", customerId);
    return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      key: String(r.preference_key),
      value: (r.preference_value as string | null) ?? null,
      confidence: Number(r.confidence ?? 1),
      source: String(r.source ?? "manual"),
    }));
  } catch {
    return [];
  }
}

export async function listMemory(customerId: string): Promise<Array<{ key: string; value: Record<string, unknown>; confidence: number; source: string }>> {
  try {
    const t = crmTable("crm_memory");
    if (!t) return [];
    const { data } = await t.select("*").eq("customer_id", customerId);
    return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      key: String(r.memory_key),
      value: (r.memory_value as Record<string, unknown>) ?? {},
      confidence: Number(r.confidence ?? 1),
      source: String(r.source ?? "inferred"),
    }));
  } catch {
    return [];
  }
}

export async function listSegments(customerId: string): Promise<string[]> {
  try {
    const t = crmTable("crm_segments");
    if (!t) return [];
    const { data } = await t.select("segment_key").eq("customer_id", customerId);
    return ((data ?? []) as Array<{ segment_key: string }>).map((r) => r.segment_key);
  } catch {
    return [];
  }
}

export async function addTimelineEvent(
  customerId: string,
  eventType: string,
  title: string,
  summary?: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  try {
    const t = crmTable("crm_timeline");
    if (!t) return;
    await t.insert({
      customer_id: customerId,
      event_type: eventType,
      title,
      summary: summary ?? null,
      payload,
    });
  } catch {
    /* optional */
  }
}

export async function writeAudit(customerId: string | null, action: string, details: Record<string, unknown> = {}): Promise<void> {
  try {
    const t = crmTable("crm_audit");
    if (!t) return;
    await t.insert({ customer_id: customerId, action, actor: "system", details });
  } catch {
    /* optional */
  }
}

export async function linkReservationToCustomer(reservationId: string, customerId: string): Promise<void> {
  try {
    const t = crmTable("reservations");
    if (!t) return;
    await t.update({ customer_id: customerId }).eq("id", reservationId).is("customer_id", null);
  } catch {
    /* never block */
  }
}

export async function addNote(customerId: string, note: string, authorId?: string | null): Promise<void> {
  const t = crmTable("crm_notes");
  if (!t) return;
  await t.insert({ customer_id: customerId, note, author_id: authorId ?? null });
  await addTimelineEvent(customerId, "note", "Staff note", note.slice(0, 120));
}

export async function listNotes(customerId: string) {
  const t = crmTable("crm_notes");
  if (!t) return [];
  const { data } = await t.select("*").eq("customer_id", customerId).order("created_at", { ascending: false });
  return data ?? [];
}

export async function mergeCustomers(primaryId: string, duplicateId: string): Promise<boolean> {
  try {
    if (primaryId === duplicateId) return false;
    const t = crmTable("crm_customers");
    if (!t) return false;
    for (const table of ["crm_preferences", "crm_memory", "crm_visits", "crm_segments", "crm_notes", "crm_timeline", "crm_communications", "crm_insights"]) {
      const x = crmTable(table);
      if (x) await x.update({ customer_id: primaryId }).eq("customer_id", duplicateId);
    }
    const res = crmTable("reservations");
    if (res) await res.update({ customer_id: primaryId }).eq("customer_id", duplicateId);
    await t.update({ status: "duplicate", updated_at: new Date().toISOString() }).eq("id", duplicateId);
    await addTimelineEvent(primaryId, "merge", "Customer merge", `Merged duplicate ${duplicateId}`);
    await writeAudit(primaryId, "customer_merge", { duplicateId });
    return true;
  } catch {
    return false;
  }
}

export async function exportCustomerData(customerId: string): Promise<Record<string, unknown> | null> {
  const customer = await getCustomer(customerId);
  if (!customer) return null;
  const [preferences, memory, segments, loyalty, notes] = await Promise.all([
    listPreferences(customerId),
    listMemory(customerId),
    listSegments(customerId),
    ensureLoyalty(customerId),
    listNotes(customerId),
  ]);
  await writeAudit(customerId, "data_export", {});
  return { customer, preferences, memory, segments, loyalty, notes };
}

export async function requestCustomerDeletion(customerId: string): Promise<boolean> {
  try {
    const t = crmTable("crm_customers");
    if (!t) return false;
    await t.update({
      status: "inactive",
      phone: null,
      email: null,
      address: null,
      first_name: "Deleted",
      last_name: "Customer",
      marketing_consent: false,
      ai_personalization_consent: false,
      privacy_preferences: { deletion_requested: true, deleted_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    }).eq("id", customerId);
    await writeAudit(customerId, "data_deletion", {});
    await addTimelineEvent(customerId, "privacy", "Deletion requested", "PII scrubbed per privacy request");
    return true;
  } catch {
    return false;
  }
}
