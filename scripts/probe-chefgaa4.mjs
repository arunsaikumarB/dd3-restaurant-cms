import { readFileSync } from "node:fs";

const s = readFileSync(".cache/chefgaa-order.js", "utf8");
const patterns = [
  "order_type",
  "filterString",
  "outlet/partner",
  "getPartnerOutlet",
  "OutletOrderTypes",
  "orderType",
  "desi-dhamaka",
  "Slug",
];
for (const p of patterns) {
  const re = new RegExp(`.{0,80}${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}.{0,120}`, "g");
  const matches = [...s.matchAll(re)].slice(0, 5);
  if (matches.length) {
    console.log(`\n### ${p} (${matches.length})`);
    matches.forEach((m) => console.log(m[0].replace(/\n/g, " ")));
  }
}
