import type { LocationId } from "../../config/locations";
import { getLocationConfig } from "../../config/locations";
import { buildLocationOrderMenuUrl } from "../../constants/ordering";
import type { LocationOffer } from "./types";

const LOCATION_OFFER_PATH_PREFIX: Partial<Record<LocationId, string>> = {
  "oak-tree": "/special-offers/oak-tree",
};

export function getOfferDetailPath(locationId: LocationId, slug: string): string {
  const prefix = LOCATION_OFFER_PATH_PREFIX[locationId];
  if (prefix) return `${prefix}/${slug}`;
  return `/special-offers/${slug}`;
}

/** Internal order page path with location + optional menu category (Oak Tree). */
export function getOfferOrderPath(locationId: LocationId, offer: LocationOffer): string {
  if (locationId === "oak-tree") {
    const params = new URLSearchParams({ location: locationId });
    if (offer.orderCategory) {
      params.set("category", offer.orderCategory);
    }
    return `/online-ordering?${params.toString()}`;
  }

  return getOfferOrderUrl(locationId, offer);
}

export function isInternalOfferOrderPath(path: string): boolean {
  return path.startsWith("/online-ordering");
}

/** External ChefGaa URL — used for non–Oak Tree locations only. */
export function getOfferOrderUrl(locationId: LocationId, offer: LocationOffer): string {
  const { orderDirectLink } = getLocationConfig(locationId);
  return buildLocationOrderMenuUrl(orderDirectLink, offer.orderCategory);
}

export type { LocationOffer, OfferContentSection } from "./types";
