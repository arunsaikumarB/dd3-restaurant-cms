/**
 * Local 15-minute ChefGaa scheduler for non-Netlify environments.
 * Netlify production uses netlify/functions/chefgaa-sync-scheduled.mts.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { SCHEDULED_SYNC_INTERVAL_MS } from "../src/integrations/chefgaa/constants";
import { handleChefGaaScheduledSync } from "../src/integrations/chefgaa/automation/handler";

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

async function tick(): Promise<void> {
  const result = await handleChefGaaScheduledSync();
  console.log(`[chefgaa-scheduler] ${new Date().toISOString()}`, JSON.stringify(result));
}

console.log(
  `[chefgaa-scheduler] Starting — interval ${SCHEDULED_SYNC_INTERVAL_MS / 60_000} minutes`,
);
void tick();
setInterval(() => {
  void tick();
}, SCHEDULED_SYNC_INTERVAL_MS);
