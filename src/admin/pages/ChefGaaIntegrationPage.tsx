import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  PlugZap,
  RefreshCw,
  MapPin,
  Clock,
  Layers,
  UtensilsCrossed,
  Timer,
  CalendarClock,
} from "lucide-react";
import AdminBreadcrumbs from "../components/shared/Breadcrumbs";
import PageHeader from "../components/shared/PageHeader";
import AdminCard from "../components/ui/Card";
import AdminBadge from "../components/ui/Badge";
import AdminButton from "../components/ui/Button";
import AdminSelect from "../components/ui/Select";
import DataTable from "../components/shared/DataTable";
import AdminToast, { type ToastVariant } from "../components/ui/Toast";
import { useAdminTheme } from "../context/AdminThemeContext";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import type { LocationId } from "../../config/locations";
import { getChefGaaLocationConfig, listChefGaaLocationConfigs } from "../../services/chefgaa/locationConfig";
import {
  syncAllChefGaaLocations,
  syncChefGaaLocation,
} from "../../services/chefgaa/integrationService";
import { fetchChefGaaLiveBundle, invalidateChefGaaLiveCache } from "../../services/chefgaa/supabaseQueries";
import type {
  ChefGaaConnectionStatus,
  ChefGaaLocationSyncSnapshot,
  ChefGaaSyncHealthStatus,
  ChefGaaSyncHistoryEntry,
  ChefGaaSyncResult,
} from "../../services/chefgaa/types";
import type { TableColumn } from "../types";

const connectionBadge: Record<ChefGaaConnectionStatus, "success" | "warning" | "danger" | "outline"> = {
  connected: "success",
  pending: "warning",
  disconnected: "outline",
  error: "danger",
};

const resultBadge: Record<ChefGaaSyncResult, "success" | "warning" | "danger" | "outline"> = {
  success: "success",
  partial: "warning",
  failed: "danger",
  skipped: "outline",
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

function formatCount(value: number | null): string {
  return value == null ? "—" : value.toLocaleString();
}

type LocationCardProps = {
  snapshot: ChefGaaLocationSyncSnapshot;
  selected: boolean;
  onSelect: () => void;
  onSync: () => void;
  syncing: boolean;
  dark: boolean;
};

function LocationIntegrationCard({
  snapshot,
  selected,
  onSelect,
  onSync,
  syncing,
  dark,
}: LocationCardProps) {
  const config = getChefGaaLocationConfig(snapshot.locationId);

  return (
    <AdminCard
      className={[
        "transition-shadow duration-200",
        selected ? "ring-2 ring-admin-primary shadow-admin-lg" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="shrink-0 text-admin-primary" />
            <h3 className="text-base font-semibold">{config.name}</h3>
          </div>
          <p className={`mt-1 text-xs ${dark ? "text-white/45" : "text-admin-muted"}`}>
            {config.apiVersion === "legacy" ? (
              <>Legacy API · Outlet ID: <span className="font-medium">{config.outletId}</span></>
            ) : (
              <>ChefGaa V2 · Tenant &amp; Store IDs configured</>
            )}
          </p>
        </div>
        <AdminBadge variant={connectionBadge[snapshot.connectionStatus]}>
          {healthEmoji[snapshot.healthStatus]} {healthLabels[snapshot.healthStatus]}
        </AdminBadge>
      </div>

      {config.apiVersion === "v2" ? (
        <dl className={`mt-4 space-y-2 text-xs ${dark ? "text-white/55" : "text-admin-muted"}`}>
          <div className="flex justify-between gap-4">
            <dt>Tenant ID</dt>
            <dd className="truncate font-mono text-[11px]">{config.tenantId ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Store ID</dt>
            <dd className="truncate font-mono text-[11px]">{config.storeId ?? "—"}</dd>
          </div>
        </dl>
      ) : (
        <dl className={`mt-4 grid grid-cols-2 gap-3 text-xs ${dark ? "text-white/55" : "text-admin-muted"}`}>
          <div>
            <dt className="uppercase tracking-wide">Order type</dt>
            <dd className="mt-0.5 text-sm font-medium text-inherit">{config.orderTypeId ?? "—"}</dd>
          </div>
          <div>
            <dt className="uppercase tracking-wide">API</dt>
            <dd className="mt-0.5 text-sm font-medium text-inherit">Legacy</dd>
          </div>
        </dl>
      )}

      <div className={`mt-5 grid grid-cols-2 gap-3 border-t pt-4 ${dark ? "border-white/10" : "border-admin-border"}`}>
        <Metric label="Last sync" value={formatTimestamp(snapshot.lastSyncAt)} icon={Clock} dark={dark} />
        <Metric label="Duration" value={formatDuration(snapshot.lastSyncDurationMs)} icon={Timer} dark={dark} />
        <Metric label="Categories" value={formatCount(snapshot.categoryCount)} icon={Layers} dark={dark} />
        <Metric label="Menu items" value={formatCount(snapshot.menuItemCount)} icon={UtensilsCrossed} dark={dark} />
      </div>

      <div className={`mt-4 grid grid-cols-2 gap-2 text-xs ${dark ? "text-white/55" : "text-admin-muted"}`}>
        <span>Imported: {formatCount(snapshot.categoriesImported)}</span>
        <span>Menu imported: {formatCount(snapshot.menuImported)}</span>
        <span>Updated: {formatCount(snapshot.itemsUpdated)}</span>
        <span>Deactivated: {formatCount(snapshot.itemsDeactivated)}</span>
      </div>

      <div className={`mt-4 rounded-xl p-3 text-xs ${dark ? "bg-white/5 text-white/55" : "bg-admin-ivory text-admin-muted"}`}>
        <p className="font-medium text-inherit">Sync result</p>
        <p className="mt-1">
          {snapshot.lastSyncResult ? (
            <AdminBadge variant={resultBadge[snapshot.lastSyncResult]} className="mr-2">
              {snapshot.lastSyncResult}
            </AdminBadge>
          ) : null}
          {snapshot.lastSyncMessage ?? "No sync has been run for this location yet."}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <AdminButton variant="outline" className="flex-1" onClick={onSelect}>
          {selected ? "Selected" : "Select"}
        </AdminButton>
        <AdminButton className="flex-1" onClick={onSync} disabled={syncing}>
          <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
          Sync location
        </AdminButton>
      </div>
    </AdminCard>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  dark,
}: {
  label: string;
  value: string;
  icon: typeof Clock;
  dark: boolean;
}) {
  return (
    <div>
      <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wide ${dark ? "text-white/40" : "text-admin-muted"}`}>
        <Icon size={12} />
        {label}
      </div>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

export default function ChefGaaIntegrationPage() {
  const { dark } = useAdminTheme();
  const [snapshots, setSnapshots] = useState<ChefGaaLocationSyncSnapshot[]>([]);
  const [history, setHistory] = useState<ChefGaaSyncHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingLocationId, setSyncingLocationId] = useState<LocationId | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<LocationId | null>(null);
  const [syncEngineReady, setSyncEngineReady] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [autoSyncInterval, setAutoSyncInterval] = useState("Manual");
  const [nextScheduledSync, setNextScheduledSync] = useState<string | null>(null);
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [toast, setToast] = useState<{ open: boolean; message: string; variant: ToastVariant }>({
    open: false,
    message: "",
    variant: "success",
  });

  const locationConfigs = useMemo(() => listChefGaaLocationConfigs(), []);

  const loadData = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      invalidateChefGaaLiveCache();
      setLoading(true);
    }
    try {
      const bundle = await fetchChefGaaLiveBundle("all", { force: true });
      setSnapshots(bundle.overview.locations);
      setSyncEngineReady(bundle.overview.syncEngineReady);
      setHistory(bundle.history);
      setAutoSyncEnabled(bundle.dashboard.autoSyncEnabled);
      setAutoSyncInterval(bundle.dashboard.autoSyncInterval);
      setNextScheduledSync(bundle.dashboard.nextScheduledSync);
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useAutoRefresh(() => loadData({ silent: true }), 60_000);

  const showToast = (message: string, variant: ToastVariant = "success") => {
    setToast({ open: true, message, variant });
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    showToast("ChefGaa Sync Started", "info");
    try {
      const response = await syncAllChefGaaLocations();
      await loadData({ silent: true });
      if (!response.accepted) {
        showToast(response.message, "error");
      } else if (response.message.toLowerCase().includes("queued")) {
        showToast(response.message, "info");
      } else {
        showToast("ChefGaa Sync Completed Successfully", "success");
      }
    } finally {
      setSyncingAll(false);
    }
  };

  const handleSyncSelected = async () => {
    if (!selectedLocationId) {
      showToast("Select a location card first.", "error");
      return;
    }
    await handleSyncLocation(selectedLocationId);
  };

  const handleSyncLocation = async (locationId: LocationId) => {
    const config = getChefGaaLocationConfig(locationId);
    setSelectedLocationId(locationId);
    setSyncingLocationId(locationId);
    showToast("ChefGaa Sync Started", "info");
    try {
      const response = await syncChefGaaLocation(locationId);
      await loadData({ silent: true });
      if (response.accepted) {
        if (response.message.toLowerCase().includes("queued")) {
          showToast(response.message, "info");
        } else {
          showToast(`${config.name} — ChefGaa Sync Completed Successfully`, "success");
        }
      } else {
        showToast(response.message || `${config.name} Sync Failed`, "error");
      }
    } finally {
      setSyncingLocationId(null);
    }
  };

  const filteredHistory = useMemo(() => {
    let rows = history;
    if (locationFilter !== "all") {
      rows = rows.filter((row) => row.locationId === locationFilter);
    }
    if (statusFilter !== "all") {
      rows = rows.filter((row) => row.result === statusFilter || row.status === statusFilter);
    }
    return rows;
  }, [history, locationFilter, statusFilter]);

  const historyColumns: TableColumn<ChefGaaSyncHistoryEntry>[] = [
    {
      key: "startedAt",
      label: "Timestamp",
      sortable: true,
      render: (row) => formatTimestamp(row.startedAt),
    },
    { key: "locationName", label: "Location", sortable: true },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <AdminBadge variant={resultBadge[row.result]}>{row.status}</AdminBadge>
      ),
    },
    {
      key: "durationMs",
      label: "Duration",
      render: (row) => formatDuration(row.durationMs),
    },
    {
      key: "categoryCount",
      label: "Categories",
      render: (row) => formatCount(row.categoryCount),
    },
    {
      key: "menuItemCount",
      label: "Menu Items",
      render: (row) => formatCount(row.menuItemCount),
    },
    {
      key: "pricesChanged",
      label: "Price Changes",
      render: (row) => formatCount(row.pricesChanged),
    },
    {
      key: "itemsCreated",
      label: "New Items",
      render: (row) => formatCount(row.itemsCreated),
    },
    {
      key: "itemsUpdated",
      label: "Updated Items",
      render: (row) => formatCount(row.itemsUpdated),
    },
    {
      key: "errors",
      label: "Errors",
      render: (row) => (
        <span className={`line-clamp-2 max-w-[10rem] text-xs ${dark ? "text-white/55" : "text-admin-muted"}`}>
          {row.errors ?? "—"}
        </span>
      ),
    },
    {
      key: "triggeredBy",
      label: "Triggered By",
      render: (row) => <span className="capitalize">{row.triggeredBy}</span>,
    },
  ];

  const snapshotByLocation = useMemo(
    () => new Map(snapshots.map((entry) => [entry.locationId, entry])),
    [snapshots],
  );

  return (
    <div>
      <AdminBreadcrumbs
        items={[
          { label: "Admin", path: "/admin/dashboard" },
          { label: "Integrations" },
          { label: "ChefGaa" },
        ]}
      />

      <PageHeader
        title="ChefGaa Integration"
        description="ChefGaa is the source of truth for menu, categories, pricing, and availability. Monitor sync health and audit history in real time."
      >
        <div className="flex flex-wrap gap-2">
          <AdminButton variant="outline" onClick={() => void loadData()} disabled={loading}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </AdminButton>
          <AdminButton variant="outline" onClick={() => void handleSyncSelected()} disabled={syncingAll || !!syncingLocationId}>
            Sync selected location
          </AdminButton>
          <AdminButton onClick={() => void handleSyncAll()} disabled={syncingAll || !!syncingLocationId}>
            <RefreshCw size={16} className={syncingAll ? "animate-spin" : ""} />
            Sync all
          </AdminButton>
        </div>
      </PageHeader>

      <AdminCard className="mt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
              <p className="text-sm font-semibold">Integration status</p>
              <p className={`mt-1 text-sm ${dark ? "text-white/50" : "text-admin-muted"}`}>
                {syncEngineReady
                  ? "Sync engine is online. Live metrics refresh every 60 seconds."
                  : "Connect Supabase to load live ChefGaa sync metrics."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{locationConfigs.length} locations configured</span>
          </div>
        </div>
      </AdminCard>

      <AdminCard className="mt-6">
        <div className="flex items-start gap-3">
          <div
            className={[
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              dark ? "bg-white/10 text-admin-gold" : "bg-admin-primary/10 text-admin-primary",
            ].join(" ")}
          >
            <CalendarClock size={18} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Scheduled sync</p>
            <p className={`mt-1 text-sm ${dark ? "text-white/50" : "text-admin-muted"}`}>
              Automatic synchronization UI preview. Cron scheduling is not enabled yet.
            </p>
            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className={`text-[10px] uppercase tracking-wide ${dark ? "text-white/40" : "text-admin-muted"}`}>
                  Auto sync
                </dt>
                <dd className="mt-1 text-sm font-medium">
                  {autoSyncEnabled ? "Enabled" : "Disabled"}
                </dd>
              </div>
              <div>
                <dt className={`text-[10px] uppercase tracking-wide ${dark ? "text-white/40" : "text-admin-muted"}`}>
                  Interval
                </dt>
                <dd className="mt-1 text-sm font-medium">{autoSyncInterval}</dd>
              </div>
              <div>
                <dt className={`text-[10px] uppercase tracking-wide ${dark ? "text-white/40" : "text-admin-muted"}`}>
                  Next run
                </dt>
                <dd className="mt-1 text-sm font-medium">
                  {nextScheduledSync
                    ? new Date(nextScheduledSync).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "—"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </AdminCard>

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        {locationConfigs.map((config, index) => {
          const snapshot =
            snapshotByLocation.get(config.locationId) ??
            ({
              locationId: config.locationId,
              connectionStatus: "pending",
              healthStatus: "never_synced",
              apiVersion: config.apiVersion,
              lastSyncAt: null,
              categoryCount: null,
              menuItemCount: null,
              lastSyncDurationMs: null,
              lastSyncResult: null,
              lastSyncMessage: null,
              categoriesImported: null,
              menuImported: null,
              itemsUpdated: null,
              itemsDeactivated: null,
            } satisfies ChefGaaLocationSyncSnapshot);

          return (
            <motion.div
              key={config.locationId}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06, duration: 0.35 }}
            >
              <LocationIntegrationCard
                snapshot={snapshot}
                selected={selectedLocationId === config.locationId}
                onSelect={() => setSelectedLocationId(config.locationId)}
                onSync={() => void handleSyncLocation(config.locationId)}
                syncing={syncingLocationId === config.locationId}
                dark={dark}
              />
            </motion.div>
          );
        })}
      </div>

      <AdminCard className="mt-8">
        <h2 className="text-sm font-semibold">Sync history</h2>
        <p className={`mt-1 text-sm ${dark ? "text-white/50" : "text-admin-muted"}`}>
          Audit log of manual and scheduled ChefGaa sync runs.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <div className="w-full sm:w-48">
            <AdminSelect
              value={locationFilter}
              onChange={setLocationFilter}
              options={[
                { value: "all", label: "All locations" },
                ...locationConfigs.map((config) => ({
                  value: config.locationId,
                  label: config.name,
                })),
              ]}
            />
          </div>
          <div className="w-full sm:w-48">
            <AdminSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "All statuses" },
                { value: "success", label: "Success" },
                { value: "partial", label: "Partial" },
                { value: "failed", label: "Failed" },
                { value: "running", label: "Running" },
              ]}
            />
          </div>
        </div>

        <div className="mt-4">
          <DataTable
            data={filteredHistory}
            columns={historyColumns}
            searchKeys={["locationName", "message", "result", "errors"]}
            pageSize={8}
            loading={loading}
            emptyTitle="No sync history yet"
            emptyDescription="Run a ChefGaa sync to populate this table."
            hideToolbar={filteredHistory.length === 0 && !loading}
          />
        </div>
      </AdminCard>

      <AdminToast
        open={toast.open}
        message={toast.message}
        variant={toast.variant}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
