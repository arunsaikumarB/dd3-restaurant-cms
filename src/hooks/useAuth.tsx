import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createClientIfConfigured } from "../lib/supabase/client";
import { isAdminDevBypassEnabled, isSupabaseConfigured } from "../lib/supabase/env";
import { isAdminRole, signOut as authSignOut } from "../lib/supabase/middleware";
import { fetchCurrentUserProfile } from "../services/users";
import type { UserProfile, UserRole } from "../types/database";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  isAdmin: boolean;
  loading: boolean;
  configured: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isSupabaseConfigured();
  const devBypass = isAdminDevBypassEnabled();

  const refreshSession = useCallback(async (): Promise<UserProfile | null> => {
    const supabase = createClientIfConfigured();
    if (!supabase) {
      setSession(null);
      setProfile(null);
      setLoading(false);
      return null;
    }

    setLoading(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setSession(null);
      setProfile(null);
      setLoading(false);
      return null;
    }

    const { data } = await supabase.auth.getSession();
    setSession(data.session);

    const nextProfile = await fetchCurrentUserProfile();
    setProfile(nextProfile);
    setLoading(false);
    return nextProfile;
  }, []);

  useEffect(() => {
    const supabase = createClientIfConfigured();
    if (!supabase) {
      setLoading(false);
      return;
    }

    void refreshSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshSession();
    });

    return () => subscription.unsubscribe();
  }, [refreshSession]);

  const signOut = useCallback(async () => {
    await authSignOut();
    setSession(null);
    setProfile(null);
  }, []);

  const role = profile?.role ?? null;
  const isAdmin = devBypass || isAdminRole(role);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      role,
      isAdmin,
      loading,
      configured,
      signOut,
      refreshSession,
    }),
    [session, profile, role, isAdmin, loading, configured, signOut, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
