import { readFileSync } from "node:fs";

const js = readFileSync(".cache/chefgaa-orders.js", "utf8");
const idx = js.indexOf("getMenu:async");
console.log(js.slice(idx, idx + 1500));

const idx2 = js.indexOf("platforms/");
let c = 0;
let pos = idx2;
while (pos !== -1 && c < 10) {
  console.log("\n--- platforms/ ---");
  console.log(js.slice(Math.max(0, pos - 80), pos + 200));
  pos = js.indexOf("platforms/", pos + 1);
  c++;
}
