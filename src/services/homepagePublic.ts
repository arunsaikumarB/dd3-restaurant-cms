import { getOrderUrl } from "../data/chefgaaNameMap";
import { SITE } from "../constants/site";
import { getSiteUrl } from "../config/env";
import type { LocationId } from "../config/locations";
import type { HomepageContent } from "../types/database";
import { fetchHomepageContentPublic } from "./homepageContent";
import {
  buildDefaultRestaurantSettings,
  fetchRestaurantSettingsPublic,
  type OpeningHoursForm,
} from "./restaurantSettings";
import type { RestaurantSettings } from "../types/database";

export type PublicHomepageCta = {
  label: string;
  url: string;
};

export type PublicHomepageContent = {
  hero_title: string;
  hero_subtitle: string;
  hero_image: string;
  hero_video: string;
  primary_cta: PublicHomepageCta;
  secondary_cta: PublicHomepageCta;
  about_title: string;
  about_description: string;
};

export type PublicRestaurantSettings = {
  restaurant_name: string;
  phone: string;
  email: string;
  address: string;
  google_maps: string;
  opening_hours: OpeningHoursForm;
  facebook: string;
  instagram: string;
  youtube: string;
  logo: string | null;
  reservation_url: string;
  order_url: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
};

export type HomepageBundle = {
  content: PublicHomepageContent;
  settings: PublicRestaurantSettings;
};

const HERO_TITLE_FALLBACK = "Step inside\nthe experience";
const HERO_SUBTITLE_FALLBACK =
  "Scroll to walk through our doors — from the entrance to the heart of the reception, frame by cinematic frame.";
const HERO_IMAGE_FALLBACK = "/hero/hero-poster.jpg";
const HERO_VIDEO_FALLBACK = "/media/hero.mp4";
const ABOUT_TITLE_FALLBACK = "Authentic Flavours,\nWarm Hospitality";
const ABOUT_DESCRIPTION_FALLBACK =
  "Experience authentic Indian cuisine crafted with passion and served with genuine hospitality.";

const CACHE_TTL_MS = 60_000;

let cachedBundleByLocation: Partial<Record<LocationId, HomepageBundle>> = {};
let cacheExpiresAtByLocation: Partial<Record<LocationId, number>> = {};
const inflightByLocation: Partial<Record<LocationId, Promise<HomepageBundle>>> = {};

export function getHomepageFallbacks(locationId: LocationId = "south-plainfield"): HomepageBundle {
  const defaults = buildDefaultRestaurantSettings(locationId);
  const defaultHours = defaults.opening_hours as OpeningHoursForm;

  return {
    content: {
      hero_title: HERO_TITLE_FALLBACK,
      hero_subtitle: HERO_SUBTITLE_FALLBACK,
      hero_image: HERO_IMAGE_FALLBACK,
      hero_video: HERO_VIDEO_FALLBACK,
      primary_cta: { label: "Order Now", url: defaults.order_url || getOrderUrl(locationId) },
      secondary_cta: { label: "View Menu", url: "/menu" },
      about_title: ABOUT_TITLE_FALLBACK,
      about_description: ABOUT_DESCRIPTION_FALLBACK,
    },
    settings: {
      restaurant_name: defaults.restaurant_name,
      phone: defaults.phone ?? SITE.phone,
      email: defaults.email ?? SITE.email,
      address: defaults.address ?? SITE.address,
      google_maps: defaults.google_maps ?? SITE.mapEmbed,
      opening_hours: {
        weekday: defaultHours.weekday || SITE.hours[0].time,
        weekend: defaultHours.weekend || SITE.hours[1].time,
        sunday: defaultHours.sunday || SITE.hours[2].time,
      },
      facebook: defaults.facebook ?? SITE.social.facebook,
      instagram: defaults.instagram ?? SITE.social.instagram,
      youtube: defaults.youtube ?? "",
      logo: defaults.logo,
      reservation_url: defaults.reservation_url ?? "",
      order_url: defaults.order_url ?? getOrderUrl(locationId),
      seo_title: "",
      seo_description: "",
      seo_keywords: "",
    },
  };
}

function parseOpeningHours(
  value: RestaurantSettings["opening_hours"],
  locationId: LocationId,
): OpeningHoursForm {
  const fallbacks = getHomepageFallbacks(locationId).settings.opening_hours;

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallbacks;
  }

  const hours = value as Record<string, string>;
  return {
    weekday: hours.weekday?.trim() || fallbacks.weekday,
    weekend: hours.weekend?.trim() || fallbacks.weekend,
    sunday: hours.sunday?.trim() || fallbacks.sunday,
  };
}

function mapCta(
  label: string | null | undefined,
  url: string | null | undefined,
  fallback: PublicHomepageCta,
): PublicHomepageCta {
  return {
    label: label?.trim() || fallback.label,
    url: url?.trim() || fallback.url,
  };
}

function mapHomepageContent(row: HomepageContent | null, locationId: LocationId): PublicHomepageContent {
  const fallbacks = getHomepageFallbacks(locationId).content;

  return {
    hero_title: row?.hero_title?.trim() || fallbacks.hero_title,
    hero_subtitle: row?.hero_subtitle?.trim() || fallbacks.hero_subtitle,
    hero_image: row?.hero_image?.trim() || fallbacks.hero_image,
    hero_video: row?.hero_video?.trim() || fallbacks.hero_video,
    primary_cta: mapCta(row?.primary_cta_label, row?.primary_cta_url, fallbacks.primary_cta),
    secondary_cta: mapCta(
      row?.secondary_cta_label,
      row?.secondary_cta_url,
      fallbacks.secondary_cta,
    ),
    about_title: row?.about_title?.trim() || fallbacks.about_title,
    about_description: row?.about_description?.trim() || fallbacks.about_description,
  };
}

function mapRestaurantSettings(
  row: RestaurantSettings | null,
  locationId: LocationId,
): PublicRestaurantSettings {
  const fallbacks = getHomepageFallbacks(locationId).settings;

  return {
    restaurant_name: row?.restaurant_name?.trim() || fallbacks.restaurant_name,
    phone: row?.phone?.trim() || fallbacks.phone,
    email: row?.email?.trim() || fallbacks.email,
    address: row?.address?.trim() || fallbacks.address,
    google_maps: row?.google_maps?.trim() || fallbacks.google_maps,
    opening_hours: parseOpeningHours(row?.opening_hours ?? null, locationId),
    facebook: row?.facebook?.trim() || fallbacks.facebook,
    instagram: row?.instagram?.trim() || fallbacks.instagram,
    youtube: row?.youtube?.trim() || fallbacks.youtube,
    logo: row?.logo?.trim() || fallbacks.logo,
    reservation_url: row?.reservation_url?.trim() || fallbacks.reservation_url,
    order_url: row?.order_url?.trim() || fallbacks.order_url,
    seo_title: row?.seo_title?.trim() || fallbacks.seo_title,
    seo_description: row?.seo_description?.trim() || fallbacks.seo_description,
    seo_keywords: row?.seo_keywords?.trim() || fallbacks.seo_keywords,
  };
}

export function splitTitleLines(title: string): string[] {
  const lines = title
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.length > 0 ? lines : [title];
}

export function formatWeekdayHoursLabel(hours: OpeningHoursForm): string {
  return `Mon – Thu · ${hours.weekday}`;
}

export function formatOpeningHoursRows(
  hours: OpeningHoursForm,
): { days: string; time: string }[] {
  return [
    { days: "Mon – Thu", time: hours.weekday },
    { days: "Fri – Sat", time: hours.weekend },
    { days: "Sun", time: hours.sunday },
  ];
}

export function buildPublicSocialLinks(
  settings: PublicRestaurantSettings,
): Record<string, string> {
  const links: Record<string, string> = {};

  if (settings.instagram.trim()) links.instagram = settings.instagram.trim();
  if (settings.facebook.trim()) links.facebook = settings.facebook.trim();
  if (settings.youtube.trim()) links.youtube = settings.youtube.trim();

  for (const [name, url] of Object.entries(SITE.social)) {
    if (!links[name] && url.trim()) {
      links[name] = url.trim();
    }
  }

  return links;
}

export type PublicContactCard = {
  id: string;
  title: string;
  value: string;
  href?: string;
  icon: "phone" | "email" | "location" | "clock";
};

export function buildReservationContactCards(
  settings: PublicRestaurantSettings,
): PublicContactCard[] {
  const hours = formatOpeningHoursRows(settings.opening_hours)
    .map((row) => `${row.days}: ${row.time}`)
    .join(" · ");

  return [
    {
      id: "phone",
      title: "Call Us",
      value: settings.phone,
      href: `tel:${settings.phone.replace(/\D/g, "")}`,
      icon: "phone",
    },
    {
      id: "email",
      title: "Email",
      value: settings.email,
      href: `mailto:${settings.email}`,
      icon: "email",
    },
    {
      id: "visit",
      title: "Visit Us",
      value: settings.address,
      icon: "location",
    },
    {
      id: "hours",
      title: "Business Hours",
      value: hours,
      icon: "clock",
    },
  ];
}

function parseDisplayTimeTo24Hour(timeStr: string): string | null {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let hours = Number.parseInt(match[1], 10);
  const minutes = match[2];
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, "0")}:${minutes}`;
}

function parseHoursRangeToSpecification(
  dayOfWeek: string | string[],
  range: string,
): Record<string, unknown> | null {
  const [openStr, closeStr] = range.split(/[–-]/).map((part) => part.trim());
  const opens = parseDisplayTimeTo24Hour(openStr);
  const closes = parseDisplayTimeTo24Hour(closeStr);
  if (!opens || !closes) return null;

  return {
    "@type": "OpeningHoursSpecification",
    dayOfWeek,
    opens,
    closes,
  };
}

function buildOpeningHoursSpecification(hours: OpeningHoursForm): Record<string, unknown>[] {
  const specs = [
    parseHoursRangeToSpecification(
      ["Monday", "Tuesday", "Wednesday", "Thursday"],
      hours.weekday,
    ),
    parseHoursRangeToSpecification(["Friday", "Saturday"], hours.weekend),
    parseHoursRangeToSpecification("Sunday", hours.sunday),
  ];

  return specs.filter((spec): spec is Record<string, unknown> => spec !== null);
}

function parsePostalAddress(address: string) {
  const parts = address.split(",").map((part) => part.trim());
  if (parts.length >= 3) {
    const stateZip = parts[parts.length - 1].match(/^([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
    return {
      streetAddress: parts.slice(0, -2).join(", ") || parts[0],
      addressLocality: parts[parts.length - 2],
      addressRegion: stateZip?.[1] ?? SITE.state,
      postalCode: stateZip?.[2] ?? SITE.postalCode,
      addressCountry: SITE.country,
    };
  }

  return {
    streetAddress: address,
    addressLocality: SITE.city,
    addressRegion: SITE.state,
    postalCode: SITE.postalCode,
    addressCountry: SITE.country,
  };
}

function absolutePublicUrl(pathOrUrl: string | null | undefined, fallbackPath: string): string {
  const value = pathOrUrl?.trim() || fallbackPath;
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  return `${getSiteUrl()}${value.startsWith("/") ? value : `/${value}`}`;
}

/** Schema.org JSON-LD aligned with live restaurant_settings. */
export function buildRestaurantJsonLd(
  settings: PublicRestaurantSettings,
  path: string,
) {
  const siteUrl = getSiteUrl();
  const pageUrl = `${siteUrl}${path === "/" ? "" : path}`;
  const address = parsePostalAddress(settings.address);
  const image = absolutePublicUrl(settings.logo, SITE.ogImage);
  const openingHoursSpecification = buildOpeningHoursSpecification(settings.opening_hours);

  return [
    {
      "@context": "https://schema.org",
      "@type": "Restaurant",
      name: settings.restaurant_name,
      description:
        "Authentic Indian restaurant in Lawrenceville, NJ specializing in Andhra and Hyderabadi cuisine.",
      url: siteUrl,
      telephone: settings.phone,
      email: settings.email,
      image,
      address: {
        "@type": "PostalAddress",
        ...address,
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: SITE.geo.latitude,
        longitude: SITE.geo.longitude,
      },
      servesCuisine: ["Indian", "Andhra", "Hyderabadi"],
      priceRange: "$$",
      openingHoursSpecification,
    },
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: settings.restaurant_name,
      url: pageUrl,
      telephone: settings.phone,
      email: settings.email,
      image,
      address: {
        "@type": "PostalAddress",
        ...address,
      },
    },
  ];
}

export async function fetchHomepageBundle(
  locationId: LocationId = "lawrenceville",
): Promise<HomepageBundle> {
  const now = Date.now();
  const cached = cachedBundleByLocation[locationId];
  const cacheExpiresAt = cacheExpiresAtByLocation[locationId] ?? 0;
  if (cached && now < cacheExpiresAt) {
    return cached;
  }

  const inflight = inflightByLocation[locationId];
  if (inflight) {
    return inflight;
  }

  const request = (async () => {
    try {
      const [homepageRow, settingsRow] = await Promise.all([
        fetchHomepageContentPublic(locationId),
        fetchRestaurantSettingsPublic(locationId),
      ]);

      const bundle: HomepageBundle = {
        content: mapHomepageContent(homepageRow, locationId),
        settings: mapRestaurantSettings(settingsRow, locationId),
      };

      cachedBundleByLocation[locationId] = bundle;
      cacheExpiresAtByLocation[locationId] = Date.now() + CACHE_TTL_MS;
      return bundle;
    } catch {
      const fallback = getHomepageFallbacks(locationId);
      cachedBundleByLocation[locationId] = fallback;
      cacheExpiresAtByLocation[locationId] = Date.now() + CACHE_TTL_MS;
      return fallback;
    } finally {
      delete inflightByLocation[locationId];
    }
  })();

  inflightByLocation[locationId] = request;
  return request;
}
