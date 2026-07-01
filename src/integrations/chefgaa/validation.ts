import type { LocationId } from "../../config/locations";
import { categoriesTable, menuItemsTable } from "./db";
import { createChefGaaSyncClient } from "./supabaseClient";

export type CatalogIntegrityReport = {
  locationId: LocationId;
  valid: boolean;
  chefgaaCategoryCount: number;
  chefgaaItemCount: number;
  expectedCategories: number;
  expectedItems: number;
  legacyItemCount: number;
  legacyCategoryCount: number;
  duplicateChefgaaItemIds: number;
  duplicateChefgaaCategoryIds: number;
  importedItemsWithNullId: number;
  issues: string[];
};

function countDuplicates(rows: Array<{ externalId: string }>): number {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.externalId)) {
      dupes.add(row.externalId);
    }
    seen.add(row.externalId);
  }
  return dupes.size;
}

/**
 * Verifies live menu tables contain only ChefGaa-sourced catalog rows and counts match the API download.
 */
export async function validateCatalogIntegrity(
  locationId: LocationId,
  expected: { categories: number; items: number },
): Promise<CatalogIntegrityReport> {
  const supabase = createChefGaaSyncClient();
  const issues: string[] = [];

  const { data: items, error: itemsError } = await menuItemsTable(supabase)
    .select("id, chefgaa_outlet_item_id, imported_from_chefgaa, manual_override")
    .eq("location_id", locationId);

  if (itemsError) {
    throw new Error(`Integrity check failed loading items: ${itemsError.message}`);
  }

  const { data: categories, error: categoriesError } = await categoriesTable(supabase)
    .select("id, chefgaa_category_id, imported_from_chefgaa")
    .eq("location_id", locationId);

  if (categoriesError) {
    throw new Error(`Integrity check failed loading categories: ${categoriesError.message}`);
  }

  const itemRows = (items ?? []) as Array<{
    id: string;
    chefgaa_outlet_item_id: string | null;
    imported_from_chefgaa: boolean;
    manual_override: boolean;
  }>;
  const categoryRows = (categories ?? []) as Array<{
    id: string;
    chefgaa_category_id: string | null;
    imported_from_chefgaa: boolean;
  }>;

  const chefgaaItems = itemRows.filter(
    (row) => row.imported_from_chefgaa && row.chefgaa_outlet_item_id,
  );
  const chefgaaCategories = categoryRows.filter(
    (row) => row.imported_from_chefgaa && row.chefgaa_category_id,
  );
  const legacyItems = itemRows.filter(
    (row) => !row.imported_from_chefgaa && !row.chefgaa_outlet_item_id && !row.manual_override,
  );
  const legacyCategories = categoryRows.filter(
    (row) => !row.imported_from_chefgaa && !row.chefgaa_category_id,
  );
  const importedItemsWithNullId = itemRows.filter(
    (row) => row.imported_from_chefgaa && !row.chefgaa_outlet_item_id,
  ).length;

  const duplicateChefgaaItemIds = countDuplicates(
    chefgaaItems.map((row) => ({ externalId: row.chefgaa_outlet_item_id as string })),
  );
  const duplicateChefgaaCategoryIds = countDuplicates(
    chefgaaCategories.map((row) => ({ externalId: row.chefgaa_category_id as string })),
  );

  if (legacyItems.length > 0) {
    issues.push(`${legacyItems.length} legacy CMS menu items remain without ChefGaa IDs.`);
  }
  if (legacyCategories.length > 0) {
    issues.push(`${legacyCategories.length} legacy CMS categories remain without ChefGaa IDs.`);
  }
  if (importedItemsWithNullId > 0) {
    issues.push(`${importedItemsWithNullId} rows flagged imported_from_chefgaa but missing chefgaa_outlet_item_id.`);
  }
  if (duplicateChefgaaItemIds > 0) {
    issues.push(`${duplicateChefgaaItemIds} duplicate chefgaa_outlet_item_id values.`);
  }
  if (duplicateChefgaaCategoryIds > 0) {
    issues.push(`${duplicateChefgaaCategoryIds} duplicate chefgaa_category_id values.`);
  }
  if (expected.items > 0 && chefgaaItems.length !== expected.items) {
    issues.push(
      `Menu item count mismatch: database has ${chefgaaItems.length}, ChefGaa returned ${expected.items}.`,
    );
  }
  if (expected.categories > 0 && chefgaaCategories.length !== expected.categories) {
    issues.push(
      `Category count mismatch: database has ${chefgaaCategories.length}, ChefGaa returned ${expected.categories}.`,
    );
  }

  return {
    locationId,
    valid: issues.length === 0,
    chefgaaCategoryCount: chefgaaCategories.length,
    chefgaaItemCount: chefgaaItems.length,
    expectedCategories: expected.categories,
    expectedItems: expected.items,
    legacyItemCount: legacyItems.length,
    legacyCategoryCount: legacyCategories.length,
    duplicateChefgaaItemIds,
    duplicateChefgaaCategoryIds,
    importedItemsWithNullId,
    issues,
  };
}
