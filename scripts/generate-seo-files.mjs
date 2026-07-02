/**
 * Writes robots.txt and sitemap.xml into dist/ using VITE_SITE_URL.
 * Run after `vite build` (see package.json).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const distDir = join(root, "dist");

const LOCATION_IDS = ["south-plainfield", "oak-tree", "lawrenceville"];

const LOCATION_PAGE_SEGMENTS = [
  "", // location home, e.g. /south-plainfield/
  "about",
  "menu",
  "special-offers",
  "online-ordering",
  "catering",
  "parties",
  "testimonials",
  "contact",
  "reservation",
  "privacy-policy",
  "terms-conditions",
];

const PUBLIC_ROUTES = [
  "/",
  ...LOCATION_IDS.flatMap((loc) =>
    LOCATION_PAGE_SEGMENTS.map((seg) => (seg ? `/${loc}/${seg}/` : `/${loc}/`)),
  ),
];

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function resolveSiteUrl() {
  loadEnvFile(join(root, ".env"));
  loadEnvFile(join(root, ".env.local"));

  const explicit = process.env.VITE_SITE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const netlifyUrl =
    process.env.DEPLOY_PRIME_URL?.trim() || process.env.URL?.trim();
  if (netlifyUrl) {
    return netlifyUrl.replace(/\/$/, "");
  }

  return "http://localhost:5173";
}

function routeToLoc(siteUrl, route) {
  if (route === "/") {
    return `${siteUrl}/`;
  }
  return `${siteUrl}${route}`;
}

function generateRobotsTxt(siteUrl) {
  return `User-agent: *
Allow: /
Disallow: /admin

Sitemap: ${siteUrl}/sitemap.xml
`;
}

function generateSitemapXml(siteUrl) {
  const urls = PUBLIC_ROUTES.map(
    (route) => `  <url><loc>${routeToLoc(siteUrl, route)}</loc></url>`,
  ).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

if (!existsSync(distDir)) {
  console.error("[generate-seo-files] dist/ not found. Run vite build first.");
  process.exit(1);
}

const siteUrl = resolveSiteUrl();
writeFileSync(join(distDir, "robots.txt"), generateRobotsTxt(siteUrl), "utf8");
writeFileSync(join(distDir, "sitemap.xml"), generateSitemapXml(siteUrl), "utf8");

console.log(`[generate-seo-files] site URL: ${siteUrl}`);
console.log("[generate-seo-files] wrote dist/robots.txt and dist/sitemap.xml");
