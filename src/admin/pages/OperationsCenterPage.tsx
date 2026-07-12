import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  Bell,
  Bot,
  Command,
  Gauge,
  HeartPulse,
  LayoutDashboard,
  Radio,
  Search,
  Settings2,
  Sparkles,
  Users,
  CalendarDays,
  PartyPopper,
  Workflow,
  FileText,
  TrendingUp,
} from "lucide-react";
import AdminBreadcrumbs from "../components/shared/Breadcrumbs";
import PageHeader from "../components/shared/PageHeader";
import AdminCard from "../components/ui/Card";
import AdminBadge from "../components/ui/Badge";
import AdminButton from "../components/ui/Button";
import AdminInput from "../components/ui/Input";
import AdminSelect from "../components/ui/Select";
import AdminTextarea from "../components/ui/Textarea";
import AdminToast from "../components/ui/Toast";
import AdminChart from "../components/ui/Chart";
import { useLocation } from "../hooks/useLocation";
import { DEFAULT_PUBLIC_LOCATION_ID, type LocationId } from "../../config/locations";
import { listCustomers } from "../../services/restaurantOperations/crm";
import {
  acknowledgeAlert,
  askOperationsCopilot,
  buildCustomer360,
  buildExecutiveDashboard,
  buildForecasts,
  buildLiveOperations,
  buildPerformanceMetrics,
  buildRealtimeFeed,
  COMMAND_ACTIONS,
  computeRestaurantHealth,
  downloadReportBlob,
  generateOpsInsights,
  generateOpsReport,
  getOpsReports,
  getOpsSettings,
  listAnnouncements,
  quickOpsAnswer,
  resolveAlert,
  runCommandAction,
  searchOperations,
  syncOperationalAlerts,
  upsertOpsSettings,
  type Customer360View,
  type ExecutiveDashboard,
  type ForecastDay,
  type HealthReport,
  type LiveOperationsView,
  type OpsAlert,
  type OpsInsight,
  type OpsReport,
  type PerformanceMetrics,
  type RealtimeEvent,
  type SearchHit,
} from "../../services/restaurantOperations/operationsCenter";
import "../admin.css";

type TabId =
  | "executive"
  | "live"
  | "health"
  | "insights"
  | "today"
  | "customers"
  | "reservations"
  | "catering"
  | "workflows"
  | "alerts"
  | "performance"
  | "forecasting"
  | "reports"
  | "copilot"
  | "command"
  | "feed"
  | "settings";

const TABS: Array<{ id: TabId; label: string; icon: typeof LayoutDashboard }> = [
  { id: "executive", label: "Executive", icon: LayoutDashboard },
  { id: "live", label: "Live Ops", icon: Activity },
  { id: "health", label: "Health", icon: HeartPulse },
  { id: "insights", label: "AI Insights", icon: Sparkles },
  { id: "today", label: "Today", icon: CalendarDays },
  { id: "customers", label: "Customers 360", icon: Users },
  { id: "reservations", label: "Reservations", icon: CalendarDays },
  { id: "catering", label: "Catering", icon: PartyPopper },
  { id: "workflows", label: "Workflows", icon: Workflow },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "performance", label: "Performance", icon: Gauge },
  { id: "forecasting", label: "Forecasting", icon: TrendingUp },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "copilot", label: "Copilot", icon: Bot },
  { id: "command", label: "Command", icon: Command },
  { id: "feed", label: "Live Feed", icon: Radio },
  { id: "settings", label: "Settings", icon: Settings2 },
];

function Metric({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="kb-metric">
      <p className="kb-metric__label">{label}</p>
      <p className="kb-metric__value">{value}</p>
      {hint ? <p className="text-xs opacity-70">{hint}</p> : null}
    </div>
  );
}

function severityVariant(s: string): "danger" | "warning" | "info" | "success" | "default" {
  if (s === "critical") return "danger";
  if (s === "high") return "warning";
  if (s === "medium") return "info";
  if (s === "low") return "success";
  return "default";
}

function CardTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-3 text-sm font-semibold">{children}</h3>;
}

export default function OperationsCenterPage() {
  const navigate = useNavigate();
  const { locationId, isAllLocations } = useLocation();
  const outlet = (isAllLocations ? DEFAULT_PUBLIC_LOCATION_ID : locationId) as LocationId;
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as TabId) || "executive";
  const setTab = (id: TabId) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", id);
      return next;
    });

  const [toast, setToast] = useState<{ open: boolean; message: string; variant: "success" | "error" }>({
    open: false,
    message: "",
    variant: "success",
  });
  const showToast = (message: string, variant: "success" | "error" = "success") =>
    setToast({ open: true, message, variant });

  const [dash, setDash] = useState<ExecutiveDashboard | null>(null);
  const [live, setLive] = useState<LiveOperationsView | null>(null);
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [insights, setInsights] = useState<OpsInsight[]>([]);
  const [alerts, setAlerts] = useState<OpsAlert[]>([]);
  const [forecasts, setForecasts] = useState<ForecastDay[]>([]);
  const [perf, setPerf] = useState<PerformanceMetrics | null>(null);
  const [feed, setFeed] = useState<RealtimeEvent[]>([]);
  const [reports, setReports] = useState<OpsReport[]>([]);
  const [refreshSec, setRefreshSec] = useState(12);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [customer360, setCustomer360] = useState<Customer360View | null>(null);
  const [copilotQ, setCopilotQ] = useState("Generate today's operations summary.");
  const [copilotA, setCopilotA] = useState("");
  const [copilotBusy, setCopilotBusy] = useState(false);
  const [announceTitle, setAnnounceTitle] = useState("");
  const [announceBody, setAnnounceBody] = useState("");
  const [reportCategory, setReportCategory] = useState("operations");
  const [reportPeriod, setReportPeriod] = useState("daily");
  const [reportFormat, setReportFormat] = useState("csv");
  const [announcements, setAnnouncements] = useState<Awaited<ReturnType<typeof listAnnouncements>>>([]);

  const loadCore = useCallback(async () => {
    try {
      const [d, l, h, i, a, f, p, rt, settings] = await Promise.all([
        buildExecutiveDashboard(outlet),
        buildLiveOperations(outlet),
        computeRestaurantHealth(outlet),
        generateOpsInsights(outlet),
        syncOperationalAlerts(outlet),
        buildForecasts(outlet, 7),
        buildPerformanceMetrics(outlet),
        buildRealtimeFeed(outlet),
        getOpsSettings(outlet),
      ]);
      setDash(d);
      setLive(l);
      setHealth(h);
      setInsights(i);
      setAlerts(a);
      setForecasts(f);
      setPerf(p);
      setFeed(rt);
      if (settings && typeof (settings as { live_refresh_seconds?: number }).live_refresh_seconds === "number") {
        setRefreshSec(Number((settings as { live_refresh_seconds: number }).live_refresh_seconds) || 12);
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to load Mission Control", "error");
    } finally {
      setLoading(false);
    }
  }, [outlet]);

  useEffect(() => {
    void loadCore();
    void getOpsReports(outlet).then(setReports);
    void listAnnouncements(outlet).then(setAnnouncements);
  }, [loadCore, outlet]);

  useEffect(() => {
    const ms = Math.max(10, Math.min(15, refreshSec)) * 1000;
    const id = window.setInterval(() => {
      void buildLiveOperations(outlet).then(setLive);
      void buildRealtimeFeed(outlet).then(setFeed);
      void buildExecutiveDashboard(outlet).then(setDash);
    }, ms);
    return () => window.clearInterval(id);
  }, [outlet, refreshSec]);

  const kpis = dash?.kpis;
  const weekChart = useMemo(
    () => (dash?.trends.week ?? []).map((p) => ({ label: p.label, value: p.value })),
    [dash],
  );

  const runSearch = async () => {
    const hits = await searchOperations(outlet, searchQ);
    setSearchHits(hits);
  };

  const loadCustomer = async () => {
    if (!customerId.trim()) {
      const customers = await listCustomers({ locationId: outlet, limit: 1 });
      if (!customers[0]) {
        showToast("No customers found", "error");
        return;
      }
      setCustomerId(customers[0].id);
      setCustomer360(await buildCustomer360(outlet, customers[0].id));
      return;
    }
    const view = await buildCustomer360(outlet, customerId.trim());
    setCustomer360(view);
    if (!view) showToast("Customer not found", "error");
  };

  const askCopilot = async () => {
    setCopilotBusy(true);
    try {
      const quick = await quickOpsAnswer(outlet, copilotQ);
      if (quick && !copilotQ.toLowerCase().includes("summary")) {
        setCopilotA(quick);
        return;
      }
      const reply = await askOperationsCopilot({ locationId: outlet, question: copilotQ });
      setCopilotA(reply.answer);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Copilot failed", "error");
    } finally {
      setCopilotBusy(false);
    }
  };

  const onCommand = async (id: (typeof COMMAND_ACTIONS)[number]["id"]) => {
    const result = await runCommandAction(id, {
      locationId: outlet,
      announcementTitle: announceTitle,
      announcementBody: announceBody,
    });
    if (result.href) navigate(result.href);
    showToast(result.message, result.ok ? "success" : "error");
    if (id === "run_health_check" || id === "generate_report" || id === "publish_announcement") {
      void loadCore();
      void getOpsReports(outlet).then(setReports);
      void listAnnouncements(outlet).then(setAnnouncements);
    }
  };

  const listAlertsRefresh = async () => {
    const open = await syncOperationalAlerts(outlet);
    setAlerts(open);
  };

  return (
    <div className="admin-page">
      <AdminBreadcrumbs
        items={[
          { label: "Admin", path: "/admin/dashboard" },
          { label: "Mission Control", path: "/admin/operations" },
        ]}
      />
      <PageHeader
        title="Restaurant Mission Control"
        description="Executive operations center — live floor, health, AI insights, forecasts, and command actions."
      >
        <AdminBadge variant="info">Live · {refreshSec}s</AdminBadge>
        <AdminButton variant="outline" onClick={() => void loadCore()}>
          Refresh
        </AdminButton>
      </PageHeader>

      <AdminCard className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Search size={16} />
          <div className="min-w-[220px] flex-1">
            <AdminInput
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Global search — customers, reservations, events, journeys…"
            />
          </div>
          <AdminButton onClick={() => void runSearch()}>Search</AdminButton>
        </div>
        {searchHits.length > 0 && (
          <ul className="mt-3 list-none space-y-2 p-0">
            {searchHits.map((h) => (
              <li key={`${h.module}-${h.id}`}>
                <button
                  type="button"
                  className="text-left text-sm"
                  onClick={() => navigate(h.href)}
                >
                  <AdminBadge variant="outline">{h.module}</AdminBadge> {h.title}
                  {h.subtitle ? <span className="opacity-70"> — {h.subtitle}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                tab === t.id
                  ? "border-admin-primary bg-admin-primary text-white"
                  : "border-admin-border bg-transparent"
              }`}
              onClick={() => setTab(t.id)}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {loading && <p className="text-sm opacity-70">Loading Mission Control…</p>}

      {tab === "executive" && kpis && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Metric label="Today's Reservations" value={kpis.todaysReservations} />
            <Metric label="Guests Seated" value={kpis.guestsSeated} />
            <Metric label="Walk-ins" value={kpis.walkIns} />
            <Metric label="Available Tables" value={kpis.availableTables} />
            <Metric label="Occupied Tables" value={kpis.occupiedTables} />
            <Metric label="Waitlist" value={kpis.waitlist} />
            <Metric label="Today's Catering" value={kpis.todaysCatering} />
            <Metric label="Upcoming Events" value={kpis.upcomingEvents} />
            <Metric label="VIP Arrivals" value={kpis.vipArrivals} />
            <Metric label="Pending Approvals" value={kpis.pendingApprovals} />
            <Metric label="Workflow Failures" value={kpis.workflowFailures} />
            <Metric label="Open Tasks" value={kpis.openTasks} />
            <Metric label="Health Score" value={kpis.healthScore} />
            <Metric label="Revenue (POS)" value="—" hint="Future milestone" />
          </div>
          <div className="mt-4">
            <AdminChart title="Weekly trend" data={weekChart} />
          </div>
          {announcements[0] && (
            <AdminCard className="mt-4">
              <CardTitle>Announcement</CardTitle>
              <strong>{announcements[0].title}</strong>
              <p className="mt-1 text-sm">{announcements[0].body}</p>
            </AdminCard>
          )}
        </>
      )}

      {tab === "live" && live && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AdminCard>
            <CardTitle>Reservation Timeline</CardTitle>
            <ul className="m-0 list-none space-y-2 p-0 text-sm">
              {live.reservationTimeline.slice(0, 20).map((r) => (
                <li key={r.id} className="flex justify-between gap-2">
                  <span>
                    {r.time} · {r.name} ({r.guests})
                  </span>
                  <span className="flex gap-1">
                    {r.late ? <AdminBadge variant="danger">Late</AdminBadge> : null}
                    <AdminBadge variant="outline">{r.status}</AdminBadge>
                  </span>
                </li>
              ))}
              {!live.reservationTimeline.length && <li>No reservations today</li>}
            </ul>
          </AdminCard>
          <AdminCard>
            <CardTitle>Table Occupancy</CardTitle>
            <div className="flex flex-wrap gap-2">
              {live.tableOccupancy.map((t) => (
                <AdminBadge key={t.id} variant={t.status === "available" ? "success" : "warning"}>
                  {t.tableNumber} · {t.status}
                </AdminBadge>
              ))}
              {!live.tableOccupancy.length && <span className="text-sm">No tables configured</span>}
            </div>
          </AdminCard>
          <AdminCard>
            <CardTitle>Waitlist</CardTitle>
            {live.waitlist.map((w) => (
              <div key={w.id} className="text-sm">
                #{w.position} {w.name} · party {w.partySize}
              </div>
            ))}
            {!live.waitlist.length && <span className="text-sm">Waitlist clear</span>}
          </AdminCard>
          <AdminCard>
            <CardTitle>Event Progress</CardTitle>
            {live.cateringProgress.map((e) => (
              <div key={e.id} className="text-sm">
                {e.title} · {e.stage} · {e.eventDate ?? "TBD"}
              </div>
            ))}
            {!live.cateringProgress.length && <span className="text-sm">No upcoming events</span>}
          </AdminCard>
          <AdminCard>
            <CardTitle>Workflow Status</CardTitle>
            {live.workflowStatus.slice(0, 12).map((w) => (
              <div key={w.id} className="text-sm">
                {w.id.slice(0, 8)} · {w.status}
              </div>
            ))}
            <p className="mt-2 text-sm">Open tasks: {live.openTasks}</p>
          </AdminCard>
        </div>
      )}

      {tab === "health" && health && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <Metric label="Overall" value={health.overallScore} />
            {Object.entries(health.subscores).map(([k, v]) => (
              <Metric key={k} label={k} value={v} />
            ))}
          </div>
          <AdminCard className="mt-4">
            <CardTitle>Improvement suggestions</CardTitle>
            <ul className="list-disc pl-5 text-sm">
              {health.suggestions.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </AdminCard>
        </>
      )}

      {tab === "insights" && (
        <div className="grid gap-3">
          {insights.map((i) => (
            <AdminCard key={i.id}>
              <AdminBadge variant={severityVariant(i.severity)}>{i.severity}</AdminBadge>{" "}
              <AdminBadge variant="outline">{i.module}</AdminBadge>
              <h3 className="mt-2 text-base font-semibold">{i.title}</h3>
              <p className="mt-1 text-sm opacity-80">{i.body}</p>
            </AdminCard>
          ))}
        </div>
      )}

      {tab === "today" && live && kpis && (
        <AdminCard>
          <CardTitle>Today&apos;s Operations</CardTitle>
          <p className="text-sm">
            {kpis.todaysReservations} reservations · {kpis.guestsSeated} covers seated · {kpis.waitlist} waiting ·{" "}
            {kpis.todaysCatering} catering · {kpis.pendingApprovals} approvals · health {kpis.healthScore}
          </p>
          <AdminButton className="mt-3" variant="outline" onClick={() => setTab("live")}>
            Open Live Ops
          </AdminButton>
        </AdminCard>
      )}

      {tab === "customers" && (
        <AdminCard>
          <CardTitle>Customer 360°</CardTitle>
          <div className="mb-3 flex flex-wrap gap-2">
            <div className="min-w-[240px] flex-1">
              <AdminInput
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                placeholder="Customer ID (blank = first CRM customer)"
              />
            </div>
            <AdminButton onClick={() => void loadCustomer()}>Load 360°</AdminButton>
            <AdminButton variant="outline" onClick={() => navigate("/admin/operations/crm")}>
              Open CRM
            </AdminButton>
          </div>
          {customer360 && (
            <div className="space-y-2 text-sm">
              <p>
                Stage: <strong>{customer360.journeyStage ?? "—"}</strong> · Relationship{" "}
                <strong>{customer360.relationshipScore}</strong>
                {customer360.birthdaySoon ? " · Birthday soon" : ""}
                {customer360.anniversarySoon ? " · Anniversary soon" : ""}
              </p>
              <p>Loyalty: {JSON.stringify(customer360.loyalty)}</p>
              <p>
                Preferences:{" "}
                {Object.entries(customer360.preferences)
                  .map(([k, v]) => `${k}=${v}`)
                  .join(", ") || "—"}
              </p>
              <p>Recommendations:</p>
              <ul className="list-disc pl-5">
                {customer360.recommendations.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <p>Campaigns: {customer360.upcomingCampaigns.join(", ") || "—"}</p>
              <p>
                Current reservation: {customer360.currentReservationId ?? "—"} · Event:{" "}
                {customer360.currentEventId ?? "—"}
              </p>
            </div>
          )}
        </AdminCard>
      )}

      {(tab === "reservations" || tab === "catering" || tab === "workflows") && (
        <AdminCard>
          <CardTitle>Module deep-link</CardTitle>
          <p className="mb-3 text-sm">Mission Control consumes existing modules — open the full console:</p>
          <div className="flex flex-wrap gap-2">
            {tab === "reservations" && (
              <AdminButton onClick={() => navigate("/admin/operations/reservations")}>Reservations Console</AdminButton>
            )}
            {tab === "catering" && (
              <AdminButton onClick={() => navigate("/admin/operations/events")}>Catering & Events</AdminButton>
            )}
            {tab === "workflows" && (
              <AdminButton onClick={() => navigate("/admin/operations/workflows")}>Workflow Center</AdminButton>
            )}
          </div>
        </AdminCard>
      )}

      {tab === "alerts" && (
        <div className="grid gap-3">
          {alerts.map((a) => (
            <AdminCard key={a.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <AdminBadge variant={severityVariant(a.severity)}>{a.severity}</AdminBadge>{" "}
                  <strong>{a.title}</strong>
                  <p className="mt-1 text-sm">{a.body}</p>
                </div>
                <div className="flex gap-2">
                  <AdminButton
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await acknowledgeAlert(a.id);
                      showToast("Acknowledged");
                      void listAlertsRefresh();
                    }}
                  >
                    Ack
                  </AdminButton>
                  <AdminButton
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await resolveAlert(a.id);
                      showToast("Resolved");
                      void listAlertsRefresh();
                    }}
                  >
                    Resolve
                  </AdminButton>
                </div>
              </div>
            </AdminCard>
          ))}
          {!alerts.length && (
            <AdminCard>
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle size={16} /> No open alerts
              </div>
            </AdminCard>
          )}
        </div>
      )}

      {tab === "performance" && perf && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Metric label="Reservation Conversion" value={perf.reservationConversion} />
          <Metric label="Customer Retention" value={perf.customerRetention} />
          <Metric label="Journey Progression" value={perf.journeyProgression} />
          <Metric label="Workflow Success" value={perf.workflowSuccess} />
          <Metric label="Pending Approvals" value={perf.avgApprovalPending} />
          <Metric label="Task Completion %" value={perf.taskCompletion} />
          <Metric label="Open Escalations" value={perf.openEscalations} />
        </div>
      )}

      {tab === "forecasting" && (
        <AdminCard>
          <CardTitle>7-day forecast</CardTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="py-2">Date</th>
                  <th>Reservations</th>
                  <th>Table demand</th>
                  <th>Staff</th>
                  <th>Catering</th>
                  <th>Waitlist %</th>
                  <th>Peak</th>
                </tr>
              </thead>
              <tbody>
                {forecasts.map((f) => (
                  <tr key={f.date} className="border-t border-admin-border/40">
                    <td className="py-2">{f.date}</td>
                    <td>{f.expectedReservations}</td>
                    <td>{f.tableDemand}</td>
                    <td>{f.staffRequired}</td>
                    <td>{f.cateringVolume}</td>
                    <td>{f.waitlistProbability}</td>
                    <td>{f.isPeakDay ? "Yes" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}

      {tab === "reports" && (
        <AdminCard>
          <CardTitle>Report Center</CardTitle>
          <div className="mb-3 grid gap-3 sm:grid-cols-3">
            <AdminSelect
              label="Period"
              value={reportPeriod}
              onChange={setReportPeriod}
              options={[
                { value: "daily", label: "Daily" },
                { value: "weekly", label: "Weekly" },
                { value: "monthly", label: "Monthly" },
                { value: "quarterly", label: "Quarterly" },
                { value: "annual", label: "Annual" },
              ]}
            />
            <AdminSelect
              label="Category"
              value={reportCategory}
              onChange={setReportCategory}
              options={[
                { value: "operations", label: "Operations" },
                { value: "reservations", label: "Reservations" },
                { value: "crm", label: "CRM" },
                { value: "journey", label: "Journey" },
                { value: "workflow", label: "Workflow" },
                { value: "catering", label: "Catering" },
                { value: "ai", label: "AI Performance" },
              ]}
            />
            <AdminSelect
              label="Format"
              value={reportFormat}
              onChange={setReportFormat}
              options={[
                { value: "csv", label: "CSV" },
                { value: "pdf", label: "PDF (text)" },
                { value: "excel", label: "Excel (TSV)" },
              ]}
            />
          </div>
          <AdminButton
            onClick={async () => {
              const r = await generateOpsReport({
                locationId: outlet,
                period: reportPeriod as "daily",
                category: reportCategory as "operations",
                format: reportFormat as "csv",
              });
              if (r) {
                setReports((prev) => [r, ...prev]);
                showToast("Report generated");
              } else showToast("Could not generate report", "error");
            }}
          >
            Generate
          </AdminButton>
          <ul className="mt-4 list-none space-y-2 p-0">
            {reports.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  {r.title} · {r.format}
                </span>
                <AdminButton
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const blob = downloadReportBlob(r);
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(new Blob([blob.body], { type: blob.mime }));
                    a.download = blob.filename;
                    a.click();
                  }}
                >
                  Export
                </AdminButton>
              </li>
            ))}
          </ul>
        </AdminCard>
      )}

      {tab === "copilot" && (
        <AdminCard>
          <CardTitle>Operations Copilot</CardTitle>
          <p className="mb-3 text-sm opacity-80">
            Uses Planner → Tool Orchestrator → Context Aggregator (no second AI stack).
          </p>
          <AdminTextarea value={copilotQ} onChange={(e) => setCopilotQ(e.target.value)} rows={3} />
          <div className="mt-3 flex flex-wrap gap-2">
            <AdminButton disabled={copilotBusy} onClick={() => void askCopilot()}>
              {copilotBusy ? "Thinking…" : "Ask Copilot"}
            </AdminButton>
            {[
              "How many VIP guests arrive today?",
              "Which workflows failed?",
              "Who has birthdays this week?",
              "Show pending catering approvals.",
              "What reservations are waiting confirmation?",
              "Which customers are at churn risk?",
            ].map((q) => (
              <AdminButton key={q} size="sm" variant="outline" onClick={() => setCopilotQ(q)}>
                {q}
              </AdminButton>
            ))}
          </div>
          {copilotA && (
            <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-black/5 p-3 text-sm dark:bg-white/5">
              {copilotA}
            </pre>
          )}
        </AdminCard>
      )}

      {tab === "command" && (
        <AdminCard>
          <CardTitle>Command Center</CardTitle>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {COMMAND_ACTIONS.map((a) => (
              <AdminButton key={a.id} variant="outline" onClick={() => void onCommand(a.id)}>
                {a.label}
              </AdminButton>
            ))}
          </div>
          <div className="mt-4 grid gap-2">
            <AdminInput
              placeholder="Announcement title"
              value={announceTitle}
              onChange={(e) => setAnnounceTitle(e.target.value)}
            />
            <AdminTextarea
              placeholder="Announcement body"
              value={announceBody}
              onChange={(e) => setAnnounceBody(e.target.value)}
              rows={3}
            />
          </div>
        </AdminCard>
      )}

      {tab === "feed" && (
        <AdminCard>
          <CardTitle>Real-time event stream</CardTitle>
          <ul className="m-0 list-none space-y-2 p-0">
            {feed.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-2 border-b border-admin-border/30 py-2 text-sm">
                <AdminBadge variant="outline">{e.source}</AdminBadge>
                <strong>{e.type}</strong>
                <span>{e.title}</span>
                <span className="ml-auto opacity-60">{new Date(e.at).toLocaleString()}</span>
              </li>
            ))}
            {!feed.length && <li className="text-sm">No recent events</li>}
          </ul>
        </AdminCard>
      )}

      {tab === "settings" && (
        <AdminCard>
          <CardTitle>Mission Control settings</CardTitle>
          <AdminInput
            label="Live refresh seconds (10–15)"
            type="number"
            value={String(refreshSec)}
            onChange={(e) => setRefreshSec(Number(e.target.value) || 12)}
          />
          <AdminButton
            className="mt-3"
            onClick={async () => {
              await upsertOpsSettings(outlet, {
                liveRefreshSeconds: Math.max(10, Math.min(15, refreshSec)),
              });
              showToast("Settings saved");
            }}
          >
            Save
          </AdminButton>
        </AdminCard>
      )}

      <AdminToast
        open={toast.open}
        message={toast.message}
        variant={toast.variant}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </div>
  );
}
