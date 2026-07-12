import { crmTable } from "./client";
import type { CrmTimelineEvent } from "./types";

export async function getCustomerTimeline(customerId: string, limit = 100): Promise<CrmTimelineEvent[]> {
  try {
    const t = crmTable("crm_timeline");
    if (!t) return [];
    const { data } = await t
      .select("*")
      .eq("customer_id", customerId)
      .order("occurred_at", { ascending: false })
      .limit(limit);
    return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      customerId: String(row.customer_id),
      eventType: String(row.event_type),
      title: (row.title as string | null) ?? null,
      summary: (row.summary as string | null) ?? null,
      payload: (row.payload as Record<string, unknown>) ?? {},
      occurredAt: String(row.occurred_at),
    }));
  } catch {
    return [];
  }
}
