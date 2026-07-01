import type { LocationId } from "../../../config/locations";
import { LOCATION_IDS } from "../../../config/locations";
import { createChefGaaSyncClient } from "../supabaseClient";
import { syncAll } from "../syncAll";
import { syncLocation } from "../syncLocation";
import type { SyncAllSummary, SyncLocationSummary, SyncTrigger } from "../types";
import { runHealthChecksForLocations } from "./healthCheck";
import { acquireSyncLock, isSyncLocked, releaseSyncLock } from "./lock";
import { computeSyncMonitoringStats } from "./metrics";
import { emitSyncNotification } from "./notifications";
import {
  bumpCatalogRevision,
  buildSyncRunMetadata,
  updateLocationFailureState,
} from "./reporting";
import { claimNextQueuedJob, completeQueuedJob, enqueueSyncJob } from "./queue";

export type OrchestratorRequest = {
  trigger: SyncTrigger;
  locationId?: LocationId | null;
  requestedBy?: string | null;
  /** When true, scheduled runs skip instead of queueing if lock is held. */
  skipIfLocked?: boolean;
  /** When true, manual requests are queued while another sync runs. */
  queueIfBusy?: boolean;
};

export type OrchestratorResult = {
  status: "completed" | "queued" | "skipped_locked" | "already_running";
  message: string;
  summary?: SyncAllSummary | SyncLocationSummary;
  queueId?: string;
  monitoring?: Awaited<ReturnType<typeof computeSyncMonitoringStats>>;
};

export async function loadEnabledLocationIds(): Promise<LocationId[]> {
  const supabase = createChefGaaSyncClient();
  const { data, error } = await supabase
    .from("chefgaa_location_config")
    .select("location_id, sync_enabled");

  if (error || !data?.length) {
    return [...LOCATION_IDS];
  }

  const enabled = data
    .filter((row) => (row as { sync_enabled: boolean }).sync_enabled)
    .map((row) => (row as { location_id: LocationId }).location_id);

  return enabled.length > 0 ? enabled : [...LOCATION_IDS];
}

async function runSyncExecution(
  request: OrchestratorRequest,
): Promise<SyncAllSummary | SyncLocationSummary> {
  const locationIds = await loadEnabledLocationIds();
  const targets =
    request.locationId && locationIds.includes(request.locationId)
      ? [request.locationId]
      : locationIds;

  await runHealthChecksForLocations(targets);

  await emitSyncNotification({
    eventType: "sync_started",
    locationId: request.locationId ?? null,
    message: "ChefGaa Sync Started",
    severity: "info",
    metadata: { trigger: request.trigger, requestedBy: request.requestedBy },
  });

  let summary: SyncAllSummary | SyncLocationSummary;

  if (request.locationId && targets.length === 1) {
    summary = await syncLocation(request.locationId, {
      trigger: request.trigger,
      requestedBy: request.requestedBy ?? null,
    });
  } else {
    summary = await syncAll({
      trigger: request.trigger,
      requestedBy: request.requestedBy ?? null,
      locationIds: targets,
    });
  }

  const locationSummaries =
    "locations" in summary ? summary.locations : [summary as SyncLocationSummary];

  for (const locationSummary of locationSummaries) {
    await updateLocationFailureState(locationSummary.locationId, locationSummary.success);

    if (locationSummary.success || locationSummary.status === "partial") {
      await bumpCatalogRevision(locationSummary.locationId);
    }

    const changes = buildSyncRunMetadata(locationSummary, {
      requestedBy: request.requestedBy,
      trigger: request.trigger,
    });

    if (locationSummary.items.pricesChanged > 0) {
      await emitSyncNotification({
        eventType: "price_changes_detected",
        locationId: locationSummary.locationId,
        message: `Price Changes Detected — ${locationSummary.items.pricesChanged} items`,
        severity: "warning",
        metadata: changes,
      });
    }

    if (locationSummary.items.created > 0) {
      await emitSyncNotification({
        eventType: "new_menu_imported",
        locationId: locationSummary.locationId,
        message: `New Menu Imported — ${locationSummary.items.created} items`,
        severity: "success",
        metadata: changes,
      });
    }

    if (!locationSummary.success) {
      await emitSyncNotification({
        eventType: "location_sync_failed",
        locationId: locationSummary.locationId,
        message: locationSummary.message,
        severity: "error",
        metadata: changes,
      });
    }
  }

  const allSuccess = "locations" in summary ? summary.success : summary.success;
  await emitSyncNotification({
    eventType: allSuccess ? "sync_completed" : "sync_failed",
    locationId: request.locationId ?? null,
    message: allSuccess ? "ChefGaa Sync Completed Successfully" : summary.message,
    severity: allSuccess ? "success" : "error",
    metadata: { summary },
  });

  return summary;
}

/**
 * Production orchestrator: locking, queueing, health checks, notifications, cache revision.
 */
export async function runOrchestratedSync(
  request: OrchestratorRequest,
): Promise<OrchestratorResult> {
  const holder = `${request.trigger}:${request.locationId ?? "all"}:${Date.now()}`;

  if (request.skipIfLocked && (await isSyncLocked())) {
    await emitSyncNotification({
      eventType: "sync_skipped_locked",
      message: "Scheduled sync skipped — another sync is already running.",
      severity: "warning",
    });
    return {
      status: "skipped_locked",
      message: "Already Running — scheduled sync skipped.",
    };
  }

  const lock = await acquireSyncLock(holder);
  if (!lock) {
    if (request.queueIfBusy) {
      const job = await enqueueSyncJob({
        locationId: request.locationId ?? null,
        trigger: request.trigger,
        requestedBy: request.requestedBy ?? null,
      });
      await emitSyncNotification({
        eventType: "sync_queued",
        locationId: request.locationId ?? null,
        message: "Sync queued — will run after the current sync finishes.",
        severity: "info",
        metadata: { queueId: job.id },
      });
      return {
        status: "queued",
        message: "Already Running — your sync was queued.",
        queueId: job.id,
      };
    }

    return {
      status: "already_running",
      message: "Already Running",
    };
  }

  try {
    const summary = await runSyncExecution(request);
    const monitoring = await computeSyncMonitoringStats();
    return {
      status: "completed",
      message: summary.message,
      summary,
      monitoring,
    };
  } finally {
    await releaseSyncLock(holder);
    await processSyncQueue();
  }
}

async function processSyncQueue(): Promise<void> {
  const job = await claimNextQueuedJob();
  if (!job) return;

  const result = await runOrchestratedSync({
    trigger: job.trigger,
    locationId: job.locationId,
    requestedBy: job.requestedBy,
    skipIfLocked: false,
    queueIfBusy: false,
  });

  await completeQueuedJob(job.id, result.message, result.status === "completed" ? "completed" : "skipped");
}
