import {
  getLocationConfig,
  resolvePublicLocationId,
  type LocationId,
} from "../config/locations";
import { getOrderUrl } from "../data/chefgaaNameMap";

type LinkSettings = {
  reservation_url?: string | null;
  order_url?: string | null;
  google_maps?: string | null;
  address?: string | null;
};

/** True when a CMS order URL targets the same ChefGaa store as the location default. */
export function isOrderUrlForLocation(url: string, locationId: LocationId): boolean {
  const expected = getOrderUrl(locationId);
  if (url === expected) return true;

  try {
    const actual = new URL(url);
    const canonical = new URL(expected);
    const actualType = actual.searchParams.get("order_type");
    const canonicalType = canonical.searchParams.get("order_type");
    if (actualType && canonicalType) {
      return actualType === canonicalType;
    }
    return (
      actual.hostname === canonical.hostname &&
      actual.pathname === canonical.pathname
    );
  } catch {
    return false;
  }
}

export function resolveReservationUrl(
  settings: LinkSettings | null | undefined,
  locationId: LocationId | null,
): string {
  const fromCms = settings?.reservation_url?.trim();
  if (fromCms) return fromCms;
  const resolved = resolvePublicLocationId(locationId);
  return getLocationConfig(resolved).reservationLink;
}

/**
 * Resolves the order URL for the active location. Uses CMS `order_url` only when
 * the settings bundle matches the selected location and the URL targets that store
 * (guards against stale bundles after a location switch and wrong DB values).
 */
export function resolveOrderUrl(
  settings: LinkSettings | null | undefined,
  locationId: LocationId | null,
  settingsLocationId?: LocationId | null,
): string {
  const resolved = resolvePublicLocationId(locationId);
  const fallback = getOrderUrl(resolved);
  const fromCms = settings?.order_url?.trim();
  const bundleMatches = !settingsLocationId || settingsLocationId === resolved;

  if (!fromCms || !bundleMatches || !isOrderUrlForLocation(fromCms, resolved)) {
    return fallback;
  }

  return fromCms;
}

export function isExternalUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

/** Opens Google Maps directions for the active outlet in a new tab. */
export function resolveGoogleMapsDirectionsUrl(
  settings: LinkSettings | null | undefined,
  locationId: LocationId | null,
): string {
  const resolved = resolvePublicLocationId(locationId);
  const config = getLocationConfig(resolved);
  const embed = settings?.google_maps?.trim();

  if (embed) {
    try {
      const url = new URL(embed);
      const query = url.searchParams.get("q");
      if (query) {
        return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
      }
    } catch {
      /* fall through */
    }
  }

  const destination = settings?.address?.trim() || config.address;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}
