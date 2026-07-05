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
