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

function heading(doc, text, size = 14) {
  doc.moveDown(0.4);
  doc.font("Helvetica-Bold").fontSize(size).fillColor("#991b1b").text(text, MARGIN, doc.y, {
    width: CONTENT_WIDTH,
  });
  doc.fillColor("#1a1a1a");
  doc.moveDown(0.3);
}

function subheading(doc, text) {
  doc.font("Helvetica-Bold").fontSize(11).text(text, MARGIN, doc.y, { width: CONTENT_WIDTH });
  doc.moveDown(0.2);
}

function body(doc, text) {
  doc.font("Helvetica").fontSize(10).text(text, MARGIN, doc.y, {
    width: CONTENT_WIDTH,
    align: "justify",
    lineGap: 2,
  });
  doc.moveDown(0.2);
}

function bullet(doc, text) {
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
doc.font("Helvetica").fontSize(11).fillColor("#555555").text(`Project summary for leadership review — ${date}`);
doc.fillColor("#1a1a1a");
hr(doc);

heading(doc, "Executive summary", 13);
body(
  doc,
  "We built and deployed a full restaurant website with a content management system (CMS) for Desi Dhamaka. The public site lets customers browse the menu, view offers, make reservations, and read reviews. The admin dashboard lets staff update content without touching code.",
);
body(
  doc,
  "The system is live on a demo URL today, connected to a real database and authentication backend. It is ready for content entry and stakeholder review before pointing at the production domain (desidhamakanj.net).",
);

heading(doc, "What was built");
table(
  doc,
  ["Part", "Purpose", "Users"],
  [
    ["Public website", "Menu, gallery, offers, reservations, contact", "Customers"],
    ["Admin dashboard", "Manage all site content from one place", "Staff / managers"],
  ],
  [110, 250, 135],
);

subheading(doc, "Technology stack");
table(
  doc,
  ["Layer", "Technology"],
  [
    ["Frontend", "React 18 + TypeScript + Vite"],
    ["Hosting", "Netlify (HTTPS, global CDN)"],
    ["Backend", "Supabase (PostgreSQL, Auth, Storage)"],
    ["Source code", "GitHub: dd3-restaurant-cms"],
  ],
  [120, 375],
);

heading(doc, "How it works");
body(doc, "Customer visits public site → Netlify serves pages → content loads from Supabase.");
body(
  doc,
  "Staff logs in at /admin/login → Supabase Auth → admin role check → edits content in dashboard → changes save to Supabase → public site updates within ~60 seconds.",
);

heading(doc, "Work completed — phase by phase");
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

doc.addPage();

heading(doc, "Deployment completed");
subheading(doc, "Netlify");
bullet(doc, "Site: desi-dhamaka-admin");
bullet(doc, "Live URL: https://desi-dhamaka-admin.netlify.app");
bullet(doc, "Admin: https://desi-dhamaka-admin.netlify.app/admin/login");
bullet(doc, "Env vars: VITE_SITE_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY");
doc.moveDown(0.3);

subheading(doc, "Supabase");
bullet(doc, "6 database migrations applied (tables, RLS, storage)");
bullet(doc, "Admin user created and promoted to admin role");
doc.moveDown(0.3);

subheading(doc, "Issues resolved during setup");
table(
  doc,
  ["Issue", "Resolution"],
  [
    ["Invalid login credentials", "Switched to legacy anon API key; redeployed"],
    ["Access denied", "Set user role = admin in database"],
    ["public.users missing", "Ran all migrations; created admin profile"],
  ],
  [180, 315],
);

heading(doc, "What the admin can manage");
table(
  doc,
  ["Area", "Capabilities"],
  [
    ["Homepage", "Hero, images, about section, CTAs"],
    ["Menu", "Categories, items, prices, images, active/inactive"],
    ["Gallery", "Images, captions, featured/visible"],
    ["Offers", "Promotions, banners, dates"],
    ["Reviews", "Approve/reject submissions"],
    ["Reservations", "View and manage bookings"],
    ["Settings", "Name, phone, email, address, hours, logo, social"],
  ],
  [100, 395],
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
    ["Admin CMS working", "Complete"],
    ["Database & storage", "Complete"],
    ["SEO basics", "Complete"],
    ["Production domain", "Not yet connected (demo only)"],
  ],
  [280, 215],
);

heading(doc, "Recommended next steps");
bullet(doc, "Populate content via admin (menu, homepage, settings, gallery)");
bullet(doc, "Stakeholder review on demo URL");
bullet(doc, "Connect desidhamakanj.net/lawrenceville to Netlify when approved");
bullet(doc, "Create staff accounts with appropriate roles");
bullet(doc, "Run final QA / smoke test on production URL");

heading(doc, "One-liner for leadership");
doc
  .rect(MARGIN, doc.y, CONTENT_WIDTH, 72)
  .fillAndStroke("#f5f5f5", "#e5e5e5");
const quoteY = doc.y + 10;
doc
  .font("Helvetica-Oblique")
  .fontSize(10)
  .fillColor("#333333")
  .text(
    '"We delivered a modern restaurant website with a secure admin CMS, deployed it to a live demo environment, connected it to a cloud database, and resolved authentication and database setup so the team can manage menu, homepage, and bookings without developers — ready for content fill and production domain switch when approved."',
    MARGIN + 12,
    quoteY,
    { width: CONTENT_WIDTH - 24, align: "justify", lineGap: 2 },
  );

doc.y = quoteY + 78;
doc.font("Helvetica").fontSize(8.5).fillColor("#666666").text(
  "Desi Dhamaka — Website & Admin CMS Project Summary | Demo: desi-dhamaka-admin.netlify.app",
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
