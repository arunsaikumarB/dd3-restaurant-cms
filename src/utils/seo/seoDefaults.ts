import { getLocationConfig, type LocationId } from "../../config/locations";
import { PAGE_SEO } from "../../constants/seo";
import { getSeoPagePath } from "../../config/seoPages";
import type { SeoMetadata } from "../../types/database";
import type { Json } from "../../types/database";
import type { SeoFaqItem, SeoMetadataForm, SeoPageKey } from "../../types/seoMetadata";

function parseAddressParts(address: string): { city: string; state: string; zipCode: string } {
  const match = address.match(/,\s*([^,]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/i);
  if (!match) {
    return { city: "", state: "", zipCode: "" };
  }
  return { city: match[1].trim(), state: match[2].trim(), zipCode: match[3].trim() };
}

function pageSeoFallback(pageKey: SeoPageKey): { title: string; description: string } {
  const path = getSeoPagePath(pageKey);
  const config = PAGE_SEO[path] ?? PAGE_SEO["/404"];
  return { title: config.title, description: config.description };
}

function parseJsonObject(value: Json | null | undefined): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function parseStringArray(value: Json | null | undefined): string[] {
  if (!Array.isArray(value)) return [""];
  const items = value.map(String).filter(Boolean);
  return items.length > 0 ? items : [""];
}

function parseFaqs(value: Json | null | undefined): SeoFaqItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const row = item && typeof item === "object" && !Array.isArray(item)
      ? (item as Record<string, unknown>)
      : {};
    return {
      id: String(row.id ?? crypto.randomUUID()),
      question: String(row.question ?? ""),
      answer: String(row.answer ?? ""),
      displayOrder: Number(row.displayOrder ?? index),
      status: row.status === "inactive" ? "inactive" : "active",
    };
  });
}

function parsePartialSection<T extends object>(value: unknown, fallback: T): T {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...fallback, ...(value as Partial<T>) };
  }
  return fallback;
}

export function buildDefaultSeoMetadataForm(
  locationId: LocationId,
  pageKey: SeoPageKey,
): SeoMetadataForm {
  const location = getLocationConfig(locationId);
  const { city, state, zipCode } = parseAddressParts(location.address);
  const fallback = pageSeoFallback(pageKey);
  const slug = getSeoPagePath(pageKey).replace(/^\//, "") || "home";

  return {
    basic: {
      seoTitle: fallback.title,
      metaDescription: fallback.description,
      focusKeyword: "",
      secondaryKeywords: "",
      canonicalUrl: "",
      seoSlug: slug,
      robotsIndex: "index",
    },
    openGraph: {
      ogTitle: fallback.title,
      ogDescription: fallback.description,
      ogImage: "",
      ogLocale: "en_US",
      ogUrl: "",
      ogType: "website",
    },
    twitter: {
      twitterTitle: fallback.title,
      twitterDescription: fallback.description,
      twitterImage: "",
      twitterCardType: "summary_large_image",
    },
    headings: {
      h1: "",
      h2: [""],
      h3: [""],
    },
    schema: {
      schemaTypes: pageKey === "homepage" ? ["Restaurant", "LocalBusiness", "WebSite"] : ["WebSite"],
      jsonLd: "",
      autoGenerate: true,
    },
    content: {
      seoIntroduction: "",
      seoConclusion: "",
      seoFooterContent: "",
    },
    faqs: [],
    imageSeo: {
      defaultAltText: "",
      imageTitle: "",
      imageCaption: "",
      imageDescription: "",
    },
    localSeo: {
      businessName: "Desi Dhamaka",
      restaurantName: location.name,
      cuisineType: "Indian",
      address: location.address,
      city,
      state,
      zipCode,
      country: "United States",
      latitude: "",
      longitude: "",
      phone: location.phone,
      email: location.email,
      googleMapsUrl: location.googleMapsEmbed,
      googleBusinessProfileUrl: "",
      openingHours: location.openingHours.map((row) => `${row.days}: ${row.time}`).join(", "),
      deliveryAvailable: true,
      takeawayAvailable: true,
      reservationAvailable: true,
    },
    advanced: {
      priority: "0.8",
      changeFrequency: "weekly",
      canonicalUrl: "",
      lastModified: "",
      includeInSitemap: true,
      excludeFromSitemap: false,
      noIndex: false,
      noFollow: false,
      noArchive: false,
      noSnippet: false,
    },
  };
}

export function normalizeSeoMetadataForm(
  raw: unknown,
  locationId: LocationId,
  pageKey: SeoPageKey,
): SeoMetadataForm {
  const defaults = buildDefaultSeoMetadataForm(locationId, pageKey);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return defaults;
  }

  const source = raw as Partial<SeoMetadataForm>;
  return {
    basic: { ...defaults.basic, ...(source.basic ?? {}) },
    openGraph: { ...defaults.openGraph, ...(source.openGraph ?? {}) },
    twitter: { ...defaults.twitter, ...(source.twitter ?? {}) },
    headings: {
      h1: source.headings?.h1 ?? defaults.headings.h1,
      h2: Array.isArray(source.headings?.h2) && source.headings.h2.length > 0
        ? source.headings.h2.map(String)
        : defaults.headings.h2,
      h3: Array.isArray(source.headings?.h3) && source.headings.h3.length > 0
        ? source.headings.h3.map(String)
        : defaults.headings.h3,
    },
    schema: { ...defaults.schema, ...(source.schema ?? {}) },
    content: { ...defaults.content, ...(source.content ?? {}) },
    faqs: Array.isArray(source.faqs)
      ? source.faqs.map((item: Partial<SeoMetadataForm["faqs"][number]>, index: number) => ({
          id: String(item?.id ?? crypto.randomUUID()),
          question: String(item?.question ?? ""),
          answer: String(item?.answer ?? ""),
          displayOrder: Number(item?.displayOrder ?? index),
          status: item?.status === "inactive" ? "inactive" : "active",
        }))
      : defaults.faqs,
    imageSeo: { ...defaults.imageSeo, ...(source.imageSeo ?? {}) },
    localSeo: { ...defaults.localSeo, ...(source.localSeo ?? {}) },
    advanced: { ...defaults.advanced, ...(source.advanced ?? {}) },
  };
}

export function rowToSeoForm(
  row: SeoMetadata,
  locationId: LocationId,
  pageKey: SeoPageKey,
): SeoMetadataForm {
  const defaults = buildDefaultSeoMetadataForm(locationId, pageKey);
  const schemaPayload = parseJsonObject(row.schema_json);
  const openGraphExtra = parsePartialSection(schemaPayload.openGraph, defaults.openGraph);
  const twitterExtra = parsePartialSection(schemaPayload.twitter, defaults.twitter);

  return {
    basic: {
      ...defaults.basic,
      seoTitle: row.seo_title ?? defaults.basic.seoTitle,
      metaDescription: row.meta_description ?? defaults.basic.metaDescription,
      focusKeyword: row.focus_keyword ?? "",
      secondaryKeywords: (row.secondary_keywords ?? []).join(", "),
      canonicalUrl: row.canonical_url ?? "",
      seoSlug: row.slug ?? defaults.basic.seoSlug,
      robotsIndex: row.robots === "noindex" ? "noindex" : "index",
    },
    openGraph: {
      ...defaults.openGraph,
      ...openGraphExtra,
      ogTitle: row.og_title ?? defaults.openGraph.ogTitle,
      ogDescription: row.og_description ?? defaults.openGraph.ogDescription,
      ogImage: row.og_image ?? "",
      ogLocale: row.og_location ?? defaults.openGraph.ogLocale,
    },
    twitter: {
      ...defaults.twitter,
      ...twitterExtra,
      twitterTitle: row.twitter_title ?? defaults.twitter.twitterTitle,
      twitterDescription: row.twitter_description ?? defaults.twitter.twitterDescription,
      twitterImage: row.twitter_image ?? "",
    },
    headings: {
      h1: row.h1 ?? "",
      h2: parseStringArray(row.h2),
      h3: parseStringArray(row.h3),
    },
    schema: {
      ...defaults.schema,
      schemaTypes: Array.isArray(schemaPayload.schemaTypes)
        ? (schemaPayload.schemaTypes as SeoMetadataForm["schema"]["schemaTypes"])
        : defaults.schema.schemaTypes,
      jsonLd: typeof schemaPayload.jsonLd === "string" ? schemaPayload.jsonLd : "",
      autoGenerate:
        typeof schemaPayload.autoGenerate === "boolean"
          ? schemaPayload.autoGenerate
          : defaults.schema.autoGenerate,
    },
    content: {
      seoIntroduction: row.seo_intro ?? "",
      seoConclusion: row.conclusion ?? "",
      seoFooterContent: row.seo_footer_content ?? "",
    },
    faqs: parseFaqs(row.faq),
    imageSeo: parsePartialSection(schemaPayload.imageSeo, defaults.imageSeo),
    localSeo: parsePartialSection(schemaPayload.localSeo, defaults.localSeo),
    advanced: parsePartialSection(schemaPayload.advanced, defaults.advanced),
  };
}

export function formToDbRow(
  form: SeoMetadataForm,
  locationId: LocationId,
  pageKey: SeoPageKey,
): Omit<SeoMetadata, "id" | "created_at" | "updated_at"> {
  const secondaryKeywords = form.basic.secondaryKeywords
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    location_id: locationId,
    page_key: pageKey,
    seo_title: form.basic.seoTitle || null,
    meta_description: form.basic.metaDescription || null,
    focus_keyword: form.basic.focusKeyword || null,
    secondary_keywords: secondaryKeywords,
    canonical_url: form.basic.canonicalUrl || form.advanced.canonicalUrl || null,
    slug: form.basic.seoSlug || null,
    robots: form.basic.robotsIndex,
    og_title: form.openGraph.ogTitle || null,
    og_description: form.openGraph.ogDescription || null,
    og_image: form.openGraph.ogImage || null,
    og_location: form.openGraph.ogLocale || null,
    twitter_title: form.twitter.twitterTitle || null,
    twitter_description: form.twitter.twitterDescription || null,
    twitter_image: form.twitter.twitterImage || null,
    schema_json: {
      jsonLd: form.schema.jsonLd,
      schemaTypes: form.schema.schemaTypes,
      autoGenerate: form.schema.autoGenerate,
      openGraph: {
        ogUrl: form.openGraph.ogUrl,
        ogType: form.openGraph.ogType,
      },
      twitter: {
        twitterCardType: form.twitter.twitterCardType,
      },
      imageSeo: form.imageSeo,
      localSeo: form.localSeo,
      advanced: form.advanced,
    },
    h1: form.headings.h1 || null,
    h2: form.headings.h2,
    h3: form.headings.h3,
    seo_intro: form.content.seoIntroduction || null,
    seo_footer_content: form.content.seoFooterContent || null,
    conclusion: form.content.seoConclusion || null,
    faq: form.faqs as unknown as Json,
  };
}

/** @deprecated Use formToDbRow for database writes. */
export function formToSeoPayload(form: SeoMetadataForm): SeoMetadataForm {
  return JSON.parse(JSON.stringify(form)) as SeoMetadataForm;
}
