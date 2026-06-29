import { createClientIfConfigured } from "../lib/supabase/client";
import type { UserProfile } from "../types/database";

const PROFILE_COLUMNS =
  "id, email, full_name, role, created_at, updated_at" as const;

/** Fetch the signed-in user's row from public.users (RLS: own profile or admin). */
export async function fetchCurrentUserProfile(): Promise<UserProfile | null> {
  const supabase = createClientIfConfigured();
  if (!supabase) return null;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;

  const { data, error } = await supabase
    .from("users")
    .select(PROFILE_COLUMNS)
    .eq("id", userData.user.id)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}
