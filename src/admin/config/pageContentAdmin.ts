import type { PageContentPageKey } from "../../config/pageContentSchema";

export const HOME_PAGE_CONTENT_SECTION_ORDER = [
  "hero_ui",
  "entrance",
  "experience",
  "about_extended",
  "catering_overlay",
  "signature",
  "ambience",
] as const;

export type HomePageContentSectionKey = (typeof HOME_PAGE_CONTENT_SECTION_ORDER)[number];

export const ADMIN_PAGES_TAB_ORDER: Array<{ key: PageContentPageKey; label: string }> = [
  { key: "about", label: "About" },
  { key: "menu", label: "Menu" },
  { key: "offers", label: "Offers" },
  { key: "catering", label: "Catering" },
  { key: "parties", label: "Parties" },
  { key: "testimonials", label: "Testimonials" },
  { key: "contact", label: "Contact" },
  { key: "reservation", label: "Reservation" },
  { key: "order", label: "Order" },
  { key: "global", label: "Global" },
];

export function isPageContentTabId(tabId: string): boolean {
  return tabId.startsWith("pc:");
}

export function parsePageContentTabId(tabId: string): string | null {
  if (!isPageContentTabId(tabId)) return null;
  return tabId.slice(3);
}

export function buildPageContentTabId(section: string): string {
  return `pc:${section}`;
}

export const HOME_PAGE_CONTENT_TAB_LABELS: Record<HomePageContentSectionKey, string> = {
  hero_ui: "Hero UI",
  entrance: "Entrance",
  experience: "Experience Cards",
  about_extended: "About Section",
  catering_overlay: "Catering Overlay",
  signature: "Signature",
  ambience: "Ambience",
};
