// Netlify Edge Function — injects per-page SEO tags (title, meta description,
// focus keyword, Open Graph, canonical, robots) directly into the HTML
// *before* it leaves the server, so they appear in View Source / are visible
// to non-JS crawlers (social share scrapers, simple bots) — not just to
// browsers running the client-side PageSEO.tsx JavaScript.
//
// This runs on Deno (Netlify's edge runtime), not Vite/Node, so it cannot
// import the app's src/ modules directly. The page-key mapping and fallback
// copy below are intentionally self-contained duplicates of:
//   - src/config/seoPages.ts        (SEO_PAGE_TABS: path -> SeoPageKey)
//   - src/utils/locationPaths.ts    (LOCATION_PAGE_SEGMENTS)
//   - src/constants/seo.ts          (PAGE_SEO fallback title/description)
//   - src/pages/LocationGatePage.tsx (root "/" file-level SEO)
// Keep them in sync if those files change. (scripts/generate-seo-files.mjs
// already follows this same self-contained-duplication convention for the
// same reason — plain build/server tooling outside the Vite module graph.)
import { HTMLRewriter } from "https://ghuc.cc/worker-tools/html-rewriter/index.ts";
import type { Context } from "https://edge.netlify.com";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")?.trim() ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_ANON_KEY")?.trim() ?? "";

const LOCATION_IDS = ["south-plainfield", "oak-tree", "lawrenceville"];

/** URL segment (under /:locationId/) -> seo_metadata.page_key. Segments with
 *  no entry (online-ordering, privacy-policy, terms-conditions) have no admin
 *  SEO tab and just use FALLBACKS below. */
const SEGMENT_TO_PAGE_KEY: Record<string, string> = {
  "": "homepage",
  about: "about",
  menu: "menu",
  "special-offers": "offers",
  catering: "catering",
  parties: "private-dining",
  testimonials: "testimonials",
  reservation: "reservation",
  contact: "contact",
  gallery: "gallery",
};

type Fallback = { title: string; description: string };

/** Mirrors src/constants/seo.ts PAGE_SEO, keyed by URL segment instead of path. */
const FALLBACKS: Record<string, Fallback> = {
  "": {
    title: "Desi Dhamaka — Authentic Indian Restaurant in Lawrenceville, NJ",
    description:
      "Experience authentic Andhra and Hyderabadi cuisine at Desi Dhamaka in Lawrenceville, NJ. Dum biryanis, mandi, tandoori, catering, private parties and luxury dining.",
  },
  about: {
    title: "About Us — Desi Dhamaka Indian Restaurant",
    description:
      "Discover the story behind Desi Dhamaka — tradition, passion and authentic Indian hospitality in Lawrence Township, New Jersey.",
  },
  menu: {
    title: "Menu — Desi Dhamaka Indian Restaurant",
    description:
      "Browse our full menu of signature biryanis, mandi, tandoori, curries, Indo-Chinese favourites and more at Desi Dhamaka Lawrenceville.",
  },
  catering: {
    title: "Catering — Desi Dhamaka Indian Restaurant",
    description:
      "Authentic Indian catering for weddings, corporate events and celebrations. Custom menus and exceptional service from Desi Dhamaka.",
  },
  parties: {
    title: "Private Parties — Desi Dhamaka Indian Restaurant",
    description:
      "Host birthdays, anniversaries and group celebrations at Desi Dhamaka. Private dining spaces and bespoke menus in Lawrenceville, NJ.",
  },
  testimonials: {
    title: "Testimonials — Desi Dhamaka Indian Restaurant",
    description:
      "Read what guests say about dining at Desi Dhamaka — authentic flavours, warm hospitality and unforgettable experiences.",
  },
  contact: {
    title: "Contact — Desi Dhamaka Indian Restaurant",
    description:
      "Contact Desi Dhamaka for reservations, catering enquiries and private events. Call, email or visit us in Lawrenceville, NJ.",
  },
  "online-ordering": {
    title: "Order Online — Desi Dhamaka Indian Restaurant",
    description:
      "Order authentic Indian food from Desi Dhamaka. Pickup direct or delivery via Uber Eats — freshly prepared in Lawrenceville, NJ.",
  },
  gallery: {
    title: "Gallery — Desi Dhamaka Indian Restaurant",
    description:
      "Explore the elegant interiors, dining spaces and atmosphere of Desi Dhamaka in Lawrenceville, New Jersey.",
  },
  "special-offers": {
    title: "Special Offers — Desi Dhamaka Indian Restaurant",
    description:
      "View current promotions and limited-time deals at Desi Dhamaka in Lawrenceville, New Jersey.",
  },
  reservation: {
    title: "Reserve a Table — Desi Dhamaka Indian Restaurant",
    description:
      "Book your table at Desi Dhamaka Lawrenceville. Reserve online for an unforgettable authentic Indian dining experience.",
  },
  "privacy-policy": {
    title: "Privacy Policy — Desi Dhamaka Indian Restaurant",
    description:
      "How Desi Dhamaka collects, uses and protects your personal information across our website and services.",
  },
  "terms-conditions": {
    title: "Terms & Conditions — Desi Dhamaka Indian Restaurant",
    description:
      "Terms and conditions for using the Desi Dhamaka website, online ordering and reservation services.",
  },
};

/** Mirrors src/pages/LocationGatePage.tsx's file-level SEO for "/". */
const GATE: Fallback & { keywords: string } = {
  title: "Desi Dhamaka | Authentic Indian Restaurant New Jersey",
  description:
    "Desi Dhamaka serves authentic Indian food across 3 New Jersey locations — South Plainfield, Oak Tree Edison & Lawrenceville. Choose your location for menu, offers, and reservations.",
  keywords:
    "Indian Restaurant New Jersey, Desi Dhamaka, Authentic Indian Food NJ, South Plainfield, Oak Tree Edison, Lawrenceville",
};

type SeoMetadataRow = {
  seo_title: string | null;
  meta_description: string | null;
  focus_keyword: string | null;
  secondary_keywords: string[] | null;
  canonical_url: string | null;
  robots: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
};

type ResolvedTags = {
  title: string;
  description: string;
  keywords: string;
  canonical: string;
  robots: string | null;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
};

const cache = new Map<string, { row: SeoMetadataRow | null; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

async function fetchSeoRow(locationId: string, pageKey: string): Promise<SeoMetadataRow | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  const cacheKey = `${locationId}:${pageKey}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.row;

  try {
    const url =
      `${SUPABASE_URL}/rest/v1/seo_metadata` +
      `?location_id=eq.${encodeURIComponent(locationId)}` +
      `&page_key=eq.${encodeURIComponent(pageKey)}` +
      `&select=seo_title,meta_description,focus_keyword,secondary_keywords,canonical_url,robots,og_title,og_description,og_image` +
      `&limit=1`;

    const res = await fetch(url, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    if (!res.ok) {
      cache.set(cacheKey, { row: null, expiresAt: Date.now() + CACHE_TTL_MS });
      return null;
    }
    const rows = (await res.json()) as SeoMetadataRow[];
    const row = rows[0] ?? null;
    cache.set(cacheKey, { row, expiresAt: Date.now() + CACHE_TTL_MS });
    return row;
  } catch {
    return null;
  }
}

async function resolveTags(url: URL): Promise<ResolvedTags | null> {
  const segments = url.pathname.split("/").filter(Boolean);
  const canonicalFallback = url.toString();

  if (segments.length === 0) {
    return {
      title: GATE.title,
      description: GATE.description,
      keywords: GATE.keywords,
      canonical: canonicalFallback,
      robots: null,
      ogTitle: GATE.title,
      ogDescription: GATE.description,
      ogImage: "",
    };
  }

  const [locationId, segment = ""] = segments;
  if (!LOCATION_IDS.includes(locationId)) return null;

  const fallback = FALLBACKS[segment];
  if (!fallback) return null; // unknown segment — let the SPA's 404 handling take over

  const pageKey = SEGMENT_TO_PAGE_KEY[segment];
  const row = pageKey ? await fetchSeoRow(locationId, pageKey) : null;

  const title = row?.seo_title?.trim() || fallback.title;
  const description = row?.meta_description?.trim() || fallback.description;
  const focusKeyword = row?.focus_keyword?.trim() ?? "";
  const secondaryKeywords = row?.secondary_keywords ?? [];
  const keywords = [focusKeyword, ...secondaryKeywords].filter(Boolean).join(", ");

  return {
    title,
    description,
    keywords,
    canonical: row?.canonical_url?.trim() || canonicalFallback,
    robots: row?.robots === "noindex" ? "noindex, nofollow" : null,
    ogTitle: row?.og_title?.trim() || title,
    ogDescription: row?.og_description?.trim() || description,
    ogImage: row?.og_image?.trim() || "",
  };
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export default async (request: Request, context: Context) => {
  const response = await context.next();

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return response;

  const url = new URL(request.url);
  if (url.pathname.startsWith("/admin")) return response;

  const tags = await resolveTags(url);
  if (!tags) return response;

  const injected =
    `<title>${escapeAttr(tags.title)}</title>` +
    `<meta name="description" content="${escapeAttr(tags.description)}">` +
    (tags.keywords ? `<meta name="keywords" content="${escapeAttr(tags.keywords)}">` : "") +
    `<link rel="canonical" href="${escapeAttr(tags.canonical)}">` +
    (tags.robots ? `<meta name="robots" content="${escapeAttr(tags.robots)}">` : "") +
    `<meta property="og:title" content="${escapeAttr(tags.ogTitle)}">` +
    `<meta property="og:description" content="${escapeAttr(tags.ogDescription)}">` +
    `<meta property="og:url" content="${escapeAttr(tags.canonical)}">` +
    (tags.ogImage ? `<meta property="og:image" content="${escapeAttr(tags.ogImage)}">` : "") +
    `<meta name="twitter:title" content="${escapeAttr(tags.ogTitle)}">` +
    `<meta name="twitter:description" content="${escapeAttr(tags.ogDescription)}">`;

  return new HTMLRewriter()
    .on("title", { element(el) { el.remove(); } })
    .on('meta[name="description"]', { element(el) { el.remove(); } })
    .on('meta[name="keywords"]', { element(el) { el.remove(); } })
    .on('meta[name="robots"]', { element(el) { el.remove(); } })
    .on('link[rel="canonical"]', { element(el) { el.remove(); } })
    .on('meta[property^="og:"]', { element(el) { el.remove(); } })
    .on('meta[name^="twitter:"]', { element(el) { el.remove(); } })
    .on("head", {
      element(el) {
        el.append(injected, { html: true });
      },
    })
    .transform(response);
};

export const config = {
  path: "/*",
  excludedPath: [
    "/admin/*",
    "/assets/*",
    "/*.js",
    "/*.css",
    "/*.map",
    "/*.json",
    "/*.xml",
    "/*.txt",
    "/*.png",
    "/*.jpg",
    "/*.jpeg",
    "/*.webp",
    "/*.gif",
    "/*.svg",
    "/*.ico",
    "/*.mp4",
    "/*.woff",
    "/*.woff2",
  ],
};
