/**
 * Static verification for location-scoped CRUD patterns.
 * Run: node scripts/verify-location-isolation.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const servicesDir = join(root, "src", "services");
const adminPagesDir = join(root, "src", "admin", "pages");

const locationAwareServices = [
  "menuCategories.ts",
  "menuItems.ts",
  "offers.ts",
  "restaurantSettings.ts",
  "reservations.ts",
];

const checks = [];

function read(path) {
  return readFileSync(path, "utf8");
}

for (const file of locationAwareServices) {
  const content = read(join(servicesDir, file));
  checks.push({
    name: `${file} filters GET by location_id`,
    pass: content.includes('.eq("location_id", locationId)') || content.includes(".eq(\"location_id\", locationId)"),
  });
  checks.push({
    name: `${file} scopes UPDATE/DELETE by location_id`,
    pass:
      content.includes('.eq("location_id", locationId)') &&
      (content.includes("update") || content.includes("delete")),
  });
}

const settingsContent = read(join(servicesDir, "restaurantSettings.ts"));
checks.push({
  name: "restaurant_settings UPDATE uses location_id not id",
  pass:
    settingsContent.includes("updateRestaurantSettings(\n  locationId: LocationId") &&
    settingsContent.includes('.eq("location_id", locationId)'),
});

const migration = read(join(root, "supabase", "migrations", "010_location_isolation_hardening.sql"));
checks.push({
  name: "migration 010 seeds per-location restaurant_settings",
  pass: migration.includes("restaurant_settings_location_id_key"),
});
checks.push({
  name: "migration 010 clones menu per empty location",
  pass: migration.includes("clone_menu_location"),
});

const adminPages = readdirSync(adminPagesDir).filter((f) => f.endsWith(".tsx"));
for (const page of ["MenuPage.tsx", "CategoriesPage.tsx", "OffersPage.tsx", "SettingsPage.tsx", "ReservationsPage.tsx"]) {
  const content = read(join(adminPagesDir, page));
  checks.push({
    name: `${page} blocks or scopes mutations with location`,
    pass: content.includes("isAllLocations") && content.includes("locationId"),
  });
}

let failed = 0;
for (const check of checks) {
  const status = check.pass ? "PASS" : "FAIL";
  if (!check.pass) failed += 1;
  console.log(`${status}  ${check.name}`);
}

if (failed > 0) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} location isolation checks passed.`);
