// Parses the Desi Dhamaka catalog Excel export into public/data/menu.json.
//
// Usage:
//   node scripts/parse-menu.mjs
//   node scripts/parse-menu.mjs --input path/to/catalog.xlsx

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

const DEFAULT_INPUT = join(projectRoot, "catalog-export-prod-DD3.xlsx");

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (key.startsWith("--")) {
      args[key.slice(2)] = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/^\d+\.\s*/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function displayCategoryName(raw) {
  return String(raw).replace(/^\d+\.\s*/, "").trim();
}

function isFeatured(name) {
  return /\b(special|chef|signature|premium)\b/i.test(name);
}

function parsePrice(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function run() {
  const args = parseArgs(process.argv);
  const input = args.input ? resolve(args.input) : DEFAULT_INPUT;
  const outDir = join(projectRoot, "public", "data");
  const outFile = join(outDir, "menu.json");

  if (!existsSync(input)) {
    throw new Error(`Excel file not found: ${input}`);
  }

  const workbook = XLSX.readFile(input);
  const sheet = workbook.Sheets.Items;
  if (!sheet) {
    throw new Error('Worksheet "Items" not found in Excel file.');
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const items = rows
    .filter((row) => String(row["status *"] || "active").toLowerCase() === "active")
    .map((row) => {
      const name = String(row["name *"] || "").trim();
      const categoryName = String(row.category_name || "Uncategorized").trim();
      const description = String(row.description || "").trim();

      return {
        id: slugify(name) || String(row.sku || Math.random()),
        name,
        description,
        price: parsePrice(row["selling_price *"]),
        category: categoryName,
        categorySlug: slugify(categoryName),
        featured: isFeatured(name),
      };
    })
    .filter((item) => item.name && item.price >= 0);

  // Group by category, sort items alphabetically within each category.
  const categoryMap = new Map();
  for (const item of items) {
    if (!categoryMap.has(item.category)) {
      categoryMap.set(item.category, []);
    }
    categoryMap.get(item.category).push(item);
  }

  const categories = [...categoryMap.entries()]
    .sort(([a], [b]) =>
      displayCategoryName(a).localeCompare(displayCategoryName(b))
    )
    .map(([rawName, categoryItems]) => {
      categoryItems.sort((a, b) => a.name.localeCompare(b.name));
      return {
        id: slugify(rawName),
        name: displayCategoryName(rawName),
        rawName,
        itemCount: categoryItems.length,
        items: categoryItems,
      };
    });

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: input.split(/[\\/]/).pop(),
    totalItems: items.length,
    categories,
  };

  mkdirSync(outDir, { recursive: true });
  writeFileSync(outFile, JSON.stringify(manifest, null, 2));

  console.log(`Parsed ${items.length} items across ${categories.length} categories.`);
  console.log("Output:", outFile);
}

try {
  run();
} catch (err) {
  console.error("[parse-menu]", err.message);
  process.exit(1);
}
