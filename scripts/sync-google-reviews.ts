/**
 * CLI entry point for Google Reviews (Serper) -> Supabase synchronization.
 *
 * Usage:
 *   npx tsx scripts/sync-google-reviews.ts
 *
 * Requires:
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SERPER_API_KEY
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { runGoogleReviewsSync } from "../src/integrations/googleReviews/sync";

function loadEnvFile(filename: string): void {
  const path = resolve(process.cwd(), filename);
  if (!existsSync(path)) return;

  const content = readFileSync(path, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
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

loadEnvFile(".env.local");
loadEnvFile(".env");

async function main(): Promise<void> {
  const results = await runGoogleReviewsSync();
  console.log(JSON.stringify(results, null, 2));

  const hasError = Object.values(results).some((r) => r.error);
  process.exit(hasError ? 1 : 0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
