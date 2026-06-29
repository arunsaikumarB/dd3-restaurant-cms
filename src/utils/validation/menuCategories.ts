import type { MenuCategoryForm } from "../../services/menuCategories";
import type { ContentStatus } from "../../types/database";
import { slugify } from "../slug";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type MenuCategoryErrors = Partial<Record<keyof MenuCategoryForm, string>>;

export function resolveCategorySlug(name: string, slug: string): string {
  const trimmedSlug = slug.trim();
  if (trimmedSlug) return trimmedSlug;
  return slugify(name);
}

export function validateMenuCategoryForm(
  form: MenuCategoryForm,
  options?: { slugTaken?: boolean },
): MenuCategoryErrors {
  const errors: MenuCategoryErrors = {};

  const name = form.name.trim();
  if (!name) {
    errors.name = "Category name is required.";
  }

  const slug = resolveCategorySlug(form.name, form.slug);
  if (!slug) {
    errors.slug = "Slug is required.";
  } else if (!SLUG_RE.test(slug)) {
    errors.slug = "Use lowercase letters, numbers, and hyphens only.";
  } else if (options?.slugTaken) {
    errors.slug = "This slug is already in use.";
  }

  if (!Number.isFinite(form.display_order)) {
    errors.display_order = "Display order must be a number.";
  } else if (form.display_order < 0) {
    errors.display_order = "Display order cannot be negative.";
  }

  const status = form.status as ContentStatus;
  if (!status || (status !== "active" && status !== "inactive")) {
    errors.status = "Status is required.";
  }

  return errors;
}

export function hasValidationErrors(errors: MenuCategoryErrors): boolean {
  return Object.keys(errors).length > 0;
}
