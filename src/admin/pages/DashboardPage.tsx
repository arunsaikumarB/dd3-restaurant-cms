import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Tag,
  Image,
  PlugZap,
  Star,
  Settings,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import AdminBreadcrumbs from "../components/shared/Breadcrumbs";
import StatCard from "../components/ui/StatCard";
import AdminCard from "../components/ui/Card";
import AdminButton from "../components/ui/Button";
import AdminBadge from "../components/ui/Badge";
import { useAdminTheme } from "../context/AdminThemeContext";
import { useLocation } from "../hooks/useLocation";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { invalidateChefGaaLiveCache } from "../../services/chefgaa/supabaseQueries";
import { fetchDashboardStats } from "../services/dashboardStats";
import type { ChefGaaDashboardSummary, ChefGaaSyncHealthStatus } from "../../services/chefgaa/types";
import type { AdminStat, ActivityItem } from "../types";

const activityIcons: Record<ActivityItem["type"], typeof Tag> = {
  menu: Tag,
  offer: Tag,
  gallery: Image,
  review: Star,
  settings: Settings,
  integration: PlugZap,
};

const healthLabels: Record<ChefGaaSyncHealthStatus, string> = {
  connected: "Connected",
  syncing: "Syncing",
  failed: "Failed",
  never_synced: "Never Synced",
};

const healthEmoji: Record<ChefGaaSyncHealthStatus, string> = {
  connected: "🟢",
  syncing: "🟡",
  failed: "🔴",
  never_synced: "⚪",
};

const CONTENT_STAT_ORDER = ["offers", "gallery"] as const;
const OPERATIONS_STAT_ORDER = [
  "locations",
  "connected",
  "failed",
  "last-sync",
  "categories",
  "menu-items",
] as const;

const OPERATIONS_SECTION_STORAGE_KEY = "dd3.admin.dashboard.operationsExpanded";

function readOperationsExpanded(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(OPERATIONS_SECTION_STORAGE_KEY) === "true";
}

function orderStats(
  stats: AdminStat[],
  order: readonly string[],
): AdminStat[] {
  const byId = new Map(stats.map((stat) => [stat.id, stat]));
  return order
    .map((id) => byId.get(id))
    .filter((stat): stat is AdminStat => Boolean(stat));
}

function StatGrid({
  stats,
  animationOffset = 0,
  gridClassName = "grid gap-4 sm:grid-cols-2 xl:grid-cols-4",
}: {
  stats: AdminStat[];
  animationOffset?: number;
  gridClassName?: string;
}) {
  return (
    <div className={gridClassName}>
      {stats.map((stat, i) => (
        <motion.div
          key={stat.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: (animationOffset + i) * 0.04, duration: 0.4 }}
        >
          <StatCard stat={stat} />
        </motion.div>
      ))}
    </div>
  );
}

function formatTimestamp(value: string | null): string {
  if (!value) return "Never";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function connectionBadgeVariant(
  status: ChefGaaDashboardSummary["connectionStatus"],
): "success" | "warning" | "danger" {
  if (status === "connected") return "success";
  if (status === "degraded") return "warning";
  return "danger";
}

export default function AdminDashboardPage() {
  const { dark } = useAdminTheme();
  const { scope, currentLocation } = useLocation();
  const [stats, setStats] = useState<AdminStat[]>([]);
  const [insightStats, setInsightStats] = useState<AdminStat[]>([]);
  const [locationLabel, setLocationLabel] = useState("");
  const [chefGaa, setChefGaa] = useState<ChefGaaDashboardSummary | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [operationsExpanded, setOperationsExpanded] = useState(readOperationsExpanded);

  const contentStats = useMemo(
    () => orderStats(stats, CONTENT_STAT_ORDER),
    [stats],
  );
  const operationsStats = useMemo(
    () => orderStats(stats, OPERATIONS_STAT_ORDER),
    [stats],
  );

  const toggleOperationsSection = () => {
    setOperationsExpanded((prev) => {
      const next = !prev;
      localStorage.setItem(OPERATIONS_SECTION_STORAGE_KEY, String(next));
      return next;
    });
  };

  const loadDashboard = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      invalidateChefGaaLiveCache();
      setLoading(true);
    }
    try {
      const result = await fetchDashboardStats(scope);
      setStats(result.stats);
      setInsightStats(result.insightStats);
      setLocationLabel(result.locationLabel);
      setChefGaa(result.chefGaa);
      setRecentActivity(result.recentActivity);
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useAutoRefresh(() => loadDashboard({ silent: true }), 60_000);

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "Dashboard" }]} />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className={`mt-1 text-sm ${dark ? "text-white/50" : "text-admin-muted"}`}>
            {locationLabel
              ? `Operations overview for ${locationLabel}.`
              : "Welcome back. Manage website content, media, and integrations."}
            {currentLocation ? ` ${currentLocation.address}` : ""}
          </p>
        </div>
        <AdminButton variant="outline" onClick={() => void loadDashboard()} disabled={loading}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </AdminButton>
      </motion.div>

      <div className="mt-8">
        <StatGrid
          stats={contentStats}
          gridClassName="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        />
      </div>

      <section className="mt-8" aria-label="Website insights">
        <h2 className="text-sm font-semibold">Website Insights</h2>
        <div className="mt-4">
          <StatGrid stats={insightStats} gridClassName="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" />
        </div>
      </section>

      <section className="mt-8" aria-label="Operations and system status">
        <button
          type="button"
          onClick={toggleOperationsSection}
          aria-expanded={operationsExpanded}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <h2 className="text-sm font-semibold">Operations &amp; System Status</h2>
          <ChevronDown
            size={18}
            className={[
              "shrink-0 transition-transform duration-200",
              dark ? "text-white/50" : "text-admin-muted",
              operationsExpanded ? "rotate-180" : "",
            ].join(" ")}
            aria-hidden
          />
        </button>

        {operationsExpanded ? (
          <div className="mt-4 space-y-8">
            <StatGrid stats={operationsStats} animationOffset={CONTENT_STAT_ORDER.length} />

            {chefGaa ? (
              <AdminCard>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className={[
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                        dark ? "bg-admin-primary/20 text-admin-gold" : "bg-admin-primary/10 text-admin-primary",
                      ].join(" ")}
                    >
                      <PlugZap size={20} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-semibold">ChefGaa Integration Status</h2>
                        <AdminBadge variant={connectionBadgeVariant(chefGaa.connectionStatus)}>
                          {chefGaa.connectionStatus === "connected"
                            ? "Connected"
                            : chefGaa.connectionStatus === "degraded"
                              ? "Needs attention"
                              : "Disconnected"}
                        </AdminBadge>
                      </div>
                      <p className={`mt-1 text-sm ${dark ? "text-white/50" : "text-admin-muted"}`}>
                        Live sync health from ChefGaa catalog imports.
                      </p>
                    </div>
                  </div>
                  <Link to="/admin/integrations/chefgaa">
                    <AdminButton variant="outline" className="w-full sm:w-auto">
                      Open integration
                    </AdminButton>
                  </Link>
                </div>

                <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  {[
                    { label: "Connection Status", value: chefGaa.connectionStatus },
                    { label: "Last Sync", value: formatTimestamp(chefGaa.lastSyncAt) },
                    { label: "Next Scheduled Sync", value: formatTimestamp(chefGaa.nextScheduledSync) },
                    { label: "Sync Duration", value: formatDuration(chefGaa.lastSyncDurationMs) },
                    { label: "Success Rate", value: `${chefGaa.successRate}%` },
                    { label: "Failed Sync Count", value: chefGaa.failedSyncCount.toLocaleString() },
                    { label: "API Version", value: chefGaa.apiVersionLabel },
                  ].map((item) => (
                    <div key={item.label}>
                      <dt className={`text-[10px] uppercase tracking-wide ${dark ? "text-white/40" : "text-admin-muted"}`}>
                        {item.label}
                      </dt>
                      <dd className="mt-1 text-sm font-medium capitalize">{item.value}</dd>
                    </div>
                  ))}
                </dl>

                <div className={`mt-6 grid gap-3 border-t pt-6 sm:grid-cols-3 ${dark ? "border-white/10" : "border-admin-border"}`}>
                  {chefGaa.locations.map((location) => (
                    <div
                      key={location.locationId}
                      className={`rounded-xl p-4 ${dark ? "bg-white/5" : "bg-admin-ivory"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">
                          {healthEmoji[location.healthStatus]} {healthLabels[location.healthStatus]}
                        </p>
                        <span className={`text-[10px] uppercase ${dark ? "text-white/40" : "text-admin-muted"}`}>
                          {location.apiVersion}
                        </span>
                      </div>
                      <p className={`mt-2 text-xs ${dark ? "text-white/50" : "text-admin-muted"}`}>
                        Last sync: {formatTimestamp(location.lastSyncAt)}
                      </p>
                      <p className={`mt-1 text-xs ${dark ? "text-white/50" : "text-admin-muted"}`}>
                        Duration: {formatDuration(location.lastSyncDurationMs)}
                      </p>
                      <div className={`mt-3 grid grid-cols-2 gap-2 text-xs ${dark ? "text-white/55" : "text-admin-muted"}`}>
                        <span>Categories: {location.categoriesImported?.toLocaleString() ?? "—"}</span>
                        <span>Menu: {location.menuImported?.toLocaleString() ?? "—"}</span>
                        <span>Updated: {location.itemsUpdated?.toLocaleString() ?? "—"}</span>
                        <span>Deactivated: {location.itemsDeactivated?.toLocaleString() ?? "—"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </AdminCard>
            ) : null}

            <AdminCard>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">Recent Activity</h3>
                <span className={`text-xs ${dark ? "text-white/40" : "text-admin-muted"}`}>
                  ChefGaa sync runs
                </span>
              </div>
              {recentActivity.length === 0 ? (
                <p className={`py-8 text-center text-sm ${dark ? "text-white/50" : "text-admin-muted"}`}>
                  No sync activity yet. Run a ChefGaa sync to populate this feed.
                </p>
              ) : (
                <ul className="space-y-3">
                  {recentActivity.map((item) => {
                    const Icon = activityIcons[item.type] ?? Tag;
                    return (
                      <li
                        key={item.id}
                        className={`flex items-center gap-3 rounded-xl p-3 ${dark ? "hover:bg-white/5" : "hover:bg-admin-ivory/50"}`}
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${dark ? "bg-white/10 text-admin-gold" : "bg-admin-primary/10 text-admin-primary"}`}
                        >
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{item.action}</p>
                          <p className={`truncate text-xs ${dark ? "text-white/40" : "text-admin-muted"}`}>
                            {item.target}
                          </p>
                        </div>
                        <span className={`shrink-0 text-xs ${dark ? "text-white/30" : "text-admin-muted/70"}`}>
                          {item.time}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </AdminCard>
          </div>
        ) : null}
      </section>
    </div>
  );
}
