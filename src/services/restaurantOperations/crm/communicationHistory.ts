import { crmTable } from "./client";
import { addTimelineEvent } from "./crmRepository";
import type { CrmCommunication } from "./types";

export async function logCommunication(input: {
  customerId?: string | null;
  locationId?: string | null;
  channel?: string;
  direction?: string;
  subject?: string;
  body?: string;
  summary?: string;
  conversationId?: string | null;
  payload?: Record<string, unknown>;
}): Promise<void> {
  try {
    const t = crmTable("crm_communications");
    if (!t) return;
    await t.insert({
      customer_id: input.customerId ?? null,
      location_id: input.locationId ?? null,
      channel: input.channel ?? "ai_chat",
      direction: input.direction ?? "inbound",
      subject: input.subject ?? null,
      body: input.body ?? null,
      summary: input.summary ?? null,
      conversation_id: input.conversationId ?? null,
      status: "logged",
      payload: input.payload ?? {},
    });
    if (input.customerId) {
      await addTimelineEvent(
        input.customerId,
        "communication",
        input.channel ?? "ai_chat",
        input.summary ?? (input.body ?? "").slice(0, 120),
      );
    }
  } catch {
    /* optional */
  }
}

export async function listCommunications(customerId: string, limit = 50): Promise<CrmCommunication[]> {
  try {
    const t = crmTable("crm_communications");
    if (!t) return [];
    const { data } = await t
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      customerId: (row.customer_id as string | null) ?? null,
      channel: String(row.channel),
      direction: String(row.direction),
      subject: (row.subject as string | null) ?? null,
      body: (row.body as string | null) ?? null,
      summary: (row.summary as string | null) ?? null,
      conversationId: (row.conversation_id as string | null) ?? null,
      createdAt: String(row.created_at),
    }));
  } catch {
    return [];
  }
}
