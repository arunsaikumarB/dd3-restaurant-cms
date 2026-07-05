import { getLocationConfig, type LocationId } from "../../config/locations";
import { PAGE_SEO } from "../../constants/seo";
import { getSeoPagePath } from "../../config/seoPages";
import type { SeoMetadataForm, SeoPageKey } from "../../types/seoMetadata";

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
      openingHours: location.openingHours.weekday,
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
  row: { data: unknown },
  locationId: LocationId,
  pageKey: SeoPageKey,
): SeoMetadataForm {
  return normalizeSeoMetadataForm(row.data, locationId, pageKey);
}

export function formToSeoPayload(form: SeoMetadataForm): SeoMetadataForm {
  return JSON.parse(JSON.stringify(form)) as SeoMetadataForm;
}
