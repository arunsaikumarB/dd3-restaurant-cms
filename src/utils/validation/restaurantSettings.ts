import type { RestaurantSettingsForm } from "../../services/restaurantSettings";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s().-]{7,20}$/;

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export type RestaurantSettingsErrors = Partial<
  Record<
    | keyof RestaurantSettingsForm
    | "opening_hours.weekday"
    | "opening_hours.weekend"
    | "opening_hours.sunday",
    string
  >
>;

export function validateRestaurantSettings(
  form: RestaurantSettingsForm,
): RestaurantSettingsErrors {
  const errors: RestaurantSettingsErrors = {};

  const name = form.restaurant_name.trim();
  if (!name) {
    errors.restaurant_name = "Restaurant name is required.";
  }

  const email = form.email.trim();
  if (email && !EMAIL_RE.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  const phone = form.phone.trim();
  if (phone && !PHONE_RE.test(phone)) {
    errors.phone = "Enter a valid phone number.";
  }

  const googleMaps = form.google_maps.trim();
  if (googleMaps && !isValidUrl(googleMaps)) {
    errors.google_maps = "Enter a valid URL (https://...).";
  }

  const facebook = form.facebook.trim();
  if (facebook && !isValidUrl(facebook)) {
    errors.facebook = "Enter a valid Facebook URL.";
  }

  const instagram = form.instagram.trim();
  if (instagram && !isValidUrl(instagram)) {
    errors.instagram = "Enter a valid Instagram URL.";
  }

  const youtube = form.youtube.trim();
  if (youtube && !isValidUrl(youtube)) {
    errors.youtube = "Enter a valid YouTube URL.";
  }

  return errors;
}

export function hasValidationErrors(errors: RestaurantSettingsErrors): boolean {
  return Object.keys(errors).length > 0;
}
