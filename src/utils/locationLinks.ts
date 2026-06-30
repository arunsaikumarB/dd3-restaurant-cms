import { getLocationConfig, type LocationId } from "../config/locations";
import { ORDER_DIRECT_URL } from "../constants/ordering";

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
  if (locationId) return getLocationConfig(locationId).reservationLink;
  return "/reservation";
}

export function resolveOrderUrl(
  settings: LinkSettings | null | undefined,
  locationId: LocationId | null,
): string {
  const fromCms = settings?.order_url?.trim();
  if (fromCms) return fromCms;
  if (locationId) return getLocationConfig(locationId).orderDirectLink;
  return ORDER_DIRECT_URL;
}

export function isExternalUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}
