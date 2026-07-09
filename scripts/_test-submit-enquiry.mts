import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

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
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnvFile(".env.local");
loadEnvFile(".env");

async function main() {
  const handlerModule = await import("../netlify/functions/submit-enquiry.mts");
  const handler = handlerModule.default;

  console.log("=== Test 1: Contact form (south-plainfield) ===");
  const contactResult = await handler({
    httpMethod: "POST",
    body: JSON.stringify({
      source: "contact",
      location_id: "south-plainfield",
      name: "Test Contact User",
      email: "testcontact@example.com",
      phone: "555-0100",
      message: "This is a local end-to-end test of the contact form.",
    }),
  });
  console.log(contactResult);

  console.log("\n=== Test 2: Catering quote (oak-tree) ===");
  const cateringResult = await handler({
    httpMethod: "POST",
    body: JSON.stringify({
      source: "catering",
      location_id: "oak-tree",
      name: "Test Catering User",
      email: "testcatering@example.com",
      phone: "555-0200",
      message: "This is a local end-to-end test of the catering quote form.",
      event_type: "Birthday Party",
      event_date: "2026-08-15",
      guest_count: 40,
    }),
  });
  console.log(cateringResult);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
