import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../../hooks/useAuth";
import { ADMIN_DASHBOARD_PATH } from "../../lib/supabase/middleware";
import PageLoader from "../../components/layout/PageLoader";

/**
 * Redirect authenticated users away from the login page.
 */
export default function GuestRoute({ children }: { children: ReactNode }) {
  const { session, loading, configured } = useAuth();

  if (!configured) {
    return <>{children}</>;
  }

  if (loading) {
    return <PageLoader />;
  }

  if (session) {
    return <Navigate to={ADMIN_DASHBOARD_PATH} replace />;
  }

  return <>{children}</>;
}
