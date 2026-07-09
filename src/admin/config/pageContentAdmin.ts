import type { PageContentPageKey } from "../../config/pageContentSchema";
import type { SeoPageKey } from "../../types/seoMetadata";

export const HOME_PAGE_CONTENT_SECTION_ORDER = [
  "hero_ui",
  "entrance",
  "experience",
  "about_extended",
  "catering_overlay",
  "signature",
  "offers_teaser",
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
  { key: "privacy_policy", label: "Privacy Policy" },
  { key: "terms_conditions", label: "Terms & Conditions" },
  { key: "global", label: "Global" },
];

/** Maps a Pages-section tab to its corresponding SEO page key, where one exists. */
export const PAGE_CONTENT_TO_SEO_KEY: Partial<Record<PageContentPageKey, SeoPageKey>> = {
  home: "homepage",
  about: "about",
  menu: "menu",
  offers: "offers",
  catering: "catering",
  parties: "private-dining",
  testimonials: "testimonials",
  contact: "contact",
  reservation: "reservation",
};

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
  offers_teaser: "Offers Teaser",
  ambience: "Ambience",
};
