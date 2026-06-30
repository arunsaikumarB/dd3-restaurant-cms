/**
 * Validate location offer datasets.
 * Usage: node scripts/validate-south-plainfield-offers.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const datasets = [
  {
    label: "South Plainfield",
    listing: ".cache/south-plainfield-offers.html",
    file: "src/data/offers/southPlainfield.ts",
  },
  {
    label: "Oak Tree",
    listing: ".cache/oak-tree-offers.html",
    file: "src/data/offers/oakTree.ts",
  },
  {
    label: "Lawrenceville",
    listing: ".cache/lawrenceville-offers-v2.html",
    file: "src/data/offers/lawrenceville.ts",
  },
];

function parseListing(html) {
  const offers = [];
  const cardRegex =
    /<div class="offer-card"[^>]*>[\s\S]*?<h3 class="offer-card-name">([^<]+)<\/h3>[\s\S]*?<p class="offer-card-desc">([^<]+)<\/p>/g;
  let match;
  while ((match = cardRegex.exec(html)) !== null) {
    offers.push({ title: match[1].trim(), description: match[2].trim() });
  }
  return offers;
}

function parseDataset(source) {
  const titles = [...source.matchAll(/title:\s*"([^"]+)"/g)].map((m) => m[1]);
  const slugs = [...source.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]);
  const images = [...source.matchAll(/image:\s*"([^"]+)"/g)].map((m) => m[1]);
  const externalLinks = [...source.matchAll(/https:\/\/desidhamakanj\.net[^"]+/g)].filter(
    (m) => !m[0].includes("/wp-content/uploads/"),
  );
  return { titles, slugs, images, externalLinks };
}

async function checkImage(url) {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (!res.ok) return `HTTP ${res.status}`;
    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) return `unexpected type: ${type}`;
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "request failed";
  }
}

let failed = false;

for (const { label, listing, file } of datasets) {
  console.log(`\n=== ${label} Offers ===`);
  const html = readFileSync(join(root, listing), "utf8");
  const datasetSource = readFileSync(join(root, file), "utf8");
  const sourceOffers = parseListing(html);
  let dataset = parseDataset(datasetSource);

  if (dataset.titles.length === 0 && datasetSource.includes("southPlainfieldOffers.map")) {
    const spSource = readFileSync(join(root, "src/data/offers/southPlainfield.ts"), "utf8");
    dataset = parseDataset(spSource);
  }

  const missing = sourceOffers
    .filter((s) => !dataset.titles.includes(s.title))
    .map((s) => s.title);
  const duplicateSlugs = dataset.slugs.filter(
    (slug, i) => dataset.slugs.indexOf(slug) !== i,
  );

  console.log(`Source offers: ${sourceOffers.length}`);
  console.log(`Dataset offers: ${dataset.titles.length}`);
  console.log(`Missing: ${missing.length ? missing.join(", ") : "none"}`);
  console.log(`Duplicate slugs: ${duplicateSlugs.length ? duplicateSlugs.join(", ") : "none"}`);
  console.log(
    `External page links in dataset: ${dataset.externalLinks.length} (should be 0)`,
  );

  const brokenImages = [];
  for (const image of dataset.images) {
    const err = await checkImage(image);
    if (err) brokenImages.push({ image, err });
  }
  console.log(`Broken images: ${brokenImages.length}`);
  brokenImages.forEach(({ image, err }) => console.log(`  - ${image}: ${err}`));

  if (
    missing.length ||
    duplicateSlugs.length ||
    dataset.externalLinks.length ||
    brokenImages.length
  ) {
    failed = true;
  }
}

if (failed) process.exitCode = 1;
