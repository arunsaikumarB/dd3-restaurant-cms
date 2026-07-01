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

function validateCtaPair(
  label: string,
  url: string,
  labelKey: keyof HomepageContentForm,
  urlKey: keyof HomepageContentForm,
  labelFallback: string,
  errors: HomepageContentErrors,
) {
  if (!label.trim()) {
    errors[labelKey] = `${labelFallback} label is required.`;
  }

  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    errors[urlKey] = `${labelFallback} URL is required.`;
  } else if (!isValidCtaLink(trimmedUrl)) {
    errors[urlKey] = "Enter a valid URL (https://...) or internal route (/path).";
  }
}

export function validateHomepageContent(form: HomepageContentForm): HomepageContentErrors {
  const errors: HomepageContentErrors = {};

  if (!form.hero_title.trim()) {
    errors.hero_title = "Hero title is required.";
  }

  validateCtaPair(
    form.primary_cta_label,
    form.primary_cta_url,
    "primary_cta_label",
    "primary_cta_url",
    "Primary CTA",
    errors,
  );

  validateCtaPair(
    form.secondary_cta_label,
    form.secondary_cta_url,
    "secondary_cta_label",
    "secondary_cta_url",
    "Secondary CTA",
    errors,
  );

  if (!form.about_title.trim()) {
    errors.about_title = "About title is required.";
  }

  return errors;
}

export function hasValidationErrors(errors: HomepageContentErrors): boolean {
  return Object.keys(errors).length > 0;
}
