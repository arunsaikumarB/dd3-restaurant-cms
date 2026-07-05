import type { LocationId } from "../config/locations";

/** Supported SEO page keys in the CMS. */
export type SeoPageKey =
  | "homepage"
  | "about"
  | "menu"
  | "offers"
  | "gallery"
  | "testimonials"
  | "reservation"
  | "contact"
  | "private-dining"
  | "catering"
  | "events"
  | "custom";

export type SeoRobotsIndex = "index" | "noindex";
export type SeoFaqStatus = "active" | "inactive";
export type SeoChangeFrequency =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

export type SeoSchemaType =
  | "Restaurant"
  | "LocalBusiness"
  | "Organization"
  | "FAQPage"
  | "Menu"
  | "Offer"
  | "Review"
  | "BreadcrumbList"
  | "WebSite"
  | "Article";

export type SeoTwitterCardType =
  | "summary"
  | "summary_large_image"
  | "app"
  | "player";

export interface SeoFaqItem {
  id: string;
  question: string;
  answer: string;
  displayOrder: number;
  status: SeoFaqStatus;
}

export interface SeoMetadataForm {
  basic: {
    seoTitle: string;
    metaDescription: string;
    focusKeyword: string;
    secondaryKeywords: string;
    canonicalUrl: string;
    seoSlug: string;
    robotsIndex: SeoRobotsIndex;
  };
  openGraph: {
    ogTitle: string;
    ogDescription: string;
    ogImage: string;
    ogLocale: string;
    ogUrl: string;
    ogType: string;
  };
  twitter: {
    twitterTitle: string;
    twitterDescription: string;
    twitterImage: string;
    twitterCardType: SeoTwitterCardType;
  };
  headings: {
    h1: string;
    h2: string[];
    h3: string[];
  };
  schema: {
    schemaTypes: SeoSchemaType[];
    jsonLd: string;
    autoGenerate: boolean;
  };
  content: {
    seoIntroduction: string;
    seoConclusion: string;
    seoFooterContent: string;
  };
  faqs: SeoFaqItem[];
  imageSeo: {
    defaultAltText: string;
    imageTitle: string;
    imageCaption: string;
    imageDescription: string;
  };
  localSeo: {
    businessName: string;
    restaurantName: string;
    cuisineType: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    latitude: string;
    longitude: string;
    phone: string;
    email: string;
    googleMapsUrl: string;
    googleBusinessProfileUrl: string;
    openingHours: string;
    deliveryAvailable: boolean;
    takeawayAvailable: boolean;
    reservationAvailable: boolean;
  };
  advanced: {
    priority: string;
    changeFrequency: SeoChangeFrequency;
    canonicalUrl: string;
    lastModified: string;
    includeInSitemap: boolean;
    excludeFromSitemap: boolean;
    noIndex: boolean;
    noFollow: boolean;
    noArchive: boolean;
    noSnippet: boolean;
  };
}

export interface SeoMetadataRow {
  id: string;
  page_key: SeoPageKey;
  location_id: LocationId;
  data: SeoMetadataForm;
  created_at: string;
  updated_at: string;
}

export type SeoValidationSeverity = "warning" | "error";

export interface SeoValidationIssue {
  id: string;
  severity: SeoValidationSeverity;
  message: string;
  field?: string;
}

export interface SeoValidationResult {
  issues: SeoValidationIssue[];
  headingIssues: SeoValidationIssue[];
}
