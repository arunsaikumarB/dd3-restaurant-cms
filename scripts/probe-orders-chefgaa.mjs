import { writeFileSync } from "node:fs";

const js = await fetch("https://orders.chefgaa.com/assets/index-DEyTq6zE.js").then((r) =>
  r.text(),
);
writeFileSync(".cache/chefgaa-orders.js", js, "utf8");

const apis = [...js.matchAll(/https:\/\/api[^"'`]+/g)].map((m) => m[0]);
console.log("API urls:", [...new Set(apis)]);

const bp = js.match(/bp="([^"]+)"/)?.[1] ?? js.match(/baseURL:"([^"]+)"/)?.[1];
console.log("bp:", bp);

for (const term of ["getMenuData", "menu-item", "outlet/partner", "api.chefgaa"]) {
  const i = js.indexOf(term);
  if (i >= 0) console.log(term, ":", js.slice(i, i + 200));
}
