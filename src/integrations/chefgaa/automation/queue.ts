import type { LocationId } from "../../../config/locations";
import { syncQueueTable } from "../db";
import { createChefGaaSyncClient } from "../supabaseClient";
import type { SyncTrigger } from "../types";

export type QueuedSyncJob = {
  id: string;
  locationId: LocationId | null;
  trigger: SyncTrigger;
  requestedBy: string | null;
};

export async function enqueueSyncJob(payload: {
  locationId?: LocationId | null;
  trigger: SyncTrigger;
  requestedBy?: string | null;
}): Promise<QueuedSyncJob> {
  const supabase = createChefGaaSyncClient();
  const { data, error } = await syncQueueTable(supabase)
    .insert({
      location_id: payload.locationId ?? null,
      trigger: payload.trigger,
      requested_by: payload.requestedBy ?? null,
      status: "pending",
    })
    .select("id, location_id, trigger, requested_by")
    .single();

  if (error || !data) {
    throw new Error(`Failed to enqueue sync job: ${error?.message ?? "unknown"}`);
  }

  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    locationId: (row.location_id as LocationId | null) ?? null,
    trigger: row.trigger as SyncTrigger,
    requestedBy: (row.requested_by as string | null) ?? null,
  };
}

export async function claimNextQueuedJob(): Promise<QueuedSyncJob | null> {
  const supabase = createChefGaaSyncClient();
  const { data: pending } = await syncQueueTable(supabase)
    .select("id, location_id, trigger, requested_by")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!pending) return null;
  const pendingRow = pending as Record<string, unknown>;

  await syncQueueTable(supabase)
    .update({ status: "processing" })
    .eq("id", String(pendingRow.id));

  return {
    id: String(pendingRow.id),
    locationId: (pendingRow.location_id as LocationId | null) ?? null,
    trigger: pendingRow.trigger as SyncTrigger,
    requestedBy: (pendingRow.requested_by as string | null) ?? null,
  };
}

export async function completeQueuedJob(
  jobId: string,
  resultMessage: string,
  status: "completed" | "skipped" = "completed",
): Promise<void> {
  const supabase = createChefGaaSyncClient();
  await syncQueueTable(supabase)
    .update({
      status,
      processed_at: new Date().toISOString(),
      result_message: resultMessage,
    })
    .eq("id", jobId);
}
