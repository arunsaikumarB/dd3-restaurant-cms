import { readFileSync } from "node:fs";

const s = readFileSync(".cache/chefgaa-order.js", "utf8");
for (const p of [
  "baseURL:bp",
  'bp="',
  "ir=Xt.create",
  "jW=Xt.create",
  "filterString",
  "getMenuData",
  "/menu-item",
]) {
  let i = s.indexOf(p);
  let c = 0;
  while (i >= 0 && c < 2) {
    console.log(`\n=== ${p} #${c + 1} ===`);
    console.log(s.slice(i, i + 400));
    i = s.indexOf(p, i + 1);
    c++;
  }
}
