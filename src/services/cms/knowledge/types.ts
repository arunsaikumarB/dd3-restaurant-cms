import type { LocationId } from "../../../config/locations";

/** CMS modules Cheffy is allowed to read today. Add new keys here to plug in modules. */
export type CMSModuleKey =
  | "restaurantSettings"
  | "homepage"
  | "offers"
  | "gallery"
  | "reviews"
  | "seo"
  | "locationSettings";

export type CMSModuleSlice<T> = {
  key: CMSModuleKey;
  available: boolean;
  data: T | null;
};

export type CMSHoursRow = { days: string; time: string };

export type CMSRestaurantSettings = {
  name: string;
  phone: string;
  phones: string[];
  email: string;
  address: string;
  hours: CMSHoursRow[];
  orderUrl: string;
  reservationUrl: string;
  googleMaps: string;
  social: { instagram?: string; facebook?: string; youtube?: string };
};

export type CMSHomepage = {
  heroTitle: string;
  heroSubtitle: string;
  aboutTitle: string;
  aboutDescription: string;
  primaryCta: { label: string; url: string };
  secondaryCta: { label: string; url: string };
};

export type CMSOffer = {
  title: string;
  description: string;
  slug: string;
  badge: string | null;
};

export type CMSGalleryItem = {
  title: string;
  caption: string;
  category: string;
  featured: boolean;
};

export type CMSReview = {
  name: string;
  rating: number;
  excerpt: string;
};

export type CMSSeoPage = {
  pageKey: string;
  title: string;
  description: string;
  keywords: string;
};

export type CMSLocationSettings = {
  id: LocationId;
  name: string;
  shortName: string;
  address: string;
  phone: string;
  email: string;
  reservationLink: string;
  orderDirectLink: string;
  openingHours: CMSHoursRow[];
};

export type CMSKnowledgeModules = {
  restaurantSettings: CMSModuleSlice<CMSRestaurantSettings>;
  homepage: CMSModuleSlice<CMSHomepage>;
  offers: CMSModuleSlice<CMSOffer[]>;
  gallery: CMSModuleSlice<CMSGalleryItem[]>;
  reviews: CMSModuleSlice<CMSReview[]>;
  seo: CMSModuleSlice<CMSSeoPage[]>;
  locationSettings: CMSModuleSlice<CMSLocationSettings>;
};

export type CMSKnowledge = {
  locationId: LocationId;
  locationName: string;
  generatedAt: string;
  navigation: Record<string, string>;
  modules: CMSKnowledgeModules;
};

export type CMSQueryResult = {
  modules: CMSModuleKey[];
  payload: Record<string, unknown>;
};
