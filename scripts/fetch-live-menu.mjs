import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const urls = [
  ["https://desidhamakanj.net/lawrenceville/menu/", ".cache/lawrenceville-menu-live.html"],
];

for (const [url, out] of urls) {
  const html = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  }).then((r) => r.text());
  writeFileSync(resolve(ROOT, out), html, "utf8");
  const cats = [...html.matchAll(/<h2>([^<]+)<\/h2>/g)].map((m) => m[1]);
  console.log(url, "len", html.length, "h2 count", cats.length);
  console.log(cats.filter((c) => !/legal|hours/i.test(c)).join(" | "));
}
