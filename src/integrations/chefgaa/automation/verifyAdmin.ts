function readEnv(key: string): string | undefined {
  const runtime = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  };
  return runtime.process?.env?.[key];
}

/**
 * Verifies a Supabase access token belongs to an admin or staff user.
 * Service role key stays server-side only.
 */
export async function verifyAdminAccessToken(accessToken: string): Promise<{
  ok: boolean;
  userId?: string;
  error?: string;
}> {
  const url =
    readEnv("VITE_SUPABASE_URL") ??
    readEnv("SUPABASE_URL") ??
    readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceKey) {
    return { ok: false, error: "Server Supabase credentials are not configured." };
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData.user) {
    return { ok: false, error: "Invalid or expired session." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();

  const role = (profile as { role?: string } | null)?.role;
  if (profileError || !role || (role !== "admin" && role !== "staff")) {
    return { ok: false, error: "Admin access required." };
  }

  return { ok: true, userId: userData.user.id };
}
