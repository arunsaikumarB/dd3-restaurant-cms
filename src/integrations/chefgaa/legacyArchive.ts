import type { LocationId } from "../../config/locations";
import { categoriesTable, menuItemsTable } from "./db";
import { createChefGaaSyncClient } from "./supabaseClient";

export type LegacyArchiveResult = {
  itemsArchived: number;
  categoriesArchived: number;
};

type LegacyItemRow = Record<string, unknown> & { id: string };

type LegacyCategoryRow = Record<string, unknown> & { id: string };

/**
 * Moves pre-ChefGaa CMS menu rows into archive tables and deletes them from live tables.
 * Preserves rows with manual_override = true. Idempotent when no legacy rows remain.
 */
export async function archiveLegacyMenuData(
  locationId: LocationId,
  archiveReason = "chefgaa_first_sync",
): Promise<LegacyArchiveResult> {
  const supabase = createChefGaaSyncClient();
  const itemsTable = menuItemsTable(supabase);
  const catsTable = categoriesTable(supabase);
  const archivedAt = new Date().toISOString();

  const { data: legacyItems, error: itemsLoadError } = await (
    itemsTable as unknown as {
      select(columns: string): {
        eq(column: string, value: string): {
          eq(column: string, value: boolean): {
            is(column: string, value: null): Promise<{
              data: LegacyItemRow[] | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    }
  )
    .select("*")
    .eq("location_id", locationId)
    .eq("imported_from_chefgaa", false)
    .is("chefgaa_outlet_item_id", null);

  if (itemsLoadError) {
    throw new Error(`Failed to load legacy menu items: ${itemsLoadError.message}`);
  }

  const itemsToArchive = (legacyItems ?? []).filter(
    (row) => row.manual_override !== true,
  );

  if (itemsToArchive.length > 0) {
    const archiveRows = itemsToArchive.map((row) => ({
      ...row,
      archived_at: archivedAt,
      archive_reason: archiveReason,
    }));

    const { error: archiveInsertError } = await (
      supabase.from("menu_items_legacy_archive") as unknown as {
        insert(rows: Record<string, unknown>[]): Promise<{ error: { message: string } | null }>;
      }
    ).insert(archiveRows);

    if (archiveInsertError) {
      throw new Error(`Failed to archive legacy menu items: ${archiveInsertError.message}`);
    }

    for (const row of itemsToArchive) {
      const { error } = await supabase
        .from("menu_items")
        .delete()
        .eq("id", row.id)
        .eq("location_id", locationId);
      if (error) {
        throw new Error(`Failed to delete archived legacy item ${row.id}: ${error.message}`);
      }
    }
  }

  const { data: legacyCategories, error: catsLoadError } = await (
    catsTable as unknown as {
      select(columns: string): {
        eq(column: string, value: string): {
          eq(column: string, value: boolean): {
            is(column: string, value: null): Promise<{
              data: LegacyCategoryRow[] | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    }
  )
    .select("*")
    .eq("location_id", locationId)
    .eq("imported_from_chefgaa", false)
    .is("chefgaa_category_id", null);

  if (catsLoadError) {
    throw new Error(`Failed to load legacy categories: ${catsLoadError.message}`);
  }

  const { data: remainingItems, error: remainingError } = await itemsTable
    .select("category_id")
    .eq("location_id", locationId);

  if (remainingError) {
    throw new Error(`Failed to load remaining menu items: ${remainingError.message}`);
  }

  const categoriesWithItems = new Set(
    ((remainingItems ?? []) as Array<{ category_id: string }>).map((row) => row.category_id),
  );

  const categoriesToArchive = (legacyCategories ?? []).filter(
    (row) => !categoriesWithItems.has(row.id),
  );

  if (categoriesToArchive.length > 0) {
    const archiveRows = categoriesToArchive.map((row) => ({
      ...row,
      archived_at: archivedAt,
      archive_reason: archiveReason,
    }));

    const { error: archiveInsertError } = await (
      supabase.from("menu_categories_legacy_archive") as unknown as {
        insert(rows: Record<string, unknown>[]): Promise<{ error: { message: string } | null }>;
      }
    ).insert(archiveRows);

    if (archiveInsertError) {
      throw new Error(`Failed to archive legacy categories: ${archiveInsertError.message}`);
    }

    for (const row of categoriesToArchive) {
      const { error } = await supabase
        .from("menu_categories")
        .delete()
        .eq("id", row.id)
        .eq("location_id", locationId);
      if (error) {
        throw new Error(`Failed to delete archived legacy category ${row.id}: ${error.message}`);
      }
    }
  }

  return {
    itemsArchived: itemsToArchive.length,
    categoriesArchived: categoriesToArchive.length,
  };
}

export async function isLocationChefGaaInitialized(locationId: LocationId): Promise<boolean> {
  const supabase = createChefGaaSyncClient();
  const { data, error } = await supabase
    .from("chefgaa_location_config")
    .select("chefgaa_initialized")
    .eq("location_id", locationId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read ChefGaa init flag: ${error.message}`);
  }

  return Boolean((data as { chefgaa_initialized?: boolean } | null)?.chefgaa_initialized);
}

export async function markLocationChefGaaInitialized(
  locationId: LocationId,
  catalogCounts: { categories: number; items: number },
): Promise<void> {
  const supabase = createChefGaaSyncClient();
  const { error } = await (
    supabase.from("chefgaa_location_config") as unknown as {
      update(row: Record<string, unknown>): {
        eq(column: string, value: string): Promise<{ error: { message: string } | null }>;
      };
    }
  )
    .update({
      chefgaa_initialized: true,
      chefgaa_catalog_category_count: catalogCounts.categories,
      chefgaa_catalog_item_count: catalogCounts.items,
    })
    .eq("location_id", locationId);

  if (error) {
    throw new Error(`Failed to mark location initialized: ${error.message}`);
  }
}
