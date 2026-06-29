import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  ADMIN_DASHBOARD_PATH,
  ADMIN_UNAUTHORIZED_PATH,
} from "../../lib/supabase/middleware";
import PageLoader from "../../components/layout/PageLoader";

/**
 * Redirect authenticated admin users away from the login page.
 * Non-admin authenticated users go to the unauthorized page.
 */
export default function GuestRoute({ children }: { children: ReactNode }) {
  const { session, isAdmin, loading, configured } = useAuth();

  if (!configured) {
    return <>{children}</>;
  }

  if (loading) {
    return <PageLoader />;
  }

  if (session) {
    if (isAdmin) {
      return <Navigate to={ADMIN_DASHBOARD_PATH} replace />;
    }
    return <Navigate to={ADMIN_UNAUTHORIZED_PATH} replace />;
  }

  return <>{children}</>;
}
