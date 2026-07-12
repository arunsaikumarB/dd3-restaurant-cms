/**
 * Notification abstraction — queues events only.
 * Email / SMS / WhatsApp / Push providers are future integrations.
 */

import { resTable } from "./client";

export type NotificationChannel = "email" | "sms" | "whatsapp" | "push" | "internal";

export async function enqueueNotification(input: {
  locationId?: string | null;
  reservationId?: string | null;
  waitlistId?: string | null;
  eventType: string;
  channel?: NotificationChannel;
  payload?: Record<string, unknown>;
}): Promise<void> {
  try {
    const t = resTable("reservation_notifications");
    if (!t) return;
    await t.insert({
      reservation_id: input.reservationId ?? null,
      waitlist_id: input.waitlistId ?? null,
      location_id: input.locationId ?? null,
      channel: input.channel ?? "email",
      event_type: input.eventType,
      status: "queued",
      payload: input.payload ?? {},
    });
  } catch {
    /* never block booking */
  }
}

export async function listNotifications(locationId: string, limit = 50) {
  try {
    const t = resTable("reservation_notifications");
    if (!t) return [];
    const { data } = await t
      .select("*")
      .eq("location_id", locationId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return data ?? [];
  } catch {
    return [];
  }
}
