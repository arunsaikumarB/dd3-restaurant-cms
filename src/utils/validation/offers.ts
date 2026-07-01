import type { OfferForm } from "../../services/offers";
import { slugify } from "../slug";

export type OfferErrors = Partial<Record<keyof OfferForm | "content", string>>;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugifyTitle(title: string): string {
  return slugify(title);
}

export function validateOfferForm(form: OfferForm): OfferErrors {
  const errors: OfferErrors = {};

  if (!form.title.trim()) {
    errors.title = "Offer title is required.";
  }

  if (!form.slug.trim()) {
    errors.slug = "URL slug is required.";
  } else if (!SLUG_PATTERN.test(form.slug.trim())) {
    errors.slug = "Slug must use lowercase letters, numbers, and hyphens only.";
  }

  const validSections = form.content.filter((section) => section.heading.trim());
  if (validSections.length === 0) {
    errors.content = "Add at least one content section with a heading.";
  }

  if (!Number.isFinite(form.display_order)) {
    errors.display_order = "Display order must be a number.";
  } else if (form.display_order < 0) {
    errors.display_order = "Display order cannot be negative.";
  }

  if (form.start_date && form.end_date && form.end_date < form.start_date) {
    errors.end_date = "End date cannot be before start date.";
  }

  for (const url of form.gallery) {
    const trimmed = url.trim();
    if (!trimmed) continue;
    if (!isValidImageUrl(trimmed)) {
      errors.gallery = "Gallery URLs must be valid http(s) links or site paths.";
      break;
    }
  }

  const imageUrl = form.image?.trim();
  if (imageUrl && !isValidImageUrl(imageUrl)) {
    errors.image = "Image URL must be a valid http(s) link or site path.";
  }

  return errors;
}

export function hasValidationErrors(errors: OfferErrors): boolean {
  return Object.keys(errors).length > 0;
}

function isValidImageUrl(value: string): boolean {
  if (value.startsWith("/")) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
