import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, LogOut } from "lucide-react";
import { ADMIN_NAV_SECTIONS } from "../../config/navigation";
import { useAdminTheme } from "../../context/AdminThemeContext";
import { useAuth } from "../../../hooks/useAuth";
import { ADMIN_LOGIN_PATH } from "../../../lib/supabase/middleware";
import { SITE } from "../../../constants/site";

export default function AdminSidebar() {
  const { dark, sidebarCollapsed, toggleSidebar } = useAdminTheme();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate(ADMIN_LOGIN_PATH);
  };

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 72 : 260 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={[
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r",
        dark ? "border-admin-border-dark bg-admin-surface-dark" : "border-admin-border bg-white",
      ].join(" ")}
    >
      <div className="flex h-[72px] items-center gap-3 border-b border-inherit px-4">
        <button
          type="button"
          onClick={toggleSidebar}
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
            dark ? "bg-admin-primary/20 text-admin-gold" : "bg-admin-primary/10 text-admin-primary",
          ].join(" ")}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft
            size={18}
            className={`transition-transform duration-300 ${sidebarCollapsed ? "rotate-180" : ""}`}
          />
        </button>
        {!sidebarCollapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-w-0">
            <p className="truncate text-sm font-semibold">{SITE.name}</p>
            <p className={`truncate text-[10px] uppercase tracking-wider ${dark ? "text-white/40" : "text-admin-muted"}`}>
              Admin Panel
            </p>
          </motion.div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto admin-scrollbar px-3 py-4">
        <div className="space-y-6">
          {ADMIN_NAV_SECTIONS.map((section, sectionIndex) => (
            <div key={section.title ?? `section-${sectionIndex}`}>
              {section.title && !sidebarCollapsed ? (
                <p
                  className={`mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider ${dark ? "text-white/35" : "text-admin-muted/80"}`}
                >
                  {section.title}
                </p>
              ) : section.title && sidebarCollapsed ? (
                <div className={`mx-3 mb-2 border-t ${dark ? "border-white/10" : "border-admin-border"}`} />
              ) : null}
              <ul className="space-y-1">
                {section.items.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        [
                          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                          isActive
                            ? "bg-admin-primary text-white shadow-admin"
                            : dark
                              ? "text-white/60 hover:bg-white/5 hover:text-white"
                              : "text-admin-muted hover:bg-admin-ivory hover:text-admin-text",
                        ].join(" ")
                      }
                    >
                      <item.icon size={18} className="shrink-0" />
                      {!sidebarCollapsed && <span>{item.label}</span>}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <div className="border-t border-inherit p-3">
        <button
          type="button"
          onClick={handleSignOut}
          className={[
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
            dark ? "text-white/50 hover:bg-white/5" : "text-admin-muted hover:bg-admin-ivory",
          ].join(" ")}
        >
          <LogOut size={18} />
          {!sidebarCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </motion.aside>
  );
}
