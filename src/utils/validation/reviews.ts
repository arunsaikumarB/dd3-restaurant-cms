import type { ReviewForm } from "../../services/reviews";

export type ReviewErrors = Partial<Record<keyof ReviewForm, string>>;

export function validateReviewForm(form: ReviewForm): ReviewErrors {
  const errors: ReviewErrors = {};

  if (!form.customer_name.trim()) {
    errors.customer_name = "Customer name is required.";
  }

  if (!Number.isFinite(form.rating) || form.rating < 1 || form.rating > 5) {
    errors.rating = "Rating must be between 1 and 5.";
  }

  if (!form.review.trim()) {
    errors.review = "Review text is required.";
  }

  return errors;
}

export function hasValidationErrors(errors: ReviewErrors): boolean {
  return Object.keys(errors).length > 0;
}
