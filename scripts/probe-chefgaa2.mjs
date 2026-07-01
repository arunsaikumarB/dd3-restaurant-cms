import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

async function fetchText(url) {
  const r = await fetch(url);
  return r.text();
}

const html = await fetchText(
  "https://order.chefgaa.com/store/desi-dhamaka?order_type=106",
);
const m = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
if (!m) throw new Error("No JS bundle found");
const jsUrl = "https://order.chefgaa.com" + m[1];
console.log("Fetching", jsUrl);
const js = await fetchText(jsUrl);
writeFileSync(resolve(ROOT, ".cache/chefgaa-order.js"), js, "utf8");

const terms = [
  "outletMenu",
  "menuItems",
  "categories",
  "order_type",
  "getMenu",
  "fetchMenu",
  "/menu/",
  "platforms",
  "outlets",
  "orderType",
];
for (const term of terms) {
  let idx = 0;
  let c = 0;
  while ((idx = js.indexOf(term, idx + 1)) !== -1 && c < 3) {
    console.log(`\n=== ${term} ===`);
    console.log(js.slice(Math.max(0, idx - 120), idx + 200).replace(/\n/g, " "));
    c++;
  }
}
