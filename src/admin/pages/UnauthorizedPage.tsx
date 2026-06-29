import { ShieldOff } from "lucide-react";
import { motion } from "framer-motion";
import { AdminThemeProvider, useAdminTheme } from "../context/AdminThemeContext";
import AdminButton from "../components/ui/Button";
import { useAuth } from "../../hooks/useAuth";
import { ADMIN_LOGIN_PATH } from "../../lib/supabase/middleware";
import { SITE } from "../../constants/site";
import "../admin.css";

function UnauthorizedContent() {
  const { dark } = useAdminTheme();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    window.location.assign(ADMIN_LOGIN_PATH);
  };

  return (
    <div
      className={`admin-root relative flex min-h-screen items-center justify-center p-6 ${dark ? "admin-root--dark" : "admin-root--light"}`}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-admin-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-admin-gold/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md"
      >
        <div className="admin-glass rounded-3xl border border-white/20 p-8 shadow-admin-lg md:p-10">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-admin-danger/80 to-admin-primary text-white">
              <ShieldOff size={24} />
            </div>
            <h1 className="text-2xl font-semibold">Access denied</h1>
            <p className={`mt-1 text-sm ${dark ? "text-white/50" : "text-admin-muted"}`}>
              {SITE.name} Admin Dashboard
            </p>
          </div>

          <p className={`text-center text-sm ${dark ? "text-white/70" : "text-admin-muted"}`}>
            Your account is signed in but does not have admin access. Only users with the admin
            role can use the dashboard.
          </p>

          <AdminButton type="button" className="mt-8 w-full" size="lg" onClick={handleSignOut}>
            Sign out
          </AdminButton>
        </div>
      </motion.div>
    </div>
  );
}

export default function UnauthorizedPage() {
  return (
    <AdminThemeProvider>
      <UnauthorizedContent />
    </AdminThemeProvider>
  );
}
