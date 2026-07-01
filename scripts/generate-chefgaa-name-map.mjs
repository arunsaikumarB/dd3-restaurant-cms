/**
 * Generates per-location ChefGaa name map snippets from menu sources.
 * Usage: node scripts/generate-chefgaa-name-map.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function fetchChefGaaCategories(outletId) {
  const data = await fetch("https://api.chefgaa.com/menu-item", {
    headers: { outlet: String(outletId), partner: "1", Accept: "application/json" },
  }).then((r) => r.json());
  return data.map((c) => String(c.name).trim());
}

function parseHtmlCategories(htmlPath) {
  const html = readFileSync(htmlPath, "utf8");
  return [...html.matchAll(/<h2>([\s\S]*?)<\/h2>/g)]
    .map((m) =>
      m[1]
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .trim(),
    )
    .filter((n) => n && !/legal|hours/i.test(n));
}

const configs = [
  {
    locationId: "south-plainfield",
    outletId: 71,
  },
  {
    locationId: "oak-tree",
    outletId: 70,
  },
  {
    locationId: "lawrenceville",
    htmlPath: resolve(ROOT, ".cache/lawrenceville-menu.html"),
    overrides: {
      "kebab-and-tandooris": "Kebab and Tandoori",
      "naans-and-breads": "Naans",
      "non-vegetarian-entrees": "Non Vegetarian Entrees",
      "non-vegetarian-appetizers": "Non Vegetarian Appetizers",
      "vegetarian-rice-and-biryani": "Vegetarian Rice & Biryani",
      "non-veg-biryani": "Biryani",
      "dd-family-packs": "DD Family Packs",
      "thali": "Cooker Pulav",
      "chai-and-coffee": "Chai",
    },
  },
];

const maps = {};
for (const cfg of configs) {
  const names = cfg.outletId
    ? await fetchChefGaaCategories(cfg.outletId)
    : parseHtmlCategories(cfg.htmlPath);
  const map = {};
  for (const name of names) {
    map[slugify(name)] = name;
  }
  if (cfg.overrides) Object.assign(map, cfg.overrides);
  maps[cfg.locationId] = map;
}

const chefSpecialItems = {};
for (const [locationId, cfg] of [
  ["south-plainfield", { outletId: 71 }],
  ["oak-tree", { outletId: 70 }],
] ) {
  const data = await fetch("https://api.chefgaa.com/menu-item", {
    headers: { outlet: String(cfg.outletId), partner: "1", Accept: "application/json" },
  }).then((r) => r.json());
  const items = data.flatMap((c) => c.menuItems ?? []);
  chefSpecialItems[locationId] = items
    .filter((i) => /chef'?s special|\bdd spl\b|\bdd special\b/i.test(i.name))
    .map((i) => i.name);
}

writeFileSync(
  resolve(ROOT, "scripts/.chefgaa-maps.json"),
  JSON.stringify({ categoryMaps: maps, chefSpecialItems }, null, 2),
  "utf8",
);

console.log("Wrote scripts/.chefgaa-maps.json");
for (const [loc, map] of Object.entries(maps)) {
  console.log(`${loc}: ${Object.keys(map).length} categories`);
}
