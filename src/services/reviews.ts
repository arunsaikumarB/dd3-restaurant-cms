import { createClientIfConfigured } from "../lib/supabase/client";
import { isSupabaseConfigured } from "../lib/supabase/env";
import type { Review, ReviewInsert } from "../types/database";
import { mapSupabaseError } from "../utils/supabase/errors";

export type ReviewForm = {
  customer_name: string;
  rating: number;
  review: string;
  approved: boolean;
  featured: boolean;
};

export type ReviewTableRow = {
  id: string;
  customer: string;
  customer_name: string;
  rating: number;
  review: string;
  date: string;
  status: "approved" | "pending";
  approved: boolean;
  featured: boolean;
  created_at: string;
};

export const EMPTY_REVIEW_FORM: ReviewForm = {
  customer_name: "",
  rating: 5,
  review: "",
  approved: false,
  featured: false,
};

export function rowToForm(row: ReviewTableRow): ReviewForm {
  return {
    customer_name: row.customer_name,
    rating: row.rating,
    review: row.review,
    approved: row.approved,
    featured: row.featured,
  };
}

export function formToPayload(form: ReviewForm): ReviewInsert {
  return {
    customer_name: form.customer_name.trim(),
    rating: Math.round(form.rating),
    review: form.review.trim(),
    approved: form.approved,
    featured: form.featured,
  };
}

function formatReviewDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function mapReviewRow(row: Review): ReviewTableRow {
  const approved = row.approved ?? false;

  return {
    id: row.id,
    customer: row.customer_name,
    customer_name: row.customer_name,
    rating: row.rating,
    review: row.review,
    date: formatReviewDate(row.created_at),
    status: approved ? "approved" : "pending",
    approved,
    featured: row.featured ?? false,
    created_at: row.created_at,
  };
}

function sortReviewsNewest(rows: ReviewTableRow[]): ReviewTableRow[] {
  return [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

type SupabaseError = { message: string; code?: string };

type ReviewsQuery = {
  select(columns: string): Promise<{ data: Review[] | null; error: SupabaseError | null }>;
  insert(row: ReviewInsert): {
    select(columns: string): {
      single(): Promise<{ data: Review | null; error: SupabaseError | null }>;
    };
  };
  update(row: Partial<ReviewInsert>): {
    eq(column: string, value: string): {
      select(columns: string): {
        single(): Promise<{ data: Review | null; error: SupabaseError | null }>;
      };
    };
  };
  delete(): {
    eq(column: string, value: string): Promise<{ error: SupabaseError | null }>;
  };
};

function reviewsTable(supabase: NonNullable<ReturnType<typeof createClientIfConfigured>>) {
  return supabase.from("reviews") as unknown as ReviewsQuery;
}

function requireClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
  const supabase = createClientIfConfigured();
  if (!supabase) {
    throw new Error("Supabase client could not be initialized.");
  }
  return supabase;
}

export async function fetchReviews(): Promise<ReviewTableRow[]> {
  const supabase = requireClient();
  const { data, error } = await reviewsTable(supabase).select("*");

  if (error) {
    throw new Error(mapSupabaseError(error, "load reviews"));
  }

  return sortReviewsNewest((data ?? []).map(mapReviewRow));
}

export async function createReview(form: ReviewForm): Promise<ReviewTableRow> {
  const supabase = requireClient();
  const { data, error } = await reviewsTable(supabase)
    .insert(formToPayload(form))
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(mapSupabaseError(error ?? { message: "Create failed." }, "create review"));
  }

  return mapReviewRow(data);
}

export async function updateReview(id: string, form: ReviewForm): Promise<ReviewTableRow> {
  const supabase = requireClient();
  const { data, error } = await reviewsTable(supabase)
    .update(formToPayload(form))
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(mapSupabaseError(error ?? { message: "Update failed." }, "update review"));
  }

  return mapReviewRow(data);
}

export async function updateReviewApproved(id: string, approved: boolean): Promise<ReviewTableRow> {
  const supabase = requireClient();
  const { data, error } = await reviewsTable(supabase)
    .update({ approved })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(mapSupabaseError(error ?? { message: "Update failed." }, "update approval status"));
  }

  return mapReviewRow(data);
}

export async function updateReviewFeatured(id: string, featured: boolean): Promise<ReviewTableRow> {
  const supabase = requireClient();
  const { data, error } = await reviewsTable(supabase)
    .update({ featured })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(mapSupabaseError(error ?? { message: "Update failed." }, "update featured status"));
  }

  return mapReviewRow(data);
}

export async function deleteReview(id: string): Promise<void> {
  const supabase = requireClient();
  const { error } = await reviewsTable(supabase).delete().eq("id", id);

  if (error) {
    throw new Error(mapSupabaseError(error, "delete review"));
  }
}

export const RATING_FILTER_OPTIONS = [
  { value: "all", label: "All Ratings" },
  { value: "5", label: "5 Stars" },
  { value: "4", label: "4 Stars" },
  { value: "3", label: "3 Stars" },
  { value: "2", label: "2 Stars" },
  { value: "1", label: "1 Star" },
];
