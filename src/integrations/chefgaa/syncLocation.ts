import type { LocationId } from "../../config/locations";
import { downloadAndNormalizeMenu } from "./mapper";
import {
  archiveLegacyMenuData,
  isLocationChefGaaInitialized,
  markLocationChefGaaInitialized,
} from "./legacyArchive";
import { loadCategoryIdMap, syncCategories } from "./syncCategories";
import { syncMenuItems } from "./syncMenu";
import {
  completeSyncRun,
  loadLocationIntegrationConfig,
  logSyncEvent,
  startSyncRun,
  updateLocationSyncMetadata,
} from "./syncLogger";
import type { SyncLocationSummary, SyncTrigger } from "./types";
import { formatSyncSummaryMessage } from "./utils";
import { buildSyncRunMetadata } from "./automation/reporting";
import { validateCatalogIntegrity } from "./validation";

export type SyncLocationOptions = {
  trigger?: SyncTrigger;
  requestedBy?: string | null;
};

/**
 * Downloads ChefGaa menu data for one location, normalizes it, and upserts into Supabase.
 * Aborts without writing menu rows when the ChefGaa API request fails.
 */
export async function syncLocation(
  locationId: LocationId,
  options: SyncLocationOptions = {},
): Promise<SyncLocationSummary> {
  const started = Date.now();
  const trigger = options.trigger ?? "manual";
  const errors: string[] = [];
  let runId: string | null = null;

  const emptyStats = {
    categories: { created: 0, updated: 0, deactivated: 0, unchanged: 0, failed: 0 },
    items: {
      created: 0,
      updated: 0,
      deactivated: 0,
      pricesChanged: 0,
      availabilityChanged: 0,
      unchanged: 0,
      failed: 0,
    },
  };

  try {
    const config = await loadLocationIntegrationConfig(locationId);
    if (!config.syncEnabled) {
      return {
        locationId,
        success: false,
        status: "failed",
        ...emptyStats,
        errors: ["Sync is disabled for this location."],
        durationMs: Date.now() - started,
        runId: null,
        message: "Sync disabled.",
      };
    }

    runId = await startSyncRun(locationId, trigger);
    await logSyncEvent(runId, "info", `Starting ChefGaa sync for ${locationId}`);

    const initialized = await isLocationChefGaaInitialized(locationId);
    if (!initialized) {
      await logSyncEvent(runId, "info", "First ChefGaa sync — archiving legacy CMS menu data");
      const archiveResult = await archiveLegacyMenuData(locationId, "chefgaa_first_sync");
      await logSyncEvent(runId, "info", "Legacy CMS data archived", archiveResult);
    }

    const catalog = await downloadAndNormalizeMenu(config);
    await logSyncEvent(runId, "info", "ChefGaa catalog downloaded", {
      categories: catalog.categories.length,
      items: catalog.items.length,
    });

    const syncedAt = new Date().toISOString();
    const categoryStats = await syncCategories(locationId, catalog.categories, syncedAt);
    const categoryIdByExternal = await loadCategoryIdMap(locationId);
    const itemStats = await syncMenuItems(
      locationId,
      catalog.items,
      categoryIdByExternal,
      syncedAt,
    );

    const integrity = await validateCatalogIntegrity(locationId, {
      categories: catalog.categories.length,
      items: catalog.items.length,
    });

    await logSyncEvent(runId, "info", "Catalog integrity validation", integrity);

    if (!integrity.valid) {
      for (const issue of integrity.issues) {
        errors.push(issue);
      }
    }

    const hasFailures =
      categoryStats.failed > 0 || itemStats.failed > 0 || !integrity.valid;
    const status = hasFailures ? "partial" : "success";
    const durationMs = Date.now() - started;
    const message = hasFailures && !integrity.valid
      ? `${formatSyncSummaryMessage(categoryStats, itemStats)} · Integrity: ${integrity.issues.join("; ")}`
      : formatSyncSummaryMessage(categoryStats, itemStats);

    if (!initialized && integrity.valid) {
      await markLocationChefGaaInitialized(locationId, {
        categories: catalog.categories.length,
        items: catalog.items.length,
      });
    }

    await completeSyncRun(runId, {
      status,
      durationMs,
      categoriesCreated: categoryStats.created,
      categoriesUpdated: categoryStats.updated,
      categoriesDeactivated: categoryStats.deactivated,
      itemsCreated: itemStats.created,
      itemsUpdated: itemStats.updated,
      itemsDeactivated: itemStats.deactivated,
      pricesChanged: itemStats.pricesChanged,
      itemsFailed: itemStats.failed + categoryStats.failed,
      errorSummary: hasFailures ? message : null,
      metadata: buildSyncRunMetadata(
        {
          locationId,
          success: !hasFailures,
          status,
          categories: categoryStats,
          items: itemStats,
          errors,
          durationMs,
          runId,
          message,
        },
        {
          requestedBy: options.requestedBy ?? null,
          trigger: options.trigger ?? "manual",
          categoriesDownloaded: catalog.categories.length,
          itemsDownloaded: catalog.items.length,
          catalogIntegrity: integrity,
        },
      ),
    });

    await updateLocationSyncMetadata(locationId, {
      status,
      durationMs,
      error: hasFailures ? message : null,
      catalogCategoryCount: integrity.chefgaaCategoryCount,
      catalogItemCount: integrity.chefgaaItemCount,
    });

    await logSyncEvent(runId, "info", "Sync completed", { status, durationMs, integrity });

    return {
      locationId,
      success: !hasFailures,
      status,
      categories: categoryStats,
      items: itemStats,
      errors,
      durationMs,
      runId,
      message,
    };
  } catch (error) {
    const durationMs = Date.now() - started;
    const message = error instanceof Error ? error.message : String(error);
    errors.push(message);

    if (runId) {
      await logSyncEvent(runId, "error", message);
      await completeSyncRun(runId, {
        status: "failed",
        durationMs,
        categoriesCreated: 0,
        categoriesUpdated: 0,
        categoriesDeactivated: 0,
        itemsCreated: 0,
        itemsUpdated: 0,
        itemsDeactivated: 0,
        pricesChanged: 0,
        itemsFailed: 0,
        errorSummary: message,
      });
    }

    await updateLocationSyncMetadata(locationId, {
      status: "failed",
      durationMs,
      error: message,
    }).catch(() => undefined);

    return {
      locationId,
      success: false,
      status: "failed",
      ...emptyStats,
      errors,
      durationMs,
      runId,
      message,
    };
  }
}
