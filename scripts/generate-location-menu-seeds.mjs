/**
 * Generates per-location Supabase menu seed SQL from ChefGaa API (SP/OT)
 * and desidhamakanj.net HTML export (Lawrenceville).
 *
 * Usage: node scripts/generate-location-menu-seeds.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const API = "https://api.chefgaa.com";
const PARTNER_ID = 1;

const LOCATIONS = [
  {
    locationId: "south-plainfield",
    label: "South Plainfield",
    outletId: 71,
    orderUrl: "https://order.chefgaa.com/store/desi-dhamaka?order_type=106",
    outFile: resolve(ROOT, "supabase/seed_south_plainfield.sql"),
    source: "ChefGaa API outlet 71 (order_type 108)",
  },
  {
    locationId: "oak-tree",
    label: "Oak Tree",
    outletId: 70,
    orderUrl: "https://order.chefgaa.com/store/desi-dhamaka?order_type=108",
    outFile: resolve(ROOT, "supabase/seed_oak_tree.sql"),
    source: "ChefGaa API outlet 70 (order_type 106)",
  },
  {
    locationId: "lawrenceville",
    label: "Lawrenceville",
    htmlPath: resolve(ROOT, ".cache/lawrenceville-menu.html"),
    orderUrl: "https://orders.chefgaa.com/store/desi-dhamaka/menu",
    outFile: resolve(ROOT, "supabase/seed_lawrenceville.sql"),
    source: "desidhamakanj.net/lawrenceville/menu HTML export",
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

function isChefSpecial(name) {
  return /chef'?s special|\bdd spl\b|\bdd special\b/i.test(name);
}

function inferVeg(categoryName, itemName) {
  const cat = categoryName.toLowerCase();
  const name = itemName.toLowerCase();
  if (
    cat.includes("non-veg") ||
    cat.includes("non-vegetarian") ||
    /\b(chicken|mutton|goat|fish|shrimp|prawn|egg|meat|kodi|mamsam|royyala|nalli|seafood|natukodi)\b/i.test(
      name,
    )
  ) {
    if (
      /\b(veg|paneer|gobi|mushroom|baby corn|lotus|corn masala|vankaya)\b/i.test(name) &&
      !/\b(chicken|mutton|fish|shrimp|egg|goat)\b/i.test(name)
    ) {
      return true;
    }
    return false;
  }
  if (cat.includes("vegetarian") || (cat === "soups" && /^veg\b/i.test(name))) {
    return true;
  }
  if (/\b(chicken|mutton|goat|fish|shrimp|prawn|egg|meat)\b/i.test(name)) {
    return false;
  }
  return true;
}

function inferSpicy(name, description) {
  const text = `${name} ${description ?? ""}`.toLowerCase();
  return /\b(spicy|chilli|chili|hot & sour|hot and sour|pepper fry|65|guntur|mirchi|karam|fiery)\b/i.test(
    text,
  );
}

function decodeHtml(value) {
  return String(value)
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8217;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function parsePrice(value) {
  const match = String(value).match(/\$([\d.]+)/);
  return match ? Number.parseFloat(match[1]) : null;
}

function parseMenuCards(panelHtml, categoryName, items) {
  const blocks = panelHtml.split(/<div class="menu-card">/).slice(1);
  for (const block of blocks) {
    const nameMatch = block.match(/<div class="card-name">([\s\S]*?)<\/div>/);
    const priceMatch = block.match(/<span class="card-price">([^<]+)<\/span>/);
    const descMatch = block.match(/<div class="card-desc">([\s\S]*?)<\/div>/);
    if (!nameMatch || !priceMatch) continue;
    const name = decodeHtml(nameMatch[1].replace(/<[^>]+>/g, ""));
    const price = parsePrice(priceMatch[1]);
    const description = decodeHtml((descMatch?.[1] ?? "").replace(/<[^>]+>/g, ""));
    if (!name || price === null) continue;
    items.push({ name, description, price });
  }
}

function parseMandiGroups(panelHtml, categoryName, items) {
  const groups = panelHtml.split(/<div class="mandi-group">/).slice(1);
  for (const group of groups) {
    const nameMatch = group.match(/<h3>([\s\S]*?)<\/h3>/);
    if (!nameMatch) continue;
    const baseName = decodeHtml(nameMatch[1].replace(/<[^>]+>/g, ""));
    const rowRegex =
      /<span class="mandi-row-label">([\s\S]*?)<\/span>\s*<span class="mandi-row-price">([^<]+)<\/span>/g;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(group)) !== null) {
      const size = decodeHtml(rowMatch[1]);
      const price = parsePrice(rowMatch[2]);
      if (!size || price === null) continue;
      items.push({ name: `${baseName} (${size})`, description: "", price });
    }
  }
}

function parseMenuHtml(html) {
  const panelStarts = [...html.matchAll(/<div class="panel[^>]*id="(panel-[^"]+)"/g)];
  const categories = [];
  for (let index = 0; index < panelStarts.length; index += 1) {
    const start = panelStarts[index].index ?? 0;
    const end =
      index + 1 < panelStarts.length
        ? (panelStarts[index + 1].index ?? html.length)
        : html.length;
    const panelHtml = html.slice(start, end);
    const headingMatch = panelHtml.match(/<h2>([\s\S]*?)<\/h2>/);
    if (!headingMatch) continue;
    const categoryName = decodeHtml(headingMatch[1].replace(/<[^>]+>/g, ""));
    if (/^legal$|^hours$/i.test(categoryName)) continue;
    const items = [];
    parseMandiGroups(panelHtml, categoryName, items);
    parseMenuCards(panelHtml, categoryName, items);
    if (items.length > 0) categories.push({ name: categoryName, items });
  }
  return categories;
}

async function fetchChefGaaMenu(outletId) {
  const response = await fetch(`${API}/menu-item`, {
    headers: {
      Accept: "application/json",
      outlet: String(outletId),
      partner: String(PARTNER_ID),
    },
  });
  if (!response.ok) {
    throw new Error(`ChefGaa menu fetch failed for outlet ${outletId}: ${response.status}`);
  }
  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error(`Unexpected ChefGaa response for outlet ${outletId}`);
  }
  return data.map((category) => ({
    name: String(category.name ?? "").trim(),
    items: (category.menuItems ?? []).map((item) => ({
      name: String(item.name ?? "").trim(),
      description: item.description ? String(item.description).trim() : "",
      price: Number(item.selling_price ?? item.cost_price ?? 0),
      image:
        typeof item.image === "string" && item.image.startsWith("http")
          ? item.image
          : null,
      available: !item.mark_as_unavailable,
      displayOrder:
        item.sort_order === null || item.sort_order === undefined
          ? null
          : Number(item.sort_order),
    })),
  }));
}

function assignCategorySlugs(categories) {
  const used = new Set();
  return categories.map((category) => {
    let slug = slugify(category.name);
    let suffix = 2;
    while (used.has(slug)) {
      slug = `${slugify(category.name)}-${suffix}`;
      suffix += 1;
    }
    used.add(slug);
    return { ...category, slug };
  });
}

function buildMenuData(location) {
  if (location.outletId) {
    return fetchChefGaaMenu(location.outletId).then((categories) =>
      assignCategorySlugs(categories),
    );
  }
  const html = readFileSync(location.htmlPath, "utf8");
  const categories = assignCategorySlugs(parseMenuHtml(html));
  return Promise.resolve(categories);
}

function generateSql(location, categories) {
  const totalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0);
  const lines = [];
  lines.push("-- ============================================================");
  lines.push(`-- Desi Dhamaka — menu seed for ${location.label}`);
  lines.push(`-- location_id: ${location.locationId}`);
  lines.push(`-- Source: ${location.source}`);
  lines.push(`-- Order URL: ${location.orderUrl}`);
  lines.push(`-- Categories: ${categories.length} · Items: ${totalItems}`);
  lines.push("-- Run supabase/clear_menu_locations.sql BEFORE this file.");
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
        (cat, i) =>
          `  (${sqlStr(cat.name)}, ${sqlStr(cat.slug)}, NULL, ${i + 1}, 'active', '${location.locationId}')`,
      )
      .join(",\n"),
  );
  lines.push("ON CONFLICT (location_id, slug) DO NOTHING;");
  lines.push("");
  lines.push("-- Menu items");
  lines.push("WITH cat AS (");
  lines.push(
    `  SELECT id, slug FROM public.menu_categories WHERE location_id = '${location.locationId}'`,
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
    cat.items.forEach((item, idx) => {
      const displayOrder = item.displayOrder ?? idx + 1;
      const status = item.available === false ? "'inactive'" : "'active'";
      itemRows.push(
        `  (${sqlStr(cat.slug)}, ${sqlStr(item.name)}, ${sqlStr(item.description)}, ` +
          `${sqlNum(item.price)}, ${sqlStr(item.image)}, ${sqlBool(inferVeg(cat.name, item.name))}, ` +
          `FALSE, ${sqlBool(isChefSpecial(item.name))}, ` +
          `${inferSpicy(item.name, item.description) ? 2 : "NULL"}, ` +
          `${status}, ${displayOrder}, '${location.locationId}')`,
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
    `  WHERE mc.location_id = '${location.locationId}' AND mc.slug = v.cat_slug AND mi.name = v.name`,
  );
  lines.push(");");
  lines.push("");
  lines.push("COMMIT;");
  lines.push("");
  return { sql: lines.join("\n"), totalItems, categories: categories.length };
}

async function main() {
  const summary = [];
  for (const location of LOCATIONS) {
    const categories = await buildMenuData(location);
    const { sql, totalItems, categories: catCount } = generateSql(location, categories);
    writeFileSync(location.outFile, sql, "utf8");
    summary.push({
      location: location.locationId,
      file: location.outFile.replace(ROOT + "\\", "").replace(ROOT + "/", ""),
      categories: catCount,
      items: totalItems,
    });
    console.log(`Wrote ${location.outFile} (${catCount} categories, ${totalItems} items)`);
  }
  console.log("\nSummary:", JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
