import { getLocationConfig, LOCATIONS, type LocationId } from "../../../config/locations";
import { getOrderUrl } from "../../../data/chefgaaNameMap";
import { locPath } from "../../../utils/locationPaths";
import {
  fetchHomepageBundle,
  formatOpeningHoursRows,
} from "../../homepagePublic";
import { fetchPublicOffersData } from "../../offersPublic";
import { fetchPublicGalleryData } from "../../galleryPublic";
import { fetchPublicReviewsData } from "../../reviewsPublic";
import { getSeoMetadataMap } from "../../seoMetadataPublic";
import type { SeoPageKey } from "../../../types/seoMetadata";
import type {
  CMSGalleryItem,
  CMSHomepage,
  CMSKnowledge,
  CMSLocationSettings,
  CMSModuleKey,
  CMSModuleSlice,
  CMSOffer,
  CMSRestaurantSettings,
  CMSReview,
  CMSSeoPage,
} from "./types";

function trimText(value: unknown, max = 280): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function slice<T>(key: CMSModuleKey, data: T | null): CMSModuleSlice<T> {
  const available = data !== null && (Array.isArray(data) ? data.length > 0 : true);
  return { key, available, data: available ? data : null };
}

function loadRestaurantSettings(bundle: Awaited<ReturnType<typeof fetchHomepageBundle>>) {
  const settings = bundle.settings;
  const hasCore =
    Boolean(settings.restaurant_name?.trim()) ||
    Boolean(settings.phone?.trim()) ||
    Boolean(settings.address?.trim());

  if (!hasCore) return null;

  const data: CMSRestaurantSettings = {
    name: settings.restaurant_name.trim(),
    phone: settings.phone.trim(),
    phones: settings.phones.filter(Boolean),
    email: settings.email.trim(),
    address: settings.address.trim(),
    hours: formatOpeningHoursRows(settings.opening_hours).filter((h) => h.days || h.time),
    orderUrl: settings.order_url.trim(),
    reservationUrl: settings.reservation_url.trim(),
    googleMaps: settings.google_maps.trim(),
    social: {
      instagram: settings.instagram.trim() || undefined,
      facebook: settings.facebook.trim() || undefined,
      youtube: settings.youtube.trim() || undefined,
    },
  };

  return data;
}

function loadHomepage(bundle: Awaited<ReturnType<typeof fetchHomepageBundle>>): CMSHomepage | null {
  const { content } = bundle;
  const hasContent =
    Boolean(content.hero_title?.trim()) ||
    Boolean(content.about_description?.trim()) ||
    Boolean(content.hero_subtitle?.trim());

  if (!hasContent) return null;

  return {
    heroTitle: trimText(content.hero_title, 120),
    heroSubtitle: trimText(content.hero_subtitle, 240),
    aboutTitle: trimText(content.about_title, 120),
    aboutDescription: trimText(content.about_description, 400),
    primaryCta: {
      label: content.primary_cta.label.trim(),
      url: content.primary_cta.url.trim(),
    },
    secondaryCta: {
      label: content.secondary_cta.label.trim(),
      url: content.secondary_cta.url.trim(),
    },
  };
}

function loadOffers(rows: Awaited<ReturnType<typeof fetchPublicOffersData>>): CMSOffer[] {
  return rows
    .map((offer) => ({
      title: offer.title.trim(),
      description: trimText(offer.description, 220),
      slug: offer.slug.trim(),
      badge: offer.badge?.trim() || null,
    }))
    .filter((offer) => offer.title);
}

function loadGallery(rows: Awaited<ReturnType<typeof fetchPublicGalleryData>>, locationId: LocationId): CMSGalleryItem[] {
  return rows
    .filter((item) => item.location_id === "all" || item.location_id === locationId)
    .map((item) => ({
      title: item.title.trim() || item.alt_text.trim(),
      caption: trimText(item.caption, 160),
      category: item.category.trim(),
      featured: item.featured,
    }))
    .filter((item) => item.title || item.caption);
}

function loadReviews(rows: Awaited<ReturnType<typeof fetchPublicReviewsData>>): CMSReview[] {
  return rows
    .map((review) => ({
      name: review.name.trim(),
      rating: review.rating,
      excerpt: trimText(review.text, 180),
    }))
    .filter((review) => review.name && review.excerpt);
}

function loadSeo(map: Awaited<ReturnType<typeof getSeoMetadataMap>>): CMSSeoPage[] {
  const pages: CMSSeoPage[] = [];
  for (const [pageKey, form] of Object.entries(map)) {
    if (!form) continue;
    const title = form.basic.seoTitle?.trim() ?? "";
    const description = form.basic.metaDescription?.trim() ?? "";
    const keywords = [form.basic.focusKeyword, form.basic.secondaryKeywords]
      .map((value) => value?.trim())
      .filter(Boolean)
      .join(", ");
    if (!title && !description) continue;
    pages.push({
      pageKey,
      title,
      description: trimText(description, 280),
      keywords,
    });
  }
  return pages;
}

function loadLocationSettings(locationId: LocationId): CMSLocationSettings {
  const config = getLocationConfig(locationId);
  return {
    id: config.id,
    name: config.name,
    shortName: config.shortName,
    address: config.address,
    phone: config.phone,
    email: config.email,
    reservationLink: config.reservationLink,
    orderDirectLink: config.orderDirectLink,
    openingHours: config.openingHours.map((row) => ({ days: row.days, time: row.time })),
  };
}

function buildNavigation(
  locationId: LocationId,
  settings: CMSRestaurantSettings | null,
): Record<string, string> {
  const orderUrl = settings?.orderUrl?.trim() || getOrderUrl(locationId);
  return {
    home: locPath(locationId, "/"),
    about: locPath(locationId, "/about"),
    menu: orderUrl,
    catering: locPath(locationId, "/catering"),
    parties: locPath(locationId, "/parties"),
    reservation: locPath(locationId, "/reservation"),
    order: locPath(locationId, "/online-ordering"),
    offers: locPath(locationId, "/special-offers"),
    contact: locPath(locationId, "/contact"),
    gallery: locPath(locationId, "/gallery"),
    testimonials: locPath(locationId, "/testimonials"),
  };
}

/** Aggregates live CMS data from all registered modules. */
export async function buildCMSKnowledge(locationId: LocationId): Promise<CMSKnowledge> {
  const config = getLocationConfig(locationId);

  const [bundle, offers, gallery, reviews, seoMap] = await Promise.all([
    fetchHomepageBundle(locationId),
    fetchPublicOffersData(locationId),
    fetchPublicGalleryData(),
    fetchPublicReviewsData(locationId),
    getSeoMetadataMap(locationId),
  ]);

  const restaurantData = loadRestaurantSettings(bundle);
  const homepageData = loadHomepage(bundle);
  const offersData = loadOffers(offers);
  const galleryData = loadGallery(gallery, locationId);
  const reviewsData = loadReviews(reviews);
  const seoData = loadSeo(seoMap);
  const locationData = loadLocationSettings(locationId);

  return {
    locationId,
    locationName: config.name,
    generatedAt: new Date().toISOString(),
    navigation: buildNavigation(locationId, restaurantData),
    modules: {
      restaurantSettings: slice("restaurantSettings", restaurantData),
      homepage: slice("homepage", homepageData),
      offers: slice("offers", offersData),
      gallery: slice("gallery", galleryData),
      reviews: slice("reviews", reviewsData),
      seo: slice("seo", seoData),
      locationSettings: slice("locationSettings", locationData),
    },
  };
}

/** All configured public locations — from Location Settings module. */
export function listCMSLocations(): CMSLocationSettings[] {
  return (Object.keys(LOCATIONS) as LocationId[]).map(loadLocationSettings);
}

export function getSeoPage(knowledge: CMSKnowledge, pageKey: SeoPageKey): CMSSeoPage | null {
  const seo = knowledge.modules.seo.data;
  if (!seo) return null;
  return seo.find((page) => page.pageKey === pageKey) ?? null;
}
