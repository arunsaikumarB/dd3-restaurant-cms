import { PUBLIC_OFFERS_FALLBACK, type PublicOffer } from "../data/publicOffers";
import type { Offer } from "../types/database";
import { formatOfferDate, getOfferScheduleStatus } from "../utils/offers/schedule";
import { fetchPublicOffers } from "./offers";

export type { PublicOffer };

const CACHE_TTL_MS = 60_000;
const FALLBACK_BANNER = "/showcase/biryani.jpg";

let cachedOffers: PublicOffer[] | null = null;
let cacheExpiresAt = 0;
let inflightRequest: Promise<PublicOffer[]> | null = null;

function mapPublicOffer(row: Offer): PublicOffer {
  return {
    id: row.id,
    title: row.title,
    description: row.description?.trim() ?? "",
    banner: row.banner?.trim() || FALLBACK_BANNER,
    discount: row.discount?.trim() ?? "",
    start_date: formatOfferDate(row.start_date),
    end_date: formatOfferDate(row.end_date),
    created_at: row.created_at,
  };
}

function isCurrentPublicOffer(offer: PublicOffer, now = new Date()): boolean {
  return getOfferScheduleStatus(offer.start_date, offer.end_date, now) === "current";
}

function sortPublicOffers(rows: PublicOffer[]): PublicOffer[] {
  return [...rows].sort((a, b) => {
    const startDiff = b.start_date.localeCompare(a.start_date);
    if (startDiff !== 0) return startDiff;
    return b.created_at.localeCompare(a.created_at);
  });
}

function filterPublicOffers(rows: PublicOffer[]): PublicOffer[] {
  return sortPublicOffers(rows.filter((offer) => isCurrentPublicOffer(offer)));
}

export function getPublicOffersFallback(): PublicOffer[] {
  return sortPublicOffers(PUBLIC_OFFERS_FALLBACK);
}

async function fetchSupabasePublicOffers(): Promise<PublicOffer[] | null> {
  const rows = await fetchPublicOffers();
  if (!rows) {
    return null;
  }

  const mapped = rows.map(mapPublicOffer);
  const current = filterPublicOffers(mapped);
  return current;
}

export async function fetchPublicOffersData(): Promise<PublicOffer[]> {
  const now = Date.now();
  if (cachedOffers && now < cacheExpiresAt) {
    return cachedOffers;
  }

  if (inflightRequest) {
    return inflightRequest;
  }

  inflightRequest = (async () => {
    try {
      const supabaseOffers = await fetchSupabasePublicOffers();
      if (supabaseOffers !== null && supabaseOffers.length > 0) {
        cachedOffers = supabaseOffers;
        cacheExpiresAt = Date.now() + CACHE_TTL_MS;
        return supabaseOffers;
      }

      const fallback = getPublicOffersFallback();
      cachedOffers = fallback;
      cacheExpiresAt = Date.now() + CACHE_TTL_MS;
      return fallback;
    } catch {
      const fallback = getPublicOffersFallback();
      cachedOffers = fallback;
      cacheExpiresAt = Date.now() + CACHE_TTL_MS;
      return fallback;
    } finally {
      inflightRequest = null;
    }
  })();

  return inflightRequest;
}

export type PublicOffersResult = {
  offers: PublicOffer[];
  error: string | null;
};

export async function loadPublicOffersData(): Promise<PublicOffersResult> {
  try {
    const offers = await fetchPublicOffersData();
    return { offers, error: null };
  } catch (err) {
    return {
      offers: getPublicOffersFallback(),
      error: err instanceof Error ? err.message : "Failed to load offers.",
    };
  }
}
