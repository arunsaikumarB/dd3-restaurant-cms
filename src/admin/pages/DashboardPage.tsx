import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  UtensilsCrossed,
  Tag,
  CalendarDays,
  Image,
} from "lucide-react";
import AdminBreadcrumbs from "../components/shared/Breadcrumbs";
import StatCard from "../components/ui/StatCard";
import AdminCard from "../components/ui/Card";
import AdminChart, { AreaChart } from "../components/ui/Chart";
import AdminButton from "../components/ui/Button";
import { useAdminTheme } from "../context/AdminThemeContext";
import { useLocation } from "../hooks/useLocation";
import { fetchDashboardStats } from "../services/dashboardStats";
import type { AdminStat } from "../types";
import {
  VISITOR_CHART_DATA,
  RESERVATION_CHART_DATA,
  RECENT_ACTIVITIES,
} from "../data/mock";

const activityIcons = {
  menu: UtensilsCrossed,
  reservation: CalendarDays,
  review: Tag,
  offer: Tag,
  gallery: Image,
  settings: Tag,
};

const quickActions = [
  { label: "Add Menu Item", path: "/admin/menu", icon: UtensilsCrossed },
  { label: "New Offer", path: "/admin/offers", icon: Tag },
  { label: "View Reservations", path: "/admin/reservations", icon: CalendarDays },
  { label: "Upload Image", path: "/admin/gallery", icon: Image },
];

export default function AdminDashboardPage() {
  const { dark } = useAdminTheme();
  const { scope, currentLocation } = useLocation();
  const [stats, setStats] = useState<AdminStat[]>([]);
  const [locationLabel, setLocationLabel] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetchDashboardStats(scope).then((result) => {
      if (cancelled) return;
      setStats(result.stats);
      setLocationLabel(result.locationLabel);
    });
    return () => {
      cancelled = true;
    };
  }, [scope]);

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "Dashboard" }]} />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className={`mt-1 text-sm ${dark ? "text-white/50" : "text-admin-muted"}`}>
          {locationLabel
            ? `Overview for ${locationLabel}.`
            : "Welcome back. Here's what's happening at Desi Dhamaka today."}
          {currentLocation ? ` ${currentLocation.address}` : ""}
        </p>
      </motion.div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
          >
            <StatCard stat={stat} />
          </motion.div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <AdminChart title="Website Visitors (This Week)" data={VISITOR_CHART_DATA} />
        <AreaChart title="Reservations (6 Months)" data={RESERVATION_CHART_DATA} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <AdminCard className="lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold">Recent Activity</h3>
          <ul className="space-y-3">
            {RECENT_ACTIVITIES.map((item) => {
              const Icon = activityIcons[item.type] ?? Tag;
              return (
                <li
                  key={item.id}
                  className={`flex items-center gap-3 rounded-xl p-3 ${dark ? "hover:bg-white/5" : "hover:bg-admin-ivory/50"}`}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${dark ? "bg-white/10 text-admin-gold" : "bg-admin-primary/10 text-admin-primary"}`}>
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{item.action}</p>
                    <p className={`truncate text-xs ${dark ? "text-white/40" : "text-admin-muted"}`}>{item.target}</p>
                  </div>
                  <span className={`shrink-0 text-xs ${dark ? "text-white/30" : "text-admin-muted/70"}`}>{item.time}</span>
                </li>
              );
            })}
          </ul>
        </AdminCard>

        <AdminCard>
          <h3 className="mb-4 text-sm font-semibold">Quick Actions</h3>
          <div className="space-y-2">
            {quickActions.map((action) => (
              <Link key={action.path} to={action.path}>
                <AdminButton variant="outline" className="w-full justify-start">
                  <action.icon size={16} />
                  {action.label}
                </AdminButton>
              </Link>
            ))}
          </div>
          <div className={`mt-6 rounded-xl p-4 ${dark ? "bg-admin-primary/10" : "bg-admin-ivory"}`}>
            <p className="text-xs font-medium text-admin-primary">Tip</p>
            <p className={`mt-1 text-xs ${dark ? "text-white/50" : "text-admin-muted"}`}>
              Use the location selector in the header to switch between restaurant branches.
            </p>
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
