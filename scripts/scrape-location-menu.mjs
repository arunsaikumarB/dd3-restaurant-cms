/**
 * Import location menu from desidhamakanj.net HTML export.
 *
 * Usage:
 *   node scripts/scrape-location-menu.mjs <input.html> <output.ts> <sourceUrl> <exportName> <locationLabel>
 *
 * Example:
 *   node scripts/scrape-location-menu.mjs .cache/oak-tree-menu.html src/data/menu/oakTree.ts \
 *     https://desidhamakanj.net/oak-tree/menu/ oakTreeMenu "Oak Tree"
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
  const text = `${name} ${description}`.toLowerCase();
  return /\b(spicy|chilli|chili|hot & sour|hot and sour|pepper fry|65|guntur|mirchi|karam|fiery|hell of)\b/i.test(
    text,
  );
}

function inferChefSpecial(name) {
  return /\b(dd spl|dd special|chef|majestic|555|special)\b/i.test(name.toLowerCase());
}

function inferPopular(name) {
  return /\b(classic|favorite|favourite|crowd|signature|iconic|must-try)\b/i.test(
    name.toLowerCase(),
  );
}

function buildItem(categoryName, name, price, description) {
  const categorySlug = slugify(categoryName);
  const id = `${categorySlug}-${slugify(name)}`;

  return {
    id,
    name,
    category: categoryName,
    description: description ?? "",
    price,
    image: null,
    isPopular: inferPopular(name),
    isChefSpecial: inferChefSpecial(name),
    isSpicy: inferSpicy(name, description ?? ""),
    isVeg: inferVeg(categoryName, name),
  };
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
    items.push(buildItem(categoryName, name, price, description));
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
      items.push(buildItem(categoryName, `${baseName} (${size})`, price, ""));
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
    const items = [];

    parseMandiGroups(panelHtml, categoryName, items);
    parseMenuCards(panelHtml, categoryName, items);

    if (items.length > 0) {
      categories.push({ name: categoryName, items });
    }
  }

  return categories;
}

function toMenuData(categories, sourceUrl) {
  const mappedCategories = categories.map((category) => {
    const categorySlug = slugify(category.name);
    const items = category.items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      categorySlug,
      featured: item.isChefSpecial,
      image: item.image,
      veg: item.isVeg,
      popular: item.isPopular,
      chefSpecial: item.isChefSpecial,
      spiceLevel: item.isSpicy ? 2 : null,
      available: true,
    }));

    return {
      id: categorySlug,
      name: category.name,
      rawName: category.name,
      itemCount: items.length,
      image: null,
      items,
    };
  });

  const totalItems = mappedCategories.reduce((sum, cat) => sum + cat.itemCount, 0);

  return {
    generatedAt: new Date().toISOString(),
    source: sourceUrl,
    totalItems,
    categories: mappedCategories,
  };
}

function emitTypeScript(menuData, sourceUrl, exportName, locationLabel) {
  const json = JSON.stringify(menuData, null, 2);
  return `import type { MenuData } from "../../types/menu";

/** ${locationLabel} menu — imported from ${sourceUrl} */
const ${exportName} = ${json} as const satisfies MenuData;

export default ${exportName};
`;
}

function validateMenu(menuData) {
  const ids = new Set();
  const duplicates = [];

  for (const category of menuData.categories) {
    for (const item of category.items) {
      if (ids.has(item.id)) duplicates.push(item.id);
      ids.add(item.id);
    }
  }

  return { duplicates };
}

function main() {
  const inputPath = resolve(process.argv[2] ?? "");
  const outputPath = resolve(process.argv[3] ?? "");
  const sourceUrl = process.argv[4] ?? "";
  const exportName = process.argv[5] ?? "locationMenu";
  const locationLabel = process.argv[6] ?? "Location";

  if (!inputPath || !outputPath || !sourceUrl) {
    throw new Error(
      "Usage: node scripts/scrape-location-menu.mjs <input.html> <output.ts> <sourceUrl> <exportName> <locationLabel>",
    );
  }

  if (!existsSync(inputPath)) {
    throw new Error(`Input not found: ${inputPath}`);
  }

  const html = readFileSync(inputPath, "utf8");
  const categories = parseMenuHtml(html);
  const menuData = toMenuData(categories, sourceUrl);
  const validation = validateMenu(menuData);

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(
    outputPath,
    emitTypeScript(menuData, sourceUrl, exportName, locationLabel),
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        location: locationLabel,
        source: sourceUrl,
        categories: menuData.categories.length,
        items: menuData.totalItems,
        categoryNames: menuData.categories.map((c) => `${c.name} (${c.itemCount})`),
        duplicates: validation.duplicates,
        missingItems: [],
        couldNotImport: [],
      },
      null,
      2,
    ),
  );
}

main();
