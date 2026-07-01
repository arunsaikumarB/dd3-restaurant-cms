import { readFileSync } from "node:fs";

const js = readFileSync(".cache/chefgaa-orders.js", "utf8");
for (const p of ["IG=", "jG=", "Cu.apiUrl", "apiUrl:"]) {
  let idx = 0;
  let c = 0;
  while ((idx = js.indexOf(p, idx + 1)) !== -1 && c < 3) {
    console.log(p, js.slice(idx, idx + 200));
    c++;
  }
}
