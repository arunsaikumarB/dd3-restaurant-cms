import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogIn } from "lucide-react";
import { AdminThemeProvider, useAdminTheme } from "../context/AdminThemeContext";
import AdminButton from "../components/ui/Button";
import AdminInput from "../components/ui/Input";
import { useAuth } from "../../hooks/useAuth";
import { signInWithEmail, ADMIN_DASHBOARD_PATH } from "../../lib/supabase/middleware";
import { SITE } from "../../constants/site";
import "../admin.css";

function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { dark } = useAdminTheme();
  const { configured, refreshSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from =
    (location.state as { from?: string } | null)?.from ?? ADMIN_DASHBOARD_PATH;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!configured) {
      navigate(ADMIN_DASHBOARD_PATH);
      return;
    }

    setSubmitting(true);
    const result = await signInWithEmail(email.trim(), password);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    await refreshSession();
    navigate(from, { replace: true });
  };

  return (
    <div className={`admin-root relative min-h-screen flex items-center justify-center p-6 ${dark ? "admin-root--dark" : "admin-root--light"}`}>
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
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-admin-primary to-admin-gold text-white">
              <LogIn size={24} />
            </div>
            <h1 className="text-2xl font-semibold">{SITE.name}</h1>
            <p className={`mt-1 text-sm ${dark ? "text-white/50" : "text-admin-muted"}`}>
              Admin Dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AdminInput
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@desidhamaka.com"
              required
              autoComplete="email"
            />
            <AdminInput
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
            {error && (
              <p className="text-sm text-admin-danger" role="alert">
                {error}
              </p>
            )}
            <AdminButton type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign In"}
            </AdminButton>
          </form>

          {!configured && (
            <p className={`mt-6 text-center text-xs ${dark ? "text-white/30" : "text-admin-muted/70"}`}>
              Supabase not configured — sign in bypasses to dashboard
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <AdminThemeProvider>
      <LoginForm />
    </AdminThemeProvider>
  );
}
