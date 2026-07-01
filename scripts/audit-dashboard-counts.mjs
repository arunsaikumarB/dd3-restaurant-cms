/**
 * Simulates dashboard count queries (service role vs imported+active filters).
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filename) {
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
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);
const LOCATIONS = ["south-plainfield", "oak-tree", "lawrenceville"];

async function count(table, filters) {
  let q = supabase.from(table).select("*", { count: "exact", head: true });
  for (const [col, val] of Object.entries(filters)) {
    if (val === null) q = q.is(col, null);
    else q = q.eq(col, val);
  }
  const { count, error } = await q;
  return { count: count ?? 0, error: error?.message ?? null };
}

async function main() {
  const report = { locations: {}, config: {}, global: {} };

  const { data: configs } = await supabase.from("chefgaa_location_config").select("*");
  report.config = configs;

  for (const loc of LOCATIONS) {
    report.locations[loc] = {
      allItems: await count("menu_items", { location_id: loc }),
      allCategories: await count("menu_categories", { location_id: loc }),
      importedItems: await count("menu_items", { location_id: loc, imported_from_chefgaa: true }),
      importedCategories: await count("menu_categories", {
        location_id: loc,
        imported_from_chefgaa: true,
      }),
      activeImportedItems: await count("menu_items", {
        location_id: loc,
        imported_from_chefgaa: true,
        status: "active",
      }),
      activeImportedCategories: await count("menu_categories", {
        location_id: loc,
        imported_from_chefgaa: true,
        status: "active",
      }),
      legacyItems: await count("menu_items", {
        location_id: loc,
        imported_from_chefgaa: false,
      }),
    };
  }

  const sums = LOCATIONS.reduce(
    (acc, loc) => {
      acc.allItems += report.locations[loc].allItems.count;
      acc.importedItems += report.locations[loc].importedItems.count;
      acc.activeImportedItems += report.locations[loc].activeImportedItems.count;
      return acc;
    },
    { allItems: 0, importedItems: 0, activeImportedItems: 0 },
  );
  report.global = sums;

  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
