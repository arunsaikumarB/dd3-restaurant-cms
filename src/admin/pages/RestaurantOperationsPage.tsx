import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CalendarDays,
  LayoutGrid,
  Clock,
  ListOrdered,
  Settings2,
  Bell,
  BarChart3,
  Table2,
  SlidersHorizontal,
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
  assignTable,
  getAvailability,
  getReservationAnalytics,
  getSettings,
  listNotifications,
  listReservationsForDate,
  listRules,
  listTables,
  listWaitlist,
  notifyWaitlistAvailable,
  runReservationEngine,
  saveSettings,
  updateTablePositions,
  updateTableStatus,
  upsertRule,
  type RestaurantTable,
  type ReservationRecord,
  type WaitlistEntry,
} from "../../services/restaurantOperations";
import { fetchReservations, type ReservationTableRow } from "../../services/reservations";
import "../admin.css";

type TabId =
  | "dashboard"
  | "reservations"
  | "tables"
  | "availability"
  | "calendar"
  | "waitlist"
  | "rules"
  | "slots"
  | "notifications"
  | "analytics"
  | "settings";

const TABS: Array<{ id: TabId; label: string; icon: typeof CalendarDays }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { id: "reservations", label: "Reservations", icon: CalendarDays },
  { id: "tables", label: "Tables", icon: Table2 },
  { id: "availability", label: "Availability", icon: Clock },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "waitlist", label: "Waitlist", icon: ListOrdered },
  { id: "rules", label: "Rules", icon: SlidersHorizontal },
  { id: "slots", label: "Time Slots", icon: Clock },
  { id: "notifications", label: "Notifications", icon: Bell },
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

export default function RestaurantOperationsPage() {
  const { locationId, isAllLocations } = useLocation();
  const outlet = (isAllLocations ? DEFAULT_PUBLIC_LOCATION_ID : locationId) as LocationId;
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as TabId) || "dashboard";
  const setTab = (id: TabId) => setParams({ tab: id });

  const [toast, setToast] = useState<{ open: boolean; message: string; variant: "success" | "error" }>({
    open: false,
    message: "",
    variant: "success",
  });
  const [analytics, setAnalytics] = useState<Awaited<ReturnType<typeof getReservationAnalytics>> | null>(null);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [reservations, setReservations] = useState<ReservationTableRow[]>([]);
  const [dayReservations, setDayReservations] = useState<ReservationRecord[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<Awaited<ReturnType<typeof getAvailability>>>([]);
  const [rules, setRules] = useState<Awaited<ReturnType<typeof listRules>>>([]);
  const [settings, setSettings] = useState<Awaited<ReturnType<typeof getSettings>> | null>(null);
  const [notifications, setNotifications] = useState<unknown[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    customerName: "",
    phone: "",
    email: "",
    date: new Date().toISOString().slice(0, 10),
    time: "19:00",
    guests: 2,
    specialRequests: "",
  });
  const [calendarView, setCalendarView] = useState<"day" | "week" | "month">("day");

  const showToast = (message: string, variant: "success" | "error" = "success") =>
    setToast({ open: true, message, variant });

  const refresh = useCallback(async () => {
    const [a, t, w, r, s, n, day] = await Promise.all([
      getReservationAnalytics(outlet),
      listTables(outlet),
      listWaitlist(outlet),
      fetchReservations(outlet).catch(() => [] as ReservationTableRow[]),
      getSettings(outlet),
      listNotifications(outlet),
      listReservationsForDate(outlet, date),
    ]);
    setAnalytics(a);
    setTables(t);
    setWaitlist(w);
    setReservations(r);
    setSettings(s);
    setNotifications(n);
    setDayReservations(day);
    setRules(await listRules(outlet));
    setSlots(await getAvailability({ locationId: outlet, date }));
  }, [outlet, date]);

  useEffect(() => {
    void refresh();
  }, [refresh, tab]);

  const weekDates = useMemo(() => {
    const base = new Date(`${date}T00:00:00`);
    const day = base.getDay();
    const start = new Date(base);
    start.setDate(base.getDate() - day);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }, [date]);

  const onTableDrop = async (e: React.DragEvent, tableId: string) => {
    e.preventDefault();
    const reservationId = e.dataTransfer.getData("text/reservation-id") || dragId;
    if (!reservationId) return;
    const ok = await assignTable(reservationId, tableId);
    showToast(ok ? "Table assigned." : "Assignment failed.", ok ? "success" : "error");
    void refresh();
  };

  const moveTable = async (id: string, posX: number, posY: number) => {
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, posX, posY } : t)));
    await updateTablePositions([{ id, posX, posY }]);
  };

  const createReservation = async () => {
    const res = await runReservationEngine({
      action: "create",
      locationId: outlet,
      fields: {
        locationId: outlet,
        ...createForm,
        source: "admin",
      },
    });
    showToast(res.message, res.ok ? "success" : "error");
    if (res.ok) void refresh();
  };

  return (
    <div className="ai-concierge-page">
      <AdminBreadcrumbs
        items={[
          { label: "Mission Control", path: "/admin/operations" },
          { label: "Reservations", path: "/admin/operations/reservations" },
          { label: TABS.find((t) => t.id === tab)?.label ?? "Dashboard" },
        ]}
      />
      <PageHeader
        title="Restaurant Operations"
        description="Single reservation engine for AI, staff, and future Voice / Mobile — tables, availability, waitlist, and analytics."
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

      {tab === "dashboard" && analytics && (
        <div className="space-y-4">
          <div className="kb-metric-grid">
            <Metric label="Today" value={analytics.todaysCount} />
            <Metric label="Upcoming" value={analytics.upcomingCount} />
            <Metric label="No-shows" value={analytics.noShows} />
            <Metric label="Avg Party" value={analytics.avgPartySize} />
            <Metric label="Occupancy" value={`${analytics.occupancyEstimate}%`} />
            <Metric label="Cancel Rate" value={`${analytics.cancellationRate}%`} />
            <Metric label="Table Util." value={`${analytics.tableUtilization}%`} />
            <Metric label="Waitlist" value={waitlist.length} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <AdminCard>
              <strong className="text-sm">Today's Timeline</strong>
              <ul className="mt-3 max-h-72 space-y-2 overflow-auto text-sm">
                {dayReservations.map((r) => (
                  <li key={r.id} className="flex justify-between gap-2 border-b border-admin-border/30 pb-2">
                    <span>
                      {r.time} · {r.customerName} · {r.guests} guests
                    </span>
                    <AdminBadge variant={r.status === "confirmed" ? "success" : "default"}>{r.status}</AdminBadge>
                  </li>
                ))}
                {!dayReservations.length && <li className="text-admin-muted">No reservations today.</li>}
              </ul>
            </AdminCard>
            <AdminCard>
              <strong className="text-sm">Quick Create</strong>
              <div className="mt-3 grid gap-2">
                <AdminInput label="Name" value={createForm.customerName} onChange={(e) => setCreateForm({ ...createForm, customerName: e.target.value })} />
                <AdminInput label="Phone" value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} />
                <AdminInput label="Date" type="date" value={createForm.date} onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })} />
                <AdminInput label="Time" type="time" value={createForm.time} onChange={(e) => setCreateForm({ ...createForm, time: e.target.value })} />
                <AdminInput label="Guests" type="number" value={createForm.guests} onChange={(e) => setCreateForm({ ...createForm, guests: Number(e.target.value) })} />
                <AdminButton onClick={() => void createReservation()}>Create Reservation</AdminButton>
              </div>
            </AdminCard>
          </div>
        </div>
      )}

      {tab === "reservations" && (
        <AdminCard>
          <div className="mb-3 flex flex-wrap items-end gap-2">
            <AdminInput label="Filter date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="overflow-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-admin-border/40 text-xs text-admin-muted">
                  <th className="py-2">Guest</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Guests</th>
                  <th>Status</th>
                  <th>Code</th>
                  <th>Assign</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-admin-border/20"
                    draggable
                    onDragStart={(e) => {
                      setDragId(r.id);
                      e.dataTransfer.setData("text/reservation-id", r.id);
                    }}
                  >
                    <td className="py-2">
                      <div className="font-medium">{r.customer_name}</div>
                      <div className="text-xs text-admin-muted">{r.phone}</div>
                    </td>
                    <td>{r.date}</td>
                    <td>{r.time}</td>
                    <td>{r.guests}</td>
                    <td>
                      <AdminBadge>{r.status}</AdminBadge>
                    </td>
                    <td className="text-xs">{(r as ReservationTableRow & { confirmation_code?: string }).confirmation_code ?? "—"}</td>
                    <td>
                      <span className="text-xs text-admin-muted">Drag onto a table</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!reservations.length && <p className="py-6 text-sm text-admin-muted">No reservations for this outlet.</p>}
          </div>
        </AdminCard>
      )}

      {tab === "tables" && (
        <div className="space-y-4">
          <p className="text-sm text-admin-muted">
            Drag reservations from the Reservations tab onto a table. Drag table cards to rearrange the floor plan.
          </p>
          <div className="relative min-h-[420px] rounded-xl border border-admin-border/40 bg-[radial-gradient(circle_at_20%_20%,rgba(237,60,24,0.06),transparent_40%),linear-gradient(180deg,rgba(0,0,0,0.02),transparent)] p-4">
            {tables.map((t) => (
              <div
                key={t.id}
                className="absolute w-28 cursor-grab rounded-lg border border-admin-border/50 bg-white/90 p-2 shadow-sm dark:bg-black/40"
                style={{ left: `${t.posX}%`, top: `${t.posY}%`, transform: "translate(-50%, -50%)" }}
                draggable
                onDragStart={() => setDragId(t.id)}
                onDragEnd={(e) => {
                  const parent = (e.target as HTMLElement).parentElement;
                  if (!parent) return;
                  const rect = parent.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                  const y = ((e.clientY - rect.top) / rect.height) * 100;
                  void moveTable(t.id, Math.max(5, Math.min(95, x)), Math.max(5, Math.min(95, y)));
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => void onTableDrop(e, t.id)}
              >
                <div className="flex items-center justify-between gap-1">
                  <strong className="text-sm">{t.tableNumber}</strong>
                  <AdminBadge
                    variant={
                      t.status === "available" ? "success" : t.status === "maintenance" ? "danger" : "warning"
                    }
                  >
                    {t.status}
                  </AdminBadge>
                </div>
                <p className="text-xs text-admin-muted">{t.capacity} seats</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {t.booth && <AdminBadge variant="outline">Booth</AdminBadge>}
                  {t.windowSeat && <AdminBadge variant="outline">Window</AdminBadge>}
                  {t.vip && <AdminBadge variant="outline">VIP</AdminBadge>}
                  {t.outdoor && <AdminBadge variant="outline">Outdoor</AdminBadge>}
                </div>
                <AdminSelect
                  value={t.status}
                  onChange={(v) => void updateTableStatus(t.id, v as RestaurantTable["status"]).then(refresh)}
                  options={[
                    { value: "available", label: "Available" },
                    { value: "occupied", label: "Occupied" },
                    { value: "reserved", label: "Reserved" },
                    { value: "cleaning", label: "Cleaning" },
                    { value: "maintenance", label: "Maintenance" },
                  ]}
                />
              </div>
            ))}
            {!tables.length && (
              <p className="text-sm text-admin-muted">No tables yet — apply migration 044 to seed floor plans.</p>
            )}
          </div>
        </div>
      )}

      {tab === "availability" && (
        <div className="space-y-4">
          <AdminInput label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {slots.map((s) => (
              <AdminCard key={s.time} padding="sm">
                <div className="flex items-center justify-between">
                  <strong>{s.time}</strong>
                  <AdminBadge variant={s.available ? "success" : "danger"}>
                    {s.available ? "Open" : "Full"}
                  </AdminBadge>
                </div>
                <p className="mt-1 text-xs text-admin-muted">
                  {s.remainingCovers} covers left{s.reason ? ` · ${s.reason}` : ""}
                </p>
              </AdminCard>
            ))}
          </div>
        </div>
      )}

      {tab === "calendar" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <AdminSelect
              value={calendarView}
              onChange={(v) => setCalendarView(v as typeof calendarView)}
              options={[
                { value: "day", label: "Day" },
                { value: "week", label: "Week" },
                { value: "month", label: "Month" },
              ]}
            />
            <AdminInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          {calendarView === "day" && (
            <AdminCard>
              <strong className="text-sm">Day timeline — {date}</strong>
              <ul className="mt-3 space-y-2 text-sm">
                {dayReservations.map((r) => (
                  <li key={r.id}>
                    {r.time} · {r.customerName} · {r.guests} · {r.status}
                  </li>
                ))}
                {!dayReservations.length && <li className="text-admin-muted">No bookings</li>}
              </ul>
            </AdminCard>
          )}
          {calendarView === "week" && (
            <div className="grid gap-2 md:grid-cols-7">
              {weekDates.map((d) => (
                <AdminCard key={d} padding="sm">
                  <button type="button" className="text-xs font-semibold" onClick={() => setDate(d)}>
                    {d.slice(5)}
                  </button>
                  <p className="mt-2 text-xs text-admin-muted">
                    {reservations.filter((r) => r.date === d).length} bookings
                  </p>
                </AdminCard>
              ))}
            </div>
          )}
          {calendarView === "month" && (
            <AdminCard>
              <p className="text-sm text-admin-muted">
                Month overview uses reservation counts for the selected outlet. Select a week day card for detail.
              </p>
              <p className="mt-2 text-sm">
                Total upcoming listed: {reservations.filter((r) => r.date >= date).length}
              </p>
            </AdminCard>
          )}
        </div>
      )}

      {tab === "waitlist" && (
        <div className="space-y-3">
          {waitlist.map((w) => (
            <AdminCard key={w.id} padding="sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <strong>#{w.queuePosition} {w.guestName}</strong>
                  <p className="text-xs text-admin-muted">
                    {w.partySize} guests · {w.phone} · ~{w.estimatedWaitMinutes ?? 15} min
                  </p>
                </div>
                <AdminButton
                  variant="secondary"
                  onClick={() => void notifyWaitlistAvailable(w.id, outlet).then(refresh)}
                >
                  Notify Available
                </AdminButton>
              </div>
            </AdminCard>
          ))}
          {!waitlist.length && <p className="text-sm text-admin-muted">Waitlist empty.</p>}
        </div>
      )}

      {tab === "rules" && (
        <div className="space-y-3">
          {rules.map((r) => (
            <AdminCard key={r.key} padding="sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-sm">{r.key}</strong>
                <AdminBadge variant={r.enabled ? "success" : "default"}>{r.enabled ? "On" : "Off"}</AdminBadge>
              </div>
              <pre className="mt-2 text-xs whitespace-pre-wrap">{JSON.stringify(r.value, null, 2)}</pre>
              <AdminButton
                className="mt-2"
                variant="secondary"
                onClick={() => void upsertRule(outlet, r.key, r.value, !r.enabled).then(refresh)}
              >
                Toggle
              </AdminButton>
            </AdminCard>
          ))}
          {!rules.length && <p className="text-sm text-admin-muted">No rules — apply migration 044.</p>}
        </div>
      )}

      {tab === "slots" && (
        <AdminCard>
          <strong className="text-sm">Configured time slots (from availability engine)</strong>
          <div className="mt-3 flex flex-wrap gap-2">
            {slots.map((s) => (
              <AdminBadge key={s.time} variant={s.available ? "success" : "outline"}>
                {s.time}
              </AdminBadge>
            ))}
          </div>
        </AdminCard>
      )}

      {tab === "notifications" && (
        <div className="space-y-2">
          <p className="text-xs text-admin-muted">
            Abstraction only — email/SMS/WhatsApp/Push providers are not connected yet. Events are queued.
          </p>
          {(notifications as Array<Record<string, unknown>>).map((n) => (
            <AdminCard key={String(n.id)} padding="sm">
              <div className="flex flex-wrap gap-2 text-sm">
                <AdminBadge>{String(n.event_type)}</AdminBadge>
                <AdminBadge variant="outline">{String(n.channel)}</AdminBadge>
                <AdminBadge variant="info">{String(n.status)}</AdminBadge>
                <span className="text-xs text-admin-muted">{String(n.created_at)}</span>
              </div>
            </AdminCard>
          ))}
          {!notifications.length && <p className="text-sm text-admin-muted">No queued notifications.</p>}
        </div>
      )}

      {tab === "analytics" && analytics && (
        <div className="space-y-4">
          <div className="kb-metric-grid">
            <Metric label="Today" value={analytics.todaysCount} />
            <Metric label="Upcoming" value={analytics.upcomingCount} />
            <Metric label="No-shows" value={analytics.noShows} />
            <Metric label="Avg Party" value={analytics.avgPartySize} />
            <Metric label="Occupancy" value={`${analytics.occupancyEstimate}%`} />
            <Metric label="Cancellations" value={`${analytics.cancellationRate}%`} />
            <Metric label="Table Util." value={`${analytics.tableUtilization}%`} />
          </div>
          {analytics.peakHours.length > 0 && <AdminChart title="Peak Hours (Today)" data={analytics.peakHours} />}
          {analytics.sources.length > 0 && <AdminChart title="Reservation Sources" data={analytics.sources} />}
        </div>
      )}

      {tab === "settings" && settings && (
        <AdminCard>
          <div className="grid gap-3 md:grid-cols-2">
            <AdminInput
              label="Max guests"
              type="number"
              value={settings.maxGuests}
              onChange={(e) => setSettings({ ...settings, maxGuests: Number(e.target.value) })}
            />
            <AdminInput
              label="Min guests"
              type="number"
              value={settings.minGuests}
              onChange={(e) => setSettings({ ...settings, minGuests: Number(e.target.value) })}
            />
            <AdminInput
              label="Advance booking days"
              type="number"
              value={settings.advanceBookingDays}
              onChange={(e) => setSettings({ ...settings, advanceBookingDays: Number(e.target.value) })}
            />
            <AdminInput
              label="Default duration (min)"
              type="number"
              value={settings.defaultDurationMinutes}
              onChange={(e) => setSettings({ ...settings, defaultDurationMinutes: Number(e.target.value) })}
            />
            <AdminInput
              label="Buffer (min)"
              type="number"
              value={settings.bufferMinutes}
              onChange={(e) => setSettings({ ...settings, bufferMinutes: Number(e.target.value) })}
            />
            <AdminTextarea
              label="Blocked dates (YYYY-MM-DD, comma-separated)"
              value={settings.blockedDates.join(", ")}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  blockedDates: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
          <AdminButton
            className="mt-4"
            onClick={() =>
              void saveSettings(outlet, settings).then(() => {
                showToast("Settings saved.");
                void refresh();
              })
            }
          >
            Save Settings
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
