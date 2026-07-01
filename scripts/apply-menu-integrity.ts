/**
 * Applies migration 019 cleanup via the sync service-role client.
 * Requires archive tables from 019_chefgaa_data_integrity.sql to exist.
 *
 * Usage: npx tsx scripts/apply-menu-integrity.ts
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { LOCATION_IDS } from "../src/config/locations";
import { archiveLegacyMenuData, markLocationChefGaaInitialized } from "../src/integrations/chefgaa/legacyArchive";
import { validateCatalogIntegrity } from "../src/integrations/chefgaa/validation";
import { createChefGaaSyncClient } from "../src/integrations/chefgaa/supabaseClient";

function loadEnvFile(filename: string): void {
  const path = resolve(process.cwd(), filename);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep <= 0) continue;
    const key = trimmed.slice(0, sep).trim();
    let value = trimmed.slice(sep + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

async function assertMigrationReady(): Promise<void> {
  const supabase = createChefGaaSyncClient();
  const { error } = await supabase.from("menu_items_legacy_archive").select("id").limit(1);
  if (error) {
    throw new Error(
      "Archive tables not found. Run supabase/migrations/019_chefgaa_data_integrity.sql in the Supabase SQL editor first.",
    );
  }
}

async function main(): Promise<void> {
  await assertMigrationReady();

  const results: Record<string, unknown> = { locations: {} };

  for (const locationId of LOCATION_IDS) {
    const archiveResult = await archiveLegacyMenuData(locationId, "migration_019_apply_script");
    const integrity = await validateCatalogIntegrity(locationId, {
      categories: 0,
      items: 0,
    });

    const supabase = createChefGaaSyncClient();
    const { count: itemCount } = await supabase
      .from("menu_items")
      .select("*", { count: "exact", head: true })
      .eq("location_id", locationId)
      .eq("imported_from_chefgaa", true);

    const { count: categoryCount } = await supabase
      .from("menu_categories")
      .select("*", { count: "exact", head: true })
      .eq("location_id", locationId)
      .eq("imported_from_chefgaa", true);

    await markLocationChefGaaInitialized(locationId, {
      categories: categoryCount ?? 0,
      items: itemCount ?? 0,
    });

    results.locations[locationId] = {
      archiveResult,
      importedCategories: categoryCount ?? 0,
      importedItems: itemCount ?? 0,
      legacyItemsRemaining: integrity.legacyItemCount,
      legacyCategoriesRemaining: integrity.legacyCategoryCount,
    };
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
