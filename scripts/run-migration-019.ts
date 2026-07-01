/**
 * Runs migration 019 archive/cleanup via Supabase SQL functions.
 * Usage: npx tsx scripts/run-migration-019.ts
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

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

const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing Supabase credentials.");
  process.exit(1);
}

const supabase = createClient(url, key);
const LOCATIONS = ["south-plainfield", "oak-tree", "lawrenceville"];

async function columnExists(table: string, column: string): Promise<boolean> {
  const { error } = await supabase.from(table).select(column).limit(1);
  return !error;
}

async function main(): Promise<void> {
  const hasArchive = !(await supabase.from("menu_items_legacy_archive").select("id").limit(1)).error;
  const hasInit = await columnExists("chefgaa_location_config", "chefgaa_initialized");

  if (!hasArchive || !hasInit) {
    console.error(
      "Migration 019 schema is not applied. Paste and run supabase/migrations/019_chefgaa_data_integrity.sql in the Supabase SQL editor, then re-run this script.",
    );
    process.exit(1);
  }

  const report: Record<string, unknown> = { locations: {} };

  for (const locationId of LOCATIONS) {
    const { data: itemsArchived, error: itemsError } = await supabase.rpc(
      "archive_legacy_menu_items",
      { p_location_id: locationId },
    );
    if (itemsError) {
      throw new Error(`archive_legacy_menu_items(${locationId}): ${itemsError.message}`);
    }

    const { data: catsArchived, error: catsError } = await supabase.rpc(
      "archive_legacy_menu_categories",
      { p_location_id: locationId },
    );
    if (catsError) {
      throw new Error(`archive_legacy_menu_categories(${locationId}): ${catsError.message}`);
    }

    report.locations[locationId] = {
      itemsArchived,
      categoriesArchived: catsArchived,
    };
  }

  console.log(JSON.stringify(report, null, 2));
  console.log("\nRun: node scripts/audit-menu-integrity.mjs");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
