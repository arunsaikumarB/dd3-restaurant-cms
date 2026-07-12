/**
 * Generates docs/Cheffy-Complete-Implementation.pdf
 * Full inventory of everything built for Cheffy from day one.
 * Run: node scripts/generate-cheffy-complete-implementation-pdf.mjs
 */
import PDFDocument from "pdfkit";
import { createWriteStream } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pdfPath = join(__dirname, "..", "docs", "Cheffy-Complete-Implementation.pdf");

const MARGIN = 50;
const PAGE_WIDTH = 595.28;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function hr(doc) {
  const y = doc.y + 4;
  doc.moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).strokeColor("#e5e5e5").stroke();
  doc.moveDown(0.55);
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
  doc.moveDown(0.22);
}

function subheading(doc, text) {
  ensureSpace(doc, 28);
  doc.font("Helvetica-Bold").fontSize(10.5).fillColor("#7f1d1d").text(text, MARGIN, doc.y, {
    width: CONTENT_WIDTH,
  });
  doc.fillColor("#1a1a1a");
  doc.moveDown(0.12);
}

function body(doc, text) {
  ensureSpace(doc, 36);
  doc.font("Helvetica").fontSize(10).text(text, MARGIN, doc.y, {
    width: CONTENT_WIDTH,
    align: "justify",
    lineGap: 2,
  });
  doc.moveDown(0.18);
}

function bullet(doc, text) {
  ensureSpace(doc, 16);
  doc.font("Helvetica").fontSize(9.5).text(`•  ${text}`, MARGIN + 6, doc.y, {
    width: CONTENT_WIDTH - 6,
    lineGap: 1.4,
  });
}

function mono(doc, text) {
  ensureSpace(doc, 14);
  doc.font("Courier").fontSize(8).fillColor("#333333").text(text, MARGIN + 8, doc.y, {
    width: CONTENT_WIDTH - 8,
  });
  doc.fillColor("#1a1a1a");
}

function table(doc, headers, rows, colWidths) {
  ensureSpace(doc, 40);
  let y = doc.y;
  const rowH = 17;
  const fontSize = 8.5;
  const startX = MARGIN;

  doc.font("Helvetica-Bold").fontSize(fontSize);
  let x = startX;
  headers.forEach((h, i) => {
    doc.rect(x, y, colWidths[i], rowH).fillAndStroke("#fef2f2", "#d4d4d4");
    doc.fillColor("#1a1a1a").text(h, x + 3, y + 4, { width: colWidths[i] - 6 });
    x += colWidths[i];
  });
  y += rowH;

  doc.font("Helvetica").fontSize(fontSize);
  rows.forEach((row) => {
    if (y > 760) {
      doc.addPage();
      y = MARGIN;
    }
    x = startX;
    const bg = "#ffffff";
    row.forEach((cell, i) => {
      doc.rect(x, y, colWidths[i], rowH).fillAndStroke(bg, "#e5e5e5");
      doc.fillColor("#1a1a1a").text(String(cell), x + 3, y + 4, {
        width: colWidths[i] - 6,
        ellipsis: true,
      });
      x += colWidths[i];
    });
    y += rowH;
  });
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

/* -------------------------------------------------------------------------- */
/* Cover                                                                      */
/* -------------------------------------------------------------------------- */
doc.font("Helvetica-Bold").fontSize(22).fillColor("#b91c1c").text("Cheffy AI Dining Concierge", {
  width: CONTENT_WIDTH,
});
doc.moveDown(0.1);
doc.font("Helvetica-Bold").fontSize(14).fillColor("#444444").text("Complete Implementation Report", {
  width: CONTENT_WIDTH,
});
doc.moveDown(0.15);
doc.font("Helvetica").fontSize(11).fillColor("#555555").text(
  `Desi Dhamaka Restaurant Group · Everything built from day one · ${date}`,
);
doc.fillColor("#1a1a1a");
hr(doc);

body(
  doc,
  "This PDF is the definitive inventory of Cheffy — the AI dining concierge on the Desi Dhamaka website. " +
    "It covers the floating mascot and chat UI, Gemini streaming backend, CMS knowledge layer, tool calling, " +
    "personality and session memory, Semantic RAG Knowledge Base, context orchestrator, admin CMS modules, " +
    "outlet isolation, ChefGaa live-menu redirects, Netlify functions, Supabase migrations, and deploy requirements.",
);

heading(doc, "1. Executive Summary");
bullet(doc, "Product name: Cheffy — AI Restaurant Assistant (Powered by ChefGaa)");
bullet(doc, "Live public site: https://desi-dhamaka-admin.netlify.app");
bullet(doc, "Admin AI Concierge: /admin/integrations/ai-concierge");
bullet(doc, "Admin Knowledge Base: /admin/integrations/knowledge-base");
bullet(doc, "Stack: React + TypeScript + Vite · Netlify Functions · Gemini LLM · Supabase (CMS + pgvector RAG)");
bullet(doc, "Outlets: South Plainfield · Oak Tree (Edison) · Lawrenceville — never mixed in one reply");
bullet(doc, "Menu policy: Cheffy does not invent dishes or prices; guests are sent to the outlet ChefGaa live menu");

heading(doc, "2. End-to-End Architecture");
body(
  doc,
  "Guest opens Cheffy → React UI collects the message → CMS knowledge loads for the selected outlet → " +
    "Context Orchestrator optionally retrieves semantic RAG chunks → enriched request hits Netlify ai-concierge → " +
    "Gemini streams the reply → UI parses action tokens, presentation cards, and follow-up chips → " +
    "session memory persists in browser sessionStorage. If the LLM is unavailable, a deterministic CMS responder answers from live website data.",
);
mono(doc, "Customer → Semantic Search (optional) → CMS + RAG context → Gemini → Cheffy UI");
doc.moveDown(0.25);

heading(doc, "3. Implementation Timeline (from the start)");
table(
  doc,
  ["Phase", "What was delivered"],
  [
    ["Foundation", "Floating mascot, chat shell, AIProvider on public routes"],
    ["Gemini gateway", "Netlify ai-concierge, streaming SSE, system prompt"],
    ["CMS knowledge", "Outlet-aware builder, tools, deterministic fallback"],
    ["Personality", "Session prefs, greetings, chips, hospitality voice"],
    ["Admin Concierge", "AI settings, personality, prompts, logs, sandbox"],
    ["Semantic RAG", "Upload, chunk, embed, pgvector search, playground"],
    ["Orchestrator", "CMS + RAG + tools + business rules before each LLM call"],
    ["Menu handoff", "Demo menu removed; all menu CTAs → ChefGaa per outlet"],
  ],
  [110, CONTENT_WIDTH - 110],
);

heading(doc, "4. Frontend — Guest Experience (LIVE)");
subheading(doc, "Entry & shell");
bullet(doc, "src/App.tsx — mounts AIProvider + Cheffy on all public location routes");
bullet(doc, "src/components/ai/CheffyContext.tsx — conversation engine, orchestrator, streaming, history");
bullet(doc, "src/components/ai/Cheffy.tsx — floating mascot, bubbles, open/close chat, inactivity nudge");
bullet(doc, "Asset: public/cheffy/cheffy-mascot.png");

subheading(doc, "Mascot, motion & emotion");
bullet(doc, "CheffyMascotState — phases: hidden → peek → greeting → idle → listening → thinking → speaking → celebrating");
bullet(doc, "CheffyAnimator — GSAP transform-only motion; respects prefers-reduced-motion");
bullet(doc, "First-paint CSS hide + useLayoutEffect so mascot never flashes before intro");
bullet(doc, "Location-specific welcome copy for each NJ outlet");
bullet(doc, "Emotion bridge: intent detection → mascot thinking/speaking states");

subheading(doc, "Chat UI");
bullet(doc, "ChatWindow, ChatHome, MessageBubble, MessageStreamRenderer, Typing / DynamicTyping indicators");
bullet(doc, "Quick actions, input chips, follow-up chips after replies");
bullet(doc, "Presentation cards: Offer, Location, Contact, Recommendation (View Live Menu)");

subheading(doc, "Action system");
bullet(doc, "Parses tokens: [BUTTON:], [ORDER:], [ONLINE ORDERING:], [MENU:], [CALL:], [MAP:], [ACTION:switch_location:]");
bullet(doc, "Menu / Order external URLs open the outlet ChefGaa page in the same tab");
bullet(doc, "Phone / email / maps / reservation / switch-location handled safely in CheffyActionBar");

heading(doc, "5. AI Core — Providers, Prompt, Tools, Personality");
subheading(doc, "Providers");
bullet(doc, "Default LIVE provider: Gemini (gemini-2.0-flash) via Netlify — keys never in the browser");
bullet(doc, "Optional: OpenAI and Claude paths on the server when env keys exist");
bullet(doc, "Mock provider for local/dev fallback");
bullet(doc, "Client always calls /.netlify/functions/ai-concierge (JSON or SSE stream)");

subheading(doc, "System prompt (canonical)");
bullet(doc, "src/config/ai/systemPrompt.ts — single source of truth for client + Netlify");
bullet(doc, "Rules: restaurant-only scope, anti-hallucination, outlet isolation, hospitality voice");
bullet(doc, "Menu rule: direct guests to ChefGaa live menu; never invent dishes or prices");
bullet(doc, "Action-token format instructions for buttons and deep links");

subheading(doc, "Intents detected");
body(
  doc,
  "menu · vegetarian · offers · reservation · catering · order · recommend · hours · contact · location · " +
    "greeting · faq · kids · party · buffet · gallery · unknown",
);

subheading(doc, "Registered tools (LIVE against CMS)");
bullet(doc, "getRestaurantInfo, getHomepageContent, getOffers, getGallery, getReviews, getSEO");
bullet(doc, "getCurrentLocation, navigateToPage");
bullet(doc, "Future (not live): Menu tool, Reservation tool, ChefGaa cart — feature-flagged only");

subheading(doc, "Personality & session memory");
bullet(doc, "Guest prefs: dietary, spice, mood, dining purpose, family/kids — stored in sessionStorage");
bullet(doc, "Time-of-day greetings, nudge copy, hospitality closings");
bullet(doc, "Dynamic chips adapt to last topic and preferences");
bullet(doc, "Conversation history + conversation UUID for correlation/logging");

heading(doc, "6. CMS Knowledge Layer (LIVE)");
bullet(doc, "buildCMSKnowledge(locationId) aggregates homepage, restaurant settings, offers, gallery, reviews, SEO");
bullet(doc, "navigation.menu resolves to the outlet ChefGaa order URL from Restaurant Settings");
bullet(doc, "navigation.order points to /{location}/online-ordering on the website");
bullet(doc, "Deterministic CMS responder answers when LLM is unavailable");
bullet(doc, "unavailableMenu() explains live menu is on online ordering + View Live Menu button");

heading(doc, "7. Semantic RAG Knowledge Base");
body(
  doc,
  "Cheffy can learn from uploaded documents — not only CMS tables. Documents are extracted, chunked, " +
    "embedded with Gemini text-embedding-004 (768 dimensions), stored in Supabase pgvector, and retrieved " +
    "before Gemini answers when semantic RAG is enabled.",
);

subheading(doc, "Deliverables status");
table(
  doc,
  ["Deliverable", "Status"],
  [
    ["AI Knowledge Base Module", "Done — admin + RAG services"],
    ["PDF / DOCX / TXT Upload", "Done (+ MD, HTML, CSV)"],
    ["Categories & Metadata", "Done"],
    ["Version Control", "Done — semantic_document_versions"],
    ["Document Preview", "Partial — text/chunk preview"],
    ["Smart Text Extraction", "Done — pdf-parse / mammoth"],
    ["Semantic Chunking", "Done — paragraph + overlap"],
    ["Embedding Generation", "Done — Netlify index fn"],
    ["Supabase pgvector", "Done — migration 033"],
    ["Semantic Search", "Done"],
    ["Similarity Scoring", "Done — cosine"],
    ["Search Playground", "Done — admin UI"],
    ["Re-indexing", "Done"],
    ["Document Lifecycle", "Done — upload/version/delete"],
  ],
  [220, CONTENT_WIDTH - 220],
);

subheading(doc, "Knowledge categories");
table(
  doc,
  ["Category ID", "Label"],
  [
    ["restaurant_policies", "Restaurant Policies"],
    ["faqs", "FAQs"],
    ["catering", "Catering"],
    ["private_parties", "Private Parties"],
    ["events", "Events"],
    ["festival_info", "Festival Information"],
    ["brand_story", "Brand Story / About"],
    ["press_releases", "Press Releases"],
    ["awards", "Awards"],
    ["training", "Training (private / internal)"],
    ["future_menu", "Future Menu Documents"],
  ],
  [180, CONTENT_WIDTH - 180],
);

subheading(doc, "Key files");
bullet(doc, "Admin UI: src/admin/pages/KnowledgeBasePage.tsx");
bullet(doc, "RAG services: src/services/rag/* (categories, chunker, cache, retriever, repository)");
bullet(doc, "Functions: semantic-knowledge-index.mts, semantic-knowledge-search.mts");
bullet(doc, "Libs: semanticEmbeddings.ts, semanticTextExtractor.ts, semanticSupabase.ts");
bullet(doc, "Migration: supabase/migrations/033_semantic_knowledge.sql");
bullet(doc, "Storage bucket: semantic-knowledge (private, admin-only, 50MB)");

heading(doc, "8. Context Orchestrator");
bullet(doc, "enrichAIRequestWithOrchestrator wraps CMS enrichment — does not replace core AI architecture");
bullet(doc, "Plans sources: outlet · business rules · session · personality · CMS · tools · ± semantic RAG");
bullet(doc, "Trims RAG chunks (max ~4 chunks / ~1200 tokens) before injecting as semanticKnowledge tool result");
bullet(doc, "Wired from CheffyContext on every guest message");
mono(doc, "src/services/ai/orchestrator/{contextOrchestrator,sourcePlanner,businessRules}.ts");

heading(doc, "9. Admin CMS Modules");
subheading(doc, "AI Concierge — /admin/integrations/ai-concierge");
bullet(doc, "Sections: General, Personality, Knowledge, Providers, Prompt, Conversation, Suggestions");
bullet(doc, "Also: Analytics, Testing/Sandbox, Logs, Error Logs, Advanced, location overrides");
bullet(doc, "Roles: super_admin / manager / staff (staff read-only)");
bullet(doc, "Tables from migration 032_ai_management.sql");

subheading(doc, "Knowledge Base — /admin/integrations/knowledge-base");
bullet(doc, "Upload with title, description, category, outlet scope, public/private visibility");
bullet(doc, "Document list with index status badges (pending / processing / indexed / failed / stale)");
bullet(doc, "Re-index, delete, version history, chunk preview, search playground");

heading(doc, "10. Outlet / Location Awareness");
bullet(doc, "Uses LocationContext selectedLocationId for every knowledge build and RAG query");
bullet(doc, "Prompt rule: never mix South Plainfield, Oak Tree, and Lawrenceville");
bullet(doc, "Mascot welcomes are location-specific");
bullet(doc, "Switch-location action can move the guest between outlets");
bullet(doc, "RAG documents can be global (location_id null) or outlet-scoped");
bullet(doc, "Order URLs come from Restaurant Settings order_url per outlet (validated, never mixed)");

heading(doc, "11. Menu & Online Ordering Integration");
body(
  doc,
  "The on-site demo menu was removed. Menu is no longer a separate website page. Every Menu entry point " +
    "(header, footer, experience cards, signature carousel, Cheffy buttons) redirects to the selected outlet’s " +
    "ChefGaa online ordering URL from CMS Restaurant Settings. If no outlet is selected, the guest is sent to the location gate.",
);
bullet(doc, "Legacy /{location}/menu → MenuRedirectPage → ChefGaa (or / if no location)");
bullet(doc, "Cheffy menu intents → explain live menu + [BUTTON:View Live Menu|orderUrl]");
bullet(doc, "Admin knowledge flags keep menu/chefgaa tools OFF by design (link strategy)");

heading(doc, "12. Netlify Functions");
table(
  doc,
  ["Function", "Purpose"],
  [
    ["ai-concierge.mts", "LLM gateway — Gemini/OpenAI/Claude + SSE"],
    ["semantic-knowledge-index.mts", "Extract → chunk → embed → store"],
    ["semantic-knowledge-search.mts", "Query embed → match_semantic_chunks"],
  ],
  [210, CONTENT_WIDTH - 210],
);

heading(doc, "13. Supabase Migrations & Schema");
subheading(doc, "032_ai_management.sql");
bullet(doc, "ai_settings, ai_personality, ai_provider_settings, ai_prompt_versions");
bullet(doc, "ai_suggested_questions, ai_followups, ai_feature_flags");
bullet(doc, "ai_conversation_logs, ai_tool_logs, ai_error_logs, ai_audit_log");
bullet(doc, "users.ai_access_level + admin-only RLS");

subheading(doc, "033_semantic_knowledge.sql");
bullet(doc, "Extension: vector (pgvector)");
bullet(doc, "Tables: semantic_documents, semantic_document_versions, semantic_chunks, semantic_index_jobs");
bullet(doc, "RPC: match_semantic_chunks — outlet-aware, public-only, category-filtered cosine search");
bullet(doc, "Index: IVFFlat on embedding vector(768)");
bullet(doc, "Storage: semantic-knowledge bucket");

heading(doc, "14. Environment Variables");
table(
  doc,
  ["Variable", "Where", "Purpose"],
  [
    ["VITE_AI_PROVIDER", "Client", "Provider name (gemini)"],
    ["AI_PROVIDER", "Netlify", "Server provider"],
    ["GEMINI_API_KEY", "Netlify only", "LLM + embeddings"],
    ["GEMINI_MODEL", "Netlify", "Default gemini-2.0-flash"],
    ["GEMINI_* tuning", "Netlify", "Temp, top_p, tokens, streaming"],
    ["CHEFFY_PROMPT_VERSION", "Netlify", "Prompt version tag"],
    ["OPENAI_* / ANTHROPIC_*", "Netlify", "Optional providers"],
    ["VITE_SUPABASE_*", "Client", "CMS + admin"],
    ["SUPABASE_SERVICE_ROLE_KEY", "Netlify only", "RAG index/search"],
  ],
  [170, 90, CONTENT_WIDTH - 260],
);
body(doc, "Never expose LLM API keys or the service role key to the browser.");

heading(doc, "15. Live vs Admin-Only");
table(
  doc,
  ["Capability", "Guest site", "Admin"],
  [
    ["Floating mascot + chat", "Yes", "—"],
    ["Gemini streaming", "Yes", "Sandbox too"],
    ["CMS tools + outlet context", "Yes", "Toggles"],
    ["Menu → ChefGaa", "Yes", "—"],
    ["Session chips / memory", "Yes", "Edit seeds"],
    ["Semantic RAG retrieval", "Yes if indexed", "Upload/index"],
    ["AI settings / logs", "—", "Yes"],
    ["Provider keys / embeddings", "Server only", "Config UI"],
  ],
  [200, 120, CONTENT_WIDTH - 320],
);

heading(doc, "16. Deploy Checklist");
bullet(doc, "1. Apply migrations 032 and 033 to Supabase (pgvector must be available)");
bullet(doc, "2. Set Netlify env: GEMINI_API_KEY, Supabase URL/anon, SUPABASE_SERVICE_ROLE_KEY");
bullet(doc, "3. Confirm netlify.toml functions directory and external modules (pdf-parse, mammoth)");
bullet(doc, "4. Optional: enable ai_feature_flags.semantic_rag; upload docs and reindex");
bullet(doc, "5. Deploy with npm run deploy (or Netlify CI)");
bullet(doc, "6. Verify Cheffy on a location page and Knowledge Base / AI Concierge in admin");

heading(doc, "17. Intentional Non-Features / Gaps");
bullet(doc, "No live dish-level menu catalog inside Cheffy — ChefGaa is the source of truth");
bullet(doc, "Offers RAG category is not dedicated; offers primarily come from CMS offers module");
bullet(doc, "Document preview is extracted text/chunks, not an embedded PDF viewer");
bullet(doc, "Claude client path is mock; server handlers exist when keys are set");
bullet(doc, "Training category is private and excluded from public match_semantic_chunks");
bullet(doc, "Admin AI settings persist in Supabase; runtime LLM is primarily env-driven on Netlify");

heading(doc, "18. Primary Code Map");
subheading(doc, "Guest UI");
mono(doc, "src/components/ai/*  ·  src/App.tsx");
subheading(doc, "AI services");
mono(doc, "src/services/ai/*  ·  src/config/ai/*  ·  src/services/cms/knowledge/*");
subheading(doc, "RAG");
mono(doc, "src/services/rag/*  ·  src/types/semanticKnowledge.ts");
subheading(doc, "Orchestrator");
mono(doc, "src/services/ai/orchestrator/*");
subheading(doc, "Admin");
mono(doc, "src/admin/pages/AIConciergePage.tsx  ·  KnowledgeBasePage.tsx");
mono(doc, "src/services/aiAdmin/*  ·  src/admin/hooks/use*Admin.ts");
subheading(doc, "Server");
mono(doc, "netlify/functions/ai-concierge.mts");
mono(doc, "netlify/functions/semantic-knowledge-*.mts");
mono(doc, "netlify/functions/lib/{cheffySystemPrompt,aiConfig,semantic*}.ts");
subheading(doc, "Database");
mono(doc, "supabase/migrations/032_ai_management.sql");
mono(doc, "supabase/migrations/033_semantic_knowledge.sql");

heading(doc, "19. Outcome");
body(
  doc,
  "Cheffy is a production dining concierge: warm animated host on the public site, outlet-safe answers from live CMS data, " +
    "optional document intelligence via Semantic RAG, Gemini streaming through a secure Netlify gateway, and full admin control " +
    "for personality, prompts, knowledge documents, and testing. Guests who ask for the menu are guided to the correct ChefGaa " +
    "online ordering experience for their selected location — never to invented dishes or a mixed-outlet URL.",
);

doc.moveDown(0.6);
hr(doc);
doc.font("Helvetica").fontSize(9).fillColor("#666666").text(
  `Desi Dhamaka · Cheffy Complete Implementation Report · Generated ${date} · Live: https://desi-dhamaka-admin.netlify.app`,
  { width: CONTENT_WIDTH, align: "center" },
);

doc.end();

await new Promise((resolve, reject) => {
  stream.on("finish", resolve);
  stream.on("error", reject);
});

console.log(`Wrote ${pdfPath}`);
