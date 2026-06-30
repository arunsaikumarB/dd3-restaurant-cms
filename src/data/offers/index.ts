import type { LocationId } from "../../config/locations";
import { getLocationConfig } from "../../config/locations";
import { buildLocationOrderMenuUrl } from "../../constants/ordering";
import lawrencevilleOffers from "./lawrenceville";
import oakTreeOffers from "./oakTree";
import southPlainfieldOffers from "./southPlainfield";
import type { LocationOffer } from "./types";

const STATIC_OFFERS: Record<LocationId, LocationOffer[]> = {
  "south-plainfield": southPlainfieldOffers,
  "oak-tree": oakTreeOffers,
  lawrenceville: lawrencevilleOffers,
};

const LOCATION_OFFER_PATH_PREFIX: Partial<Record<LocationId, string>> = {
  "oak-tree": "/offers/oak-tree",
};

export function getOffersForLocation(locationId: LocationId): LocationOffer[] {
  return STATIC_OFFERS[locationId] ?? [];
}

export function getOfferBySlug(
  locationId: LocationId,
  slug: string,
): LocationOffer | undefined {
  return getOffersForLocation(locationId).find((offer) => offer.slug === slug);
}

export function getRelatedOffers(
  locationId: LocationId,
  slug: string,
  limit = 3,
): LocationOffer[] {
  return getOffersForLocation(locationId)
    .filter((offer) => offer.slug !== slug)
    .slice(0, limit);
}

export function findOfferAcrossLocations(
  slug: string,
  preferredLocationId?: LocationId,
): { locationId: LocationId; offer: LocationOffer } | null {
  if (preferredLocationId) {
    const preferred = getOfferBySlug(preferredLocationId, slug);
    if (preferred) return { locationId: preferredLocationId, offer: preferred };
  }

  for (const locationId of Object.keys(STATIC_OFFERS) as LocationId[]) {
    const offer = getOfferBySlug(locationId, slug);
    if (offer) return { locationId, offer };
  }
  return null;
}

export function getOfferDetailPath(locationId: LocationId, slug: string): string {
  const prefix = LOCATION_OFFER_PATH_PREFIX[locationId];
  if (prefix) return `${prefix}/${slug}`;
  return `/offers/${slug}`;
}

/** Internal order page path with location + optional menu category (Oak Tree). */
export function getOfferOrderPath(locationId: LocationId, offer: LocationOffer): string {
  if (locationId === "oak-tree") {
    const params = new URLSearchParams({ location: locationId });
    if (offer.orderCategory) {
      params.set("category", offer.orderCategory);
    }
    return `/order?${params.toString()}`;
  }

  return getOfferOrderUrl(locationId, offer);
}

export function isInternalOfferOrderPath(path: string): boolean {
  return path.startsWith("/order");
}

/** External ChefGaa URL — used for non–Oak Tree locations only. */
export function getOfferOrderUrl(
  locationId: LocationId,
  offer: LocationOffer,
): string {
  const { orderDirectLink } = getLocationConfig(locationId);
  return buildLocationOrderMenuUrl(orderDirectLink, offer.orderCategory);
}

export { lawrencevilleOffers, oakTreeOffers, southPlainfieldOffers };
export type { LocationOffer, OfferContentSection } from "./types";
