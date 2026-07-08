import type { CheffyIntent } from "../ai/emotionEngine";
import type { SemanticDocumentCategory } from "../../types/semanticKnowledge";

export const SEMANTIC_CATEGORIES: Array<{
  id: SemanticDocumentCategory;
  label: string;
  description: string;
}> = [
  { id: "restaurant_policies", label: "Restaurant Policies", description: "House rules, refunds, dress code, policies" },
  { id: "faqs", label: "FAQs", description: "Frequently asked guest questions" },
  { id: "catering", label: "Catering", description: "Catering packages, minimums, delivery zones" },
  { id: "private_parties", label: "Private Parties", description: "Private dining, party rooms, group bookings" },
  { id: "events", label: "Events", description: "Special events, live music, themed nights" },
  { id: "festival_info", label: "Festival Information", description: "Diwali, Holi, seasonal festival menus" },
  { id: "brand_story", label: "Brand Story", description: "History, founders, culinary philosophy" },
  { id: "press_releases", label: "Press Releases", description: "Media announcements and news" },
  { id: "awards", label: "Awards", description: "Accolades, reviews, certifications" },
  { id: "training", label: "Training", description: "Staff training and SOP reference (private)" },
  { id: "future_menu", label: "Future Menu Documents", description: "Menu drafts and seasonal planning" },
];

export const CATEGORY_BY_ID = Object.fromEntries(
  SEMANTIC_CATEGORIES.map((c) => [c.id, c]),
) as Record<SemanticDocumentCategory, (typeof SEMANTIC_CATEGORIES)[number]>;

/** Map Cheffy intents → semantic categories for focused retrieval. */
export const INTENT_SEMANTIC_CATEGORIES: Partial<Record<CheffyIntent, SemanticDocumentCategory[]>> = {
  faq: ["faqs", "restaurant_policies"],
  catering: ["catering", "faqs"],
  party: ["private_parties", "events", "catering"],
  buffet: ["events", "faqs"],
  kids: ["faqs", "restaurant_policies"],
  greeting: ["brand_story"],
  unknown: ["faqs", "restaurant_policies", "brand_story"],
};

export function categoriesForIntent(intent: CheffyIntent): SemanticDocumentCategory[] | undefined {
  return INTENT_SEMANTIC_CATEGORIES[intent];
}

export function labelForCategory(category: SemanticDocumentCategory): string {
  return CATEGORY_BY_ID[category]?.label ?? category;
}

export function detectFileType(fileName: string): "pdf" | "docx" | "txt" | "markdown" | "html" | "csv" | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".docx")) return "docx";
  if (lower.endsWith(".txt")) return "txt";
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "markdown";
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "html";
  if (lower.endsWith(".csv")) return "csv";
  return null;
}

export const ACCEPTED_FILE_EXTENSIONS = ".pdf,.docx,.txt,.md,.markdown,.html,.htm,.csv";
