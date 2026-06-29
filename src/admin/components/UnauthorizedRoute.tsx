import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  ADMIN_DASHBOARD_PATH,
  ADMIN_LOGIN_PATH,
  isAdminRole,
} from "../../lib/supabase/middleware";
import { isAdminDevBypassEnabled } from "../../lib/supabase/env";
import PageLoader from "../../components/layout/PageLoader";

/**
 * Allows only authenticated non-admin users on the unauthorized page.
 */
export default function UnauthorizedRoute({ children }: { children: ReactNode }) {
  const { session, profile, loading, configured } = useAuth();

  if (!configured) {
    if (isAdminDevBypassEnabled()) {
      return <Navigate to={ADMIN_DASHBOARD_PATH} replace />;
    }
    return <Navigate to={ADMIN_LOGIN_PATH} replace />;
  }

  if (loading) {
    return <PageLoader />;
  }

  if (!session) {
    return <Navigate to={ADMIN_LOGIN_PATH} replace />;
  }

  if (isAdminRole(profile?.role)) {
    return <Navigate to={ADMIN_DASHBOARD_PATH} replace />;
  }

  return <>{children}</>;
}
