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

export function resolveReservationUrl(
  settings: LinkSettings | null | undefined,
  locationId: LocationId | null,
): string {
  const fromCms = settings?.reservation_url?.trim();
  if (fromCms) return fromCms;
  const resolved = resolvePublicLocationId(locationId);
  return getLocationConfig(resolved).reservationLink;
}

export function resolveOrderUrl(
  settings: LinkSettings | null | undefined,
  locationId: LocationId | null,
): string {
  const fromCms = settings?.order_url?.trim();
  if (fromCms) return fromCms;
  return getOrderUrl(resolvePublicLocationId(locationId));
}

export function isExternalUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}
