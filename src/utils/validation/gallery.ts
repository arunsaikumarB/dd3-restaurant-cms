import type { GalleryForm } from "../../services/gallery";

export type GalleryErrors = Partial<Record<keyof GalleryForm, string>>;

export function validateGalleryForm(form: GalleryForm): GalleryErrors {
  const errors: GalleryErrors = {};

  if (!form.image?.trim()) {
    errors.image = "Image is required.";
  }

  if (!form.category.trim()) {
    errors.category = "Category is required.";
  }

  if (!form.section.trim()) {
    errors.section = "Section is required.";
  }

  if (!form.location_id.trim()) {
    errors.location_id = "Location is required.";
  }

  if (!form.alt_text.trim()) {
    errors.alt_text = "Alt text is required.";
  }

  if (!Number.isFinite(form.display_order)) {
    errors.display_order = "Display order must be a number.";
  } else if (form.display_order < 0) {
    errors.display_order = "Display order cannot be negative.";
  }

  return errors;
}

export function hasValidationErrors(errors: GalleryErrors): boolean {
  return Object.keys(errors).length > 0;
}
