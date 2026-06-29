import type { Session, User } from "@supabase/supabase-js";
import { createClientIfConfigured } from "./client";
import type { UserRole } from "../../types/database";

export const ADMIN_LOGIN_PATH = "/admin/login";
export const ADMIN_DASHBOARD_PATH = "/admin/dashboard";
export const ADMIN_UNAUTHORIZED_PATH = "/admin/unauthorized";

export function isAdminRole(role: UserRole | null | undefined): boolean {
  return role === "admin";
}

/** Paths that require an authenticated Supabase session. */
export const PROTECTED_ADMIN_PREFIX = "/admin";

export function isAdminProtectedPath(pathname: string): boolean {
  if (pathname === ADMIN_LOGIN_PATH) return false;
  return pathname === PROTECTED_ADMIN_PREFIX || pathname.startsWith(`${PROTECTED_ADMIN_PREFIX}/`);
}

export function isAdminLoginPath(pathname: string): boolean {
  return pathname === ADMIN_LOGIN_PATH;
}

/**
 * Route-guard helpers for React Router (Vite SPA).
 * Equivalent role to Next.js middleware — runs client-side before admin layout renders.
 */
export async function getSession(): Promise<Session | null> {
  const supabase = createClientIfConfigured();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error("[auth] getSession:", error.message);
    return null;
  }
  return data.session;
}

export async function getUser(): Promise<User | null> {
  const supabase = createClientIfConfigured();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("[auth] getUser:", error.message);
    return null;
  }
  return data.user;
}

export async function signOut(): Promise<void> {
  const supabase = createClientIfConfigured();
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<{ error: string | null }> {
  const supabase = createClientIfConfigured();
  if (!supabase) {
    return { error: "Supabase is not configured. Add environment variables." };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
}
