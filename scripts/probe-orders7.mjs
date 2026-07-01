import { readFileSync } from "node:fs";

const js = readFileSync(".cache/chefgaa-orders.js", "utf8");
for (const term of [
  "tenantId",
  "selectedStoreId",
  "getPlatformBySlug",
  "platforms/slug",
  "StoreSlugMenuRoute",
  "lawrence",
]) {
  let idx = 0;
  let c = 0;
  while ((idx = js.indexOf(term, idx + 1)) !== -1 && c < 2) {
    console.log(`\n=== ${term} ===`);
    console.log(js.slice(Math.max(0, idx - 120), idx + 280).replace(/\n/g, " "));
    c++;
  }
}
