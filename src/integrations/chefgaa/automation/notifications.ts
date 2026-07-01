import type { LocationId } from "../../../config/locations";
import { syncNotificationsTable } from "../db";
import { createChefGaaSyncClient } from "../supabaseClient";

export type NotificationEventType =
  | "sync_started"
  | "sync_completed"
  | "sync_failed"
  | "api_offline"
  | "price_changes_detected"
  | "new_menu_imported"
  | "location_sync_failed"
  | "sync_queued"
  | "sync_skipped_locked"
  | "critical_location";

export type NotificationSeverity = "info" | "success" | "warning" | "error" | "critical";

export async function emitSyncNotification(payload: {
  eventType: NotificationEventType;
  locationId?: LocationId | null;
  message: string;
  severity?: NotificationSeverity;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabase = createChefGaaSyncClient();
  await syncNotificationsTable(supabase).insert({
    event_type: payload.eventType,
    location_id: payload.locationId ?? null,
    message: payload.message,
    severity: payload.severity ?? "info",
    metadata: payload.metadata ?? {},
  });
}
