/**
 * One-off: convert static JPG/PNG under public/ to WebP (quality 80, max 1920px).
 * Run: node scripts/convert-public-images-to-webp.mjs
 */
import { readdirSync, readFileSync, writeFileSync, unlinkSync, statSync, existsSync } from "node:fs";
import { join, relative, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC = join(ROOT, "public");

const QUALITY = 80;
const MAX_WIDTH = 1920;

/** Keep original file on disk (OG / social share). */
const KEEP_ORIGINALS = new Set(["showcase/biryani.jpg"]);

/** Do not convert — favicon / touch-icon assets. */
function shouldSkipConversion(relPath) {
  const lower = relPath.toLowerCase().replace(/\\/g, "/");
  if (lower.includes("favicon")) return true;
  if (basename(lower).startsWith("dd-logo")) return true;
  if (lower.endsWith(".ico")) return true;
  return false;
}

function walkImages(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkImages(full, acc);
      continue;
    }
    if (!/\.(jpe?g|png)$/i.test(entry.name)) continue;
    const rel = relative(PUBLIC, full).replace(/\\/g, "/");
    if (shouldSkipConversion(rel)) continue;
    acc.push({ full, rel });
  }
  return acc;
}

function formatMb(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function convertOne({ full, rel }) {
  const outFull = full.replace(/\.(jpe?g|png)$/i, ".webp");
  const outRel = rel.replace(/\.(jpe?g|png)$/i, ".webp");
  const before = statSync(full).size;

  let pipeline = sharp(full);
  const meta = await pipeline.metadata();
  if (meta.width && meta.width > MAX_WIDTH) {
    pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
  }
  await pipeline.webp({ quality: QUALITY }).toFile(outFull);

  const after = statSync(outFull).size;
  return { rel, outRel, before, after, outFull };
}

function updateManifest(manifestPath) {
  if (!existsSync(manifestPath)) return;
  const raw = readFileSync(manifestPath, "utf8");
  const updated = raw
    .replace(/\.jpg/g, ".webp")
    .replace(/\.jpeg/g, ".webp")
    .replace(/\.png/g, ".webp");
  writeFileSync(manifestPath, updated);
}

async function main() {
  const files = walkImages(PUBLIC);
  const inventory = files.map(({ rel, full }) => ({
    path: `public/${rel}`,
    sizeKB: Math.round(statSync(full).size / 1024),
  }));

  console.log("=== INVENTORY (before conversion) ===");
  console.log(`Total files: ${inventory.length}`);
  const totalBefore = files.reduce((sum, { full }) => sum + statSync(full).size, 0);
  console.log(`Total size: ${formatMb(totalBefore)}`);
  console.log("");

  const results = [];
  for (const file of files) {
    results.push(await convertOne(file));
  }

  const totalAfter = results.reduce((sum, r) => sum + r.after, 0);
  const saved = totalBefore - totalAfter;
  const pct = ((saved / totalBefore) * 100).toFixed(1);

  console.log("=== CONVERSION COMPLETE ===");
  console.log(`Converted: ${results.length} files`);
  console.log(`Before: ${formatMb(totalBefore)}`);
  console.log(`After (webp only): ${formatMb(totalAfter)}`);
  console.log(`Saved: ${formatMb(saved)} (${pct}%)`);
  console.log("");

  let deleted = 0;
  for (const { rel, full } of files) {
    if (KEEP_ORIGINALS.has(rel)) {
      console.log(`Kept original (OG): public/${rel}`);
      continue;
    }
    unlinkSync(full);
    deleted++;
  }
  console.log(`Deleted originals: ${deleted}`);

  updateManifest(join(PUBLIC, "frames", "manifest.json"));
  updateManifest(join(PUBLIC, "catering-frames", "manifest.json"));
  console.log("Updated frame manifests.");

  const report = {
    inventory,
    totalBefore,
    totalAfter,
    saved,
    keptOriginals: [...KEEP_ORIGINALS],
    converted: results.length,
    deleted,
  };
  writeFileSync(
    join(ROOT, "scripts", "webp-conversion-report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log("Report: scripts/webp-conversion-report.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
