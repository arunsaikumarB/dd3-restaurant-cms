import type { LocationId } from "../config/locations";

export const MENU_ROUTE_PATH = "/menu";

/** True when a CMS or nav path points at the legacy on-site menu page. */
export function isInternalMenuPath(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return true;
  if (trimmed === MENU_ROUTE_PATH) return true;
  return /\/menu\/?$/.test(trimmed.replace(/\/+$/, ""));
}

/** Maps legacy `/menu` paths to the outlet's ChefGaa ordering URL from CMS settings. */
export function resolveMenuCtaUrl(
  cmsUrl: string,
  orderUrl: string,
  locationId: LocationId | null,
): string {
  if (!locationId) return "/";
  if (isInternalMenuPath(cmsUrl)) return orderUrl;
  return cmsUrl.trim() || orderUrl;
}

/** Sends the visitor to the location ChefGaa ordering page (same tab). */
export function redirectToOnlineOrdering(orderUrl: string): void {
  window.location.assign(orderUrl);
}
