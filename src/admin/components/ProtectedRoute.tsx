import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../../hooks/useAuth";
import { ADMIN_LOGIN_PATH, ADMIN_UNAUTHORIZED_PATH } from "../../lib/supabase/middleware";
import { isAdminDevBypassEnabled } from "../../lib/supabase/env";
import PageLoader from "../../components/layout/PageLoader";

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Client-side route guard for admin pages.
 * Requires an authenticated Supabase session and role = admin.
 * When Supabase is not configured, allows access only in local dev (mock-data mode).
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, isAdmin, loading, configured } = useAuth();
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

  if (!isAdmin) {
    return <Navigate to={ADMIN_UNAUTHORIZED_PATH} replace />;
  }

  return <>{children}</>;
}
