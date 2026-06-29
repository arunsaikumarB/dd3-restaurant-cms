import { Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import { AdminThemeProvider, useAdminTheme } from "../../context/AdminThemeContext";
import AdminSidebar from "./Sidebar";
import AdminHeader from "./Header";
import "../../admin.css";

function AdminLayoutInner() {
  const { dark, sidebarCollapsed } = useAdminTheme();

  return (
    <div className={`admin-root min-h-screen ${dark ? "admin-root--dark" : "admin-root--light"}`}>
      <AdminSidebar />
      <motion.div
        animate={{ marginLeft: sidebarCollapsed ? 72 : 260 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="min-h-screen"
      >
        <AdminHeader />
        <main className="admin-scrollbar p-6 lg:p-8">
          <Outlet />
        </main>
      </motion.div>
    </div>
  );
}

export default function AdminLayout() {
  return (
    <AdminThemeProvider>
      <AdminLayoutInner />
    </AdminThemeProvider>
  );
}
