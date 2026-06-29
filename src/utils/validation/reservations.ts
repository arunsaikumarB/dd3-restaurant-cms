import type { ReservationForm } from "../../services/reservations";

export type ReservationErrors = Partial<Record<keyof ReservationForm, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateReservationForm(form: ReservationForm): ReservationErrors {
  const errors: ReservationErrors = {};

  if (!form.customer_name.trim()) {
    errors.customer_name = "Customer name is required.";
  }

  if (!form.phone.trim()) {
    errors.phone = "Phone is required.";
  }

  if (!form.email.trim()) {
    errors.email = "Email is required.";
  } else if (!EMAIL_PATTERN.test(form.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (!form.date.trim()) {
    errors.date = "Reservation date is required.";
  }

  if (!form.time.trim()) {
    errors.time = "Reservation time is required.";
  }

  if (!Number.isFinite(form.guests) || form.guests < 1) {
    errors.guests = "Guests must be at least 1.";
  }

  return errors;
}

export function hasValidationErrors(errors: ReservationErrors): boolean {
  return Object.keys(errors).length > 0;
}
