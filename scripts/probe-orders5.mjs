import { readFileSync } from "node:fs";

const js = readFileSync(".cache/chefgaa-orders.js", "utf8");
const patterns = ["an=qt.create", "an=Xt.create", ",an=", "customerBffUrl", "Gx=", "baseURL"];
for (const p of patterns) {
  const i = js.indexOf(p);
  if (i >= 0) console.log(p, ":", js.slice(i, i + 250));
}
