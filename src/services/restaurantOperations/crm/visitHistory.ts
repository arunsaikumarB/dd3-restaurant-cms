import { crmTable } from "./client";
import { addTimelineEvent } from "./crmRepository";
import type { CrmVisit } from "./types";

export async function recordVisit(input: {
  customerId: string;
  locationId?: string | null;
  reservationId?: string | null;
  visitType?: string;
  visitDate?: string | null;
  visitTime?: string | null;
  partySize?: number | null;
  spend?: number | null;
  occasion?: string | null;
  status?: string;
}): Promise<CrmVisit | null> {
  try {
    const t = crmTable("crm_visits");
    if (!t) return null;
    const { data } = await t
      .insert({
        customer_id: input.customerId,
        location_id: input.locationId ?? null,
        reservation_id: input.reservationId ?? null,
        visit_type: input.visitType ?? "reservation",
        visit_date: input.visitDate ?? null,
        visit_time: input.visitTime ?? null,
        party_size: input.partySize ?? null,
        spend: input.spend ?? null,
        occasion: input.occasion ?? null,
        status: input.status ?? "completed",
      })
      .select("*")
      .single();

    const customers = crmTable("crm_customers");
    if (customers) {
      const { data: c } = await customers.select("visit_count, lifetime_value").eq("id", input.customerId).maybeSingle();
      const visitCount = Number((c as { visit_count?: number } | null)?.visit_count ?? 0) + 1;
      const ltv = Number((c as { lifetime_value?: number } | null)?.lifetime_value ?? 0) + Number(input.spend ?? 0);
      await customers
        .update({
          visit_count: visitCount,
          last_visit: input.visitDate ?? new Date().toISOString().slice(0, 10),
          lifetime_value: ltv,
          avg_party_size: input.partySize ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.customerId);
    }

    await addTimelineEvent(
      input.customerId,
      "visit",
      "Visit recorded",
      `${input.visitType ?? "reservation"} on ${input.visitDate ?? "unknown"}`,
      { reservationId: input.reservationId },
    );

    if (!data) return null;
    const row = data as Record<string, unknown>;
    return {
      id: String(row.id),
      customerId: input.customerId,
      locationId: (row.location_id as string | null) ?? null,
      reservationId: (row.reservation_id as string | null) ?? null,
      visitType: String(row.visit_type),
      visitDate: row.visit_date ? String(row.visit_date) : null,
      visitTime: row.visit_time ? String(row.visit_time).slice(0, 5) : null,
      partySize: row.party_size != null ? Number(row.party_size) : null,
      spend: row.spend != null ? Number(row.spend) : null,
      occasion: (row.occasion as string | null) ?? null,
      status: String(row.status),
    };
  } catch {
    return null;
  }
}

export async function listVisits(customerId: string, limit = 50): Promise<CrmVisit[]> {
  try {
    const t = crmTable("crm_visits");
    if (!t) return [];
    const { data } = await t
      .select("*")
      .eq("customer_id", customerId)
      .order("visit_date", { ascending: false })
      .limit(limit);
    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      customerId: String(row.customer_id),
      locationId: (row.location_id as string | null) ?? null,
      reservationId: (row.reservation_id as string | null) ?? null,
      visitType: String(row.visit_type),
      visitDate: row.visit_date ? String(row.visit_date) : null,
      visitTime: row.visit_time ? String(row.visit_time).slice(0, 5) : null,
      partySize: row.party_size != null ? Number(row.party_size) : null,
      spend: row.spend != null ? Number(row.spend) : null,
      occasion: (row.occasion as string | null) ?? null,
      status: String(row.status),
    }));
  } catch {
    return [];
  }
}
