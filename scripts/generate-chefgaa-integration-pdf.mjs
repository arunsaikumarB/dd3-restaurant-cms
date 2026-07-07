/**
 * Generates docs/ChefGaa-Integration-Guide.pdf
 * Run: node scripts/generate-chefgaa-integration-pdf.mjs
 */
import PDFDocument from "pdfkit";
import { createWriteStream } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pdfPath = join(__dirname, "..", "docs", "ChefGaa-Integration-Guide.pdf");

const MARGIN = 50;
const PAGE_WIDTH = 595.28;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function hr(doc) {
  const y = doc.y + 4;
  doc.moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).strokeColor("#e5e5e5").stroke();
  doc.moveDown(0.6);
}

function ensureSpace(doc, needed = 60) {
  if (doc.y + needed > 780) doc.addPage();
}

function heading(doc, text, size = 14) {
  ensureSpace(doc, 40);
  doc.moveDown(0.4);
  doc.font("Helvetica-Bold").fontSize(size).fillColor("#991b1b").text(text, MARGIN, doc.y, {
    width: CONTENT_WIDTH,
  });
  doc.fillColor("#1a1a1a");
  doc.moveDown(0.3);
}

function subheading(doc, text) {
  ensureSpace(doc, 30);
  doc.font("Helvetica-Bold").fontSize(11).text(text, MARGIN, doc.y, { width: CONTENT_WIDTH });
  doc.moveDown(0.2);
}

function body(doc, text) {
  ensureSpace(doc, 40);
  doc.font("Helvetica").fontSize(10).text(text, MARGIN, doc.y, {
    width: CONTENT_WIDTH,
    align: "justify",
    lineGap: 2,
  });
  doc.moveDown(0.2);
}

function bullet(doc, text) {
  ensureSpace(doc, 20);
  doc.font("Helvetica").fontSize(10).text(`•  ${text}`, MARGIN + 8, doc.y, {
    width: CONTENT_WIDTH - 8,
    lineGap: 2,
  });
}

function table(doc, headers, rows, colWidths) {
  const startX = MARGIN;
  let y = doc.y;
  const rowH = 18;
  const fontSize = 9;

  doc.font("Helvetica-Bold").fontSize(fontSize);
  let x = startX;
  headers.forEach((h, i) => {
    doc.rect(x, y, colWidths[i], rowH).fillAndStroke("#fef2f2", "#d4d4d4");
    doc.fillColor("#1a1a1a").text(h, x + 4, y + 5, { width: colWidths[i] - 8 });
    x += colWidths[i];
  });
  y += rowH;

  doc.font("Helvetica").fontSize(fontSize);
  rows.forEach((row, ri) => {
    if (y > 750) {
      doc.addPage();
      y = MARGIN;
    }
    x = startX;
    const fill = ri % 2 === 0 ? "#ffffff" : "#fafafa";
    row.forEach((cell, i) => {
      doc.rect(x, y, colWidths[i], rowH).fillAndStroke(fill, "#d4d4d4");
      doc.fillColor("#1a1a1a").text(String(cell), x + 4, y + 5, { width: colWidths[i] - 8 });
      x += colWidths[i];
    });
    y += rowH;
  });

  doc.x = MARGIN;
  doc.y = y + 8;
}

const doc = new PDFDocument({ margin: MARGIN, size: "A4" });
const stream = createWriteStream(pdfPath);
doc.pipe(stream);

const date = new Date().toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

doc.font("Helvetica-Bold").fontSize(22).fillColor("#b91c1c").text("ChefGaa Integration Guide", {
  width: CONTENT_WIDTH,
});
doc.moveDown(0.2);
doc.font("Helvetica").fontSize(11).fillColor("#555555").text(
  `Desi Dhamaka Website & Admin CMS — ${date}`,
);
doc.fillColor("#1a1a1a");
hr(doc);

heading(doc, "What it does (one sentence)", 13);
body(
  doc,
  "ChefGaa is the source of truth for menu data (categories, items, prices, availability, images). The CMS pulls that data on a schedule or on demand, stores it in Supabase, and the public website reads from Supabase — it never talks to ChefGaa directly.",
);

heading(doc, "Big picture");
body(
  doc,
  "ChefGaa POS (Legacy API for South Plainfield & Oak Tree, V2 API for Lawrenceville) → Netlify Functions (chefgaa-sync manual + chefgaa-sync-scheduled every 15 min) → Orchestrator (lock, queue, health checks) → Supabase (menu_categories, menu_items, audit tables) → Public website menu page. Customers order via deep links to ChefGaa ordering sites.",
);

heading(doc, "The three locations — two API types");
table(
  doc,
  ["Location", "API", "Identifier"],
  [
    ["South Plainfield", "Legacy", "Outlet 70, order type 106"],
    ["Oak Tree", "Legacy", "Outlet 71, order type 108"],
    ["Lawrenceville", "V2", "Tenant UUID + Store UUID + platform slug"],
  ],
  [120, 80, 295],
);
body(
  doc,
  "Legacy API: GET https://api.chefgaa.com/menu-item with outlet and partner headers — full menu in one call. V2 API: GET https://chf2-customer-api.chefgaa.com/ with tenant-id, store-id, and x-platform headers. South Plainfield and Oak Tree are production-ready on Legacy. Lawrenceville uses V2 — credentials must match what ChefGaa expects.",
);

heading(doc, "What gets synced");
bullet(doc, "Category name, slug, display order, active/inactive status");
bullet(doc, "Item name, description, price, image URL");
bullet(doc, "Availability (available / unavailable)");
bullet(doc, "Inferred fields: veg/non-veg, spice level, chef special, popular flag");
bullet(doc, "External IDs: chefgaa_category_id, chefgaa_outlet_item_id");
bullet(doc, "Content hash per row so unchanged items are skipped");
body(
  doc,
  "Not synced to the website: raw ChefGaa JSON, payment secrets, modifier groups (future work).",
);

heading(doc, "Step-by-step: what happens when sync runs");
bullet(doc, "1. Trigger — manual (admin button) or scheduled (every 15 minutes via Netlify cron).");
bullet(doc, "2. Auth (manual only) — admin must be logged in; Netlify function verifies Supabase JWT and admin/staff role.");
bullet(doc, "3. Lock — only one sync at a time (chefgaa_sync_lock). Manual sync queues if busy; scheduled sync skips.");
bullet(doc, "4. Health check — pings each location ChefGaa API before syncing.");
bullet(doc, "5. Download — fetches menu from Legacy or V2 client per location config.");
bullet(doc, "6. Normalize — maps ChefGaa format into standard internal catalog (mapper layer).");
bullet(doc, "7. First sync only — archives old CMS menu rows into menu_*_legacy_archive tables.");
bullet(doc, "8. Diff & upsert — creates new items, updates changed ones, deactivates removed items.");
bullet(doc, "9. Audit — writes to chefgaa_sync_runs and chefgaa_sync_run_events.");
bullet(doc, "10. Cache bust — bumps catalog_revision so public site picks up fresh data within ~60 seconds.");

doc.addPage();

heading(doc, "Admin UI");
body(doc, "Path: https://desi-dhamaka-admin.netlify.app/admin/integrations/chefgaa");
table(
  doc,
  ["Feature", "What it means"],
  [
    ["Location cards", "Per-store status: connected / failed / never synced"],
    ["Sync All", "Queues sync for all enabled locations"],
    ["Sync location", "Sync one store only"],
    ["Metrics", "Last sync time, duration, category/item counts"],
    ["Sync history", "Full audit log — filter by location or result"],
    ["Auto-refresh", "Dashboard polls every 60 seconds"],
  ],
  [120, 375],
);
body(
  doc,
  "The admin UI calls POST /.netlify/functions/chefgaa-sync with the admin auth token. Sync never runs in the browser.",
);

heading(doc, "How the public website uses it");
bullet(doc, "User visits /south-plainfield/menu.");
bullet(doc, "menuPublic.ts reads menu_categories + menu_items from Supabase (filtered by location_id).");
bullet(doc, "In-memory cache (~60s) checks catalog_revision — if sync bumped it, cache clears.");
bullet(doc, "If Supabase is empty, falls back to static seed data.");
bullet(doc, "Order Now links go to ChefGaa ordering site with deep-link params for category/item names.");
body(
  doc,
  "The website menu is display + discovery. Actual ordering/checkout happens on ChefGaa.",
);

heading(doc, "Database tables");
table(
  doc,
  ["Table", "Purpose"],
  [
    ["chefgaa_location_config", "Per-location API version, outlet/tenant IDs, sync settings"],
    ["chefgaa_sync_runs", "Each sync attempt — counts, duration, success/partial/failed"],
    ["chefgaa_sync_run_events", "Detailed log lines per run"],
    ["chefgaa_sync_lock", "Singleton lock — prevents overlapping syncs"],
    ["chefgaa_sync_queue", "Pending manual syncs when busy"],
    ["chefgaa_sync_notifications", "Events: price changes, new items, failures"],
    ["chefgaa_api_health_checks", "API reachability audit"],
    ["menu_categories / menu_items", "Normalized menu + ChefGaa external IDs"],
    ["menu_*_legacy_archive", "Backup of pre-ChefGaa CMS data"],
  ],
  [175, 320],
);

heading(doc, "Safety rules built in");
table(
  doc,
  ["Rule", "Why"],
  [
    ["Server-side only", "ChefGaa API calls use Netlify functions + service role key"],
    ["Admin auth required", "Manual sync needs logged-in admin/staff"],
    ["manual_override per item", "Sync won't overwrite that item's CMS edits"],
    ["Content hash diffing", "Unchanged items skip DB updates"],
    ["First-sync archive", "Old CMS menu isn't lost — moved to archive tables"],
    ["Location isolation", "All menu rows scoped by location_id"],
    ["Lock + queue", "No race conditions from double-clicks or cron overlap"],
  ],
  [150, 345],
);

doc.addPage();

heading(doc, "Scheduling & local commands");
bullet(doc, "Netlify scheduled function: chefgaa-sync-scheduled runs every 15 minutes (*/15 * * * *).");
bullet(doc, "Default sync_schedule in DB is 15m for all locations.");
bullet(doc, "Local: npm run sync:chefgaa or npm run sync:chefgaa:all");

heading(doc, "Environment variables (production)");
table(
  doc,
  ["Variable", "Used for"],
  [
    ["SUPABASE_SERVICE_ROLE_KEY", "Server-side sync writes (bypasses RLS)"],
    ["VITE_SUPABASE_URL / SUPABASE_URL", "Supabase connection"],
    ["Netlify deploy", "Functions must be deployed (not just static build)"],
  ],
  [200, 295],
);
body(
  doc,
  "No ChefGaa API key needed for public menu reads on Legacy — outlet headers are enough. V2 needs correct tenant/store/platform config from ChefGaa admin.",
);

heading(doc, "FAQ — likely dev team questions");

subheading(doc, "Is ChefGaa the CMS or is our CMS the CMS?");
body(
  doc,
  "ChefGaa owns menu/pricing. Our CMS is a sync dashboard + optional overrides. Marketing copy, homepage, SEO, gallery, etc. stay in our CMS.",
);

subheading(doc, "What if sync fails?");
body(
  doc,
  "Last good data stays in Supabase. Run is logged as failed or partial. Admin can retry manually. Scheduled job retries in 15 minutes.",
);

subheading(doc, "What if an admin edits a menu item in our CMS?");
body(
  doc,
  "Unless manual_override = true on that item, the next sync will overwrite it with ChefGaa data. ChefGaa is source of truth by design.",
);

subheading(doc, "What happens when ChefGaa removes an item?");
body(doc, "Item is deactivated (soft-delete via chefgaa_removed_at / status inactive), not hard-deleted.");

subheading(doc, "Why two API versions?");
body(
  doc,
  "Older NJ locations (SP, Oak Tree) use Legacy. Lawrenceville was onboarded on ChefGaa V2. The integration has an adapter per location — same normalized output regardless of API.",
);

subheading(doc, "Does the public site hit ChefGaa on every page load?");
body(doc, "No. It reads Supabase only. ChefGaa is hit only during sync (server-side).");

subheading(doc, "Can we sync one location without affecting others?");
body(doc, "Yes — use Sync location on that card. Each location syncs independently.");

subheading(doc, "What about orders / payments?");
body(
  doc,
  "Not integrated. We deep-link to ChefGaa ordering. No order webhooks or payment flow in this integration.",
);

subheading(doc, "Where is the code?");
body(
  doc,
  "Integration: src/integrations/chefgaa/. Admin UI: src/admin/pages/ChefGaaIntegrationPage.tsx. Netlify functions: netlify/functions/chefgaa-sync.mts and chefgaa-sync-scheduled.mts. Migrations: 017, 018, 019.",
);

heading(doc, "One-line pitch for stakeholders");
doc.rect(MARGIN, doc.y, CONTENT_WIDTH, 72).fillAndStroke("#f5f5f5", "#e5e5e5");
const quoteY = doc.y + 10;
doc
  .font("Helvetica-Oblique")
  .fontSize(10)
  .fillColor("#333333")
  .text(
    '"Our website menu auto-updates from ChefGaa every 15 minutes. Staff manage the menu in ChefGaa; our CMS pulls it in and shows it on the site. Customers still order through ChefGaa ordering platform."',
    MARGIN + 12,
    quoteY,
    { width: CONTENT_WIDTH - 24, align: "justify", lineGap: 2 },
  );

doc.y = quoteY + 78;
doc.font("Helvetica").fontSize(8.5).fillColor("#666666").text(
  "Desi Dhamaka — ChefGaa Integration Guide | Admin: desi-dhamaka-admin.netlify.app/admin/integrations/chefgaa",
  MARGIN,
  doc.y,
  { width: CONTENT_WIDTH, align: "center" },
);

doc.end();

stream.on("finish", () => {
  console.log(`PDF written to: ${pdfPath}`);
});

stream.on("error", (err) => {
  console.error(err);
  process.exit(1);
});
