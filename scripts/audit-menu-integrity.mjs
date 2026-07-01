/**
 * Audit menu data integrity before ChefGaa cleanup migration.
 * Usage: node scripts/audit-menu-integrity.mjs
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
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);
const LOCATIONS = ["south-plainfield", "oak-tree", "lawrenceville"];

async function fetchAll(table, select, filter) {
  const rows = [];
  let from = 0;
  const page = 1000;
  while (true) {
    let q = supabase.from(table).select(select).range(from, from + page - 1);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < page) break;
    from += page;
  }
  return rows;
}

function groupCount(rows, keyFn) {
  const m = new Map();
  for (const row of rows) {
    const k = keyFn(row);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

async function main() {
  const items = await fetchAll(
    "menu_items",
    "id, location_id, name, price, category_id, display_order, status, imported_from_chefgaa, chefgaa_outlet_item_id, manual_override",
  );
  const categories = await fetchAll(
    "menu_categories",
    "id, location_id, name, slug, display_order, status, imported_from_chefgaa, chefgaa_category_id",
  );

  const report = { generatedAt: new Date().toISOString(), locations: {}, global: {} };

  for (const loc of LOCATIONS) {
    const locItems = items.filter((r) => r.location_id === loc);
    const locCats = categories.filter((r) => r.location_id === loc);

    const legacyItems = locItems.filter((r) => !r.imported_from_chefgaa && !r.chefgaa_outlet_item_id);
    const chefgaaItems = locItems.filter((r) => r.imported_from_chefgaa && r.chefgaa_outlet_item_id);
    const orphanImported = locItems.filter((r) => r.imported_from_chefgaa && !r.chefgaa_outlet_item_id);
    const orphanExternal = locItems.filter((r) => !r.imported_from_chefgaa && r.chefgaa_outlet_item_id);
    const manualOverride = locItems.filter((r) => r.manual_override);

    const legacyCats = locCats.filter((r) => !r.imported_from_chefgaa && !r.chefgaa_category_id);
    const chefgaaCats = locCats.filter((r) => r.imported_from_chefgaa && r.chefgaa_category_id);

    const dupChefgaaIds = [...groupCount(chefgaaItems, (r) => r.chefgaa_outlet_item_id).entries()]
      .filter(([, c]) => c > 1)
      .map(([id, count]) => ({ chefgaa_outlet_item_id: id, count }));

    const dupChefgaaCatIds = [...groupCount(chefgaaCats, (r) => r.chefgaa_category_id).entries()]
      .filter(([, c]) => c > 1)
      .map(([id, count]) => ({ chefgaa_category_id: id, count }));

    // Name duplicates within location (active items only)
    const activeItems = locItems.filter((r) => r.status === "active");
    const nameDupes = [...groupCount(activeItems, (r) => r.name.toLowerCase().trim()).entries()]
      .filter(([, c]) => c > 1)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    report.locations[loc] = {
      items: {
        total: locItems.length,
        chefgaaImported: chefgaaItems.length,
        legacy: legacyItems.length,
        orphanImportedFlag: orphanImported.length,
        orphanExternalIdOnly: orphanExternal.length,
        manualOverride: manualOverride.length,
        active: locItems.filter((r) => r.status === "active").length,
        inactive: locItems.filter((r) => r.status === "inactive").length,
        duplicateChefgaaIds: dupChefgaaIds,
      },
      categories: {
        total: locCats.length,
        chefgaaImported: chefgaaCats.length,
        legacy: legacyCats.length,
        duplicateChefgaaIds: dupChefgaaCatIds,
      },
      sampleLegacyItemNames: legacyItems.slice(0, 5).map((r) => r.name),
      sampleNameDuplicates: nameDupes,
    };
  }

  const nullChefgaaId = items.filter((r) => !r.chefgaa_outlet_item_id).length;
  const dupGlobalChefgaa = [...groupCount(
    items.filter((r) => r.chefgaa_outlet_item_id),
    (r) => `${r.location_id}:${r.chefgaa_outlet_item_id}`,
  ).entries()].filter(([, c]) => c > 1);

  report.global = {
    totalItems: items.length,
    totalCategories: categories.length,
    itemsWithNullChefgaaId: nullChefgaaId,
    duplicateChefgaaItemKeys: dupGlobalChefgaa.length,
    duplicateChefgaaItemDetails: dupGlobalChefgaa.slice(0, 20).map(([k, count]) => ({ key: k, count })),
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
