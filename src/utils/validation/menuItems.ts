import type { MenuItemForm } from "../../services/menuItems";
import type { ContentStatus } from "../../types/database";

export type MenuItemErrors = Partial<Record<keyof MenuItemForm, string>>;

const AVAILABILITY_STATUSES: ContentStatus[] = ["active", "inactive"];

export function validateMenuItemForm(form: MenuItemForm): MenuItemErrors {
  const errors: MenuItemErrors = {};

  if (!form.category_id.trim()) {
    errors.category_id = "Category is required.";
  }

  if (!form.name.trim()) {
    errors.name = "Item name is required.";
  }

  if (!Number.isFinite(form.price) || form.price <= 0) {
    errors.price = "Price must be greater than zero.";
  }

  if (!Number.isFinite(form.display_order)) {
    errors.display_order = "Display order must be a number.";
  } else if (form.display_order < 0) {
    errors.display_order = "Display order cannot be negative.";
  }

  if (form.spice_level !== null) {
    if (!Number.isInteger(form.spice_level) || form.spice_level < 0 || form.spice_level > 5) {
      errors.spice_level = "Spice level must be between 0 and 5.";
    }
  }

  if (!AVAILABILITY_STATUSES.includes(form.status)) {
    errors.status = "Availability status is required.";
  }

  return errors;
}

export function hasValidationErrors(errors: MenuItemErrors): boolean {
  return Object.keys(errors).length > 0;
}
