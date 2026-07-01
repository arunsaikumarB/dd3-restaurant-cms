import { createClientIfConfigured } from "../lib/supabase/client";
import type { LocationId } from "../config/locations";
import type { PageContentPageKey } from "../config/pageContentSchema";
import type { Json, PageContent, PageContentInsert } from "../types/database";
import { invalidatePageContentCache } from "./pageContentPublic";

export const ALL_LOCATIONS_SCOPE_MESSAGE =
  "Select a single location in the header to edit page content for that branch.";

export class AllLocationsScopeError extends Error {
  constructor() {
    super(ALL_LOCATIONS_SCOPE_MESSAGE);
    this.name = "AllLocationsScopeError";
  }
}

function mapSupabaseError(error: { message: string; code?: string }): string {
  if (error.code === "42501" || error.message.toLowerCase().includes("permission")) {
    return "You do not have permission to update page content. Please sign in as an admin.";
  }
  return error.message || "Failed to save page content.";
}

function parseContent(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

type SupabaseError = { message: string; code?: string };

type PageContentQuery = {
  select(columns: string): {
    eq(column: string, value: string): {
      eq(column: string, value: string): {
        eq(column: string, value: string): {
          maybeSingle(): Promise<{ data: Pick<PageContent, "content"> | null; error: SupabaseError | null }>;
        };
      };
    };
  };
  update(row: Partial<PageContentInsert>): {
    eq(column: string, value: string): {
      eq(column: string, value: string): {
        eq(column: string, value: string): {
          select(columns: string): {
            single(): Promise<{ data: PageContent | null; error: SupabaseError | null }>;
          };
        };
      };
    };
  };
};

function pageContentTable(supabase: NonNullable<ReturnType<typeof createClientIfConfigured>>) {
  return supabase.from("page_content") as unknown as PageContentQuery;
}

export async function getSection(
  locationId: LocationId,
  page: PageContentPageKey,
  section: string,
): Promise<Record<string, unknown>> {
  const client = createClientIfConfigured();
  if (!client) {
    return {};
  }

  const { data, error } = await pageContentTable(client)
    .select("content")
    .eq("location_id", locationId)
    .eq("page", page)
    .eq("section", section)
    .maybeSingle();

  if (error) {
    throw new Error(mapSupabaseError(error));
  }

  return parseContent(data?.content);
}

export async function upsertSection(
  locationId: LocationId,
  page: PageContentPageKey,
  section: string,
  content: Record<string, unknown>,
): Promise<PageContent> {
  const client = createClientIfConfigured();
  if (!client) {
    throw new Error("Supabase is not configured.");
  }

  const payload: Partial<PageContentInsert> = {
    content: content as Json,
  };

  const { data, error } = await pageContentTable(client)
    .update(payload)
    .eq("location_id", locationId)
    .eq("page", page)
    .eq("section", section)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(mapSupabaseError(error ?? { message: "Update failed." }));
  }

  invalidatePageContentCache(locationId);
  return data;
}
