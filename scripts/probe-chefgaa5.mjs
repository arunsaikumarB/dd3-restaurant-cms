import { readFileSync } from "node:fs";

const s = readFileSync(".cache/chefgaa-order.js", "utf8");
const idx = s.indexOf("getMenuData(");
let count = 0;
let pos = idx;
while (pos !== -1 && count < 15) {
  console.log(s.slice(Math.max(0, pos - 150), pos + 250).replace(/\n/g, " "));
  console.log("---");
  pos = s.indexOf("getMenuData(", pos + 1);
  count++;
}
