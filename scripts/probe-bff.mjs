import { readFileSync } from "node:fs";

const js = readFileSync(".cache/chefgaa-orders.js", "utf8");
const matches = [...js.matchAll(/customerBffUrl:"([^"]+)"/g)].map((m) => m[1]);
console.log("customerBffUrls:", [...new Set(matches)]);

const di = js.match(/di=\{[^}]{0,500}\}/g);
console.log("di configs:", di?.slice(0, 5));

// Find production config - often last occurrence or https
const prod = matches.find((u) => u.startsWith("https"));
console.log("prod bff:", prod);

// Try orders.chefgaa.com relative paths
const urls = [
  "https://orders.chefgaa.com/customer-bff/api/v1/public/menu/platforms/slug/desi-dhamaka",
  "https://orders.chefgaa.com/api/v1/public/menu/platforms/slug/desi-dhamaka",
  "https://api.chefgaa.com/customer-bff/api/v1/public/menu/platforms/slug/desi-dhamaka",
];

for (const url of urls) {
  const r = await fetch(url, {
    headers: { Accept: "application/json", "x-platform": "web" },
  });
  const text = await r.text();
  console.log("\n", url, r.status, text.slice(0, 400));
}
