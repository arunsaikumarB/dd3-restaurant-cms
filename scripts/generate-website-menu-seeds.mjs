/**
 * Generates website menu seed SQL from static menu TS files
 * (desidhamakanj.net scrape) with user-specified adjustments.
 *
 * Usage: node scripts/generate-website-menu-seeds.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const LOCATIONS = [
  {
    locationId: "south-plainfield",
    label: "South Plainfield",
    srcFile: resolve(ROOT, "src/data/menu/southPlainfield.ts"),
    exportMarker: "southPlainfieldMenu =",
    outFile: resolve(ROOT, "supabase/seed_sp_website.sql"),
    excludeCategories: ["Breakfast"],
    categoryRenames: {},
  },
  {
    locationId: "oak-tree",
    label: "Oak Tree",
    srcFile: resolve(ROOT, "src/data/menu/oakTree.ts"),
    exportMarker: "oakTreeMenu =",
    outFile: resolve(ROOT, "supabase/seed_ot_website.sql"),
    excludeCategories: [],
    categoryRenames: {},
  },
  {
    locationId: "lawrenceville",
    label: "Lawrenceville",
    srcFile: resolve(ROOT, "src/data/menu/lawrenceville.ts"),
    exportMarker: "lawrencevilleMenu =",
    outFile: resolve(ROOT, "supabase/seed_lv_website.sql"),
    excludeCategories: [],
    categoryRenames: { Thali: "Thali & Cooker Pulav" },
  },
];

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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

function isChefSpecial(name, categoryName) {
  const text = `${name} ${categoryName}`;
  return /\bDD\s*Spl\b|\bDD\s*Special\b|\bDD\s*Chef'?s\s*Special\b/i.test(text);
}

function loadMenu(srcFile, exportMarker) {
  const raw = readFileSync(srcFile, "utf8");
  const start = raw.indexOf("{", raw.indexOf(exportMarker));
  const end = raw.lastIndexOf("} as const");
  return JSON.parse(raw.slice(start, end + 1));
}

function prepareCategories(menu, config) {
  const usedSlugs = new Set();
  return menu.categories
    .filter((cat) => !config.excludeCategories.includes(cat.name))
    .map((cat, index) => {
      const name = config.categoryRenames[cat.name] ?? cat.name;
      let slug = slugify(name);
      let suffix = 2;
      while (usedSlugs.has(slug)) {
        slug = `${slugify(name)}-${suffix}`;
        suffix += 1;
      }
      usedSlugs.add(slug);
      return {
        name,
        slug,
        displayOrder: index + 1,
        items: cat.items.map((item, idx) => ({
          name: item.name,
          description: item.description ?? "",
          price: item.price,
          image: item.image ?? null,
          veg: item.veg ?? true,
          popular: item.popular ?? false,
          chefSpecial: isChefSpecial(item.name, name),
          spiceLevel: item.spiceLevel ?? null,
          available: item.available !== false,
          displayOrder: idx + 1,
        })),
      };
    });
}

function generateSql(config, categories) {
  const totalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0);
  const lines = [];
  lines.push("-- ============================================================");
  lines.push(`-- Desi Dhamaka — website menu seed for ${config.label}`);
  lines.push(`-- location_id: ${config.locationId}`);
  lines.push(`-- Source: desidhamakanj.net website menu`);
  lines.push(`-- Categories: ${categories.length} · Items: ${totalItems}`);
  lines.push("-- Run DELETE on menu_items/menu_categories BEFORE this file.");
  lines.push("-- Idempotent: re-running will not duplicate rows.");
  lines.push("-- ============================================================");
  lines.push("");
  lines.push("BEGIN;");
  lines.push("");
  lines.push("-- Categories");
  lines.push(
    "INSERT INTO public.menu_categories (name, slug, image, display_order, status, location_id)",
  );
  lines.push("VALUES");
  lines.push(
    categories
      .map(
        (cat) =>
          `  (${sqlStr(cat.name)}, ${sqlStr(cat.slug)}, NULL, ${cat.displayOrder}, 'active', '${config.locationId}')`,
      )
      .join(",\n"),
  );
  lines.push("ON CONFLICT (location_id, slug) DO NOTHING;");
  lines.push("");
  lines.push("-- Menu items");
  lines.push("WITH cat AS (");
  lines.push(
    `  SELECT id, slug FROM public.menu_categories WHERE location_id = '${config.locationId}'`,
  );
  lines.push(")");
  lines.push(
    "INSERT INTO public.menu_items (category_id, name, description, price, image, veg, popular, chef_special, spice_level, status, display_order, location_id)",
  );
  lines.push(
    "SELECT c.id, v.name, v.description, v.price, v.image, v.veg, v.popular, v.chef_special, v.spice_level, v.status::public.content_status, v.display_order, v.location_id",
  );
  lines.push("FROM (VALUES");

  const itemRows = [];
  for (const cat of categories) {
    for (const item of cat.items) {
      const status = item.available === false ? "'inactive'" : "'active'";
      const spice = item.spiceLevel === null ? "NULL" : String(item.spiceLevel);
      itemRows.push(
        `  (${sqlStr(cat.slug)}, ${sqlStr(item.name)}, ${sqlStr(item.description)}, ` +
          `${sqlNum(item.price)}, ${sqlStr(item.image)}, ${sqlBool(item.veg)}, ` +
          `${sqlBool(item.popular)}, ${sqlBool(item.chefSpecial)}, ${spice}, ` +
          `${status}, ${item.displayOrder}, '${config.locationId}')`,
      );
    }
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
    `  WHERE mc.location_id = '${config.locationId}' AND mc.slug = v.cat_slug AND mi.name = v.name`,
  );
  lines.push(");");
  lines.push("");
  lines.push("COMMIT;");
  lines.push("");
  return { sql: lines.join("\n"), totalItems, categories: categories.length };
}

const summary = [];
for (const config of LOCATIONS) {
  const menu = loadMenu(config.srcFile, config.exportMarker);
  const categories = prepareCategories(menu, config);
  const { sql, totalItems, categories: catCount } = generateSql(config, categories);
  writeFileSync(config.outFile, sql, "utf8");
  summary.push({
    location: config.locationId,
    file: config.outFile.replace(ROOT + "\\", "").replace(ROOT + "/", ""),
    categories: catCount,
    items: totalItems,
  });
  console.log(`Wrote ${config.outFile} (${catCount} categories, ${totalItems} items)`);
}
console.log("\nSummary:", JSON.stringify(summary, null, 2));
