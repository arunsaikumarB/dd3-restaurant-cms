export const MIN_RESTAURANT_PHONES = 1;
export const MAX_RESTAURANT_PHONES = 5;

/** Normalize a list of phone strings for storage/display. */
export function normalizePhoneList(values: string[]): string[] {
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, MAX_RESTAURANT_PHONES);
}

/** Parse phones from DB row, falling back to legacy single phone column. */
export function parsePhonesFromRow(
  phones: unknown,
  legacyPhone: string | null | undefined,
): string[] {
  if (Array.isArray(phones)) {
    const parsed = normalizePhoneList(
      phones.filter((entry): entry is string => typeof entry === "string"),
    );
    if (parsed.length > 0) return parsed;
  }

  const fallback = legacyPhone?.trim();
  return fallback ? [fallback] : [];
}

/** Primary phone — first in the list. */
export function primaryPhone(phones: string[]): string {
  return phones[0] ?? "";
}

export function phoneTelHref(phone: string): string {
  return `tel:${phone.replace(/\D/g, "")}`;
}

/** Inline display, e.g. footer or legal copy. */
export function formatPhonesInline(phones: string[]): string {
  return normalizePhoneList(phones).join(" · ");
}
