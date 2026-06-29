import type { HomepageContentForm } from "../../services/homepageContent";

export type HomepageContentErrors = Partial<Record<keyof HomepageContentForm, string>>;

function isValidCtaLink(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  if (trimmed.startsWith("/")) {
    return /^\/[^\s]*$/.test(trimmed);
  }

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateHomepageContent(form: HomepageContentForm): HomepageContentErrors {
  const errors: HomepageContentErrors = {};

  if (!form.hero_title.trim()) {
    errors.hero_title = "Hero title is required.";
  }

  if (!form.cta_text.trim()) {
    errors.cta_text = "CTA text is required.";
  }

  const ctaLink = form.cta_link.trim();
  if (!ctaLink) {
    errors.cta_link = "CTA link is required.";
  } else if (!isValidCtaLink(ctaLink)) {
    errors.cta_link = "Enter a valid URL (https://...) or internal route (/path).";
  }

  if (!form.about_title.trim()) {
    errors.about_title = "About title is required.";
  }

  return errors;
}

export function hasValidationErrors(errors: HomepageContentErrors): boolean {
  return Object.keys(errors).length > 0;
}
