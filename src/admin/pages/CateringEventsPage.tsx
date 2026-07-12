import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  LayoutGrid,
  UserPlus,
  CalendarDays,
  Package,
  FileText,
  UtensilsCrossed,
  CheckSquare,
  ClipboardCheck,
  MessageSquare,
  FolderOpen,
  BarChart3,
  Settings2,
  PartyPopper,
  ShoppingBag,
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
import {
  advanceWorkflow,
  completeTask,
  createOrReviseQuote,
  createTasksForEvent,
  EVENT_TYPE_OPTIONS,
  getEvent,
  getEventAnalytics,
  getEventCommunications,
  getLatestQuote,
  getSettings,
  getTasks,
  listApprovals,
  listDocuments,
  listEvents,
  listLeads,
  listPackages,
  listQuotes,
  recommendMenu,
  runEventEngine,
  saveMenuForEvent,
  upsertPackage,
  upsertSettings,
  updateQuote,
  workflowVisual,
  WORKFLOW_STAGES,
  type EventAnalyticsSnapshot,
  type EventLead,
  type EventPackage,
  type EventQuote,
  type EventRecord,
  type EventTask,
} from "../../services/restaurantOperations/events";
import "../admin.css";

type TabId =
  | "dashboard"
  | "leads"
  | "events"
  | "orders"
  | "packages"
  | "quotes"
  | "menus"
  | "calendar"
  | "tasks"
  | "approvals"
  | "communications"
  | "documents"
  | "analytics"
  | "settings";

const TABS: Array<{ id: TabId; label: string; icon: typeof LayoutGrid }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { id: "leads", label: "Leads", icon: UserPlus },
  { id: "events", label: "Events", icon: PartyPopper },
  { id: "orders", label: "Catering Orders", icon: ShoppingBag },
  { id: "packages", label: "Party Packages", icon: Package },
  { id: "quotes", label: "Quote Builder", icon: FileText },
  { id: "menus", label: "Menu Planner", icon: UtensilsCrossed },
  { id: "calendar", label: "Event Calendar", icon: CalendarDays },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "approvals", label: "Approvals", icon: ClipboardCheck },
  { id: "communications", label: "Communications", icon: MessageSquare },
  { id: "documents", label: "Documents", icon: FolderOpen },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings2 },
];

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="kb-metric">
      <p className="kb-metric__label">{label}</p>
      <p className="kb-metric__value">{value}</p>
    </div>
  );
}

function statusVariant(status: string): "success" | "warning" | "danger" | "default" {
  if (["confirmed", "completed", "done", "approved", "accepted"].includes(status)) return "success";
  if (["cancelled", "lost", "rejected"].includes(status)) return "danger";
  if (["negotiation", "pending", "draft", "new", "open"].includes(status)) return "warning";
  return "default";
}

export default function CateringEventsPage() {
  const { locationId, isAllLocations } = useLocation();
  const outlet = (isAllLocations ? DEFAULT_PUBLIC_LOCATION_ID : locationId) as LocationId;
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as TabId) || "dashboard";
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

  const [analytics, setAnalytics] = useState<EventAnalyticsSnapshot | null>(null);
  const [leads, setLeads] = useState<EventLead[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [packages, setPackages] = useState<EventPackage[]>([]);
  const [quotes, setQuotes] = useState<EventQuote[]>([]);
  const [tasks, setTasks] = useState<EventTask[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [filterType, setFilterType] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [inquiryForm, setInquiryForm] = useState({
    customerName: "",
    phone: "",
    email: "",
    eventType: "birthday",
    eventDate: "",
    guestCount: "40",
    budget: "",
    message: "",
  });
  const [pkgForm, setPkgForm] = useState({
    code: "",
    name: "",
    tier: "silver",
    minGuests: "20",
    basePrice: "250",
    pricePerGuest: "30",
    description: "",
  });
  const [settingsForm, setSettingsForm] = useState({
    taxRate: "0.06625",
    serviceChargeRate: "0.18",
    minGuests: "20",
    depositPercent: "0.3",
  });
  const [menuPreview, setMenuPreview] = useState("");
  const [comms, setComms] = useState<Awaited<ReturnType<typeof getEventCommunications>>>([]);
  const [docs, setDocs] = useState<Awaited<ReturnType<typeof listDocuments>>>([]);
  const [approvals, setApprovals] = useState<Awaited<ReturnType<typeof listApprovals>>>([]);

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) ?? events[0] ?? null,
    [events, selectedEventId],
  );

  const refresh = useCallback(async () => {
    const [a, l, e, p, q, t] = await Promise.all([
      getEventAnalytics(outlet),
      listLeads({ locationId: outlet, limit: 200 }),
      listEvents({ locationId: outlet, limit: 200 }),
      listPackages(outlet, false),
      listQuotes(undefined, outlet),
      getTasks({ locationId: outlet }),
    ]);
    setAnalytics(a);
    setLeads(l);
    setEvents(e);
    setPackages(p);
    setQuotes(q);
    setTasks(t);
    if (!selectedEventId && e[0]) setSelectedEventId(e[0].id);
    const s = await getSettings(outlet);
    if (s) {
      setSettingsForm({
        taxRate: String(s.taxRate),
        serviceChargeRate: String(s.serviceChargeRate),
        minGuests: String(s.minGuests),
        depositPercent: String(s.depositPercent),
      });
    }
  }, [outlet, selectedEventId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!selectedEvent) return;
    void (async () => {
      const [c, d, ap] = await Promise.all([
        getEventCommunications({ eventId: selectedEvent.id }),
        listDocuments(selectedEvent.id),
        listApprovals(selectedEvent.id),
      ]);
      setComms(c);
      setDocs(d);
      setApprovals(ap);
      const draft = recommendMenu(
        {
          locationId: outlet,
          guestCount: selectedEvent.guestCount ?? undefined,
          budget: selectedEvent.budget ?? undefined,
          eventType: selectedEvent.eventType,
          dietary: selectedEvent.dietary,
          needs: selectedEvent.needs,
          cuisine: selectedEvent.cuisine ?? undefined,
        },
        packages.find((p) => p.id === selectedEvent.packageId) ?? null,
      );
      setMenuPreview(
        [
          draft.menu.name,
          `Starters: ${draft.menu.starters.join(", ") || "—"}`,
          `Mains: ${draft.menu.mains.join(", ") || "—"}`,
          `Desserts: ${draft.menu.desserts.join(", ") || "—"}`,
          ...draft.hints,
        ].join("\n"),
      );
    })();
  }, [selectedEvent, outlet, packages]);

  const filteredEvents = useMemo(
    () =>
      events.filter((e) => {
        if (filterType && e.eventType !== filterType) return false;
        if (filterStage && e.workflowStage !== filterStage) return false;
        return true;
      }),
    [events, filterType, filterStage],
  );

  const calendarEvents = useMemo(
    () => filteredEvents.filter((e) => e.eventDate && e.eventDate.startsWith(calendarMonth)),
    [filteredEvents, calendarMonth],
  );

  const orders = useMemo(
    () =>
      events.filter((e) =>
        ["deposit_pending", "deposit_received", "confirmed", "preparation", "execution"].includes(
          e.workflowStage,
        ),
      ),
    [events],
  );

  const handleNewInquiry = async () => {
    const msg = [
      inquiryForm.message || "Catering inquiry from admin",
      `Name is ${inquiryForm.customerName}`,
      inquiryForm.phone,
      inquiryForm.email,
      `${inquiryForm.eventType} for ${inquiryForm.guestCount} guests`,
      inquiryForm.eventDate,
      inquiryForm.budget ? `budget $${inquiryForm.budget}` : "",
    ]
      .filter(Boolean)
      .join(". ");
    const res = await runEventEngine({
      action: "inquire",
      locationId: outlet,
      message: msg,
      fields: {
        locationId: outlet,
        customerName: inquiryForm.customerName,
        phone: inquiryForm.phone,
        email: inquiryForm.email || undefined,
        eventType: inquiryForm.eventType,
        eventDate: inquiryForm.eventDate || undefined,
        guestCount: Number(inquiryForm.guestCount) || undefined,
        budget: inquiryForm.budget ? Number(inquiryForm.budget) : undefined,
        source: "website",
      },
    });
    showToast(res.message, res.ok ? "success" : "error");
    await refresh();
  };

  const handleBuildQuote = async () => {
    if (!selectedEvent) return;
    const full = await getEvent(selectedEvent.id);
    if (!full) return;
    const pkg = packages.find((p) => p.id === full.packageId) ?? packages[0] ?? null;
    const existing = await getLatestQuote(full.id);
    const quote = await createOrReviseQuote({ event: full, pkg, revise: Boolean(existing) });
    if (quote) {
      await advanceWorkflow(full, "proposal", { quoteId: quote.id, actor: "admin" });
      showToast(`Quote v${quote.version} · $${quote.grandTotal.toFixed(2)}`);
    } else showToast("Quote failed", "error");
    await refresh();
  };

  const handleAdvance = async (stage?: (typeof WORKFLOW_STAGES)[number]) => {
    if (!selectedEvent) return;
    const next = await advanceWorkflow(selectedEvent, stage, { actor: "admin" });
    if (next && ["confirmed", "preparation", "deposit_pending"].includes(next.workflowStage)) {
      await createTasksForEvent(next);
    }
    showToast(next ? `Stage → ${next.workflowStage}` : "Could not advance", next ? "success" : "error");
    await refresh();
  };

  const handleSavePackage = async () => {
    const saved = await upsertPackage({
      locationId: outlet,
      code: pkgForm.code || "CUSTOM",
      name: pkgForm.name || "Custom Package",
      tier: pkgForm.tier,
      minGuests: Number(pkgForm.minGuests) || 20,
      basePrice: Number(pkgForm.basePrice) || 0,
      pricePerGuest: Number(pkgForm.pricePerGuest) || 0,
      description: pkgForm.description,
      menuJson: {},
      decorJson: {},
      addons: [],
    });
    showToast(saved ? `Saved ${saved.code}` : "Save failed", saved ? "success" : "error");
    await refresh();
  };

  const handleSaveMenu = async () => {
    if (!selectedEvent) return;
    const draft = recommendMenu(
      {
        locationId: outlet,
        guestCount: selectedEvent.guestCount ?? undefined,
        eventType: selectedEvent.eventType,
        dietary: selectedEvent.dietary,
        needs: selectedEvent.needs,
      },
      packages.find((p) => p.id === selectedEvent.packageId) ?? null,
    );
    const saved = await saveMenuForEvent(selectedEvent.id, outlet, draft.menu);
    showToast(saved ? "Menu saved" : "Menu save failed", saved ? "success" : "error");
  };

  const handleApproveQuote = async (status: string) => {
    if (!selectedEvent) return;
    const q = await getLatestQuote(selectedEvent.id);
    if (!q) {
      showToast("No quote", "error");
      return;
    }
    await updateQuote(q.id, { approvalStatus: status });
    if (status === "approved") await handleAdvance("confirmed");
    else showToast(`Quote → ${status}`);
    await refresh();
  };

  const visual = selectedEvent ? workflowVisual(selectedEvent.workflowStage) : null;
  const typeOptions = [
    { value: "", label: "All types" },
    ...EVENT_TYPE_OPTIONS.map((t) => ({ value: String(t), label: String(t) })),
  ];
  const stageOptions = [
    { value: "", label: "All stages" },
    ...WORKFLOW_STAGES.map((s) => ({ value: s, label: s.replace(/_/g, " ") })),
  ];

  return (
    <div className="ai-concierge-page">
      <AdminBreadcrumbs
        items={[
          { label: "Restaurant Operations", path: "/admin/operations" },
          { label: "Catering & Events" },
        ]}
      />
      <PageHeader
        title="Catering & Events"
        description="Enterprise event lifecycle — leads, packages, quotes, tasks, calendar, and analytics."
      >
        <AdminBadge variant="outline">{outlet}</AdminBadge>
        <AdminButton variant="secondary" onClick={() => void refresh()}>
          Refresh
        </AdminButton>
      </PageHeader>

      {isAllLocations && (
        <p className="mb-4 text-sm text-amber-500">Select a specific outlet for operational actions.</p>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                tab === t.id
                  ? "border-admin-primary bg-admin-primary text-white"
                  : "border-admin-border text-admin-muted hover:border-admin-primary"
              }`}
              onClick={() => setTab(t.id)}
            >
              <span className="inline-flex items-center gap-1.5">
                <Icon size={14} aria-hidden />
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      {tab === "dashboard" && (
        <div className="space-y-4">
          <div className="kb-metric-grid">
            <Metric label="Open leads" value={analytics?.openLeads ?? "—"} />
            <Metric label="Conversion %" value={analytics?.conversionRate ?? "—"} />
            <Metric label="Avg guests" value={analytics?.avgEventSize ?? "—"} />
            <Metric label="Avg revenue" value={analytics ? `$${analytics.avgRevenue}` : "—"} />
            <Metric label="Upcoming" value={analytics?.upcomingEvents ?? "—"} />
            <Metric label="Forecast" value={analytics ? `$${analytics.revenueForecast}` : "—"} />
          </div>
          {(analytics?.byStage.length ?? 0) > 0 && (
            <AdminChart title="Pipeline by stage" data={(analytics?.byStage ?? []).map((s) => ({ label: s.stage, value: s.count }))} />
          )}
          <AdminCard>
            <strong className="text-sm">Quick inquiry</strong>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <AdminInput label="Name" value={inquiryForm.customerName} onChange={(e) => setInquiryForm({ ...inquiryForm, customerName: e.target.value })} />
              <AdminInput label="Phone" value={inquiryForm.phone} onChange={(e) => setInquiryForm({ ...inquiryForm, phone: e.target.value })} />
              <AdminInput label="Email" value={inquiryForm.email} onChange={(e) => setInquiryForm({ ...inquiryForm, email: e.target.value })} />
              <AdminSelect label="Event type" value={inquiryForm.eventType} onChange={(v) => setInquiryForm({ ...inquiryForm, eventType: v })} options={EVENT_TYPE_OPTIONS.map((t) => ({ value: String(t), label: String(t) }))} />
              <AdminInput label="Date" type="date" value={inquiryForm.eventDate} onChange={(e) => setInquiryForm({ ...inquiryForm, eventDate: e.target.value })} />
              <AdminInput label="Guests" value={inquiryForm.guestCount} onChange={(e) => setInquiryForm({ ...inquiryForm, guestCount: e.target.value })} />
              <AdminInput label="Budget" value={inquiryForm.budget} onChange={(e) => setInquiryForm({ ...inquiryForm, budget: e.target.value })} />
            </div>
            <div className="mt-3">
              <AdminTextarea label="Notes" value={inquiryForm.message} onChange={(e) => setInquiryForm({ ...inquiryForm, message: e.target.value })} />
            </div>
            <div className="mt-3">
              <AdminButton onClick={() => void handleNewInquiry()}>Capture lead</AdminButton>
            </div>
          </AdminCard>
        </div>
      )}

      {tab === "leads" && (
        <AdminCard>
          <strong className="text-sm">Event leads</strong>
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-admin-muted">
                <th className="py-2">Customer</th>
                <th>Source</th>
                <th>Type</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-t border-admin-border/40">
                  <td className="py-2">
                    <strong>{l.customerName}</strong>
                    <div className="text-xs text-admin-muted">{l.phone ?? l.email ?? "—"}</div>
                  </td>
                  <td>{l.source}</td>
                  <td>{l.eventType ?? "—"}</td>
                  <td>{l.priority}</td>
                  <td>
                    <AdminBadge variant={statusVariant(l.status)}>{l.status}</AdminBadge>
                  </td>
                  <td>{new Date(l.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {!leads.length && (
                <tr>
                  <td colSpan={6} className="py-4 text-admin-muted">
                    No leads yet — apply migration 046 and capture an inquiry.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </AdminCard>
      )}

      {(tab === "events" || tab === "orders") && (
        <div className="space-y-4">
          <AdminCard>
            <strong className="text-sm">{tab === "orders" ? "Catering orders" : "Events"}</strong>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <AdminSelect label="Filter type" value={filterType} onChange={setFilterType} options={typeOptions} />
              <AdminSelect label="Filter stage" value={filterStage} onChange={setFilterStage} options={stageOptions} />
            </div>
            <table className="mt-3 w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-admin-muted">
                  <th className="py-2">Title</th>
                  <th>Date</th>
                  <th>Guests</th>
                  <th>Stage</th>
                  <th>Progress</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(tab === "orders" ? orders : filteredEvents).map((e) => (
                  <tr key={e.id} className="border-t border-admin-border/40">
                    <td className="py-2">
                      <strong>{e.title}</strong>
                      <div className="text-xs text-admin-muted">{e.eventType}</div>
                    </td>
                    <td>{e.eventDate ?? "TBD"}</td>
                    <td>{e.guestCount ?? "—"}</td>
                    <td>
                      <AdminBadge variant={statusVariant(e.workflowStage)}>{e.workflowStage}</AdminBadge>
                    </td>
                    <td>{e.progressPercent}%</td>
                    <td>
                      <AdminButton size="sm" variant="ghost" onClick={() => setSelectedEventId(e.id)}>
                        Select
                      </AdminButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminCard>
          {selectedEvent && visual && (
            <AdminCard>
              <strong className="text-sm">Workflow · {selectedEvent.title}</strong>
              <p className="mt-1 text-xs text-admin-muted">{visual.percent}% complete</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {visual.stages.map((s) => (
                  <AdminBadge key={s.id} variant={s.current ? "success" : s.done ? "default" : "warning"}>
                    {s.label}
                  </AdminBadge>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <AdminButton onClick={() => void handleAdvance()}>Advance stage</AdminButton>
                <AdminButton variant="secondary" onClick={() => void handleBuildQuote()}>
                  Build / revise quote
                </AdminButton>
                <AdminButton
                  variant="outline"
                  onClick={() => void createTasksForEvent(selectedEvent).then(() => refresh())}
                >
                  Generate tasks
                </AdminButton>
              </div>
            </AdminCard>
          )}
        </div>
      )}

      {tab === "packages" && (
        <div className="space-y-4">
          <AdminCard>
            <strong className="text-sm">Party packages</strong>
            <table className="mt-3 w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-admin-muted">
                  <th className="py-2">Code</th>
                  <th>Name</th>
                  <th>Tier</th>
                  <th>Min</th>
                  <th>Base</th>
                  <th>/guest</th>
                </tr>
              </thead>
              <tbody>
                {packages.map((p) => (
                  <tr key={p.id} className="border-t border-admin-border/40">
                    <td className="py-2">{p.code}</td>
                    <td>{p.name}</td>
                    <td>{p.tier}</td>
                    <td>{p.minGuests}</td>
                    <td>${p.basePrice}</td>
                    <td>${p.pricePerGuest}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminCard>
          <AdminCard>
            <strong className="text-sm">Create / update package</strong>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <AdminInput label="Code" value={pkgForm.code} onChange={(e) => setPkgForm({ ...pkgForm, code: e.target.value })} />
              <AdminInput label="Name" value={pkgForm.name} onChange={(e) => setPkgForm({ ...pkgForm, name: e.target.value })} />
              <AdminSelect
                label="Tier"
                value={pkgForm.tier}
                onChange={(v) => setPkgForm({ ...pkgForm, tier: v })}
                options={[
                  { value: "silver", label: "Silver" },
                  { value: "gold", label: "Gold" },
                  { value: "platinum", label: "Platinum" },
                ]}
              />
              <AdminInput label="Min guests" value={pkgForm.minGuests} onChange={(e) => setPkgForm({ ...pkgForm, minGuests: e.target.value })} />
              <AdminInput label="Base price" value={pkgForm.basePrice} onChange={(e) => setPkgForm({ ...pkgForm, basePrice: e.target.value })} />
              <AdminInput label="Per guest" value={pkgForm.pricePerGuest} onChange={(e) => setPkgForm({ ...pkgForm, pricePerGuest: e.target.value })} />
            </div>
            <div className="mt-3">
              <AdminTextarea label="Description" value={pkgForm.description} onChange={(e) => setPkgForm({ ...pkgForm, description: e.target.value })} />
            </div>
            <div className="mt-3">
              <AdminButton onClick={() => void handleSavePackage()}>Save package</AdminButton>
            </div>
          </AdminCard>
        </div>
      )}

      {tab === "quotes" && (
        <AdminCard>
          <strong className="text-sm">Quote builder</strong>
          <p className="mt-1 text-xs text-admin-muted">Selected: {selectedEvent?.title ?? "None — select an event first"}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <AdminButton onClick={() => void handleBuildQuote()} disabled={!selectedEvent}>
              Generate / revise quotation
            </AdminButton>
            <AdminButton variant="secondary" onClick={() => void handleApproveQuote("pending_manager")}>
              Send to manager
            </AdminButton>
            <AdminButton variant="outline" onClick={() => void handleApproveQuote("approved")}>
              Approve & confirm
            </AdminButton>
          </div>
          <table className="mt-4 w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-admin-muted">
                <th className="py-2">Version</th>
                <th>Total</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {quotes
                .filter((q) => !selectedEvent || q.eventId === selectedEvent.id)
                .map((q) => (
                  <tr key={q.id} className="border-t border-admin-border/40">
                    <td className="py-2">v{q.version}</td>
                    <td>${q.grandTotal.toFixed(2)}</td>
                    <td>
                      <AdminBadge variant={statusVariant(q.approvalStatus)}>{q.approvalStatus}</AdminBadge>
                    </td>
                    <td>{new Date(q.updatedAt).toLocaleString()}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </AdminCard>
      )}

      {tab === "menus" && (
        <AdminCard>
          <strong className="text-sm">Menu planner</strong>
          <p className="mt-1 text-xs text-admin-muted">Recommendations for {selectedEvent?.title ?? "selected event"}</p>
          <div className="mt-3">
            <AdminTextarea label="Recommended menu" value={menuPreview} onChange={(e) => setMenuPreview(e.target.value)} rows={12} />
          </div>
          <div className="mt-3">
            <AdminButton onClick={() => void handleSaveMenu()} disabled={!selectedEvent}>
              Save menu to event
            </AdminButton>
          </div>
        </AdminCard>
      )}

      {tab === "calendar" && (
        <AdminCard>
          <strong className="text-sm">Event calendar</strong>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <AdminInput label="Month" type="month" value={calendarMonth} onChange={(e) => setCalendarMonth(e.target.value)} />
            <AdminSelect label="Event type" value={filterType} onChange={setFilterType} options={typeOptions} />
            <AdminSelect label="Stage" value={filterStage} onChange={setFilterStage} options={stageOptions} />
          </div>
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-admin-muted">
                <th className="py-2">Date</th>
                <th>Time</th>
                <th>Event</th>
                <th>Guests</th>
                <th>Stage</th>
              </tr>
            </thead>
            <tbody>
              {calendarEvents.map((e) => (
                <tr key={e.id} className="border-t border-admin-border/40">
                  <td className="py-2">{e.eventDate}</td>
                  <td>{e.eventTime ?? "—"}</td>
                  <td>{e.title}</td>
                  <td>{e.guestCount ?? "—"}</td>
                  <td>{e.workflowStage}</td>
                </tr>
              ))}
              {!calendarEvents.length && (
                <tr>
                  <td colSpan={5} className="py-4 text-admin-muted">
                    No events in this month.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </AdminCard>
      )}

      {tab === "tasks" && (
        <AdminCard>
          <strong className="text-sm">Tasks</strong>
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-admin-muted">
                <th className="py-2">Department</th>
                <th>Title</th>
                <th>Owner</th>
                <th>Due</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className="border-t border-admin-border/40">
                  <td className="py-2">{t.department}</td>
                  <td>{t.title}</td>
                  <td>{t.ownerName ?? "—"}</td>
                  <td>{t.dueDate ?? "—"}</td>
                  <td>
                    <AdminBadge variant={statusVariant(t.status)}>{t.status}</AdminBadge>
                  </td>
                  <td>
                    {t.status !== "done" && (
                      <AdminButton size="sm" variant="ghost" onClick={() => void completeTask(t.id).then(() => refresh())}>
                        Complete
                      </AdminButton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminCard>
      )}

      {tab === "approvals" && (
        <AdminCard>
          <strong className="text-sm">Approvals</strong>
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-admin-muted">
                <th className="py-2">Stage</th>
                <th>Status</th>
                <th>Actor</th>
                <th>Comment</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {approvals.map((a) => (
                <tr key={a.id} className="border-t border-admin-border/40">
                  <td className="py-2">{a.stage}</td>
                  <td>
                    <AdminBadge variant={statusVariant(a.status)}>{a.status}</AdminBadge>
                  </td>
                  <td>{a.actor ?? "—"}</td>
                  <td>{a.comment ?? "—"}</td>
                  <td>{new Date(a.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminCard>
      )}

      {tab === "communications" && (
        <AdminCard>
          <strong className="text-sm">Communications</strong>
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-admin-muted">
                <th className="py-2">Channel</th>
                <th>Direction</th>
                <th>Subject</th>
                <th>Summary</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {comms.map((c) => (
                <tr key={c.id} className="border-t border-admin-border/40">
                  <td className="py-2">{c.channel}</td>
                  <td>{c.direction}</td>
                  <td>{c.subject ?? "—"}</td>
                  <td>{c.summary ?? c.body?.slice(0, 80) ?? "—"}</td>
                  <td>{new Date(c.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminCard>
      )}

      {tab === "documents" && (
        <AdminCard>
          <strong className="text-sm">Documents</strong>
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-admin-muted">
                <th className="py-2">Type</th>
                <th>Title</th>
                <th>Version</th>
                <th>Preview</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className="border-t border-admin-border/40">
                  <td className="py-2">{d.docType}</td>
                  <td>{d.title}</td>
                  <td>v{d.version}</td>
                  <td>
                    <pre className="max-w-md whitespace-pre-wrap text-xs text-admin-muted">{(d.content ?? "").slice(0, 280)}</pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminCard>
      )}

      {tab === "analytics" && analytics && (
        <div className="space-y-4">
          <div className="kb-metric-grid">
            <Metric label="Open leads" value={analytics.openLeads} />
            <Metric label="Conversion %" value={analytics.conversionRate} />
            <Metric label="Quote accept %" value={analytics.quoteAcceptanceRate} />
            <Metric label="Lost" value={analytics.lostOpportunities} />
            <Metric label="Avg size" value={analytics.avgEventSize} />
            <Metric label="Avg revenue" value={`$${analytics.avgRevenue}`} />
            <Metric label="Upcoming" value={analytics.upcomingEvents} />
            <Metric label="Forecast" value={`$${analytics.revenueForecast}`} />
          </div>
          {analytics.leadSources.length > 0 && (
            <AdminChart title="Lead sources" data={analytics.leadSources.map((s) => ({ label: s.source, value: s.count }))} />
          )}
          {analytics.popularPackages.length > 0 && (
            <AdminChart title="Popular packages" data={analytics.popularPackages.map((p) => ({ label: p.code, value: p.count }))} />
          )}
        </div>
      )}

      {tab === "settings" && (
        <AdminCard>
          <strong className="text-sm">Event settings</strong>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <AdminInput label="Tax rate" value={settingsForm.taxRate} onChange={(e) => setSettingsForm({ ...settingsForm, taxRate: e.target.value })} />
            <AdminInput label="Service charge rate" value={settingsForm.serviceChargeRate} onChange={(e) => setSettingsForm({ ...settingsForm, serviceChargeRate: e.target.value })} />
            <AdminInput label="Min guests" value={settingsForm.minGuests} onChange={(e) => setSettingsForm({ ...settingsForm, minGuests: e.target.value })} />
            <AdminInput label="Deposit %" value={settingsForm.depositPercent} onChange={(e) => setSettingsForm({ ...settingsForm, depositPercent: e.target.value })} />
          </div>
          <div className="mt-3">
            <AdminButton
              onClick={() =>
                void upsertSettings(outlet, {
                  taxRate: Number(settingsForm.taxRate),
                  serviceChargeRate: Number(settingsForm.serviceChargeRate),
                  minGuests: Number(settingsForm.minGuests),
                  depositPercent: Number(settingsForm.depositPercent),
                }).then((s) => showToast(s ? "Settings saved" : "Save failed", s ? "success" : "error"))
              }
            >
              Save settings
            </AdminButton>
          </div>
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
