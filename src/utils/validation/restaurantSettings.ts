import type { RestaurantSettingsForm } from "../../services/restaurantSettings";
import {
  MAX_RESTAURANT_PHONES,
  MIN_RESTAURANT_PHONES,
  normalizePhoneList,
} from "../restaurantPhones";

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
> & {
  phoneFields?: Partial<Record<number, string>>;
};

export function validateRestaurantSettings(
  form: RestaurantSettingsForm,
): RestaurantSettingsErrors {
  const errors: RestaurantSettingsErrors = {};
  const phoneFields: Partial<Record<number, string>> = {};

  const name = form.restaurant_name.trim();
  if (!name) {
    errors.restaurant_name = "Restaurant name is required.";
  }

  const email = form.email.trim();
  if (email && !EMAIL_RE.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  form.phones.forEach((phone, index) => {
    const trimmed = phone.trim();
    if (trimmed && !PHONE_RE.test(trimmed)) {
      phoneFields[index] = "Enter a valid phone number.";
    }
  });

  const normalizedPhones = normalizePhoneList(form.phones);
  if (normalizedPhones.length < MIN_RESTAURANT_PHONES) {
    errors.phones = "Add at least one phone number.";
  } else if (form.phones.filter((phone) => phone.trim()).length > MAX_RESTAURANT_PHONES) {
    errors.phones = `You can add up to ${MAX_RESTAURANT_PHONES} phone numbers.`;
  }

  if (Object.keys(phoneFields).length > 0) {
    errors.phoneFields = phoneFields;
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

  const reservationUrl = form.reservation_url.trim();
  if (reservationUrl && !reservationUrl.startsWith("/") && !isValidUrl(reservationUrl)) {
    errors.reservation_url = "Enter a valid URL or path (e.g. /reservation).";
  }

  const orderUrl = form.order_url.trim();
  if (orderUrl && !orderUrl.startsWith("/") && !isValidUrl(orderUrl)) {
    errors.order_url = "Enter a valid order URL.";
  }

  return errors;
}

export function hasValidationErrors(errors: RestaurantSettingsErrors): boolean {
  const { phoneFields, ...rest } = errors;
  return Object.keys(rest).length > 0 || Boolean(phoneFields && Object.keys(phoneFields).length > 0);
}
