import { readFileSync } from "node:fs";

const js = readFileSync(".cache/chefgaa-orders.js", "utf8");
const matches = [...js.matchAll(/\/api\/v1\/[^"'`]+/g)].map((m) => m[0]);
const unique = [...new Set(matches)].filter((p) => /menu|store|platform|item/i.test(p));
console.log(unique.sort().join("\n"));
