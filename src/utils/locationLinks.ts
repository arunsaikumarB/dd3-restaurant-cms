import {
  getLocationConfig,
  resolvePublicLocationId,
  type LocationId,
} from "../config/locations";
import { getOrderUrl } from "../data/chefgaaNameMap";

type LinkSettings = {
  reservation_url?: string | null;
  order_url?: string | null;
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
