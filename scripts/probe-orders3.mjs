import { readFileSync } from "node:fs";

const js = readFileSync(".cache/chefgaa-orders.js", "utf8");
for (const term of ["menu-item", "MenuData", "menuData", "fetchMenu", "getMenu"]) {
  const idx = js.indexOf(term);
  console.log(term, idx >= 0 ? js.slice(idx, idx + 300) : "NOT FOUND");
}
