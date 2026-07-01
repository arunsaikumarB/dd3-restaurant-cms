import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import AdminBreadcrumbs from "../components/shared/Breadcrumbs";
import AdminCard from "../components/ui/Card";
import AdminBadge from "../components/ui/Badge";
import AdminButton from "../components/ui/Button";
import { useAdminTheme } from "../context/AdminThemeContext";
import { useLocation } from "../hooks/useLocation";
import {
  getLocationConfig,
  LOCATION_IDS,
  type LocationId,
} from "../../config/locations";
import {
  fetchAnalyticsDevices,
  fetchAnalyticsOfferDaily,
  fetchAnalyticsOfferPerformance,
  fetchAnalyticsReferrers,
  fetchAnalyticsSummary,
  fetchAnalyticsViewsByDay,
  fetchAnalyticsViewsByPage,
  getPreviousPeriod,
  percentChange,
  type AnalyticsDayRow,
  type AnalyticsDeviceRow,
  type AnalyticsOfferDayRow,
  type AnalyticsOfferRow,
  type AnalyticsPageRow,
  type AnalyticsReferrerRow,
  type AnalyticsSummary,
} from "../../services/analyticsAdmin";

type DatePreset = "today" | "7d" | "30d" | "90d" | "custom";

type SummaryCard = {
  id: string;
  label: string;
  value: number;
  delta: number | null;
  suffix?: string;
};

const DEVICE_COLORS = ["#ED3C18", "#C97A2B", "#2B1D18"];

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function resolvePresetRange(preset: DatePreset, customFrom: string, customTo: string): { from: Date; to: Date } {
  const to = endOfDay(new Date());
  const from = startOfDay(new Date());

  if (preset === "today") {
    return { from, to };
  }

  if (preset === "custom" && customFrom && customTo) {
    return { from: startOfDay(new Date(customFrom)), to: endOfDay(new Date(customTo)) };
  }

  const days = preset === "7d" ? 6 : preset === "30d" ? 29 : 89;
  from.setDate(from.getDate() - days);
  return { from, to };
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function formatDelta(delta: number | null): { label: string; trend: "up" | "down" | "neutral" } {
  if (delta == null) return { label: "No prior data", trend: "neutral" };
  const rounded = Math.abs(delta).toFixed(1);
  if (delta > 0) return { label: `+${rounded}% vs prior period`, trend: "up" };
  if (delta < 0) return { label: `-${rounded}% vs prior period`, trend: "down" };
  return { label: "No change vs prior period", trend: "neutral" };
}

function SummaryStatCard({ card }: { card: SummaryCard }) {
  const { dark } = useAdminTheme();
  const delta = formatDelta(card.delta);
  const TrendIcon = delta.trend === "down" ? TrendingDown : TrendingUp;

  return (
    <AdminCard className="group hover:shadow-admin-lg transition-shadow duration-300">
      <div className="flex items-start justify-between">
        <div
          className={[
            "flex h-11 w-11 items-center justify-center rounded-xl",
            dark ? "bg-admin-primary/20 text-admin-gold" : "bg-admin-primary/10 text-admin-primary",
          ].join(" ")}
        >
          <BarChart3 size={20} />
        </div>
        <span
          className={[
            "inline-flex items-center gap-1 text-xs font-medium",
            delta.trend === "up"
              ? "text-admin-success"
              : delta.trend === "down"
                ? "text-admin-danger"
                : dark
                  ? "text-white/50"
                  : "text-admin-muted",
          ].join(" ")}
        >
          {delta.trend !== "neutral" && <TrendIcon size={12} />}
          {delta.label}
        </span>
      </div>
      <p className={`mt-4 text-sm ${dark ? "text-white/50" : "text-admin-muted"}`}>{card.label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">
        {formatNumber(card.value)}
        {card.suffix ? (
          <span className={`ml-2 text-base font-medium ${dark ? "text-white/50" : "text-admin-muted"}`}>
            {card.suffix}
          </span>
        ) : null}
      </p>
    </AdminCard>
  );
}

function buildSummaryCards(current: AnalyticsSummary, previous: AnalyticsSummary): SummaryCard[] {
  const conversion =
    current.offers_page_views > 0
      ? `${((current.offer_clicks / current.offers_page_views) * 100).toFixed(1)}%`
      : "0%";

  return [
    {
      id: "page-views",
      label: "Total Page Views",
      value: current.total_page_views,
      delta: percentChange(current.total_page_views, previous.total_page_views),
    },
    {
      id: "sessions",
      label: "Unique Visitors",
      value: current.unique_sessions,
      delta: percentChange(current.unique_sessions, previous.unique_sessions),
    },
    {
      id: "offers-page",
      label: "Offers Page Views",
      value: current.offers_page_views,
      delta: percentChange(current.offers_page_views, previous.offers_page_views),
    },
    {
      id: "offer-clicks",
      label: "Offer Clicks",
      value: current.offer_clicks,
      delta: percentChange(current.offer_clicks, previous.offer_clicks),
      suffix: conversion,
    },
    {
      id: "order-clicks",
      label: "Order Now Clicks",
      value: current.order_clicks,
      delta: percentChange(current.order_clicks, previous.order_clicks),
    },
    {
      id: "reservation-clicks",
      label: "Reservation Clicks",
      value: current.reservation_clicks,
      delta: percentChange(current.reservation_clicks, previous.reservation_clicks),
    },
  ];
}

function formatCtr(views: number, clicks: number): string {
  if (views === 0) return "—";
  return `${((clicks / views) * 100).toFixed(1)}%`;
}

function OfferPerformanceTable({
  rows,
  locationId,
  from,
  to,
}: {
  rows: AnalyticsOfferRow[];
  locationId: LocationId;
  from: Date;
  to: Date;
}) {
  const { dark } = useAdminTheme();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dailyByOffer, setDailyByOffer] = useState<Record<string, AnalyticsOfferDayRow[]>>({});
  const [loadingOfferId, setLoadingOfferId] = useState<string | null>(null);

  useEffect(() => {
    setExpandedId(null);
    setDailyByOffer({});
  }, [locationId, from.getTime(), to.getTime()]);

  if (rows.length === 0) {
    return (
      <p className={`py-6 text-sm ${dark ? "text-white/50" : "text-admin-muted"}`}>
        No offers created for this location yet.
      </p>
    );
  }

  const toggleRow = async (offerId: string) => {
    if (expandedId === offerId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(offerId);
    if (dailyByOffer[offerId]) return;

    setLoadingOfferId(offerId);
    try {
      const daily = await fetchAnalyticsOfferDaily(offerId, locationId, from, to);
      setDailyByOffer((prev) => ({ ...prev, [offerId]: daily }));
    } finally {
      setLoadingOfferId(null);
    }
  };

  return (
    <table className="min-w-full text-left text-sm">
      <thead className={dark ? "text-white/50" : "text-admin-muted"}>
        <tr>
          <th className="pb-3 pr-4 font-medium w-8" aria-hidden />
          <th className="pb-3 pr-4 font-medium">Offer</th>
          <th className="pb-3 pr-4 font-medium">Views</th>
          <th className="pb-3 pr-4 font-medium">Clicks</th>
          <th className="pb-3 font-medium">CTR %</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const expanded = expandedId === row.offer_id;
          const daily = dailyByOffer[row.offer_id] ?? [];
          const chartData = daily.map((entry) => ({
            day: new Date(entry.day).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
            views: entry.views,
            clicks: entry.clicks,
          }));
          const bestDay = daily.reduce<AnalyticsOfferDayRow | null>((best, entry) => {
            if (!best || entry.views > best.views) return entry;
            return best;
          }, null);

          return (
            <Fragment key={row.offer_id}>
              <tr
                key={row.offer_id}
                className={[
                  dark ? "border-t border-white/10" : "border-t border-admin-border",
                  "cursor-pointer",
                ].join(" ")}
                onClick={() => void toggleRow(row.offer_id)}
              >
                <td className="py-3 pr-2">
                  {expanded ? (
                    <ChevronDown size={16} className={dark ? "text-white/50" : "text-admin-muted"} />
                  ) : (
                    <ChevronRight size={16} className={dark ? "text-white/50" : "text-admin-muted"} />
                  )}
                </td>
                <td className="py-3 pr-4 font-medium">{row.offer_title}</td>
                <td className="py-3 pr-4">{formatNumber(row.views)}</td>
                <td className="py-3 pr-4">{formatNumber(row.clicks)}</td>
                <td className="py-3">{formatCtr(row.views, row.clicks)}</td>
              </tr>
              {expanded ? (
                <tr key={`${row.offer_id}-detail`} className={dark ? "border-t border-white/5" : "border-t border-admin-border/60"}>
                  <td colSpan={5} className="pb-4 pt-2">
                    {loadingOfferId === row.offer_id ? (
                      <p className={`text-sm ${dark ? "text-white/50" : "text-admin-muted"}`}>Loading daily breakdown…</p>
                    ) : (
                      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
                        <div className="h-48">
                          {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke={dark ? "rgba(255,255,255,0.08)" : "rgba(43,29,24,0.08)"} />
                                <XAxis dataKey="day" stroke={dark ? "rgba(255,255,255,0.45)" : "rgba(43,29,24,0.45)"} />
                                <YAxis stroke={dark ? "rgba(255,255,255,0.45)" : "rgba(43,29,24,0.45)"} />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="views" stroke="#ED3C18" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="clicks" stroke="#C97A2B" strokeWidth={2} dot={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          ) : (
                            <p className={`flex h-full items-center justify-center text-sm ${dark ? "text-white/50" : "text-admin-muted"}`}>
                              No daily activity in this period.
                            </p>
                          )}
                        </div>
                        <dl className={`grid gap-3 text-sm ${dark ? "text-white/70" : "text-admin-muted"}`}>
                          <div>
                            <dt className="text-[10px] uppercase tracking-wide">Total views</dt>
                            <dd className="mt-1 font-medium text-inherit">{formatNumber(row.views)}</dd>
                          </div>
                          <div>
                            <dt className="text-[10px] uppercase tracking-wide">Total clicks</dt>
                            <dd className="mt-1 font-medium text-inherit">{formatNumber(row.clicks)}</dd>
                          </div>
                          <div>
                            <dt className="text-[10px] uppercase tracking-wide">CTR</dt>
                            <dd className="mt-1 font-medium text-inherit">{formatCtr(row.views, row.clicks)}</dd>
                          </div>
                          <div>
                            <dt className="text-[10px] uppercase tracking-wide">Best day</dt>
                            <dd className="mt-1 font-medium text-inherit">
                              {bestDay
                                ? `${new Date(bestDay.day).toLocaleDateString(undefined, { month: "short", day: "numeric" })} (${formatNumber(bestDay.views)} views)`
                                : "—"}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    )}
                  </td>
                </tr>
              ) : null}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

export default function InsightsPage() {
  const { dark } = useAdminTheme();
  const { scope, locationId, isAllLocations, currentLocation } = useLocation();
  const [preset, setPreset] = useState<DatePreset>("7d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [summaryCards, setSummaryCards] = useState<SummaryCard[]>([]);
  const [comparisonRows, setComparisonRows] = useState<
    { locationId: LocationId; name: string; summary: AnalyticsSummary }[]
  >([]);
  const [dayRows, setDayRows] = useState<AnalyticsDayRow[]>([]);
  const [pageRows, setPageRows] = useState<AnalyticsPageRow[]>([]);
  const [offerRows, setOfferRows] = useState<AnalyticsOfferRow[]>([]);
  const [deviceRows, setDeviceRows] = useState<AnalyticsDeviceRow[]>([]);
  const [referrerRows, setReferrerRows] = useState<AnalyticsReferrerRow[]>([]);

  const range = useMemo(
    () => resolvePresetRange(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  );

  const loadInsights = useCallback(async () => {
    setLoading(true);
    try {
      const previous = getPreviousPeriod(range.from, range.to);

      if (isAllLocations) {
        const rows = await Promise.all(
          LOCATION_IDS.map(async (id) => ({
            locationId: id,
            name: getLocationConfig(id).name,
            summary: await fetchAnalyticsSummary(id, range.from, range.to),
          })),
        );
        setComparisonRows(rows);
        setSummaryCards([]);
        setDayRows([]);
        setPageRows([]);
        setOfferRows([]);
        setDeviceRows([]);
        setReferrerRows([]);
        return;
      }

      const [
        currentSummary,
        previousSummary,
        days,
        pages,
        offers,
        devices,
        referrers,
      ] = await Promise.all([
        fetchAnalyticsSummary(locationId, range.from, range.to),
        fetchAnalyticsSummary(locationId, previous.from, previous.to),
        fetchAnalyticsViewsByDay(locationId, range.from, range.to),
        fetchAnalyticsViewsByPage(locationId, range.from, range.to),
        fetchAnalyticsOfferPerformance(locationId, range.from, range.to),
        fetchAnalyticsDevices(locationId, range.from, range.to),
        fetchAnalyticsReferrers(locationId, range.from, range.to),
      ]);

      setComparisonRows([]);
      setSummaryCards(buildSummaryCards(currentSummary, previousSummary));
      setDayRows(days);
      setPageRows(pages.slice(0, 10));
      setOfferRows(offers);
      setDeviceRows(devices);
      setReferrerRows(referrers);
    } finally {
      setLoading(false);
    }
  }, [isAllLocations, locationId, range.from, range.to]);

  useEffect(() => {
    void loadInsights();
  }, [loadInsights]);

  const hasData = isAllLocations
    ? comparisonRows.some((row) => row.summary.total_page_views > 0)
    : summaryCards.some((card) => card.value > 0) ||
      dayRows.length > 0 ||
      offerRows.length > 0;

  const chartData = dayRows.map((row) => ({
    day: new Date(row.day).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    views: row.views,
    sessions: row.sessions,
  }));

  return (
    <div>
      <AdminBreadcrumbs
        items={[
          { label: "Admin", path: "/admin/dashboard" },
          { label: "Insights" },
        ]}
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
      >
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
            <AdminBadge variant="default">
              {isAllLocations ? "All Locations" : currentLocation?.name ?? scope}
            </AdminBadge>
          </div>
          <p className={`mt-1 text-sm ${dark ? "text-white/50" : "text-admin-muted"}`}>
            Website traffic and offer performance for the selected date range.
          </p>
        </div>
        <AdminButton variant="outline" onClick={() => void loadInsights()} disabled={loading}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </AdminButton>
      </motion.div>

      <div className="mt-6 flex flex-wrap gap-2">
        {(
          [
            ["today", "Today"],
            ["7d", "7 days"],
            ["30d", "30 days"],
            ["90d", "90 days"],
            ["custom", "Custom range"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setPreset(id)}
            className={[
              "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors",
              preset === id
                ? "bg-admin-primary text-white"
                : dark
                  ? "bg-white/10 text-white/70 hover:bg-white/15"
                  : "bg-admin-ivory text-admin-muted hover:bg-admin-border/40",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {preset === "custom" ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className={`text-sm ${dark ? "text-white/60" : "text-admin-muted"}`}>
            From
            <input
              type="date"
              value={customFrom}
              onChange={(event) => setCustomFrom(event.target.value)}
              className={`ml-2 rounded-lg border px-3 py-2 text-sm ${dark ? "border-white/10 bg-white/5" : "border-admin-border bg-white"}`}
            />
          </label>
          <label className={`text-sm ${dark ? "text-white/60" : "text-admin-muted"}`}>
            To
            <input
              type="date"
              value={customTo}
              onChange={(event) => setCustomTo(event.target.value)}
              className={`ml-2 rounded-lg border px-3 py-2 text-sm ${dark ? "border-white/10 bg-white/5" : "border-admin-border bg-white"}`}
            />
          </label>
        </div>
      ) : null}

      {!hasData && !loading ? (
        <AdminCard className="mt-8">
          <p className={`py-10 text-center text-sm ${dark ? "text-white/50" : "text-admin-muted"}`}>
            No data yet — insights appear as visitors browse the site.
          </p>
        </AdminCard>
      ) : null}

      {isAllLocations ? (
        <AdminCard className="mt-8 overflow-x-auto">
          <h2 className="mb-4 text-sm font-semibold">Location comparison</h2>
          <table className="min-w-full text-left text-sm">
            <thead className={dark ? "text-white/50" : "text-admin-muted"}>
              <tr>
                <th className="pb-3 pr-4 font-medium">Location</th>
                <th className="pb-3 pr-4 font-medium">Page Views</th>
                <th className="pb-3 pr-4 font-medium">Visitors</th>
                <th className="pb-3 pr-4 font-medium">Offers Views</th>
                <th className="pb-3 pr-4 font-medium">Offer Clicks</th>
                <th className="pb-3 pr-4 font-medium">Order Clicks</th>
                <th className="pb-3 font-medium">Reservation Clicks</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.locationId} className={dark ? "border-t border-white/10" : "border-t border-admin-border"}>
                  <td className="py-3 pr-4 font-medium">{row.name}</td>
                  <td className="py-3 pr-4">{formatNumber(row.summary.total_page_views)}</td>
                  <td className="py-3 pr-4">{formatNumber(row.summary.unique_sessions)}</td>
                  <td className="py-3 pr-4">{formatNumber(row.summary.offers_page_views)}</td>
                  <td className="py-3 pr-4">{formatNumber(row.summary.offer_clicks)}</td>
                  <td className="py-3 pr-4">{formatNumber(row.summary.order_clicks)}</td>
                  <td className="py-3">{formatNumber(row.summary.reservation_clicks)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminCard>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {summaryCards.map((card) => (
              <SummaryStatCard key={card.id} card={card} />
            ))}
          </div>

          {chartData.length > 0 ? (
            <AdminCard className="mt-8">
              <h2 className="mb-4 text-sm font-semibold">Views over time</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={dark ? "rgba(255,255,255,0.08)" : "rgba(43,29,24,0.08)"} />
                    <XAxis dataKey="day" stroke={dark ? "rgba(255,255,255,0.45)" : "rgba(43,29,24,0.45)"} />
                    <YAxis stroke={dark ? "rgba(255,255,255,0.45)" : "rgba(43,29,24,0.45)"} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="views" stroke="#ED3C18" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="sessions" stroke="#C97A2B" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </AdminCard>
          ) : null}

          <AdminCard className="mt-8 overflow-x-auto">
            <h2 className="mb-4 text-sm font-semibold">Offers performance</h2>
            <OfferPerformanceTable
              rows={offerRows}
              locationId={locationId}
              from={range.from}
              to={range.to}
            />
          </AdminCard>

          <div className="mt-8 grid gap-6 xl:grid-cols-2">
            <AdminCard>
              <h2 className="mb-4 text-sm font-semibold">Top pages</h2>
              {pageRows.length === 0 ? (
                <p className={`text-sm ${dark ? "text-white/50" : "text-admin-muted"}`}>No page views yet.</p>
              ) : (
                <ul className="space-y-3">
                  {pageRows.map((row) => (
                    <li key={row.page_path} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium">{row.page_path}</span>
                      <span className={dark ? "text-white/50" : "text-admin-muted"}>{formatNumber(row.views)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </AdminCard>

            <div className="grid gap-6">
              <AdminCard>
                <h2 className="mb-4 text-sm font-semibold">Devices</h2>
                {deviceRows.length === 0 ? (
                  <p className={`text-sm ${dark ? "text-white/50" : "text-admin-muted"}`}>No device data yet.</p>
                ) : (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={deviceRows} dataKey="views" nameKey="device" innerRadius={50} outerRadius={80}>
                          {deviceRows.map((entry, index) => (
                            <Cell key={entry.device} fill={DEVICE_COLORS[index % DEVICE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </AdminCard>

              <AdminCard>
                <h2 className="mb-4 text-sm font-semibold">Top referrers</h2>
                {referrerRows.length === 0 ? (
                  <p className={`text-sm ${dark ? "text-white/50" : "text-admin-muted"}`}>No referrer data yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {referrerRows.map((row) => (
                      <li key={row.referrer} className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate font-medium">{row.referrer}</span>
                        <span className={dark ? "text-white/50" : "text-admin-muted"}>{formatNumber(row.views)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </AdminCard>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
