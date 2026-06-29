import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../../hooks/useAuth";
import { ADMIN_LOGIN_PATH } from "../../lib/supabase/middleware";
import { isAdminDevBypassEnabled } from "../../lib/supabase/env";
import PageLoader from "../../components/layout/PageLoader";

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Client-side route guard for admin pages.
 * Redirects unauthenticated users to /admin/login.
 * When Supabase is not configured, allows access only in local dev (mock-data mode).
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, loading, configured } = useAuth();
  const location = useLocation();

  if (!configured) {
    if (isAdminDevBypassEnabled()) {
      return <>{children}</>;
    }
    return <Navigate to={ADMIN_LOGIN_PATH} state={{ from: location.pathname }} replace />;
  }

  if (loading) {
    return <PageLoader />;
  }

  if (!session) {
    return <Navigate to={ADMIN_LOGIN_PATH} state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
