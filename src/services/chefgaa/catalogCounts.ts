import { createClientIfConfigured } from "../../lib/supabase/client";
import { isSupabaseConfigured } from "../../lib/supabase/env";
import type { LocationId } from "../../config/locations";
import type { ChefGaaLocationConfig, ChefGaaSyncRun } from "../../types/database";

export type ChefGaaCatalogTable = "menu_categories" | "menu_items";

const CHEFGAA_ID_COLUMN: Record<ChefGaaCatalogTable, string> = {
  menu_categories: "chefgaa_category_id",
  menu_items: "chefgaa_outlet_item_id",
};

/**
 * Live count of ChefGaa-sourced catalog rows (excludes legacy CMS and archive tables).
 */
export async function countChefGaaCatalogRows(
  table: ChefGaaCatalogTable,
  locationId: LocationId,
): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const supabase = createClientIfConfigured();
  if (!supabase) return 0;

  const idColumn = CHEFGAA_ID_COLUMN[table];
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("location_id", locationId)
    .eq("imported_from_chefgaa", true)
    .not(idColumn, "is", null);

  if (error) return 0;
  return count ?? 0;
}

export function catalogCountFromLastSync(
  config: ChefGaaLocationConfig | undefined,
  kind: "categories" | "items",
): number | null {
  if (!config || config.last_sync_status !== "success") return null;
  const value =
    kind === "categories"
      ? config.chefgaa_catalog_category_count
      : config.chefgaa_catalog_item_count;
  return typeof value === "number" && value >= 0 ? value : null;
}

/**
 * Prefer counts persisted by the last successful sync; fall back to a live ChefGaa-only query.
 */
export async function resolveChefGaaCatalogCount(
  table: ChefGaaCatalogTable,
  locationId: LocationId,
  config?: ChefGaaLocationConfig,
): Promise<number> {
  const fromSync = catalogCountFromLastSync(
    config,
    table === "menu_categories" ? "categories" : "items",
  );
  if (fromSync != null) return fromSync;
  return countChefGaaCatalogRows(table, locationId);
}

export async function sumChefGaaCatalogCounts(
  table: ChefGaaCatalogTable,
  locationIds: LocationId[],
  configs: ChefGaaLocationConfig[],
): Promise<number> {
  const counts = await Promise.all(
    locationIds.map((locationId) => {
      const config = configs.find((row) => row.location_id === locationId);
      return resolveChefGaaCatalogCount(table, locationId, config);
    }),
  );
  return counts.reduce((sum, value) => sum + value, 0);
}

type SyncRunCatalogMetadata = {
  categoriesDownloaded?: number;
  itemsDownloaded?: number;
  catalogIntegrity?: {
    chefgaaCategoryCount?: number;
    chefgaaItemCount?: number;
  };
};

/** Catalog totals recorded on a sync run (matches ChefGaa API download). */
export function catalogCountsFromSyncRun(run: ChefGaaSyncRun): {
  categories: number | null;
  items: number | null;
} {
  const metadata = (run.metadata ?? {}) as SyncRunCatalogMetadata;
  const integrity = metadata.catalogIntegrity;

  if (
    typeof integrity?.chefgaaCategoryCount === "number" &&
    typeof integrity?.chefgaaItemCount === "number"
  ) {
    return {
      categories: integrity.chefgaaCategoryCount,
      items: integrity.chefgaaItemCount,
    };
  }

  if (
    typeof metadata.categoriesDownloaded === "number" &&
    typeof metadata.itemsDownloaded === "number"
  ) {
    return {
      categories: metadata.categoriesDownloaded,
      items: metadata.itemsDownloaded,
    };
  }

  return { categories: null, items: null };
}
