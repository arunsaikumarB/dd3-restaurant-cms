import { LOCATION_IDS, type LocationId } from "../../config/locations";
import { syncLocation, type SyncLocationOptions } from "./syncLocation";
import type { SyncAllSummary } from "./types";

export type SyncAllOptions = SyncLocationOptions & {
  locationIds?: LocationId[];
};

/**
 * Runs ChefGaa sync for each location sequentially.
 * Continues when an individual location fails.
 */
export async function syncAll(options: SyncAllOptions = {}): Promise<SyncAllSummary> {
  const started = Date.now();
  const targets = options.locationIds ?? [...LOCATION_IDS];
  const locations = [];

  for (const locationId of targets) {
    const result = await syncLocation(locationId, options);
    locations.push(result);
  }

  const success = locations.every((entry) => entry.success);
  const durationMs = Date.now() - started;
  const failedCount = locations.filter((entry) => !entry.success).length;

  return {
    success,
    locations,
    durationMs,
    message:
      failedCount === 0
        ? `All ${locations.length} locations synced successfully.`
        : `${locations.length - failedCount}/${locations.length} locations synced; ${failedCount} failed.`,
  };
}
