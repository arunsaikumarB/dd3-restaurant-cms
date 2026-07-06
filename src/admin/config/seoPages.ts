export { SEO_PAGE_TABS, getSeoPagePath, resolveSeoPageKeyFromPath } from "../../config/seoPages";

export const SEO_EDITOR_SECTIONS = [
  { key: "basic", label: "Basic SEO" },
  { key: "openGraph", label: "Open Graph" },
  { key: "twitter", label: "Twitter" },
  { key: "headings", label: "Headings" },
  { key: "schema", label: "Schema Markup" },
  { key: "content", label: "Content SEO" },
  { key: "faq", label: "FAQ Builder" },
  { key: "imageSeo", label: "Image SEO" },
  { key: "localSeo", label: "Local SEO" },
  { key: "advanced", label: "Advanced SEO" },
  { key: "preview", label: "Live Preview" },
] as const;

export type SeoEditorSectionKey = (typeof SEO_EDITOR_SECTIONS)[number]["key"];
export type SeoEditorSectionTab = { key: SeoEditorSectionKey; label: string };

/** Sections shown in each page's own SEO tab (Pages / Homepage edit view). */
const PAGE_TAB_SECTION_KEYS: SeoEditorSectionKey[] = ["basic", "openGraph", "schema", "advanced"];
export const SEO_PAGE_TAB_SECTIONS: SeoEditorSectionTab[] = SEO_EDITOR_SECTIONS.filter((section) =>
  PAGE_TAB_SECTION_KEYS.includes(section.key),
);

/** Sections shown on the sidebar-level "SEO Summary" page (site-wide, Yoast-style overview). */
const SUMMARY_SECTION_KEYS: SeoEditorSectionKey[] = ["localSeo", "preview"];
export const SEO_SUMMARY_SECTIONS: SeoEditorSectionTab[] = SEO_EDITOR_SECTIONS.filter((section) =>
  SUMMARY_SECTION_KEYS.includes(section.key),
);
