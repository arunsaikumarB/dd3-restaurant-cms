import type { LocationId } from "../../../config/locations";
import { getLocationConfig } from "../../../config/locations";
import { locationConfigAutomationTable } from "../db";
import { createChefGaaSyncClient } from "../supabaseClient";
import type { CategorySyncStats, MenuSyncStats, SyncLocationSummary } from "../types";
import { emitSyncNotification } from "./notifications";

export type SyncChangeSummary = {
  newCategories: number;
  removedCategories: number;
  newItems: number;
  removedItems: number;
  priceChanges: number;
  availabilityChanges: number;
};

export function buildChangeSummary(
  categories: CategorySyncStats,
  items: MenuSyncStats,
): SyncChangeSummary {
  return {
    newCategories: categories.created,
    removedCategories: categories.deactivated,
    newItems: items.created,
    removedItems: items.deactivated,
    priceChanges: items.pricesChanged,
    availabilityChanges: items.availabilityChanged,
  };
}

export function formatLocationSyncReport(summary: SyncLocationSummary): string {
  const name = getLocationConfig(summary.locationId).name;
  const categories = summary.categories.created + summary.categories.updated;
  const items = summary.items.created + summary.items.updated;
  const changes = buildChangeSummary(summary.categories, summary.items);

  return [
    name,
    `${items} Menu Items`,
    `${categories} Categories`,
    `${changes.priceChanges} Price Changes`,
    `${changes.newItems} New Items`,
    `${changes.removedItems} Removed Items`,
    `Duration ${(summary.durationMs / 1000).toFixed(1)} sec`,
  ].join("\n");
}

export function buildSyncRunMetadata(
  summary: SyncLocationSummary,
  extras: Record<string, unknown> = {},
): Record<string, unknown> {
  const changes = buildChangeSummary(summary.categories, summary.items);
  return {
    changes,
    report: formatLocationSyncReport(summary),
    categoriesDownloaded: summary.categories.created + summary.categories.updated,
    itemsDownloaded: summary.items.created + summary.items.updated,
    ...extras,
  };
}

export async function bumpCatalogRevision(locationId: LocationId): Promise<number> {
  const supabase = createChefGaaSyncClient();
  const { data } = await locationConfigAutomationTable(supabase)
    .select("catalog_revision")
    .eq("location_id", locationId)
    .maybeSingle();

  const next = Number((data as { catalog_revision?: number } | null)?.catalog_revision ?? 0) + 1;
  await locationConfigAutomationTable(supabase)
    .update({ catalog_revision: next })
    .eq("location_id", locationId);

  return next;
}

export async function updateLocationFailureState(
  locationId: LocationId,
  success: boolean,
): Promise<void> {
  const supabase = createChefGaaSyncClient();
  const { data } = await locationConfigAutomationTable(supabase)
    .select("consecutive_failures")
    .eq("location_id", locationId)
    .maybeSingle();

  const current = Number((data as { consecutive_failures?: number } | null)?.consecutive_failures ?? 0);
  const consecutive = success ? 0 : current + 1;
  const critical = consecutive >= 3;

  const updatePayload: Record<string, unknown> = {
    consecutive_failures: consecutive,
    critical_alert: critical,
  };
  if (critical) {
    updatePayload.api_health_status = "critical";
  }

  await locationConfigAutomationTable(supabase)
    .update(updatePayload)
    .eq("location_id", locationId);

  if (critical) {
    await emitSyncNotification({
      eventType: "critical_location",
      locationId,
      message: `Critical — 3 consecutive sync failures for ${getLocationConfig(locationId).name}`,
      severity: "critical",
    });
  }
}
