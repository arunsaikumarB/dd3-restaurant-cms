import { getSiteUrl } from "../../config/env";
import type { LocationId } from "../../config/locations";
import { getSeoPagePath } from "../../config/seoPages";
import type { SeoMetadataForm, SeoPageKey } from "../../types/seoMetadata";

function buildRestaurantNode(form: SeoMetadataForm, siteUrl: string, pagePath: string) {
  const local = form.localSeo;
  return {
    "@type": "Restaurant",
    name: local.restaurantName || local.businessName,
    image: form.openGraph.ogImage || undefined,
    telephone: local.phone || undefined,
    email: local.email || undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: local.address,
      addressLocality: local.city,
      addressRegion: local.state,
      postalCode: local.zipCode,
      addressCountry: local.country || "US",
    },
    geo:
      local.latitude && local.longitude
        ? {
            "@type": "GeoCoordinates",
            latitude: local.latitude,
            longitude: local.longitude,
          }
        : undefined,
    servesCuisine: local.cuisineType || "Indian",
    url: `${siteUrl}${pagePath}`,
    openingHours: local.openingHours || undefined,
  };
}

function buildFaqNode(form: SeoMetadataForm) {
  const activeFaqs = form.faqs
    .filter((faq) => faq.status === "active" && faq.question.trim() && faq.answer.trim())
    .sort((a, b) => a.displayOrder - b.displayOrder);

  if (activeFaqs.length === 0) return null;

  return {
    "@type": "FAQPage",
    mainEntity: activeFaqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function generateSeoJsonLd(
  form: SeoMetadataForm,
  locationId: LocationId,
  pageKey: SeoPageKey,
): string {
  const siteUrl = getSiteUrl();
  const pagePath = `/${locationId}${getSeoPagePath(pageKey)}`.replace(/\/+$/, "") || `/${locationId}`;
  const graph: Record<string, unknown>[] = [];

  if (form.schema.schemaTypes.includes("WebSite")) {
    graph.push({
      "@type": "WebSite",
      name: form.localSeo.businessName || "Desi Dhamaka",
      url: `${siteUrl}/${locationId}`,
    });
  }

  if (
    form.schema.schemaTypes.includes("Restaurant") ||
    form.schema.schemaTypes.includes("LocalBusiness")
  ) {
    graph.push(buildRestaurantNode(form, siteUrl, pagePath));
  }

  if (form.schema.schemaTypes.includes("Organization")) {
    graph.push({
      "@type": "Organization",
      name: form.localSeo.businessName || "Desi Dhamaka",
      url: `${siteUrl}/${locationId}`,
      logo: form.openGraph.ogImage || undefined,
    });
  }

  const faqNode = form.schema.schemaTypes.includes("FAQPage") ? buildFaqNode(form) : null;
  if (faqNode) graph.push(faqNode);

  const payload = {
    "@context": "https://schema.org",
    "@graph": graph.filter(Boolean),
  };

  return JSON.stringify(payload, null, 2);
}

export function resolveEffectiveJsonLd(
  form: SeoMetadataForm,
  locationId: LocationId,
  pageKey: SeoPageKey,
): string {
  if (form.schema.autoGenerate) {
    return generateSeoJsonLd(form, locationId, pageKey);
  }
  return form.schema.jsonLd.trim();
}
