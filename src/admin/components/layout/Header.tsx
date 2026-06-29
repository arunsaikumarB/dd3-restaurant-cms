import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Moon, Search, Sun } from "lucide-react";
import { useAdminTheme } from "../../context/AdminThemeContext";
import { SITE } from "../../../constants/site";
import AdminBadge from "../ui/Badge";

export default function AdminHeader() {
  const { dark, toggleDark } = useAdminTheme();
  const [search, setSearch] = useState("");

  return (
    <header
      className={[
        "sticky top-0 z-30 flex h-[72px] items-center justify-between gap-4 border-b px-6",
        dark ? "border-admin-border-dark bg-admin-surface-dark/80 backdrop-blur-xl" : "border-admin-border bg-white/80 backdrop-blur-xl admin-glass",
      ].join(" ")}
    >
      <div className="relative hidden max-w-md flex-1 md:block">
        <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? "text-white/40" : "text-admin-muted"}`} />
        <input
          type="search"
          placeholder="Search dashboard..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={[
            "h-10 w-full rounded-xl border pl-9 pr-3 text-sm",
            "focus:outline-none focus:ring-2 focus:ring-admin-orange/30",
            dark ? "border-admin-border-dark bg-white/5 text-white placeholder:text-white/40" : "border-admin-border bg-admin-ivory/50 placeholder:text-admin-muted/60",
          ].join(" ")}
        />
      </div>

      <p className={`text-sm font-medium md:hidden ${dark ? "text-white/80" : "text-admin-text"}`}>
        {SITE.name}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleDark}
          className={[
            "flex h-10 w-10 items-center justify-center rounded-xl border transition-colors",
            dark ? "border-admin-border-dark hover:bg-white/5" : "border-admin-border hover:bg-admin-ivory",
          ].join(" ")}
          aria-label="Toggle dark mode"
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          type="button"
          className={[
            "relative flex h-10 w-10 items-center justify-center rounded-xl border transition-colors",
            dark ? "border-admin-border-dark hover:bg-white/5" : "border-admin-border hover:bg-admin-ivory",
          ].join(" ")}
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-admin-primary" />
        </button>

        <Link
          to="/admin/profile"
          className={[
            "flex items-center gap-3 rounded-xl border px-3 py-1.5 transition-colors",
            dark ? "border-admin-border-dark hover:bg-white/5" : "border-admin-border hover:bg-admin-ivory",
          ].join(" ")}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-admin-primary to-admin-gold text-xs font-bold text-white">
            A
          </div>
          <div className="hidden lg:block">
            <p className="text-sm font-medium leading-tight">Admin</p>
            <AdminBadge variant="info" className="mt-0.5 text-[10px]">Manager</AdminBadge>
          </div>
        </Link>
      </div>
    </header>
  );
}
