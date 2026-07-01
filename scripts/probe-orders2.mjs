import { readFileSync } from "node:fs";

const js = readFileSync(".cache/chefgaa-orders.js", "utf8");
for (const term of [
  "StoreSlug",
  "outletId",
  "localStorage.setItem",
  "desi-dhamaka",
  "getPartner",
  "partner/slug",
  "/store/",
  "menu-item",
]) {
  let idx = 0;
  let c = 0;
  while ((idx = js.indexOf(term, idx + 1)) !== -1 && c < 3) {
    console.log(`\n=== ${term} ===`);
    console.log(js.slice(Math.max(0, idx - 100), idx + 200).replace(/\n/g, " "));
    c++;
  }
}
