import type { LocationId } from "../config/locations";

/** All static page segments available under every /:locationId/ route. */
export const LOCATION_PAGE_SEGMENTS = [
  "about",
  "contact",
  "catering",
  "parties",
  "special-offers",
  "menu",
  "online-ordering",
  "testimonials",
  "reservation",
  "gallery",
  "privacy-policy",
  "terms-conditions",
] as const;

/** Old segment → new segment, used for redirecting legacy links. */
export const LEGACY_SEGMENT_MAP: Record<string, string> = {
  offers: "special-offers",
  order: "online-ordering",
};

function normalizeSegment(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

/**
 * Builds an absolute, trailing-slashed path for a page segment under a
 * given location, e.g. locPath("oak-tree", "/menu") -> "/oak-tree/menu/".
 * Pass "/" (or omit) for the location's home page.
 */
export function locPath(locationId: LocationId | null | undefined, segment: string = "/"): string {
  if (!locationId) return "/";
  const seg = normalizeSegment(segment);
  if (seg === "/" || seg === "") return `/${locationId}/`;
  const clean = seg.endsWith("/") ? seg : `${seg}/`;
  return `/${locationId}${clean}`;
}

/** True if a segment string is one of the known static page segments. */
export function isKnownSegment(segment: string): boolean {
  const clean = segment.replace(/^\/+|\/+$/g, "");
  return (LOCATION_PAGE_SEGMENTS as readonly string[]).includes(clean);
}
