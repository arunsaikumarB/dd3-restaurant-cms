/**
 * Update local /public image references from jpg/png to webp.
 * Run after convert-public-images-to-webp.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");

const TARGET_DIRS = ["src", "scripts", "supabase/migrations"];
const EXTRA_FILES = ["index.html"];

/** Intentional jpg/png references to preserve after bulk update. */
const PRESERVE = [
  { file: "src/constants/site.ts", pattern: /ogImage:\s*"\/showcase\/biryani\.webp"/, replace: 'ogImage: "/showcase/biryani.webp"' },
];

const LOCAL_PREFIXES = [
  "/showcase/",
  "/frames/",
  "/catering-frames/",
  "/hero/",
  "/reservation/",
  "/logo/",
  "/Bold-01",
  "/DD%20logo",
];

function shouldUpdatePath(pathStr) {
  if (pathStr.startsWith("http://") || pathStr.startsWith("https://")) return false;
  return LOCAL_PREFIXES.some((p) => pathStr.includes(p));
}

function updateContent(text) {
  // frame pattern
  let out = text.replace(/frame_%04d\.jpg/g, "frame_%04d.webp");

  // Quoted local paths ending in jpg/jpeg/png
  out = out.replace(
    /(["'`])(\/[^"'`]+?)\.(jpe?g|png)(\?[^"'`]*)?\1/gi,
    (match, quote, path, _ext, query = "") => {
      if (!shouldUpdatePath(path)) return match;
      const newPath = `${path}.webp${query || ""}`;
      return `${quote}${newPath}${quote}`;
    },
  );

  return out;
}

function walkFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      walkFiles(full, acc);
    } else if (/\.(ts|tsx|js|mjs|sql|html|json|css)$/.test(name)) {
      acc.push(full);
    }
  }
  return acc;
}

let updated = 0;
for (const dir of TARGET_DIRS) {
  const fullDir = join(ROOT, dir);
  for (const file of walkFiles(fullDir)) {
    const rel = file.slice(ROOT.length + 1).replace(/\\/g, "/");
    const original = readFileSync(file, "utf8");
    let next = updateContent(original);
    for (const rule of PRESERVE) {
      if (rel === rule.file) {
        next = next.replace(rule.pattern, rule.replace);
      }
    }
    if (next !== original) {
      writeFileSync(file, next);
      console.log("updated:", rel);
      updated++;
    }
  }
}

for (const rel of EXTRA_FILES) {
  const file = join(ROOT, rel);
  const original = readFileSync(file, "utf8");
  let next = updateContent(original);
  // favicon stays png in index.html
  next = next.replace(/href="\/dd-logo\.webp/g, 'href="/dd-logo.png');
  next = next.replace(/type="image\/webp" href="\/dd-logo\.png/g, 'type="image/png" href="/dd-logo.png');
  if (next !== original) {
    writeFileSync(file, next);
    console.log("updated:", rel);
    updated++;
  }
}

console.log(`\nDone. ${updated} files updated.`);
