// Generates supabase/seed_menu.sql from the static South Plainfield menu data.
// Maps the app's MenuData shape onto the real Supabase schema:
//   menu_categories(name, slug, image, display_order, status, location_id)
//   menu_items(category_id, name, description, price, image, veg, popular,
//              chef_special, spice_level, status, display_order, location_id)
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SRC = resolve(ROOT, "src/data/menu/southPlainfield.ts");
const OUT = resolve(ROOT, "supabase/seed_menu.sql");
const LOCATION = "south-plainfield";

function sqlStr(value) {
  if (value === null || value === undefined || value === "") return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}
function sqlBool(value) {
  return value ? "TRUE" : "FALSE";
}
function sqlNum(value) {
  return value === null || value === undefined ? "NULL" : String(value);
}
function status(available) {
  return available === false ? "'inactive'" : "'active'";
}

const raw = await readFile(SRC, "utf8");
const start = raw.indexOf("{", raw.indexOf("southPlainfieldMenu ="));
const end = raw.lastIndexOf("} as const");
const json = raw.slice(start, end + 1);
const menu = JSON.parse(json);

const categories = menu.categories;
let totalItems = 0;

const lines = [];
lines.push("-- ============================================================");
lines.push("-- Desi Dhamaka — menu seed for South Plainfield");
lines.push(`-- Source: ${menu.source}`);
lines.push(`-- Categories: ${categories.length} · Items: ${menu.totalItems}`);
lines.push("-- Idempotent: re-running will not duplicate categories or items.");
lines.push("-- ============================================================");
lines.push("");
lines.push("BEGIN;");
lines.push("");

// ---- Categories ----
lines.push("-- Categories");
lines.push(
  "INSERT INTO public.menu_categories (name, slug, image, display_order, status, location_id)",
);
lines.push("VALUES");
const catRows = categories.map((cat, i) => {
  const name = sqlStr(cat.rawName ?? cat.name);
  const slug = sqlStr(cat.id);
  const image = sqlStr(cat.image);
  return `  (${name}, ${slug}, ${image}, ${i}, 'active', '${LOCATION}')`;
});
lines.push(catRows.join(",\n"));
lines.push("ON CONFLICT (location_id, slug) DO NOTHING;");
lines.push("");

// ---- Items ----
lines.push("-- Menu items (category resolved by slug, scoped to location)");
lines.push("WITH cat AS (");
lines.push(
  `  SELECT id, slug FROM public.menu_categories WHERE location_id = '${LOCATION}'`,
);
lines.push(")");
lines.push(
  "INSERT INTO public.menu_items (category_id, name, description, price, image, veg, popular, chef_special, spice_level, status, display_order, location_id)",
);
lines.push(
  "SELECT c.id, v.name, v.description, v.price, v.image, v.veg, v.popular, v.chef_special, v.spice_level, v.status, v.display_order, v.location_id",
);
lines.push("FROM (VALUES");

const itemRows = [];
for (const cat of categories) {
  cat.items.forEach((item, idx) => {
    totalItems += 1;
    itemRows.push(
      `  (${sqlStr(cat.id)}, ${sqlStr(item.name)}, ${sqlStr(item.description)}, ` +
        `${sqlNum(item.price)}, ${sqlStr(item.image)}, ${sqlBool(item.veg)}, ` +
        `${sqlBool(item.popular)}, ${sqlBool(item.chefSpecial)}, ${sqlNum(item.spiceLevel)}, ` +
        `${status(item.available)}, ${idx}, '${LOCATION}')`,
    );
  });
}
lines.push(itemRows.join(",\n"));
lines.push(
  ") AS v(cat_slug, name, description, price, image, veg, popular, chef_special, spice_level, status, display_order, location_id)",
);
lines.push("JOIN cat c ON c.slug = v.cat_slug");
lines.push("WHERE NOT EXISTS (");
lines.push("  SELECT 1 FROM public.menu_items mi");
lines.push("  JOIN public.menu_categories mc ON mc.id = mi.category_id");
lines.push(
  `  WHERE mc.location_id = '${LOCATION}' AND mc.slug = v.cat_slug AND mi.name = v.name`,
);
lines.push(");");
lines.push("");
lines.push("COMMIT;");
lines.push("");

await writeFile(OUT, lines.join("\n"), "utf8");
console.log(
  `Wrote ${OUT}\nCategories: ${categories.length}\nItems: ${totalItems}`,
);
