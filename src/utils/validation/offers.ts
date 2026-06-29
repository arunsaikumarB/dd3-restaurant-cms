import type { OfferForm } from "../../services/offers";

export type OfferErrors = Partial<Record<keyof OfferForm, string>>;

export function validateOfferForm(form: OfferForm): OfferErrors {
  const errors: OfferErrors = {};

  if (!form.title.trim()) {
    errors.title = "Offer title is required.";
  }

  if (!form.discount.trim()) {
    errors.discount = "Discount is required.";
  }

  if (!form.start_date.trim()) {
    errors.start_date = "Start date is required.";
  }

  if (!form.end_date.trim()) {
    errors.end_date = "End date is required.";
  }

  if (form.start_date && form.end_date && form.end_date < form.start_date) {
    errors.end_date = "End date cannot be before start date.";
  }

  return errors;
}

export function hasValidationErrors(errors: OfferErrors): boolean {
  return Object.keys(errors).length > 0;
}
