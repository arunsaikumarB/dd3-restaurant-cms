import { ORDER_DIRECT_URL } from "../constants/ordering";
import { SITE } from "../constants/site";
import type { HomepageContent } from "../types/database";
import { fetchHomepageContentPublic } from "./homepageContent";
import {
  buildDefaultRestaurantSettings,
  fetchRestaurantSettingsPublic,
  type OpeningHoursForm,
} from "./restaurantSettings";
import type { RestaurantSettings } from "../types/database";

export type PublicHomepageContent = {
  hero_title: string;
  hero_subtitle: string;
  hero_image: string;
  hero_video: string;
  cta_text: string;
  cta_link: string;
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
};

export type HomepageBundle = {
  content: PublicHomepageContent;
  settings: PublicRestaurantSettings;
};

const HERO_TITLE_FALLBACK = "Step inside\nthe experience";
const HERO_SUBTITLE_FALLBACK =
  "Scroll to walk through our doors — from the entrance to the heart of the reception, frame by cinematic frame.";
const HERO_IMAGE_FALLBACK = "/hero/hero-poster.jpg";
const HERO_VIDEO_FALLBACK = "/hero/videoplayback.mp4";
const ABOUT_TITLE_FALLBACK = "Authentic Flavours,\nWarm Hospitality";
const ABOUT_DESCRIPTION_FALLBACK =
  "Experience authentic Indian cuisine crafted with passion and served with genuine hospitality.";

const CACHE_TTL_MS = 60_000;

let cachedBundle: HomepageBundle | null = null;
let cacheExpiresAt = 0;
let inflightRequest: Promise<HomepageBundle> | null = null;

export function getHomepageFallbacks(): HomepageBundle {
  const defaults = buildDefaultRestaurantSettings();
  const defaultHours = defaults.opening_hours as OpeningHoursForm;

  return {
    content: {
      hero_title: HERO_TITLE_FALLBACK,
      hero_subtitle: HERO_SUBTITLE_FALLBACK,
      hero_image: HERO_IMAGE_FALLBACK,
      hero_video: HERO_VIDEO_FALLBACK,
      cta_text: "Order Now",
      cta_link: ORDER_DIRECT_URL,
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
    },
  };
}

function parseOpeningHours(value: RestaurantSettings["opening_hours"]): OpeningHoursForm {
  const fallbacks = getHomepageFallbacks().settings.opening_hours;

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

function mapHomepageContent(row: HomepageContent | null): PublicHomepageContent {
  const fallbacks = getHomepageFallbacks().content;

  return {
    hero_title: row?.hero_title?.trim() || fallbacks.hero_title,
    hero_subtitle: row?.hero_subtitle?.trim() || fallbacks.hero_subtitle,
    hero_image: row?.hero_image?.trim() || fallbacks.hero_image,
    hero_video: row?.hero_video?.trim() || fallbacks.hero_video,
    cta_text: row?.cta_text?.trim() || fallbacks.cta_text,
    cta_link: row?.cta_link?.trim() || fallbacks.cta_link,
    about_title: row?.about_title?.trim() || fallbacks.about_title,
    about_description: row?.about_description?.trim() || fallbacks.about_description,
  };
}

function mapRestaurantSettings(row: RestaurantSettings | null): PublicRestaurantSettings {
  const fallbacks = getHomepageFallbacks().settings;

  return {
    restaurant_name: row?.restaurant_name?.trim() || fallbacks.restaurant_name,
    phone: row?.phone?.trim() || fallbacks.phone,
    email: row?.email?.trim() || fallbacks.email,
    address: row?.address?.trim() || fallbacks.address,
    google_maps: row?.google_maps?.trim() || fallbacks.google_maps,
    opening_hours: parseOpeningHours(row?.opening_hours ?? null),
    facebook: row?.facebook?.trim() || fallbacks.facebook,
    instagram: row?.instagram?.trim() || fallbacks.instagram,
    youtube: row?.youtube?.trim() || fallbacks.youtube,
    logo: row?.logo?.trim() || fallbacks.logo,
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

export async function fetchHomepageBundle(): Promise<HomepageBundle> {
  const now = Date.now();
  if (cachedBundle && now < cacheExpiresAt) {
    return cachedBundle;
  }

  if (inflightRequest) {
    return inflightRequest;
  }

  inflightRequest = (async () => {
    try {
      const [homepageRow, settingsRow] = await Promise.all([
        fetchHomepageContentPublic(),
        fetchRestaurantSettingsPublic(),
      ]);

      const bundle: HomepageBundle = {
        content: mapHomepageContent(homepageRow),
        settings: mapRestaurantSettings(settingsRow),
      };

      cachedBundle = bundle;
      cacheExpiresAt = Date.now() + CACHE_TTL_MS;
      return bundle;
    } catch {
      return getHomepageFallbacks();
    } finally {
      inflightRequest = null;
    }
  })();

  return inflightRequest;
}
