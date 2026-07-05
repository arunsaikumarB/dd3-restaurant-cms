import { createClientIfConfigured } from "../lib/supabase/client";
import { isSupabaseConfigured } from "../lib/supabase/env";
import type { LocationId } from "../config/locations";
import type { Json, SeoMetadata } from "../types/database";
import type { SeoMetadataForm, SeoMetadataRow, SeoPageKey } from "../types/seoMetadata";
import {
  buildDefaultSeoMetadataForm,
  formToSeoPayload,
  rowToSeoForm,
} from "../utils/seo/seoDefaults";
import { invalidateSeoMetadataCache } from "./seoMetadataPublic";

type SupabaseError = { message: string; code?: string };

type SeoMetadataDbRow = SeoMetadata;

type SeoMetadataQuery = {
  select(columns: string): {
    eq(column: string, value: string): {
      eq(column: string, value: string): {
        maybeSingle(): Promise<{ data: SeoMetadataDbRow | null; error: SupabaseError | null }>;
      };
      order(column: string, opts: { ascending: boolean }): Promise<{
        data: SeoMetadataDbRow[] | null;
        error: SupabaseError | null;
      }>;
    };
  };
  insert(row: { page_key: SeoPageKey; location_id: LocationId; data: Json }): {
    select(columns: string): {
      single(): Promise<{ data: SeoMetadataDbRow | null; error: SupabaseError | null }>;
    };
  };
  update(row: { data: Json }): {
    eq(column: string, value: string): {
      select(columns: string): {
        single(): Promise<{ data: SeoMetadataDbRow | null; error: SupabaseError | null }>;
      };
    };
  };
  delete(): {
    eq(column: string, value: string): Promise<{ error: SupabaseError | null }>;
  };
};

function mapSupabaseError(error: { message: string; code?: string }): string {
  if (error.code === "42501" || error.message.toLowerCase().includes("permission")) {
    return "You do not have permission to update SEO metadata. Please sign in as an admin.";
  }
  return error.message || "Failed to save SEO metadata.";
}

function seoMetadataTable(client: NonNullable<ReturnType<typeof createClientIfConfigured>>) {
  return client.from("seo_metadata") as unknown as SeoMetadataQuery;
}

function toRow(row: SeoMetadataDbRow, pageKey: SeoPageKey, locationId: LocationId): SeoMetadataRow {
  return {
    id: row.id,
    page_key: row.page_key as SeoPageKey,
    location_id: row.location_id,
    data: rowToSeoForm(row, locationId, pageKey),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getSeoMetadata(
  locationId: LocationId,
  pageKey: SeoPageKey,
): Promise<SeoMetadataRow | null> {
  const client = createClientIfConfigured();
  if (!client) return null;

  const { data, error } = await seoMetadataTable(client)
    .select("*")
    .eq("location_id", locationId)
    .eq("page_key", pageKey)
    .maybeSingle();

  if (error) throw new Error(mapSupabaseError(error));
  if (!data) return null;
  return toRow(data, pageKey, locationId);
}

export async function getSeoMetadataForLocation(locationId: LocationId): Promise<SeoMetadataRow[]> {
  const client = createClientIfConfigured();
  if (!client) return [];

  const { data, error } = await seoMetadataTable(client)
    .select("*")
    .eq("location_id", locationId)
    .order("page_key", { ascending: true });

  if (error) throw new Error(mapSupabaseError(error));
  return (data ?? []).map((row) => toRow(row, row.page_key as SeoPageKey, locationId));
}

export async function getOrCreateSeoMetadata(
  locationId: LocationId,
  pageKey: SeoPageKey,
): Promise<SeoMetadataRow> {
  const existing = await getSeoMetadata(locationId, pageKey);
  if (existing) return existing;
  return createSeoMetadata(locationId, pageKey, buildDefaultSeoMetadataForm(locationId, pageKey));
}

export async function createSeoMetadata(
  locationId: LocationId,
  pageKey: SeoPageKey,
  form: SeoMetadataForm,
): Promise<SeoMetadataRow> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const client = createClientIfConfigured();
  if (!client) throw new Error("Supabase client unavailable.");

  const payload = formToSeoPayload(form);
  const { data, error } = await seoMetadataTable(client)
    .insert({
      page_key: pageKey,
      location_id: locationId,
      data: payload as unknown as Json,
    })
    .select("*")
    .single();

  if (error) throw new Error(mapSupabaseError(error));
  if (!data) throw new Error("Failed to create SEO metadata.");

  invalidateSeoMetadataCache(locationId);
  return toRow(data, pageKey, locationId);
}

export async function updateSeoMetadata(
  id: string,
  locationId: LocationId,
  pageKey: SeoPageKey,
  form: SeoMetadataForm,
): Promise<SeoMetadataRow> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const client = createClientIfConfigured();
  if (!client) throw new Error("Supabase client unavailable.");

  const payload = formToSeoPayload(form);
  const { data, error } = await seoMetadataTable(client)
    .update({ data: payload as unknown as Json })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(mapSupabaseError(error));
  if (!data) throw new Error("Failed to update SEO metadata.");

  invalidateSeoMetadataCache(locationId);
  return toRow(data, pageKey, locationId);
}

export async function deleteSeoMetadata(id: string, locationId: LocationId): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const client = createClientIfConfigured();
  if (!client) throw new Error("Supabase client unavailable.");

  const { error } = await seoMetadataTable(client).delete().eq("id", id);
  if (error) throw new Error(mapSupabaseError(error));
  invalidateSeoMetadataCache(locationId);
}
