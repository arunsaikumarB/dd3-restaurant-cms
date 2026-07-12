import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  LayoutGrid,
  Users,
  UserRound,
  History,
  Heart,
  Star,
  Tags,
  StickyNote,
  MessageSquare,
  Sparkles,
  BarChart3,
  Settings2,
} from "lucide-react";
import AdminBreadcrumbs from "../components/shared/Breadcrumbs";
import PageHeader from "../components/shared/PageHeader";
import AdminCard from "../components/ui/Card";
import AdminBadge from "../components/ui/Badge";
import AdminButton from "../components/ui/Button";
import AdminInput from "../components/ui/Input";
import AdminTextarea from "../components/ui/Textarea";
import AdminToast from "../components/ui/Toast";
import AdminChart from "../components/ui/Chart";
import { useLocation } from "../hooks/useLocation";
import { DEFAULT_PUBLIC_LOCATION_ID, type LocationId } from "../../config/locations";
import {
  addNote,
  exportCustomerData,
  generateCustomerInsights,
  getCrmDashboard,
  getCustomer,
  getCustomerTimeline,
  listCommunications,
  listCustomers,
  listMemory,
  listNotes,
  listOpenInsights,
  listPreferences,
  listSegments,
  listVisits,
  mergeCustomers,
  requestCustomerDeletion,
  upsertCustomer,
  type CrmCustomer,
  type CrmDashboard,
  type CrmInsight,
} from "../../services/restaurantOperations/crm";
import { displayName } from "../../services/restaurantOperations/crm/client";
import "../admin.css";

type TabId =
  | "dashboard"
  | "customers"
  | "details"
  | "timeline"
  | "preferences"
  | "visits"
  | "reservations"
  | "memory"
  | "loyalty"
  | "segments"
  | "notes"
  | "communications"
  | "analytics"
  | "settings";

const TABS: Array<{ id: TabId; label: string; icon: typeof Users }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { id: "customers", label: "Customers", icon: Users },
  { id: "details", label: "Customer Details", icon: UserRound },
  { id: "timeline", label: "Timeline", icon: History },
  { id: "preferences", label: "Preferences", icon: Heart },
  { id: "visits", label: "Visits", icon: History },
  { id: "reservations", label: "Reservations", icon: History },
  { id: "memory", label: "AI Memory", icon: Sparkles },
  { id: "loyalty", label: "Loyalty", icon: Star },
  { id: "segments", label: "Segments", icon: Tags },
  { id: "notes", label: "Notes", icon: StickyNote },
  { id: "communications", label: "Communications", icon: MessageSquare },
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

export default function CustomerCrmPage() {
  const { locationId, isAllLocations } = useLocation();
  const outlet = (isAllLocations ? DEFAULT_PUBLIC_LOCATION_ID : locationId) as LocationId;
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as TabId) || "dashboard";
  const setTab = (id: TabId) => setParams((prev) => {
    const next = new URLSearchParams(prev);
    next.set("tab", id);
    return next;
  });

  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState<CrmCustomer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(params.get("id"));
  const [dash, setDash] = useState<CrmDashboard | null>(null);
  const [insights, setInsights] = useState<CrmInsight[]>([]);
  const [detail, setDetail] = useState<CrmCustomer | null>(null);
  const [prefs, setPrefs] = useState<Awaited<ReturnType<typeof listPreferences>>>([]);
  const [memory, setMemory] = useState<Awaited<ReturnType<typeof listMemory>>>([]);
  const [segments, setSegments] = useState<string[]>([]);
  const [visits, setVisits] = useState<Awaited<ReturnType<typeof listVisits>>>([]);
  const [timeline, setTimeline] = useState<Awaited<ReturnType<typeof getCustomerTimeline>>>([]);
  const [comms, setComms] = useState<Awaited<ReturnType<typeof listCommunications>>>([]);
  const [notes, setNotes] = useState<unknown[]>([]);
  const [noteText, setNoteText] = useState("");
  const [mergeId, setMergeId] = useState("");
  const [createForm, setCreateForm] = useState({ fullName: "", phone: "", email: "" });
  const [toast, setToast] = useState<{ open: boolean; message: string; variant: "success" | "error" }>({
    open: false,
    message: "",
    variant: "success",
  });

  const showToast = (message: string, variant: "success" | "error" = "success") =>
    setToast({ open: true, message, variant });

  const refreshList = useCallback(async () => {
    const [list, d, open] = await Promise.all([
      listCustomers({ locationId: outlet, query, limit: 200 }),
      getCrmDashboard(outlet),
      listOpenInsights(undefined, 30),
    ]);
    setCustomers(list);
    setDash(d);
    setInsights(open);
    if (!selectedId && list[0]) setSelectedId(list[0].id);
  }, [outlet, query, selectedId]);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  useEffect(() => {
    if (!selectedId) return;
    void (async () => {
      const c = await getCustomer(selectedId);
      setDetail(c);
      if (!c) return;
      const [p, m, s, v, t, cm, n, ig] = await Promise.all([
        listPreferences(c.id),
        listMemory(c.id),
        listSegments(c.id),
        listVisits(c.id),
        getCustomerTimeline(c.id),
        listCommunications(c.id),
        listNotes(c.id),
        generateCustomerInsights(c),
      ]);
      setPrefs(p);
      setMemory(m);
      setSegments(s);
      setVisits(v);
      setTimeline(t);
      setComms(cm);
      setNotes(n);
      setInsights(ig);
    })();
  }, [selectedId, tab]);

  const selectedName = useMemo(() => (detail ? displayName(detail) : "—"), [detail]);

  const openCustomer = (id: string) => {
    setSelectedId(id);
    setParams({ tab: "details", id });
  };

  return (
    <div className="ai-concierge-page">
      <AdminBreadcrumbs
        items={[
          { label: "Mission Control", path: "/admin/operations" },
          { label: "Customer CRM" },
        ]}
      />
      <PageHeader
        title="Customer CRM"
        description="Unified guest profiles, AI memory, loyalty, visits, and personalization — the restaurant's memory."
      >
        <AdminBadge variant="outline">{outlet}</AdminBadge>
        <AdminButton variant="secondary" onClick={() => void refreshList()}>
          Refresh
        </AdminButton>
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                tab === t.id
                  ? "border-admin-accent bg-admin-accent/15 text-admin-accent"
                  : "border-admin-border/50 text-admin-muted hover:border-admin-accent/40"
              }`}
              onClick={() => setTab(t.id)}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "dashboard" && dash && (
        <div className="space-y-4">
          <div className="kb-metric-grid">
            <Metric label="Total Customers" value={dash.totalCustomers} />
            <Metric label="New (30d)" value={dash.newCustomers} />
            <Metric label="Returning" value={dash.returningCustomers} />
            <Metric label="VIP" value={dash.vipCount} />
            <Metric label="Birthdays Today" value={dash.birthdaysToday} />
            <Metric label="Anniversaries" value={dash.anniversariesToday} />
            <Metric label="Inactive" value={dash.inactiveCustomers} />
            <Metric label="Avg Visits" value={dash.averageVisits} />
            <Metric label="Avg LTV" value={dash.averageLifetimeValue} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {dash.loyaltyDistribution.length > 0 && (
              <AdminChart title="Loyalty Distribution" data={dash.loyaltyDistribution} />
            )}
            {dash.segmentCounts.length > 0 && (
              <AdminChart title="Segments" data={dash.segmentCounts.slice(0, 8)} />
            )}
          </div>
          <AdminCard>
            <strong className="text-sm">Top Customers</strong>
            <ul className="mt-2 space-y-1 text-sm">
              {dash.topCustomers.map((c) => (
                <li key={c.id} className="flex justify-between gap-2">
                  <button type="button" className="underline" onClick={() => openCustomer(c.id)}>
                    {c.name}
                  </button>
                  <span className="text-xs text-admin-muted">
                    {c.visits} visits · LTV {c.ltv}
                  </span>
                </li>
              ))}
            </ul>
          </AdminCard>
          <AdminCard>
            <strong className="text-sm">AI Insights</strong>
            <ul className="mt-2 space-y-2 text-sm">
              {insights.slice(0, 10).map((i) => (
                <li key={i.id}>
                  <AdminBadge variant={i.priority === "high" ? "danger" : "warning"}>{i.insightType}</AdminBadge>{" "}
                  {i.title} — <span className="text-admin-muted">{i.reason}</span>
                </li>
              ))}
              {!insights.length && <li className="text-admin-muted">No open insights yet.</li>}
            </ul>
          </AdminCard>
        </div>
      )}

      {tab === "customers" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <AdminInput label="Search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, phone, email…" />
            <div className="flex items-end">
              <AdminButton onClick={() => void refreshList()}>Search</AdminButton>
            </div>
          </div>
          <AdminCard>
            <strong className="text-sm">Quick create</strong>
            <div className="mt-2 grid gap-2 md:grid-cols-4">
              <AdminInput label="Name" value={createForm.fullName} onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })} />
              <AdminInput label="Phone" value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} />
              <AdminInput label="Email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
              <div className="flex items-end">
                <AdminButton
                  onClick={() =>
                    void upsertCustomer({ locationId: outlet, ...createForm }).then((c) => {
                      showToast(c ? "Customer saved." : "Could not save customer.", c ? "success" : "error");
                      void refreshList();
                    })
                  }
                >
                  Save
                </AdminButton>
              </div>
            </div>
          </AdminCard>
          <div className="overflow-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-admin-border/40 text-xs text-admin-muted">
                  <th className="py-2">Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Visits</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b border-admin-border/20">
                    <td className="py-2 font-medium">
                      {displayName(c)} {c.isVip && <AdminBadge variant="warning">VIP</AdminBadge>}
                    </td>
                    <td>{c.phone ?? "—"}</td>
                    <td>{c.email ?? "—"}</td>
                    <td>{c.visitCount}</td>
                    <td>
                      <AdminBadge>{c.status}</AdminBadge>
                    </td>
                    <td>
                      <AdminButton variant="secondary" onClick={() => openCustomer(c.id)}>
                        Open
                      </AdminButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!customers.length && <p className="py-6 text-sm text-admin-muted">No customers yet — apply migration 045 and run guest chats.</p>}
          </div>
        </div>
      )}

      {(tab === "details" || tab === "loyalty" || tab === "settings") && detail && (
        <div className="space-y-4">
          <AdminCard>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{selectedName}</h3>
                <p className="text-sm text-admin-muted">
                  {detail.phone ?? "—"} · {detail.email ?? "—"} · {detail.visitCount} visits · LTV {detail.lifetimeValue}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <AdminBadge>{detail.status}</AdminBadge>
                  {detail.isVip && <AdminBadge variant="warning">VIP</AdminBadge>}
                  {detail.marketingConsent && <AdminBadge variant="info">Marketing OK</AdminBadge>}
                  {detail.aiPersonalizationConsent && <AdminBadge variant="success">AI Memory OK</AdminBadge>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <AdminButton
                  variant="secondary"
                  onClick={() =>
                    void exportCustomerData(detail.id).then((data) => {
                      if (!data) return;
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `crm-${detail.id}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      showToast("Export ready.");
                    })
                  }
                >
                  Export Data
                </AdminButton>
                <AdminButton
                  variant="secondary"
                  onClick={() =>
                    void requestCustomerDeletion(detail.id).then((ok) => {
                      showToast(ok ? "Deletion processed." : "Deletion failed.", ok ? "success" : "error");
                      void refreshList();
                    })
                  }
                >
                  Privacy Delete
                </AdminButton>
              </div>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-3 text-sm">
              <div>DOB: {detail.dateOfBirth ?? "—"}</div>
              <div>Anniversary: {detail.anniversary ?? "—"}</div>
              <div>Last visit: {detail.lastVisit ?? "—"}</div>
              <div>Language: {detail.preferredLanguage}</div>
              <div>City: {detail.city ?? "—"}</div>
              <div>Created: {detail.createdAt.slice(0, 10)}</div>
            </div>
          </AdminCard>
          {tab === "settings" && (
            <AdminCard>
              <strong className="text-sm">Merge duplicate</strong>
              <p className="mt-1 text-xs text-admin-muted">Merge another customer ID into this profile.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <AdminInput label="Duplicate customer ID" value={mergeId} onChange={(e) => setMergeId(e.target.value)} />
                <div className="flex items-end">
                  <AdminButton
                    onClick={() =>
                      void mergeCustomers(detail.id, mergeId.trim()).then((ok) => {
                        showToast(ok ? "Merged." : "Merge failed.", ok ? "success" : "error");
                        void refreshList();
                      })
                    }
                  >
                    Merge
                  </AdminButton>
                </div>
              </div>
            </AdminCard>
          )}
        </div>
      )}

      {tab === "timeline" && (
        <AdminCard>
          <strong className="text-sm">Timeline — {selectedName}</strong>
          <ul className="mt-3 max-h-[28rem] space-y-2 overflow-auto text-sm">
            {timeline.map((e) => (
              <li key={e.id} className="border-b border-admin-border/20 pb-2">
                <div className="flex flex-wrap gap-2">
                  <AdminBadge variant="outline">{e.eventType}</AdminBadge>
                  <span className="text-xs text-admin-muted">{e.occurredAt}</span>
                </div>
                <p className="font-medium">{e.title}</p>
                <p className="text-admin-muted">{e.summary}</p>
              </li>
            ))}
            {!timeline.length && <li className="text-admin-muted">Select a customer to view timeline.</li>}
          </ul>
        </AdminCard>
      )}

      {tab === "preferences" && (
        <div className="grid gap-3 md:grid-cols-2">
          {prefs.map((p) => (
            <AdminCard key={p.key} padding="sm">
              <strong className="text-sm">{p.key}</strong>
              <p className="text-sm">{p.value}</p>
              <p className="text-xs text-admin-muted">
                confidence {p.confidence} · {p.source}
              </p>
            </AdminCard>
          ))}
          {!prefs.length && <p className="text-sm text-admin-muted">No preferences stored.</p>}
        </div>
      )}

      {(tab === "visits" || tab === "reservations") && (
        <AdminCard>
          <strong className="text-sm">{tab === "visits" ? "Visit history" : "Reservation-linked visits"}</strong>
          <ul className="mt-3 space-y-2 text-sm">
            {visits
              .filter((v) => (tab === "reservations" ? Boolean(v.reservationId) : true))
              .map((v) => (
                <li key={v.id}>
                  {v.visitDate} {v.visitTime ?? ""} · {v.visitType} · party {v.partySize ?? "—"} · {v.status}
                  {v.reservationId && <span className="text-xs text-admin-muted"> · res {v.reservationId.slice(0, 8)}</span>}
                </li>
              ))}
            {!visits.length && <li className="text-admin-muted">No visits yet.</li>}
          </ul>
        </AdminCard>
      )}

      {tab === "memory" && (
        <div className="space-y-3">
          {memory.map((m) => (
            <AdminCard key={m.key} padding="sm">
              <strong className="text-sm">{m.key}</strong>
              <pre className="mt-1 text-xs whitespace-pre-wrap">{JSON.stringify(m.value, null, 2)}</pre>
              <p className="text-xs text-admin-muted">
                confidence {m.confidence} · {m.source}
              </p>
            </AdminCard>
          ))}
          {!memory.length && <p className="text-sm text-admin-muted">No AI memory yet.</p>}
        </div>
      )}

      {tab === "loyalty" && detail && (
        <AdminCard>
          <p className="text-sm">Loyalty is managed automatically from visits and rewards.</p>
          <p className="mt-2 text-sm text-admin-muted">Open Customer Details after selecting a guest to see VIP / LTV signals.</p>
        </AdminCard>
      )}

      {tab === "segments" && (
        <div className="flex flex-wrap gap-2">
          {segments.map((s) => (
            <AdminBadge key={s} variant="info">
              {s}
            </AdminBadge>
          ))}
          {!segments.length && <p className="text-sm text-admin-muted">No segments assigned.</p>}
        </div>
      )}

      {tab === "notes" && detail && (
        <div className="space-y-3">
          <AdminTextarea label="Add note" value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={3} />
          <AdminButton
            onClick={() =>
              void addNote(detail.id, noteText).then(() => {
                setNoteText("");
                showToast("Note saved.");
                setSelectedId(detail.id);
              })
            }
          >
            Save Note
          </AdminButton>
          <ul className="space-y-2 text-sm">
            {(notes as Array<Record<string, unknown>>).map((n) => (
              <li key={String(n.id)} className="rounded border border-admin-border/30 p-2">
                {String(n.note)}
                <div className="text-xs text-admin-muted">{String(n.created_at)}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "communications" && (
        <ul className="space-y-2 text-sm">
          {comms.map((c) => (
            <li key={c.id} className="rounded border border-admin-border/30 p-2">
              <AdminBadge variant="outline">{c.channel}</AdminBadge> {c.summary ?? c.body?.slice(0, 120)}
              <div className="text-xs text-admin-muted">{c.createdAt}</div>
            </li>
          ))}
          {!comms.length && <li className="text-admin-muted">No communications logged.</li>}
        </ul>
      )}

      {tab === "analytics" && dash && (
        <div className="space-y-4">
          <div className="kb-metric-grid">
            <Metric label="Customers" value={dash.totalCustomers} />
            <Metric label="Retention proxy" value={`${dash.returningCustomers}`} />
            <Metric label="VIP" value={dash.vipCount} />
            <Metric label="Avg LTV" value={dash.averageLifetimeValue} />
          </div>
          {dash.segmentCounts.length > 0 && <AdminChart title="Segment Mix" data={dash.segmentCounts} />}
          {dash.loyaltyDistribution.length > 0 && (
            <AdminChart title="Loyalty Tiers" data={dash.loyaltyDistribution} />
          )}
        </div>
      )}

      {!detail && ["details", "timeline", "preferences", "visits", "memory", "notes", "communications"].includes(tab) && (
        <p className="text-sm text-admin-muted">Select a customer from the Customers tab first.</p>
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
