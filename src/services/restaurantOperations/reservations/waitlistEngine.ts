import { resTable } from "./client";
import { enqueueNotification } from "./notificationService";
import type { WaitlistEntry } from "./types";

function mapWaitlist(row: Record<string, unknown>): WaitlistEntry {
  return {
    id: String(row.id),
    locationId: String(row.location_id),
    guestName: String(row.guest_name),
    phone: String(row.phone),
    partySize: Number(row.party_size),
    queuePosition: Number(row.queue_position ?? 1),
    estimatedWaitMinutes: row.estimated_wait_minutes != null ? Number(row.estimated_wait_minutes) : null,
    priority: Number(row.priority ?? 0),
    status: String(row.status ?? "waiting"),
    preferredDate: row.preferred_date ? String(row.preferred_date) : null,
    preferredTime: row.preferred_time ? String(row.preferred_time).slice(0, 5) : null,
  };
}

export async function joinWaitlist(input: {
  locationId: string;
  guestName: string;
  phone: string;
  email?: string;
  partySize: number;
  preferredDate?: string;
  preferredTime?: string;
  priority?: number;
  conversationId?: string | null;
}): Promise<WaitlistEntry | null> {
  try {
    const t = resTable("reservation_waitlist");
    if (!t) return null;
    const { data: existing } = await t
      .select("queue_position")
      .eq("location_id", input.locationId)
      .eq("status", "waiting")
      .order("queue_position", { ascending: false })
      .limit(1);
    const last = ((existing ?? []) as Array<{ queue_position: number }>)[0];
    const position = (last?.queue_position ?? 0) + 1;
    const estimated = position * 15;

    const { data } = await t
      .insert({
        location_id: input.locationId,
        guest_name: input.guestName,
        phone: input.phone,
        email: input.email ?? null,
        party_size: input.partySize,
        preferred_date: input.preferredDate ?? null,
        preferred_time: input.preferredTime ?? null,
        queue_position: position,
        estimated_wait_minutes: estimated,
        priority: input.priority ?? 0,
        status: "waiting",
        conversation_id: input.conversationId ?? null,
      })
      .select("*")
      .single();

    if (!data) return null;
    const entry = mapWaitlist(data as Record<string, unknown>);
    await enqueueNotification({
      locationId: input.locationId,
      waitlistId: entry.id,
      eventType: "waitlist_joined",
      channel: "email",
      payload: { queuePosition: entry.queuePosition, estimatedWaitMinutes: entry.estimatedWaitMinutes },
    });
    return entry;
  } catch {
    return null;
  }
}

export async function listWaitlist(locationId: string): Promise<WaitlistEntry[]> {
  try {
    const t = resTable("reservation_waitlist");
    if (!t) return [];
    const { data } = await t
      .select("*")
      .eq("location_id", locationId)
      .eq("status", "waiting")
      .order("priority", { ascending: false })
      .order("queue_position", { ascending: true });
    return ((data ?? []) as Record<string, unknown>[]).map(mapWaitlist);
  } catch {
    return [];
  }
}

export async function notifyWaitlistAvailable(waitlistId: string, locationId: string): Promise<void> {
  try {
    const t = resTable("reservation_waitlist");
    if (!t) return;
    await t
      .update({ status: "notified", notified_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", waitlistId);
    await enqueueNotification({
      locationId,
      waitlistId,
      eventType: "waitlist_available",
      channel: "email",
      payload: {},
    });
  } catch {
    /* optional */
  }
}
