import { queryCMSKnowledge } from "../../cms/knowledge";
import { detectIntent } from "../emotionEngine";
import type { ToolExecutionContext, ToolExecutionResult, ToolName } from "./types";

function ok(tool: ToolName, available: boolean, data: unknown): ToolExecutionResult {
  return { tool, available, data };
}

function unavailable(tool: ToolName): ToolExecutionResult {
  return { tool, available: false, data: null };
}

export function executeGetRestaurantInfo(ctx: ToolExecutionContext): ToolExecutionResult {
  const { knowledge } = ctx;
  const settings = knowledge.modules.restaurantSettings;
  const homepage = knowledge.modules.homepage.data;
  const location = knowledge.modules.locationSettings.data;

  if (!settings.available || !settings.data) {
    return unavailable("getRestaurantInfo");
  }

  const data = settings.data;
  return ok("getRestaurantInfo", true, {
    name: data.name || knowledge.locationName,
    description: homepage?.aboutDescription || homepage?.heroSubtitle || "",
    address: data.address || location?.address || "",
    phone: data.phone || location?.phone || "",
    email: data.email || location?.email || "",
    website: knowledge.navigation.home || "",
    hours: data.hours.length > 0 ? data.hours : location?.openingHours ?? [],
    social: data.social,
    orderUrl: data.orderUrl || location?.orderDirectLink || knowledge.navigation.order,
    reservationUrl: data.reservationUrl || location?.reservationLink || knowledge.navigation.reservation,
    googleMaps: data.googleMaps,
  });
}

export function executeGetHomepageContent(ctx: ToolExecutionContext): ToolExecutionResult {
  const { knowledge } = ctx;
  const homepage = knowledge.modules.homepage;
  if (!homepage.available || !homepage.data) {
    return unavailable("getHomepageContent");
  }

  const data = homepage.data;
  const offers = knowledge.modules.offers.data ?? [];

  return ok("getHomepageContent", true, {
    hero: {
      title: data.heroTitle,
      subtitle: data.heroSubtitle,
    },
    about: {
      title: data.aboutTitle,
      description: data.aboutDescription,
    },
    story: data.aboutDescription,
    features: [data.primaryCta, data.secondaryCta].filter((cta) => cta.label && cta.url),
    highlights: offers.slice(0, 3).map((offer) => ({
      title: offer.title,
      badge: offer.badge,
    })),
    offersCount: offers.length,
  });
}

export function executeGetOffers(ctx: ToolExecutionContext): ToolExecutionResult {
  const { knowledge } = ctx;
  const offers = knowledge.modules.offers;
  if (!offers.available || !offers.data?.length) {
    return unavailable("getOffers");
  }

  const basePath = knowledge.navigation.offers;
  return ok("getOffers", true, {
    offers: offers.data.map((offer) => ({
      title: offer.title,
      description: offer.description,
      badge: offer.badge,
      slug: offer.slug,
      ctaUrl: offer.slug ? `${basePath}#${offer.slug}` : basePath,
    })),
    count: offers.data.length,
  });
}

export function executeGetGallery(ctx: ToolExecutionContext): ToolExecutionResult {
  const { knowledge } = ctx;
  const gallery = knowledge.modules.gallery;
  if (!gallery.available || !gallery.data?.length) {
    return unavailable("getGallery");
  }

  const items = gallery.data;
  const categories = [...new Set(items.map((item) => item.category).filter(Boolean))];
  const featured = items.filter((item) => item.featured);

  return ok("getGallery", true, {
    images: items.map((item) => ({
      title: item.title,
      caption: item.caption,
      category: item.category,
      featured: item.featured,
    })),
    categories,
    featuredImages: featured.length > 0 ? featured : items.slice(0, 6),
    count: items.length,
    galleryUrl: knowledge.navigation.gallery,
  });
}

export function executeGetReviews(ctx: ToolExecutionContext): ToolExecutionResult {
  const { knowledge } = ctx;
  const reviews = knowledge.modules.reviews;
  if (!reviews.available || !reviews.data?.length) {
    return unavailable("getReviews");
  }

  const items = reviews.data;
  const rating =
    Math.round((items.reduce((sum, review) => sum + review.rating, 0) / items.length) * 10) / 10;
  const featured = items.filter((review) => review.rating >= 4).slice(0, 5);

  return ok("getReviews", true, {
    rating,
    reviewCount: items.length,
    testimonials: items.slice(0, 8).map((review) => ({
      name: review.name,
      rating: review.rating,
      excerpt: review.excerpt,
    })),
    featuredReviews: featured.length > 0 ? featured : items.slice(0, 3),
    testimonialsUrl: knowledge.navigation.testimonials,
  });
}

export function executeGetSEO(ctx: ToolExecutionContext): ToolExecutionResult {
  const { knowledge } = ctx;
  const seo = knowledge.modules.seo;
  if (!seo.available || !seo.data?.length) {
    return unavailable("getSEO");
  }

  return ok("getSEO", true, {
    pages: seo.data.map((page) => ({
      pageKey: page.pageKey,
      title: page.title,
      description: page.description,
      keywords: page.keywords,
    })),
    count: seo.data.length,
  });
}

export function executeGetCurrentLocation(ctx: ToolExecutionContext): ToolExecutionResult {
  const { knowledge } = ctx;
  const location = knowledge.modules.locationSettings;

  return ok("getCurrentLocation", location.available, {
    locationId: knowledge.locationId,
    locationName: knowledge.locationName,
    shortName: location.data?.shortName ?? knowledge.locationName,
    address: location.data?.address ?? "",
    phone: location.data?.phone ?? "",
    email: location.data?.email ?? "",
    hours: location.data?.openingHours ?? [],
    orderUrl: location.data?.orderDirectLink ?? knowledge.navigation.order,
    reservationUrl: location.data?.reservationLink ?? knowledge.navigation.reservation,
  });
}

const NAV_INTENT_PAGES: Partial<Record<string, string[]>> = {
  menu: ["menu"],
  vegetarian: ["menu"],
  recommend: ["menu"],
  kids: ["menu"],
  offers: ["offers"],
  gallery: ["gallery"],
  greeting: ["home", "about"],
  hours: ["contact"],
  contact: ["contact"],
  location: ["contact"],
  order: ["order"],
  reservation: ["reservation"],
  catering: ["catering"],
  party: ["parties"],
  buffet: ["menu", "catering"],
  faq: ["contact", "offers"],
  unknown: ["home"],
};

export function executeNavigateToPage(ctx: ToolExecutionContext): ToolExecutionResult {
  const { knowledge, message } = ctx;
  const intent = detectIntent(message);
  const query = queryCMSKnowledge(intent, knowledge);
  const pageKeys = NAV_INTENT_PAGES[intent] ?? NAV_INTENT_PAGES.unknown ?? ["home"];

  const suggested: Record<string, string> = {};
  for (const key of pageKeys) {
    const path = knowledge.navigation[key];
    if (path) suggested[key] = path;
  }

  return ok("navigateToPage", true, {
    intent,
    suggestedPages: suggested,
    navigation: knowledge.navigation,
    suggestedModules: query.modules,
  });
}

export const TOOL_HANDLERS: Record<ToolName, (ctx: ToolExecutionContext) => ToolExecutionResult> = {
  getRestaurantInfo: executeGetRestaurantInfo,
  getHomepageContent: executeGetHomepageContent,
  getOffers: executeGetOffers,
  getGallery: executeGetGallery,
  getReviews: executeGetReviews,
  getSEO: executeGetSEO,
  getCurrentLocation: executeGetCurrentLocation,
  navigateToPage: executeNavigateToPage,
};
