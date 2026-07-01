import type { LocationId } from "../../config/locations";
import { fetchLegacyMenuCatalog } from "./legacyClient";
import { fetchV2MenuCatalog } from "./v2Client";
import type {
  ChefGaaLocationIntegrationConfig,
  LegacyMenuCategory,
  NormalizedCategory,
  NormalizedMenuCatalog,
  NormalizedMenuItem,
  V2MenuCategory,
  V2MenuItem,
} from "./types";
import {
  ensureUniqueSlug,
  inferChefSpecial,
  inferSpiceLevel,
  inferVeg,
  isLegacyCategoryAvailable,
  isLegacyItemAvailable,
  parsePrice,
  resolveChefGaaImage,
  slugifyCategoryName,
} from "./utils";

export function mapLegacyMenuCatalog(
  locationId: LocationId,
  categories: LegacyMenuCategory[],
  orderTypeId: number,
): NormalizedMenuCatalog {
  const usedSlugs = new Set<string>();
  const normalizedCategories: NormalizedCategory[] = [];
  const normalizedItems: NormalizedMenuItem[] = [];

  categories.forEach((category, categoryIndex) => {
    const categoryExternalId = String(category.OutletMenuItemCategory);
    const baseSlug = slugifyCategoryName(category.name);
    const slug = ensureUniqueSlug(baseSlug, usedSlugs);
    const categoryAvailable = isLegacyCategoryAvailable(category, orderTypeId);
    const displayOrder =
      typeof category.sort_order === "number" ? category.sort_order : categoryIndex + 1;

    const items = category.menuItems ?? [];
    const hasAvailableItem = items.some((item) => isLegacyItemAvailable(item, orderTypeId));

    normalizedCategories.push({
      id: categoryExternalId,
      name: category.name.trim(),
      slug,
      displayOrder,
      locationId,
      status: categoryAvailable && hasAvailableItem ? "active" : "inactive",
    });

    items.forEach((item, itemIndex) => {
      const available = isLegacyItemAvailable(item, orderTypeId);
      const displayItemOrder =
        typeof item.sort_order === "number" ? item.sort_order : itemIndex + 1;

      normalizedItems.push({
        id: String(item.OutletMenuItem),
        categoryId: categoryExternalId,
        catalogItemId: null,
        name: item.name.trim(),
        description: item.description?.trim() || null,
        price: parsePrice(item.selling_price ?? item.cost_price ?? 0),
        image: resolveChefGaaImage(item.image),
        veg: inferVeg(category.name, item.name),
        popular: Boolean(item.is_recommended),
        chefSpecial: inferChefSpecial(item.name),
        availability: available,
        spiceLevel: inferSpiceLevel(item.name),
        displayOrder: displayItemOrder,
        locationId,
      });
    });
  });

  return {
    locationId,
    categories: normalizedCategories,
    items: normalizedItems,
  };
}

function readV2CategoryId(category: V2MenuCategory, fallbackIndex: number): string {
  const raw = category.id ?? (category as { categoryId?: string | number }).categoryId;
  if (raw != null && String(raw).trim()) return String(raw);
  return `v2-category-${fallbackIndex + 1}`;
}

function readV2ItemId(item: V2MenuItem, fallbackIndex: number): string {
  const raw =
    item.id ??
    (item as { outletMenuItemId?: string | number }).outletMenuItemId ??
    (item as { menuItemId?: string | number }).menuItemId;
  if (raw != null && String(raw).trim()) return String(raw);
  return `v2-item-${fallbackIndex + 1}`;
}

function readV2Items(category: V2MenuCategory): V2MenuItem[] {
  const items = category.items ?? category.menuItems;
  return Array.isArray(items) ? items : [];
}

function isV2ItemUnavailable(item: V2MenuItem): boolean {
  if (item.isUnavailable === true || item.is_unavailable === true) return true;
  if (item.mark_as_unavailable === true) return true;
  return false;
}

export function mapV2MenuCatalog(
  locationId: LocationId,
  categories: V2MenuCategory[],
): NormalizedMenuCatalog {
  const usedSlugs = new Set<string>();
  const normalizedCategories: NormalizedCategory[] = [];
  const normalizedItems: NormalizedMenuItem[] = [];

  categories.forEach((category, categoryIndex) => {
    const categoryExternalId = readV2CategoryId(category, categoryIndex);
    const name = String(category.name ?? `Category ${categoryIndex + 1}`).trim();
    const baseSlug = slugifyCategoryName(name);
    const slug = ensureUniqueSlug(baseSlug, usedSlugs);
    const displayOrder =
      typeof category.sort_order === "number"
        ? category.sort_order
        : typeof category.sortOrder === "number"
          ? category.sortOrder
          : categoryIndex + 1;

    const items = readV2Items(category);
    const hasAvailableItem = items.some((item) => !isV2ItemUnavailable(item));

    normalizedCategories.push({
      id: categoryExternalId,
      name,
      slug,
      displayOrder,
      locationId,
      status: hasAvailableItem ? "active" : "inactive",
    });

    items.forEach((item, itemIndex) => {
      const itemName = String(item.name ?? `Item ${itemIndex + 1}`).trim();
      const available = !isV2ItemUnavailable(item);
      const price = parsePrice(
        item.selling_price ?? item.sellingPrice ?? item.price ?? 0,
      );
      const image = resolveChefGaaImage(
        (item.image as string | null | undefined) ??
          (item.imageUrl as string | null | undefined),
      );
      const veg =
        item.isVeg === true ||
        item.is_veg === true ||
        inferVeg(name, itemName);
      const popular = item.isRecommended === true || item.is_recommended === true;

      normalizedItems.push({
        id: readV2ItemId(item, itemIndex),
        categoryId: categoryExternalId,
        catalogItemId:
          (item as { catalogItemId?: string | number }).catalogItemId != null
            ? String((item as { catalogItemId?: string | number }).catalogItemId)
            : null,
        name: itemName,
        description:
          typeof item.description === "string" ? item.description.trim() || null : null,
        price,
        image,
        veg,
        popular,
        chefSpecial: inferChefSpecial(itemName),
        availability: available,
        spiceLevel: inferSpiceLevel(itemName),
        displayOrder:
          typeof item.sort_order === "number"
            ? item.sort_order
            : typeof item.sortOrder === "number"
              ? item.sortOrder
              : itemIndex + 1,
        locationId,
      });
    });
  });

  return {
    locationId,
    categories: normalizedCategories,
    items: normalizedItems,
  };
}

export async function downloadAndNormalizeMenu(
  config: ChefGaaLocationIntegrationConfig,
): Promise<NormalizedMenuCatalog> {
  if (config.apiVersion === "legacy") {
    if (!config.legacyOutletId || !config.legacyOrderTypeId) {
      throw new Error(`Legacy config incomplete for ${config.locationId}`);
    }
    const legacy = await fetchLegacyMenuCatalog({
      outletId: config.legacyOutletId,
      partnerId: config.legacyPartnerId,
    });
    return mapLegacyMenuCatalog(config.locationId, legacy, config.legacyOrderTypeId);
  }

  if (!config.v2TenantId || !config.v2StoreId || !config.v2PlatformSlug) {
    throw new Error(`V2 config incomplete for ${config.locationId}`);
  }

  const v2 = await fetchV2MenuCatalog({
    tenantId: config.v2TenantId,
    storeId: config.v2StoreId,
    platformSlug: config.v2PlatformSlug,
  });
  return mapV2MenuCatalog(config.locationId, v2);
}
