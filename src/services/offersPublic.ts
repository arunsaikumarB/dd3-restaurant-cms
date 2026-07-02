import type { LocationOffer, OfferContentSection } from "../data/offers/types";
import { LOCATION_IDS, type LocationId } from "../config/locations";
import type { Offer } from "../types/database";
import { formatOfferDate, getOfferScheduleStatus } from "../utils/offers/schedule";
import { fetchPublicOffers } from "./offers";

export type { LocationOffer as PublicOffer };

const CACHE_TTL_MS = 60_000;

let cachedByLocation: Partial<Record<LocationId, LocationOffer[]>> = {};
let cacheExpiresAtByLocation: Partial<Record<LocationId, number>> = {};
const inflightByLocation: Partial<Record<LocationId, Promise<LocationOffer[]>>> = {};

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseContentSections(value: unknown, row: Offer): OfferContentSection[] {
  if (Array.isArray(value) && value.length > 0) {
    const sections: OfferContentSection[] = [];

    for (const entry of value) {
      if (!entry || typeof entry !== "object") continue;
      const record = entry as Record<string, unknown>;
      const heading = typeof record.heading === "string" ? record.heading : "";
      const eyebrow = typeof record.eyebrow === "string" ? record.eyebrow : undefined;
      const paragraphs = parseStringArray(record.paragraphs);
      const list = parseStringArray(record.list);
      if (!heading.trim() && paragraphs.length === 0) continue;

      sections.push({
        eyebrow,
        heading: heading || row.title,
        paragraphs,
        list: list.length > 0 ? list : undefined,
      });
    }

    if (sections.length > 0) return sections;
  }

  return [
    {
      heading: row.title,
      paragraphs: row.description ? [row.description] : [],
    },
  ];
}

function mapDbOfferToLocationOffer(row: Offer): LocationOffer {
  const validUntil = row.valid_until?.trim() || null;
  const image = row.image ?? row.banner ?? "/showcase/biryani.webp";
  const gallery = parseStringArray(row.gallery);
  const terms = parseStringArray(row.terms);

  return {
    id: `cms-${row.id}`,
    slug: row.slug ?? row.id,
    title: row.title,
    description: row.description ?? "",
    content: parseContentSections(row.content, row),
    image,
    gallery: gallery.length > 0 ? gallery : image ? [image] : [],
    badge: row.badge ?? row.discount ?? null,
    price: row.price ?? null,
    validUntil,
    terms,
    orderCategory: row.order_category ?? null,
    featured: row.featured,
    category: row.category ?? row.badge ?? row.discount ?? null,
  };
}

function isVisibleCmsOffer(row: Offer): boolean {
  if (!row.active) return false;
  const startDate = formatOfferDate(row.start_date);
  const endDate = formatOfferDate(row.end_date);
  return getOfferScheduleStatus(startDate, endDate) !== "expired";
}

function mapVisibleCmsOffers(dbOffers: Offer[]): LocationOffer[] {
  const seenIds = new Set<string>();
  const offers: LocationOffer[] = [];

  for (const row of dbOffers) {
    if (!isVisibleCmsOffer(row) || seenIds.has(row.id)) continue;
    seenIds.add(row.id);
    offers.push(mapDbOfferToLocationOffer(row));
  }

  return offers;
}

async function resolveOffersData(locationId: LocationId): Promise<LocationOffer[]> {
  const dbOffers = await fetchPublicOffers(locationId);
  return mapVisibleCmsOffers(dbOffers);
}

export async function fetchPublicOffersData(locationId: LocationId): Promise<LocationOffer[]> {
  const now = Date.now();
  const cached = cachedByLocation[locationId];
  const cacheExpiresAt = cacheExpiresAtByLocation[locationId] ?? 0;

  if (cached && now < cacheExpiresAt) {
    return cached;
  }

  const inflight = inflightByLocation[locationId];
  if (inflight) {
    return inflight;
  }

  const request = (async () => {
    try {
      const offers = await resolveOffersData(locationId);
      cachedByLocation[locationId] = offers;
      cacheExpiresAtByLocation[locationId] = Date.now() + CACHE_TTL_MS;
      return offers;
    } catch {
      cachedByLocation[locationId] = [];
      cacheExpiresAtByLocation[locationId] = Date.now() + CACHE_TTL_MS;
      return [];
    } finally {
      delete inflightByLocation[locationId];
    }
  })();

  inflightByLocation[locationId] = request;
  return request;
}

export function invalidatePublicOffersCache(locationId?: LocationId): void {
  if (locationId) {
    delete cachedByLocation[locationId];
    delete cacheExpiresAtByLocation[locationId];
    delete inflightByLocation[locationId];
    return;
  }

  cachedByLocation = {};
  cacheExpiresAtByLocation = {};
  for (const key of Object.keys(inflightByLocation) as LocationId[]) {
    delete inflightByLocation[key];
  }
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
      offers: [],
      error: err instanceof Error ? err.message : "Failed to load offers.",
    };
  }
}

export function getRelatedOffersFromList(
  offers: LocationOffer[],
  slug: string,
  limit = 3,
): LocationOffer[] {
  return offers.filter((offer) => offer.slug !== slug).slice(0, limit);
}

export async function resolveOfferDetail(
  slug: string,
  preferredLocationId?: LocationId,
): Promise<{ locationId: LocationId; offer: LocationOffer; offers: LocationOffer[] } | null> {
  const orderedLocationIds = preferredLocationId
    ? [preferredLocationId, ...LOCATION_IDS.filter((id) => id !== preferredLocationId)]
    : [...LOCATION_IDS];

  for (const locationId of orderedLocationIds) {
    const offers = await fetchPublicOffersData(locationId);
    const offer = offers.find((entry) => entry.slug === slug);
    if (offer) {
      return { locationId, offer, offers };
    }
  }

  return null;
}
