/** Showcase images used when a signature dish has no uploaded image yet. */
const SHOWCASE_FALLBACKS: { match: string; image: string }[] = [
  { match: "biryani", image: "/showcase/biryani.webp" },
  { match: "mandi", image: "/showcase/mandi.webp" },
  { match: "tandoor", image: "/showcase/tandoori.webp" },
  { match: "kebab", image: "/showcase/tandoori.webp" },
  { match: "tikka", image: "/showcase/tandoori.webp" },
  { match: "chinese", image: "/showcase/indo-chinese.webp" },
  { match: "manchur", image: "/showcase/indo-chinese.webp" },
  { match: "chilli", image: "/showcase/indo-chinese.webp" },
  { match: "paneer", image: "/showcase/butter-chicken.webp" },
  { match: "chicken", image: "/showcase/butter-chicken.webp" },
];
export const DEFAULT_SHOWCASE_IMAGE = "/showcase/biryani.webp";

function normalizeImageUrl(image: string | null | undefined): string | null {
  if (!image?.trim()) return null;
  const trimmed = image.trim();
  if (
    trimmed === "null" ||
    trimmed === "undefined" ||
    trimmed === "N/A" ||
    trimmed === "none" ||
    trimmed === "#" ||
    trimmed.endsWith("/null") ||
    trimmed.endsWith("/undefined")
  ) {
    return null;
  }
  if (
    !trimmed.startsWith("/") &&
    !trimmed.startsWith("http://") &&
    !trimmed.startsWith("https://") &&
    !trimmed.startsWith("data:image/")
  ) {
    return null;
  }
  return trimmed;
}

/** Picks a valid image URL or a premium showcase fallback for the dish. */
export function pickSignatureImage(
  image: string | null | undefined,
  category: string,
  name: string,
): string {
  const normalized = normalizeImageUrl(image);
  if (normalized) return normalized;
  const haystack = `${category} ${name}`.toLowerCase();
  const found = SHOWCASE_FALLBACKS.find((entry) => haystack.includes(entry.match));
  return found?.image ?? DEFAULT_SHOWCASE_IMAGE;
}
