import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface AdminThemeContextValue {
  dark: boolean;
  toggleDark: () => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

const AdminThemeContext = createContext<AdminThemeContextValue | null>(null);

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(() => localStorage.getItem("admin-dark") === "true");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    localStorage.setItem("admin-dark", String(dark));
  }, [dark]);

  return (
    <AdminThemeContext.Provider
      value={{
        dark,
        toggleDark: () => setDark((v) => !v),
        sidebarCollapsed,
        toggleSidebar: () => setSidebarCollapsed((v) => !v),
      }}
    >
      {children}
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme() {
  const ctx = useContext(AdminThemeContext);
  if (!ctx) throw new Error("useAdminTheme must be used within AdminThemeProvider");
  return ctx;
}
