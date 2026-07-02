/**
 * Applies migration 026 — point hero_video to Netlify static asset.
 * Run ONLY after /media/hero.mp4 is live on production.
 *
 * Usage: npx tsx scripts/run-migration-026.ts
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filename: string): void {
  const path = resolve(process.cwd(), filename);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep <= 0) continue;
    const key = trimmed.slice(0, sep).trim();
    let value = trimmed.slice(sep + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

async function main(): Promise<void> {
  const { data: before, error: fetchError } = await supabase
    .from("homepage_content")
    .select("location_id, hero_video, hero_image")
    .order("location_id");

  if (fetchError || !before) {
    throw new Error(fetchError?.message ?? "Failed to read homepage_content.");
  }

  console.log("Before:");
  console.log(JSON.stringify(before, null, 2));

  for (const row of before) {
    const heroImage = row.hero_image?.trim() ? row.hero_image : "/hero/hero-poster.webp";
    const { error } = await supabase
      .from("homepage_content")
      .update({
        hero_video: "/media/hero.mp4",
        hero_image: heroImage,
      })
      .eq("location_id", row.location_id);

    if (error) {
      throw new Error(`${row.location_id}: ${error.message}`);
    }
  }

  const { data: after, error: afterError } = await supabase
    .from("homepage_content")
    .select("location_id, hero_video, hero_image")
    .order("location_id");

  if (afterError || !after) {
    throw new Error(afterError?.message ?? "Failed to verify homepage_content.");
  }

  console.log("\nAfter:");
  console.log(JSON.stringify(after, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
