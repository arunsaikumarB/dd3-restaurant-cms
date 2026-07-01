/**
 * Validates website seed prices against the authoritative price list.
 * Usage: node scripts/validate-website-menu-prices.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const EXPECTED = {
  "south-plainfield": {
    "Veg Sweet Corn Soup": 8.31,
    "Garlic Naan": 4.15,
    "Butter Chicken": 16.63,
    "Chicken Dum Biryani": 16.63,
    "Chicken Mandi (Single)": 27.03,
    "Mutton Cooker Pulav": 99.99,
    "DD Spl Cilantro Fish": 17.67,
  },
  "oak-tree": {
    "Veg Sweet Corn Soup": 7.99,
    "Garlic Naan": 3.99,
    "Butter Chicken": 15.99,
    "Chicken Dum Biryani": 15.99,
    "Veg Thali": 18.99,
  },
  lawrenceville: {
    "Garlic Naan": 5.15,
    "Butter Chicken": 17.99,
    "Chicken Dum Biryani": 17.99,
    "Mutton Cooker Pulav": 100.99,
    "Chicken Cooker Pulav": 90.99,
    "DD SPL Cilantro Fish": 18.67,
  },
};

function loadMenu(srcFile, marker) {
  const raw = readFileSync(srcFile, "utf8");
  const start = raw.indexOf("{", raw.indexOf(marker));
  const end = raw.lastIndexOf("} as const");
  return JSON.parse(raw.slice(start, end + 1));
}

const files = {
  "south-plainfield": ["src/data/menu/southPlainfield.ts", "southPlainfieldMenu ="],
  "oak-tree": ["src/data/menu/oakTree.ts", "oakTreeMenu ="],
  lawrenceville: ["src/data/menu/lawrenceville.ts", "lawrencevilleMenu ="],
};

let failures = 0;
for (const [loc, [file, marker]] of Object.entries(files)) {
  const menu = loadMenu(resolve(ROOT, file), marker);
  const expected = EXPECTED[loc];
  for (const [name, price] of Object.entries(expected)) {
    let found = null;
    for (const cat of menu.categories) {
      const item = cat.items.find((i) => i.name === name);
      if (item) {
        found = item.price;
        break;
      }
    }
    if (found === null) {
      console.log(`MISSING ${loc}: ${name}`);
      failures += 1;
    } else if (Math.abs(found - price) > 0.001) {
      console.log(`MISMATCH ${loc}: ${name} got ${found} expected ${price}`);
      failures += 1;
    }
  }
}
console.log(failures === 0 ? "All spot checks passed." : `${failures} issue(s).`);
process.exit(failures > 0 ? 1 : 0);
