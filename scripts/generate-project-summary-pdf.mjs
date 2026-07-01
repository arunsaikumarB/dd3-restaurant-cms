/**
 * Generates docs/Desi-Dhamaka-Project-Summary.pdf (no browser required).
 * Run: node scripts/generate-project-summary-pdf.mjs
 */
import PDFDocument from "pdfkit";
import { createWriteStream } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pdfPath = join(__dirname, "..", "docs", "Desi-Dhamaka-Project-Summary.pdf");

const MARGIN = 50;
const PAGE_WIDTH = 595.28; // A4
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

doc.font("Helvetica-Bold").fontSize(22).fillColor("#b91c1c").text("Desi Dhamaka Website & Admin CMS", {
  width: CONTENT_WIDTH,
});
doc.moveDown(0.2);
doc.font("Helvetica").fontSize(11).fillColor("#555555").text(`Complete project summary — ${date}`);
doc.fillColor("#1a1a1a");
hr(doc);

heading(doc, "Executive summary", 13);
body(
  doc,
  "We built and deployed a full multi-location restaurant website with a content management system (CMS) for Desi Dhamaka. The public site serves South Plainfield, Old Bridge, and Lawrenceville with location-aware menus, homepage content, offers, gallery, reservations, and reviews. The admin dashboard lets staff update all content without touching code.",
);
body(
  doc,
  "The system is live on Netlify today, connected to Supabase (PostgreSQL, Auth, Storage). Recent work added page-level CMS, fixed hero CTAs and a blank-homepage bug, and moved the hero video off Supabase to cut bandwidth costs. Ready for stakeholder review before production domain cutover (desidhamakanj.net).",
);

heading(doc, "What was built");
table(
  doc,
  ["Part", "Purpose", "Users"],
  [
    ["Public website", "Menu, gallery, offers, reservations, contact", "Customers"],
    ["Admin dashboard", "Manage content, analytics, pages, homepage", "Staff / managers"],
    ["Multi-location", "Separate content per SP, OT, Lawrenceville", "All locations"],
  ],
  [95, 260, 140],
);

subheading(doc, "Technology stack");
table(
  doc,
  ["Layer", "Technology"],
  [
    ["Frontend", "React 18 + TypeScript + Vite + React Router"],
    ["Hosting", "Netlify (HTTPS, global CDN, static hero video)"],
    ["Backend", "Supabase (PostgreSQL, Auth, Storage, RLS)"],
    ["Integrations", "ChefGaa online ordering URLs per location"],
    ["Source code", "GitHub: arunsaikumarB/dd3-restaurant-cms"],
  ],
  [120, 375],
);

heading(doc, "How it works");
body(doc, "Customer visits public site → Netlify serves SPA → LocationProvider picks outlet → content loads from Supabase.");
body(
  doc,
  "Staff logs in at /admin/login → Supabase Auth → admin role check → edits in dashboard → changes save to Supabase → public site reflects updates within ~60 seconds.",
);

heading(doc, "Work completed — foundation through Phase 20");
table(
  doc,
  ["Phase", "Deliverable"],
  [
    ["Foundation", "Public pages + admin UI wired to Supabase"],
    ["Phase 15", "Row Level Security, hardened auth, safe user provisioning"],
    ["Phase 16", "Admin-only dashboard; staff access denied by design"],
    ["Phase 17", "Footer/contact/reservations from Settings; smoke test docs"],
    ["Phase 18", "Launch checklist (infra, SEO, security)"],
    ["Phase 19", "Meta tags, JSON-LD, sitemap, robots.txt"],
    ["Phase 20", "Demo deployment on Netlify + env configuration"],
  ],
  [90, 405],
);

heading(doc, "Phase 21 — Multi-location CMS");
bullet(doc, "Three locations: South Plainfield (SP), Old Bridge (OT), Lawrenceville (LV)");
bullet(doc, "Per-location homepage_content, settings, menu rows, and order URLs");
bullet(doc, "Location-scoped CRUD in admin; public reads filtered by selected location");
bullet(doc, "Migrations 007–011: location tables, isolation, CMS-first public reads");
bullet(doc, "Menu seeds: 377+ items for SP; correct prices and ChefGaa order_type per outlet");

heading(doc, "ChefGaa, offers, gallery & analytics");
bullet(doc, "ChefGaa integration: location-specific ORDER NOW URLs (order_type 106/108/LV menu link)");
bullet(doc, "Homepage signature dishes wired to chef_special menu items + carousel restore");
bullet(doc, "Offers CMS with banner images, date ranges, and offer detail pages");
bullet(doc, "Gallery CMS redesign: sections, featured/visible toggles, location scoping");
bullet(doc, "Analytics dashboard: page views, offer clicks, reservation funnel (migrations 022–023)");

doc.addPage();

heading(doc, "Page content CMS — Phases 1–3");
subheading(doc, "Phase 1 — Content audit & database");
bullet(doc, "CONTENT_AUDIT.md: mapped all hardcoded public copy to CMS keys");
bullet(doc, "Migration 024_page_content.sql: 171 rows across About, Contact, Menu, Offers, etc.");
bullet(doc, "pageContentSchema.ts: typed section/field definitions for validation");

subheading(doc, "Phase 2 — Public site wiring");
bullet(doc, "PageContentProvider loads page_content from Supabase per location");
bullet(doc, "All public pages read CMS text with sensible fallbacks if DB empty");
bullet(doc, "Gallery redesign and analytics tracking integrated in same release");

subheading(doc, "Phase 3 — Admin Pages CMS");
bullet(doc, "New /admin/pages route with section-based forms");
bullet(doc, "Homepage admin extended with additional tabs (hero, about, signatures, etc.)");
bullet(doc, "pageContentAdmin.ts service for CRUD; validation mirrors public schema");

heading(doc, "Phase 4 — Homepage hero CTAs (migration 025)");
body(
  doc,
  "Replaced misused cta_text/cta_link fields with separate primary and secondary CTA label + URL pairs. Admin now shows Label and URL fields; public hero buttons display readable labels, not raw URLs.",
);
table(
  doc,
  ["Location", "Primary CTA", "Order URL pattern"],
  [
    ["South Plainfield", "Order Now", "ChefGaa order_type=106"],
    ["Old Bridge", "Order Now", "ChefGaa order_type=108"],
    ["Lawrenceville", "Order Now", "orders.chefgaa.com LV menu"],
  ],
  [110, 120, 265],
);
bullet(doc, "Files updated: Hero.tsx, HomepagePage.tsx, homepageContent.ts, homepagePublic.ts");
bullet(doc, "Commit ae0aad2 — Fix homepage hero CTAs with separate label and URL fields");

heading(doc, "Production fixes — blank homepage & bandwidth");
subheading(doc, "Blank public site (commit 90fa65c)");
body(
  doc,
  "Root cause: usePageTracking() ran in PublicSiteShell before LocationProvider, throwing useLocationSelection must be used within LocationProvider and leaving #root empty. Fix: new PublicSiteChrome component inside providers calls usePageTracking().",
);

subheading(doc, "Supabase bandwidth reduction (commit 3e30d63)");
body(
  doc,
  "Hero video was ~45 MB × 3 locations served from Supabase Storage, exhausting the 5 GB egress quota. Compressed to 720p CRF 28 (~8.13 MB), hosted at /media/hero.mp4 on Netlify CDN.",
);
bullet(doc, "Migration 026: sets hero_video=/media/hero.mp4 for all locations");
bullet(doc, "Removed legacy 16 MB videoplayback.mp4; all fallbacks point to /media/hero.mp4");
bullet(doc, "Gallery uploads resized (max 1920px, 80% JPEG/WebP) before Supabase upload");
bullet(doc, "Storage cacheControl raised to 31536000 (1 year) for new uploads");
bullet(doc, "Admin tip on hero video field: prefer Netlify static URL over Supabase for large files");

heading(doc, "Live URLs");
table(
  doc,
  ["Resource", "URL"],
  [
    ["Public site", "desi-dhamaka-admin.netlify.app"],
    ["Admin login", ".../admin/login"],
    ["Homepage CMS", ".../admin/homepage"],
    ["Pages CMS", ".../admin/pages"],
    ["Hero video", ".../media/hero.mp4 (~8 MB)"],
    ["GitHub", "github.com/arunsaikumarB/dd3-restaurant-cms"],
  ],
  [120, 375],
);

doc.addPage();

heading(doc, "Database migrations (latest)");
table(
  doc,
  ["Migration", "Purpose"],
  [
    ["024", "page_content table + 171 seed rows"],
    ["025", "Hero primary/secondary CTA label + URL fields"],
    ["026", "Hero video → /media/hero.mp4 local path"],
    ["021–023", "Gallery CMS, analytics tables"],
    ["007–011", "Multi-location isolation"],
  ],
  [70, 425],
);

heading(doc, "Issues resolved during setup & launch");
table(
  doc,
  ["Issue", "Resolution"],
  [
    ["Invalid login credentials", "Switched to legacy anon API key; redeployed"],
    ["Access denied in admin", "Set user role = admin in database"],
    ["public.users missing", "Ran all migrations; created admin profile"],
    ["Blank homepage", "Moved page tracking inside LocationProvider"],
    ["Supabase egress 100%", "Hero video off Supabase → Netlify static asset"],
    ["Wrong order URLs", "Per-location ChefGaa order_type corrected in CMS"],
  ],
  [180, 315],
);

heading(doc, "What the admin can manage today");
table(
  doc,
  ["Area", "Capabilities"],
  [
    ["Homepage", "Hero video/image, title, CTAs, about, signature dishes"],
    ["Pages", "About, Contact, Menu intro, Offers, Reservations copy"],
    ["Menu", "Categories, items, prices, images, chef specials, active flag"],
    ["Gallery", "Sections, uploads, captions, featured/visible per location"],
    ["Offers", "Promotions, banners, dates, detail page content"],
    ["Reviews", "Approve/reject customer submissions"],
    ["Reservations", "View and manage booking requests"],
    ["Settings", "Name, phone, email, address, hours, logo, social links"],
    ["Analytics", "Dashboard with traffic and conversion metrics"],
  ],
  [90, 405],
);

heading(doc, "Security");
bullet(doc, "Email + password required for admin access");
bullet(doc, "Only admin role can use the dashboard");
bullet(doc, "Row Level Security on database tables");
bullet(doc, "Service-role keys not exposed in frontend");
bullet(doc, "Admin area blocked from search engines");

heading(doc, "Current status");
table(
  doc,
  ["Item", "Status"],
  [
    ["Demo site live", "Complete"],
    ["Multi-location CMS", "Complete"],
    ["Page content CMS", "Complete"],
    ["Hero CTAs + video fix", "Complete"],
    ["Admin CMS working", "Complete"],
    ["Database & storage", "Complete"],
    ["SEO basics", "Complete"],
    ["Production domain", "Not yet connected (demo only)"],
  ],
  [220, 275],
);

heading(doc, "Recommended next steps");
bullet(doc, "Populate remaining content via admin (menu, pages, gallery per location)");
bullet(doc, "Stakeholder review on demo URL");
bullet(doc, "Connect desidhamakanj.net/lawrenceville to Netlify when approved");
bullet(doc, "Delete orphaned Supabase hero-video objects to reclaim storage");
bullet(doc, "Create staff accounts with appropriate roles");
bullet(doc, "Run final QA / smoke test on production URL");

heading(doc, "One-liner for leadership");
doc.rect(MARGIN, doc.y, CONTENT_WIDTH, 88).fillAndStroke("#f5f5f5", "#e5e5e5");
const quoteY = doc.y + 10;
doc
  .font("Helvetica-Oblique")
  .fontSize(10)
  .fillColor("#333333")
  .text(
    '"We delivered a modern multi-location restaurant website with a secure admin CMS — including page-level content editing, location-aware menus and ordering, analytics, and a live Netlify deployment. We fixed production issues (blank homepage, hero CTAs, Supabase bandwidth) so the team can manage all three outlets without developers, ready for content fill and production domain switch when approved."',
    MARGIN + 12,
    quoteY,
    { width: CONTENT_WIDTH - 24, align: "justify", lineGap: 2 },
  );

doc.y = quoteY + 94;
doc.font("Helvetica").fontSize(8.5).fillColor("#666666").text(
  "Desi Dhamaka — Website & Admin CMS Project Summary | Demo: desi-dhamaka-admin.netlify.app | Latest commit: 3e30d63",
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
