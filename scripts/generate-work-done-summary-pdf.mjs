/**
 * Generates docs/Work-Done-Summary.pdf — short main-points summary from project start to now.
 * Run: node scripts/generate-work-done-summary-pdf.mjs
 */
import PDFDocument from "pdfkit";
import { createWriteStream } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pdfPath = join(__dirname, "..", "docs", "Work-Done-Summary.pdf");

const MARGIN = 50;
const PAGE_WIDTH = 595.28;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function hr(doc) {
  const y = doc.y + 4;
  doc.moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).strokeColor("#e5e5e5").stroke();
  doc.moveDown(0.6);
}

function ensureSpace(doc, needed = 50) {
  if (doc.y + needed > 780) doc.addPage();
}

function heading(doc, text) {
  ensureSpace(doc, 36);
  doc.moveDown(0.35);
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#991b1b").text(text, MARGIN, doc.y, {
    width: CONTENT_WIDTH,
  });
  doc.fillColor("#1a1a1a");
  doc.moveDown(0.25);
}

function bullet(doc, text) {
  ensureSpace(doc, 18);
  doc.font("Helvetica").fontSize(10).text(`•  ${text}`, MARGIN + 6, doc.y, {
    width: CONTENT_WIDTH - 6,
    lineGap: 1.5,
  });
}

const doc = new PDFDocument({ margin: MARGIN, size: "A4" });
const stream = createWriteStream(pdfPath);
doc.pipe(stream);

const date = new Date().toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

doc.font("Helvetica-Bold").fontSize(22).fillColor("#b91c1c").text("Work Done — Summary", {
  width: CONTENT_WIDTH,
});
doc.moveDown(0.15);
doc.font("Helvetica").fontSize(11).fillColor("#555555").text(
  `Desi Dhamaka Website & Admin CMS | ${date}`,
);
doc.fillColor("#1a1a1a");
hr(doc);

doc.font("Helvetica").fontSize(10).text(
  "Short main-points list of everything built, fixed, and deployed from project start through today.",
  MARGIN,
  doc.y,
  { width: CONTENT_WIDTH, lineGap: 2 },
);
doc.moveDown(0.4);

heading(doc, "1. Foundation & launch");
bullet(doc, "Built full public restaurant website (React + TypeScript + Vite)");
bullet(doc, "Built admin CMS dashboard with Supabase Auth (admin-only access)");
bullet(doc, "Database: 31 migrations — schema, RLS, storage, multi-location");
bullet(doc, "Deployed to Netlify: desi-dhamaka-admin.netlify.app");
bullet(doc, "Connected GitHub repo: arunsaikumarB/dd3-restaurant-cms");
bullet(doc, "SEO basics: meta tags, JSON-LD, sitemap, robots.txt, llms.txt");

heading(doc, "2. Multi-location (3 outlets)");
bullet(doc, "South Plainfield, Oak Tree (Old Bridge), Lawrenceville — separate content per location");
bullet(doc, "Location-aware menus, homepage, settings, offers, gallery");
bullet(doc, "Menu seeds: 377+ items for South Plainfield; correct prices per outlet");
bullet(doc, "Per-location ChefGaa order URLs (order_type 106 / 108 / LV menu link)");
bullet(doc, "Premium location gate landing page with storefront images");
bullet(doc, "Location selector in navbar — full outlet names, aligned with CTAs");

heading(doc, "3. Admin CMS features");
bullet(doc, "Homepage CMS — hero video/image, title, CTAs, about, signature dishes");
bullet(doc, "Pages CMS — About, Contact, Menu intro, Offers, Reservations copy (page_content)");
bullet(doc, "Menu management — categories, items, prices, images, chef specials");
bullet(doc, "Gallery CMS redesign — sections, featured/visible toggles");
bullet(doc, "Offers CMS — banners, date ranges, offer detail pages");
bullet(doc, "Reviews — approve/reject customer submissions");
bullet(doc, "Reservations — view and manage booking requests");
bullet(doc, "Settings — name, phones (multiple per outlet), email, address, hours, logo, social");
bullet(doc, "Enterprise SEO module — per-page metadata in Pages editor");
bullet(doc, "ChefGaa Integration page — sync status, history, manual sync buttons");
bullet(doc, "Insights dashboard — live GA4 analytics + PDF export");

heading(doc, "4. ChefGaa POS integration");
bullet(doc, "Menu sync from ChefGaa → Supabase (Legacy API + V2 adapter)");
bullet(doc, "3 locations mapped: SP (outlet 70), OT (outlet 71), Lawrenceville (V2 tenant/store)");
bullet(doc, "Automated sync every 15 min via Netlify scheduled function");
bullet(doc, "Manual sync from admin; lock + queue to prevent overlaps");
bullet(doc, "Audit tables: sync runs, events, notifications, health checks");
bullet(doc, "First-sync archive of old CMS menu data; manual_override per item");
bullet(doc, "Public menu reads Supabase only — not ChefGaa on every page load");

doc.addPage();

heading(doc, "5. Public website — key pages & features");
bullet(doc, "Homepage — hero, signature carousel, experience cards, offers section, CTAs");
bullet(doc, "Menu page — categories, search, dietary filters, ChefGaa order deep links");
bullet(doc, "Online ordering page — order options per outlet");
bullet(doc, "Reservation page — premium layout for OpenTable locations (South Plainfield)");
bullet(doc, "Catering page — quote request modal (form → Supabase + email via Resend)");
bullet(doc, "Contact page — enquiry form backend (migration 031)");
bullet(doc, "Offers, Gallery, About, Reviews, Testimonials, Parties, Privacy, Terms");
bullet(doc, "URL structure — location-prefixed routes (/south-plainfield/menu, etc.)");

heading(doc, "6. Cinematic & visual enhancements");
bullet(doc, "South Plainfield scroll-driven entrance image sequence");
bullet(doc, "Oak Tree cinematic entrance sequence");
bullet(doc, "Lawrenceville entrance sequence");
bullet(doc, "Smart-cover canvas rendering for cinematic fill");
bullet(doc, "Hero video moved to Netlify static (/media/hero.mp4) — cut Supabase bandwidth");
bullet(doc, "WebP image optimization + lazy loading across public site");
bullet(doc, "Footer redesign — location tagline, split address, ChefGaa powered-by");
bullet(doc, "Favicon CMS fix — site-wide fallback + server-side SEO head injection");

heading(doc, "7. Analytics & tracking");
bullet(doc, "Custom analytics tables (page views, offer clicks, reservation funnel)");
bullet(doc, "URL restructure analytics normalization (migration 027)");
bullet(doc, "GA4 live integration via Netlify Function (admin Insights page)");
bullet(doc, "Order click and reservation click tracking on public site");

heading(doc, "8. Production fixes & hardening");
bullet(doc, "Fixed blank homepage (page tracking outside LocationProvider)");
bullet(doc, "Fixed hero CTAs — separate label + URL fields (not raw URLs)");
bullet(doc, "Fixed wrong ChefGaa order_type for South Plainfield");
bullet(doc, "Fixed admin page remount on tab-focus token refresh");
bullet(doc, "Fixed GA4 private key parsing for Netlify env vars");
bullet(doc, "Row Level Security on all tables; service keys server-side only");
bullet(doc, "npm run deploy script for one-command Netlify production deploys");

heading(doc, "9. Recent merges & deployments (July 2026)");
bullet(doc, "Merged coworker updates: order page, footer, page content forms");
bullet(doc, "Menu page UI changes — cards, categories, atmosphere cleanup");
bullet(doc, "Homepage offers section + spacing updates across sections");
bullet(doc, "Catering quote modal + Supabase enquiry pipeline deployed");
bullet(doc, "Multiple production deploys to Netlify; GitHub main kept in sync");

heading(doc, "10. Live links");
bullet(doc, "Public site: https://desi-dhamaka-admin.netlify.app");
bullet(doc, "Admin: https://desi-dhamaka-admin.netlify.app/admin");
bullet(doc, "ChefGaa Integration: .../admin/integrations/chefgaa");
bullet(doc, "GitHub: https://github.com/arunsaikumarB/dd3-restaurant-cms");

heading(doc, "11. Still pending / next steps");
bullet(doc, "Connect production domain (desidhamakanj.net) when approved");
bullet(doc, "Lawrenceville V2 ChefGaa sync — verify credentials with ChefGaa team");
bullet(doc, "Content fill for all locations via admin");
bullet(doc, "Staff accounts with appropriate roles");

doc.moveDown(0.5);
doc.rect(MARGIN, doc.y, CONTENT_WIDTH, 56).fillAndStroke("#f5f5f5", "#e5e5e5");
const quoteY = doc.y + 8;
doc
  .font("Helvetica-Bold")
  .fontSize(9.5)
  .fillColor("#333333")
  .text("One-liner:", MARGIN + 10, quoteY, { continued: true })
  .font("Helvetica")
  .text(
    " Built a multi-location restaurant website + admin CMS with ChefGaa menu sync, page-level content editing, analytics, reservations, catering enquiries, cinematic homepage sequences, and a live Netlify deployment — ready for content and production domain cutover.",
    { width: CONTENT_WIDTH - 20, lineGap: 1.5 },
  );

doc.y = quoteY + 62;
doc.font("Helvetica").fontSize(8).fillColor("#888888").text(
  "Desi Dhamaka — Work Done Summary | Generated automatically from project history",
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
