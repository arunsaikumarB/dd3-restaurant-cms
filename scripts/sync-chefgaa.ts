/**
 * CLI entry point for ChefGaa → Supabase menu synchronization.
 *
 * Usage:
 *   npx tsx scripts/sync-chefgaa.ts
 *   npx tsx scripts/sync-chefgaa.ts south-plainfield
 *   npx tsx scripts/sync-chefgaa.ts --all
 *
 * Requires:
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { LOCATION_IDS } from "../src/config/locations";
import { runOrchestratedSync } from "../src/integrations/chefgaa/automation/orchestrator";

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
  const args = process.argv.slice(2);

  if (args.includes("--all") || args.length === 0) {
    const result = await runOrchestratedSync({
      trigger: "manual",
      requestedBy: "cli",
      skipIfLocked: false,
      queueIfBusy: false,
    });
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.status === "completed" && result.summary?.success !== false ? 0 : 1);
    return;
  }

  const locationId = args[0];
  if (!LOCATION_IDS.includes(locationId as (typeof LOCATION_IDS)[number])) {
    console.error(`Unknown location "${locationId}". Expected one of: ${LOCATION_IDS.join(", ")}`);
    process.exit(1);
  }

  const result = await runOrchestratedSync({
    trigger: "manual",
    locationId: locationId as (typeof LOCATION_IDS)[number],
    requestedBy: "cli",
    skipIfLocked: false,
    queueIfBusy: false,
  });
  console.log(JSON.stringify(result, null, 2));
  const summary = result.summary;
  const success =
    result.status === "completed" &&
    summary &&
    ("success" in summary ? summary.success : (summary as { success?: boolean }).success);
  process.exit(success ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
