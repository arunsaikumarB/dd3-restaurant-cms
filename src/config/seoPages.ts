import type { SeoPageKey } from "../types/seoMetadata";

export const SEO_PAGE_TABS: Array<{ key: SeoPageKey; label: string; path: string }> = [
  { key: "homepage", label: "Homepage", path: "/" },
  { key: "about", label: "About", path: "/about" },
  { key: "menu", label: "Menu", path: "/menu" },
  { key: "offers", label: "Offers", path: "/special-offers" },
  { key: "gallery", label: "Gallery", path: "/gallery" },
  { key: "testimonials", label: "Testimonials", path: "/testimonials" },
  { key: "reservation", label: "Reservation", path: "/reservation" },
  { key: "contact", label: "Contact", path: "/contact" },
  { key: "private-dining", label: "Private Dining", path: "/parties" },
  { key: "catering", label: "Catering", path: "/catering" },
  { key: "events", label: "Events", path: "/events" },
  { key: "custom", label: "Custom Pages", path: "/custom" },
];

export function getSeoPagePath(pageKey: SeoPageKey): string {
  return SEO_PAGE_TABS.find((tab) => tab.key === pageKey)?.path ?? "/";
}

export function resolveSeoPageKeyFromPath(relativePath: string): SeoPageKey | null {
  const normalized = relativePath.replace(/\/+$/, "") || "/";
  const match = SEO_PAGE_TABS.find((tab) => tab.path === normalized);
  return match?.key ?? null;
}
