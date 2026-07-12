import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  LayoutGrid,
  GitBranch,
  Layers,
  Users,
  Tags,
  Scale,
  Megaphone,
  Flag,
  Heart,
  Shield,
  BarChart3,
  Sparkles,
  Settings2,
  Route,
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
  evaluateCustomerJourney,
  getJourneyAnalytics,
  getMergedCustomerTimeline,
  getSettings,
  listCampaigns,
  listCustomerJourneys,
  listDefinitions,
  listRecommendations,
  listRules,
  listSegments,
  listStages,
  publishJourneyVersion,
  upsertDefinition,
  upsertRule,
  upsertSettings,
  upsertStage,
  type CustomerJourney,
  type JourneyAnalyticsSnapshot,
} from "../../services/restaurantOperations/journey";
import "../admin.css";

type TabId =
  | "dashboard"
  | "builder"
  | "stages"
  | "journeys"
  | "segments"
  | "rules"
  | "campaigns"
  | "milestones"
  | "engagement"
  | "retention"
  | "analytics"
  | "recommendations"
  | "settings";

const TABS: Array<{ id: TabId; label: string; icon: typeof LayoutGrid }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { id: "builder", label: "Journey Builder", icon: GitBranch },
  { id: "stages", label: "Journey Stages", icon: Layers },
  { id: "journeys", label: "Customer Journeys", icon: Users },
  { id: "segments", label: "Segments", icon: Tags },
  { id: "rules", label: "Lifecycle Rules", icon: Scale },
  { id: "campaigns", label: "Campaign Triggers", icon: Megaphone },
  { id: "milestones", label: "Milestones", icon: Flag },
  { id: "engagement", label: "Engagement", icon: Heart },
  { id: "retention", label: "Retention", icon: Shield },
  { id: "analytics", label: "Journey Analytics", icon: BarChart3 },
  { id: "recommendations", label: "Recommendations", icon: Sparkles },
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

export default function CustomerJourneyPage() {
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

  const [analytics, setAnalytics] = useState<JourneyAnalyticsSnapshot | null>(null);
  const [journeys, setJourneys] = useState<CustomerJourney[]>([]);
  const [stages, setStages] = useState<Awaited<ReturnType<typeof listStages>>>([]);
  const [rules, setRules] = useState<Awaited<ReturnType<typeof listRules>>>([]);
  const [segments, setSegments] = useState<Awaited<ReturnType<typeof listSegments>>>([]);
  const [defs, setDefs] = useState<Awaited<ReturnType<typeof listDefinitions>>>([]);
  const [campaigns, setCampaigns] = useState<Awaited<ReturnType<typeof listCampaigns>>>([]);
  const [recs, setRecs] = useState<Awaited<ReturnType<typeof listRecommendations>>>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<Awaited<ReturnType<typeof getMergedCustomerTimeline>>>([]);
  const [graphJson, setGraphJson] = useState("");
  const [evalCustomerId, setEvalCustomerId] = useState("");
  const [customers, setCustomers] = useState<Array<{ id: string; label: string }>>([]);
  const [stageForm, setStageForm] = useState({ code: "", name: "", sortOrder: "200" });
  const [ruleForm, setRuleForm] = useState({
    code: "",
    name: "",
    toStage: "frequent",
    field: "visitCount",
    op: "gte",
    value: "4",
  });
  const [settingsForm, setSettingsForm] = useState({
    inactiveDays: "60",
    atRiskDays: "90",
    vipVisitThreshold: "8",
    frequentVisitThreshold: "4",
    enableCampaigns: "true",
  });

  const selected = useMemo(
    () => journeys.find((j) => j.customerId === selectedId) ?? journeys[0] ?? null,
    [journeys, selectedId],
  );

  const refresh = useCallback(async () => {
    const [a, j, s, r, seg, d, c, customersList, settings] = await Promise.all([
      getJourneyAnalytics(outlet),
      listCustomerJourneys({ locationId: outlet, limit: 200 }),
      listStages(outlet),
      listRules(outlet),
      listSegments(outlet),
      listDefinitions(outlet),
      listCampaigns(outlet, 100),
      listCustomers({ locationId: outlet, limit: 50 }),
      getSettings(outlet),
    ]);
    setAnalytics(a);
    setJourneys(j);
    setStages(s);
    setRules(r);
    setSegments(seg);
    setDefs(d);
    setCampaigns(c);
    setCustomers(
      customersList.map((cu) => ({
        id: cu.id,
        label: `${cu.firstName} ${cu.lastName}`.trim() || cu.phone || cu.id.slice(0, 8),
      })),
    );
    if (!selectedId && j[0]) setSelectedId(j[0].customerId);
    if (d[0]) setGraphJson(JSON.stringify(d[0].graph, null, 2));
    if (settings) {
      setSettingsForm({
        inactiveDays: String(settings.inactiveDays),
        atRiskDays: String(settings.atRiskDays),
        vipVisitThreshold: String(settings.vipVisitThreshold),
        frequentVisitThreshold: String(settings.frequentVisitThreshold),
        enableCampaigns: String(settings.enableCampaigns),
      });
    }
    const openRecs = await listRecommendations({ locationId: outlet, status: "open" });
    setRecs(openRecs);
  }, [outlet, selectedId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!selected) return;
    void getMergedCustomerTimeline(selected.customerId, outlet).then(setTimeline);
  }, [selected, outlet]);

  const retentionList = useMemo(
    () =>
      journeys.filter(
        (j) =>
          ["inactive", "at_risk", "win_back"].includes(j.stageCode) || j.scores.churnRisk >= 50,
      ),
    [journeys],
  );

  const runEval = async (customerId: string) => {
    const result = await evaluateCustomerJourney({ locationId: outlet, customerId });
    showToast(
      result ? `${result.context.stageName}: ${result.context.nextBestAction}` : "Evaluation failed",
      result ? "success" : "error",
    );
    setSelectedId(customerId);
    await refresh();
  };

  return (
    <div className="ai-concierge-page">
      <AdminBreadcrumbs
        items={[
          { label: "Mission Control", path: "/admin/operations" },
          { label: "Customer Journey" },
        ]}
      />
      <PageHeader
        title="Customer Journey"
        description="Lifecycle stages, engagement scores, milestones, next-best actions, and campaign triggers."
      >
        <AdminBadge variant="outline">{outlet}</AdminBadge>
        <AdminButton variant="secondary" onClick={() => void refresh()}>
          Refresh
        </AdminButton>
      </PageHeader>

      {isAllLocations && (
        <p className="mb-4 text-sm text-amber-500">Select a specific outlet for journey actions.</p>
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
            <Metric label="Journeys" value={analytics?.totalJourneys ?? "—"} />
            <Metric label="Retention %" value={analytics?.retentionRate ?? "—"} />
            <Metric label="Repeat %" value={analytics?.repeatVisitRate ?? "—"} />
            <Metric label="Churn risk" value={analytics?.churnRiskCount ?? "—"} />
            <Metric label="VIP+" value={analytics?.vipGrowth ?? "—"} />
            <Metric label="Avg relationship" value={analytics?.avgRelationshipScore ?? "—"} />
            <Metric label="Milestones" value={analytics?.milestoneCompletions ?? "—"} />
            <Metric label="Campaigns" value={analytics?.campaignTriggers ?? "—"} />
          </div>
          {(analytics?.stageDistribution.length ?? 0) > 0 && (
            <AdminChart
              title="Journey distribution"
              data={(analytics?.stageDistribution ?? []).map((s) => ({
                label: s.stage,
                value: s.count,
              }))}
            />
          )}
          <AdminCard>
            <strong className="text-sm">Evaluate customer journey</strong>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <AdminSelect
                label="Customer"
                value={evalCustomerId}
                onChange={setEvalCustomerId}
                options={[
                  { value: "", label: "Select customer…" },
                  ...customers.map((c) => ({ value: c.id, label: c.label })),
                ]}
              />
            </div>
            <div className="mt-3">
              <AdminButton
                disabled={!evalCustomerId}
                onClick={() => void runEval(evalCustomerId)}
              >
                <Route size={14} /> Run journey engine
              </AdminButton>
            </div>
          </AdminCard>
        </div>
      )}

      {tab === "builder" && (
        <div className="space-y-4">
          <AdminCard>
            <strong className="text-sm">Journey definitions</strong>
            <ul className="mt-2 space-y-1 text-sm">
              {defs.map((d) => (
                <li key={d.id} className="flex justify-between gap-2">
                  <span>
                    {d.name} <span className="text-xs text-admin-muted">v{d.currentVersion}</span>
                  </span>
                  <AdminButton
                    size="sm"
                    variant="ghost"
                    onClick={() => setGraphJson(JSON.stringify(d.graph, null, 2))}
                  >
                    Load
                  </AdminButton>
                </li>
              ))}
            </ul>
          </AdminCard>
          <AdminCard>
            <strong className="text-sm">Visual graph (nodes: stage, condition, delay, decision, action, workflow, notification, campaign, goal, end)</strong>
            <div className="mt-3">
              <AdminTextarea label="Graph JSON" value={graphJson} onChange={(e) => setGraphJson(e.target.value)} rows={14} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <AdminButton
                onClick={() => {
                  try {
                    const graph = JSON.parse(graphJson) as {
                      nodes: Array<Record<string, unknown>>;
                      edges: Array<Record<string, unknown>>;
                    };
                    const def = defs[0];
                    if (!def) {
                      void upsertDefinition({
                        locationId: outlet,
                        code: `JOURNEY_${Date.now().toString(36).toUpperCase()}`,
                        name: "Custom Journey",
                        graph,
                        active: true,
                      }).then((d) => {
                        showToast(d ? "Created" : "Failed", d ? "success" : "error");
                        return refresh();
                      });
                      return;
                    }
                    void publishJourneyVersion({
                      definitionId: def.id,
                      version: def.currentVersion + 1,
                      graph,
                      createdBy: "admin",
                    }).then(() => {
                      showToast(`Published v${def.currentVersion + 1}`);
                      return refresh();
                    });
                  } catch {
                    showToast("Invalid graph JSON", "error");
                  }
                }}
              >
                Publish version
              </AdminButton>
            </div>
          </AdminCard>
        </div>
      )}

      {tab === "stages" && (
        <div className="space-y-4">
          <AdminCard>
            <strong className="text-sm">Lifecycle stages</strong>
            <table className="mt-3 w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-admin-muted">
                  <th className="py-2">Order</th>
                  <th>Code</th>
                  <th>Name</th>
                </tr>
              </thead>
              <tbody>
                {stages.map((s) => (
                  <tr key={s.id} className="border-t border-admin-border/40">
                    <td className="py-2">{s.sortOrder}</td>
                    <td>{s.code}</td>
                    <td>{s.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminCard>
          <AdminCard>
            <strong className="text-sm">Add custom stage</strong>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <AdminInput label="Code" value={stageForm.code} onChange={(e) => setStageForm({ ...stageForm, code: e.target.value })} />
              <AdminInput label="Name" value={stageForm.name} onChange={(e) => setStageForm({ ...stageForm, name: e.target.value })} />
              <AdminInput label="Sort" value={stageForm.sortOrder} onChange={(e) => setStageForm({ ...stageForm, sortOrder: e.target.value })} />
            </div>
            <div className="mt-3">
              <AdminButton
                onClick={() =>
                  void upsertStage({
                    locationId: outlet,
                    code: stageForm.code,
                    name: stageForm.name,
                    sortOrder: Number(stageForm.sortOrder) || 200,
                  }).then((s) => {
                    showToast(s ? "Stage saved" : "Failed", s ? "success" : "error");
                    return refresh();
                  })
                }
              >
                Save stage
              </AdminButton>
            </div>
          </AdminCard>
        </div>
      )}

      {tab === "journeys" && (
        <div className="space-y-4">
          <AdminCard>
            <strong className="text-sm">Customer journeys</strong>
            <table className="mt-3 w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-admin-muted">
                  <th className="py-2">Customer</th>
                  <th>Stage</th>
                  <th>Relationship</th>
                  <th>Churn</th>
                  <th>NBA</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {journeys.map((j) => (
                  <tr key={j.id} className="border-t border-admin-border/40">
                    <td className="py-2 font-mono text-xs">{j.customerId.slice(0, 8)}</td>
                    <td>
                      <AdminBadge variant="outline">{j.stageCode}</AdminBadge>
                    </td>
                    <td>{j.scores.relationshipScore}</td>
                    <td>{j.scores.churnRisk}</td>
                    <td className="text-xs">{j.nextBestAction ?? "—"}</td>
                    <td>
                      <AdminButton size="sm" variant="ghost" onClick={() => setSelectedId(j.customerId)}>
                        Timeline
                      </AdminButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminCard>
          {selected && (
            <AdminCard>
              <strong className="text-sm">Merged timeline · {selected.customerId.slice(0, 8)}</strong>
              <ul className="mt-2 max-h-80 space-y-1 overflow-auto text-sm">
                {timeline.map((t, i) => (
                  <li key={`${t.at}-${i}`}>
                    <AdminBadge variant="outline">{t.source}</AdminBadge> {t.title}
                    <span className="text-xs text-admin-muted"> · {new Date(t.at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </AdminCard>
          )}
        </div>
      )}

      {tab === "segments" && (
        <AdminCard>
          <strong className="text-sm">Journey segments</strong>
          <ul className="mt-2 space-y-2 text-sm">
            {segments.map((s) => (
              <li key={s.id}>
                <strong>{s.name}</strong> <span className="text-xs text-admin-muted">({s.code})</span>
                <div className="text-xs text-admin-muted">{s.description}</div>
              </li>
            ))}
          </ul>
        </AdminCard>
      )}

      {tab === "rules" && (
        <div className="space-y-4">
          <AdminCard>
            <strong className="text-sm">Lifecycle rules</strong>
            <table className="mt-3 w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-admin-muted">
                  <th className="py-2">Code</th>
                  <th>To stage</th>
                  <th>Priority</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id} className="border-t border-admin-border/40">
                    <td className="py-2">{r.code}</td>
                    <td>{r.toStage}</td>
                    <td>{r.priority}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminCard>
          <AdminCard>
            <strong className="text-sm">Add rule</strong>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <AdminInput label="Code" value={ruleForm.code} onChange={(e) => setRuleForm({ ...ruleForm, code: e.target.value })} />
              <AdminInput label="Name" value={ruleForm.name} onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })} />
              <AdminSelect
                label="To stage"
                value={ruleForm.toStage}
                onChange={(v) => setRuleForm({ ...ruleForm, toStage: v })}
                options={stages.map((s) => ({ value: s.code, label: s.name }))}
              />
              <AdminInput label="Field" value={ruleForm.field} onChange={(e) => setRuleForm({ ...ruleForm, field: e.target.value })} />
              <AdminSelect
                label="Op"
                value={ruleForm.op}
                onChange={(v) => setRuleForm({ ...ruleForm, op: v })}
                options={["eq", "gte", "lte", "gt", "lt"].map((o) => ({ value: o, label: o }))}
              />
              <AdminInput label="Value" value={ruleForm.value} onChange={(e) => setRuleForm({ ...ruleForm, value: e.target.value })} />
            </div>
            <div className="mt-3">
              <AdminButton
                onClick={() =>
                  void upsertRule({
                    locationId: outlet,
                    code: ruleForm.code || `JR_${Date.now().toString(36).toUpperCase()}`,
                    name: ruleForm.name || "Custom rule",
                    toStage: ruleForm.toStage,
                    condition: {
                      field: ruleForm.field,
                      op: ruleForm.op as "gte",
                      value: Number(ruleForm.value),
                    },
                  }).then((r) => {
                    showToast(r ? "Rule saved" : "Failed", r ? "success" : "error");
                    return refresh();
                  })
                }
              >
                Save rule
              </AdminButton>
            </div>
          </AdminCard>
        </div>
      )}

      {tab === "campaigns" && (
        <AdminCard>
          <strong className="text-sm">Campaign triggers (published to Workflow Event Bus)</strong>
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-admin-muted">
                <th className="py-2">Trigger</th>
                <th>Campaign</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {(campaigns as Array<Record<string, unknown>>).map((c) => (
                <tr key={String(c.id)} className="border-t border-admin-border/40">
                  <td className="py-2">{String(c.trigger_type)}</td>
                  <td>{String(c.campaign_key)}</td>
                  <td>{new Date(String(c.created_at)).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminCard>
      )}

      {tab === "milestones" && selected && (
        <AdminCard>
          <strong className="text-sm">Milestones for selected customer</strong>
          <p className="mt-1 text-xs text-admin-muted">
            Unique milestones only — duplicates blocked by database constraint.
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {timeline
              .filter((t) => t.source === "milestone")
              .map((t, i) => (
                <li key={i}>
                  <AdminBadge variant="success">milestone</AdminBadge> {t.title}
                </li>
              ))}
          </ul>
        </AdminCard>
      )}

      {tab === "engagement" && (
        <AdminCard>
          <strong className="text-sm">Engagement & relationship scores</strong>
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-admin-muted">
                <th className="py-2">Customer</th>
                <th>Engage</th>
                <th>Visit</th>
                <th>Loyalty</th>
                <th>Retention</th>
                <th>Relationship</th>
              </tr>
            </thead>
            <tbody>
              {journeys.map((j) => (
                <tr key={j.id} className="border-t border-admin-border/40">
                  <td className="py-2 font-mono text-xs">{j.customerId.slice(0, 8)}</td>
                  <td>{j.scores.engagementScore}</td>
                  <td>{j.scores.visitScore}</td>
                  <td>{j.scores.loyaltyScore}</td>
                  <td>{j.scores.retentionScore}</td>
                  <td>{j.scores.relationshipScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminCard>
      )}

      {tab === "retention" && (
        <AdminCard>
          <strong className="text-sm">Retention watchlist</strong>
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-admin-muted">
                <th className="py-2">Customer</th>
                <th>Stage</th>
                <th>Churn risk</th>
                <th>NBA</th>
              </tr>
            </thead>
            <tbody>
              {retentionList.map((j) => (
                <tr key={j.id} className="border-t border-admin-border/40">
                  <td className="py-2 font-mono text-xs">{j.customerId.slice(0, 8)}</td>
                  <td>
                    <AdminBadge variant="warning">{j.stageCode}</AdminBadge>
                  </td>
                  <td>{j.scores.churnRisk}</td>
                  <td className="text-xs">{j.nextBestAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminCard>
      )}

      {tab === "analytics" && analytics && (
        <div className="space-y-4">
          <div className="kb-metric-grid">
            <Metric label="Growth (journeys)" value={analytics.totalJourneys} />
            <Metric label="Retention %" value={analytics.retentionRate} />
            <Metric label="Repeat %" value={analytics.repeatVisitRate} />
            <Metric label="Avg relationship" value={analytics.avgRelationshipScore} />
          </div>
          {analytics.topSegments.length > 0 && (
            <AdminChart
              title="Top segments"
              data={analytics.topSegments.map((s) => ({ label: s.code, value: s.count }))}
            />
          )}
        </div>
      )}

      {tab === "recommendations" && (
        <AdminCard>
          <strong className="text-sm">Next-best actions</strong>
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-admin-muted">
                <th className="py-2">Action</th>
                <th>Title</th>
                <th>Reason</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              {recs.map((r) => (
                <tr key={r.id} className="border-t border-admin-border/40">
                  <td className="py-2">{r.actionCode}</td>
                  <td>{r.title}</td>
                  <td className="text-xs">{r.reason}</td>
                  <td>{r.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminCard>
      )}

      {tab === "settings" && (
        <AdminCard>
          <strong className="text-sm">Journey settings</strong>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <AdminInput label="Inactive days" value={settingsForm.inactiveDays} onChange={(e) => setSettingsForm({ ...settingsForm, inactiveDays: e.target.value })} />
            <AdminInput label="At-risk days" value={settingsForm.atRiskDays} onChange={(e) => setSettingsForm({ ...settingsForm, atRiskDays: e.target.value })} />
            <AdminInput label="VIP visit threshold" value={settingsForm.vipVisitThreshold} onChange={(e) => setSettingsForm({ ...settingsForm, vipVisitThreshold: e.target.value })} />
            <AdminInput label="Frequent visit threshold" value={settingsForm.frequentVisitThreshold} onChange={(e) => setSettingsForm({ ...settingsForm, frequentVisitThreshold: e.target.value })} />
            <AdminSelect
              label="Campaigns"
              value={settingsForm.enableCampaigns}
              onChange={(v) => setSettingsForm({ ...settingsForm, enableCampaigns: v })}
              options={[
                { value: "true", label: "Enabled" },
                { value: "false", label: "Disabled" },
              ]}
            />
          </div>
          <div className="mt-3">
            <AdminButton
              onClick={() =>
                void upsertSettings(outlet, {
                  inactiveDays: Number(settingsForm.inactiveDays),
                  atRiskDays: Number(settingsForm.atRiskDays),
                  vipVisitThreshold: Number(settingsForm.vipVisitThreshold),
                  frequentVisitThreshold: Number(settingsForm.frequentVisitThreshold),
                  enableCampaigns: settingsForm.enableCampaigns === "true",
                }).then((s) => showToast(s ? "Saved" : "Failed", s ? "success" : "error"))
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
