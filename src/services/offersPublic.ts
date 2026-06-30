import { getOffersForLocation } from "../data/offers";
import type { LocationOffer } from "../data/offers";
import type { LocationId } from "../config/locations";
import type { Offer } from "../types/database";
import { formatOfferDate, getOfferScheduleStatus } from "../utils/offers/schedule";
import { slugify } from "../utils/slug";
import { fetchPublicOffers } from "./offers";

export type { LocationOffer as PublicOffer };

export function getPublicOffersForLocation(locationId: LocationId): LocationOffer[] {
  return getOffersForLocation(locationId);
}

/** @deprecated Use getPublicOffersForLocation */
export function getPublicOffersFallback(locationId: LocationId = "lawrenceville"): LocationOffer[] {
  return getPublicOffersForLocation(locationId);
}

function mapDbOfferToLocationOffer(row: Offer): LocationOffer {
  const endDate = formatOfferDate(row.end_date);
  const slug = `${slugify(row.title)}-${row.id.slice(0, 8)}`;

  return {
    id: `cms-${row.id}`,
    slug,
    title: row.title,
    description: row.description ?? "",
    content: [
      {
        heading: row.title,
        paragraphs: row.description ? [row.description] : [],
      },
    ],
    image: row.banner ?? "/showcase/biryani.jpg",
    gallery: row.banner ? [row.banner] : [],
    badge: row.discount || null,
    price: null,
    validUntil: endDate || null,
    terms: [],
    orderCategory: null,
    featured: row.active,
    category: row.discount || null,
  };
}

function isVisibleCmsOffer(row: Offer): boolean {
  if (!row.active) return false;
  const startDate = formatOfferDate(row.start_date);
  const endDate = formatOfferDate(row.end_date);
  return getOfferScheduleStatus(startDate, endDate) !== "expired";
}

function mergeLocationOffers(staticOffers: LocationOffer[], cmsOffers: LocationOffer[]): LocationOffer[] {
  if (cmsOffers.length === 0) return staticOffers;
  return [...staticOffers, ...cmsOffers];
}

export async function fetchPublicOffersData(locationId: LocationId): Promise<LocationOffer[]> {
  const staticOffers = getOffersForLocation(locationId);
  const dbOffers = await fetchPublicOffers(locationId);

  if (!dbOffers || dbOffers.length === 0) {
    return staticOffers;
  }

  const cmsOffers = dbOffers.filter(isVisibleCmsOffer).map(mapDbOfferToLocationOffer);
  return mergeLocationOffers(staticOffers, cmsOffers);
}

export type PublicOffersResult = {
  offers: LocationOffer[];
  error: string | null;
};

export async function loadPublicOffersData(locationId: LocationId): Promise<PublicOffersResult> {
  try {
    const offers = await fetchPublicOffersData(locationId);
    return { offers, error: null };
  } catch (err) {
    return {
      offers: getOffersForLocation(locationId),
      error: err instanceof Error ? err.message : "Failed to load offers.",
    };
  }
}
