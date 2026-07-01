import type { LocationId } from "../../config/locations";
import type { ContentStatus } from "../../types/database";
import { menuItemsTable } from "./db";
import { createChefGaaSyncClient } from "./supabaseClient";
import type { MenuSyncStats, NormalizedMenuItem } from "./types";
import { hashItemPayload } from "./utils";

type ExistingItemRow = {
  id: string;
  chefgaa_outlet_item_id: string | null;
  chefgaa_content_hash: string | null;
  price: number;
  manual_override: boolean;
  status: ContentStatus;
};

function itemStatus(item: NormalizedMenuItem): ContentStatus {
  return item.availability ? "active" : "inactive";
}

function buildItemRow(
  locationId: LocationId,
  item: NormalizedMenuItem,
  categoryId: string,
  contentHash: string,
  syncedAt: string,
  status: ContentStatus,
) {
  return {
    location_id: locationId,
    category_id: categoryId,
    name: item.name,
    description: item.description,
    price: item.price,
    image: item.image,
    veg: item.veg,
    popular: item.popular,
    chef_special: item.chefSpecial,
    spice_level: item.spiceLevel,
    status,
    display_order: item.displayOrder,
    chefgaa_outlet_item_id: item.id,
    chefgaa_catalog_item_id: item.catalogItemId,
    chefgaa_content_hash: contentHash,
    imported_from_chefgaa: true,
    chefgaa_last_synced_at: syncedAt,
    manual_override: false,
    chefgaa_removed_at: null,
  };
}

export async function syncMenuItems(
  locationId: LocationId,
  items: NormalizedMenuItem[],
  categoryIdByExternal: Map<string, string>,
  syncedAt: string,
): Promise<MenuSyncStats> {
  const supabase = createChefGaaSyncClient();
  const table = menuItemsTable(supabase);
  const stats: MenuSyncStats = {
    created: 0,
    updated: 0,
    deactivated: 0,
    pricesChanged: 0,
    availabilityChanged: 0,
    unchanged: 0,
    failed: 0,
  };

  const { data: existingRows, error: loadError } = await table
    .select(
      "id, chefgaa_outlet_item_id, chefgaa_content_hash, price, manual_override, status",
    )
    .eq("location_id", locationId);

  if (loadError) {
    throw new Error(`Failed to load existing menu items: ${loadError.message}`);
  }

  const existing = (existingRows ?? []) as ExistingItemRow[];
  const byExternalId = new Map(
    existing
      .filter((row) => row.chefgaa_outlet_item_id)
      .map((row) => [row.chefgaa_outlet_item_id as string, row]),
  );
  const incomingIds = new Set(items.map((item) => item.id));

  for (const item of items) {
    const categoryId = categoryIdByExternal.get(item.categoryId);
    if (!categoryId) {
      stats.failed += 1;
      continue;
    }

    const status = itemStatus(item);
    const contentHash = hashItemPayload({
      name: item.name,
      description: item.description,
      price: item.price,
      image: item.image,
      veg: item.veg,
      popular: item.popular,
      chefSpecial: item.chefSpecial,
      availability: item.availability,
      spiceLevel: item.spiceLevel,
      displayOrder: item.displayOrder,
      categoryId: item.categoryId,
      status,
    });

    const existingRow = byExternalId.get(item.id);

    try {
      if (!existingRow) {
        const { error } = await (
          supabase.from("menu_items") as unknown as {
            upsert(
              rows: Record<string, unknown>[],
              options: { onConflict: string; ignoreDuplicates: boolean },
            ): Promise<{ error: { message: string } | null }>;
          }
        ).upsert(
          [buildItemRow(locationId, item, categoryId, contentHash, syncedAt, status)],
          { onConflict: "location_id,chefgaa_outlet_item_id", ignoreDuplicates: false },
        );

        if (error) {
          stats.failed += 1;
          continue;
        }
        stats.created += 1;
        continue;
      }

      if (existingRow.manual_override) {
        stats.unchanged += 1;
        await table.update({ chefgaa_last_synced_at: syncedAt }).eq("id", existingRow.id);
        continue;
      }

      const priceChanged = Number(existingRow.price) !== item.price;
      const availabilityChanged = existingRow.status !== status;

      if (existingRow.chefgaa_content_hash === contentHash) {
        stats.unchanged += 1;
        await table
          .update({
            chefgaa_last_synced_at: syncedAt,
            chefgaa_removed_at: null,
          })
          .eq("id", existingRow.id);
        continue;
      }

      const { error } = await table
        .update({
          category_id: categoryId,
          name: item.name,
          description: item.description,
          price: item.price,
          image: item.image,
          veg: item.veg,
          popular: item.popular,
          chef_special: item.chefSpecial,
          spice_level: item.spiceLevel,
          status,
          display_order: item.displayOrder,
          chefgaa_catalog_item_id: item.catalogItemId,
          chefgaa_content_hash: contentHash,
          imported_from_chefgaa: true,
          chefgaa_last_synced_at: syncedAt,
          chefgaa_removed_at: null,
        })
        .eq("id", existingRow.id);

      if (error) {
        stats.failed += 1;
        continue;
      }

      stats.updated += 1;
      if (priceChanged) stats.pricesChanged += 1;
      if (availabilityChanged) stats.availabilityChanged += 1;
    } catch {
      stats.failed += 1;
    }
  }

  const importedRows = existing.filter(
    (row) => row.chefgaa_outlet_item_id && !incomingIds.has(row.chefgaa_outlet_item_id),
  );

  for (const row of importedRows) {
    if (row.manual_override || row.status === "inactive") continue;
    const { error } = await table
      .update({
        status: "inactive",
        chefgaa_last_synced_at: syncedAt,
        chefgaa_removed_at: syncedAt,
      })
      .eq("id", row.id);

    if (error) {
      stats.failed += 1;
      continue;
    }
    stats.deactivated += 1;
  }

  return stats;
}
