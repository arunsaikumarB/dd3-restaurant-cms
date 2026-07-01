import type { LocationId } from "../../config/locations";
import type { ContentStatus } from "../../types/database";
import { categoriesTable } from "./db";
import { createChefGaaSyncClient } from "./supabaseClient";
import type { CategorySyncStats, NormalizedCategory } from "./types";
import { hashCategoryPayload } from "./utils";

type ExistingCategoryRow = {
  id: string;
  slug: string;
  chefgaa_category_id: string | null;
  chefgaa_content_hash: string | null;
  name: string;
  display_order: number;
  status: ContentStatus;
};

function buildCategoryRow(
  locationId: LocationId,
  category: NormalizedCategory,
  slug: string,
  contentHash: string,
  syncedAt: string,
) {
  return {
    location_id: locationId,
    name: category.name,
    slug,
    image: null,
    display_order: category.displayOrder,
    status: category.status,
    chefgaa_category_id: category.id,
    chefgaa_content_hash: contentHash,
    imported_from_chefgaa: true,
    chefgaa_last_synced_at: syncedAt,
    chefgaa_removed_at: null,
  };
}

export async function syncCategories(
  locationId: LocationId,
  categories: NormalizedCategory[],
  syncedAt: string,
): Promise<CategorySyncStats> {
  const supabase = createChefGaaSyncClient();
  const table = categoriesTable(supabase);
  const stats: CategorySyncStats = {
    created: 0,
    updated: 0,
    deactivated: 0,
    unchanged: 0,
    failed: 0,
  };

  const { data: existingRows, error: loadError } = await table
    .select("id, slug, chefgaa_category_id, chefgaa_content_hash, name, display_order, status")
    .eq("location_id", locationId);

  if (loadError) {
    throw new Error(`Failed to load existing categories: ${loadError.message}`);
  }

  const existing = (existingRows ?? []) as ExistingCategoryRow[];
  const byExternalId = new Map(
    existing
      .filter((row) => row.chefgaa_category_id)
      .map((row) => [row.chefgaa_category_id as string, row]),
  );
  const usedSlugs = new Set(existing.map((row) => row.slug));
  const incomingIds = new Set(categories.map((category) => category.id));

  for (const category of categories) {
    const contentHash = hashCategoryPayload(
      category.name,
      category.displayOrder,
      category.status,
    );
    const existingRow = byExternalId.get(category.id);

    try {
      if (!existingRow) {
        let slug = category.slug;
        if (usedSlugs.has(slug)) {
          let suffix = 2;
          while (usedSlugs.has(`${category.slug}-${suffix}`)) suffix += 1;
          slug = `${category.slug}-${suffix}`;
        }
        usedSlugs.add(slug);

        const { error } = await (
          supabase.from("menu_categories") as unknown as {
            upsert(
              rows: Record<string, unknown>[],
              options: { onConflict: string; ignoreDuplicates: boolean },
            ): Promise<{ error: { message: string } | null }>;
          }
        ).upsert(
          [buildCategoryRow(locationId, category, slug, contentHash, syncedAt)],
          { onConflict: "location_id,chefgaa_category_id", ignoreDuplicates: false },
        );

        if (error) {
          stats.failed += 1;
          continue;
        }
        stats.created += 1;
        continue;
      }

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
          name: category.name,
          display_order: category.displayOrder,
          status: category.status,
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
    } catch {
      stats.failed += 1;
    }
  }

  const importedRows = existing.filter(
    (row) => row.chefgaa_category_id && !incomingIds.has(row.chefgaa_category_id),
  );

  for (const row of importedRows) {
    if (row.status === "inactive") continue;
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

export async function loadCategoryIdMap(
  locationId: LocationId,
): Promise<Map<string, string>> {
  const supabase = createChefGaaSyncClient();
  const { data, error } = await categoriesTable(supabase)
    .select("id, chefgaa_category_id")
    .eq("location_id", locationId);

  if (error) {
    throw new Error(`Failed to load category id map: ${error.message}`);
  }

  const map = new Map<string, string>();
  for (const row of (data ?? []) as Array<{ id: string; chefgaa_category_id: string | null }>) {
    if (row.chefgaa_category_id) {
      map.set(row.chefgaa_category_id, row.id);
    }
  }
  return map;
}
