import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  LayoutGrid,
  GitBranch,
  Radio,
  Settings2,
  Scale,
  CheckSquare,
  ClipboardCheck,
  Bell,
  History,
  AlertTriangle,
  BarChart3,
  Workflow,
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
  BUILTIN_EVENT_TYPES,
  cancelDeadLetter,
  cancelWorkflow,
  completeWorkflowTask,
  decideApproval,
  getDeadLetterQueue,
  getEventRegistry,
  getExecutionHistory,
  getInstanceHistory,
  getLatestVersion,
  getNotifications,
  getPendingApprovals,
  getWorkflowAnalytics,
  getWorkflowTasks,
  insertVersion,
  listAllApprovals,
  listDefinitions,
  listRules,
  pauseWorkflow,
  publishDomainEvent,
  resumeWorkflow,
  retryDeadLetter,
  setDefinitionActive,
  upsertDefinition,
  upsertRule,
  upsertSettings,
  getSettings,
  type WorkflowAnalyticsSnapshot,
  type WorkflowDefinition,
  type WorkflowGraph,
  type WorkflowInstance,
  type WorkflowNodeType,
} from "../../services/restaurantOperations/automation";
import "../admin.css";

type TabId =
  | "dashboard"
  | "builder"
  | "registry"
  | "rules"
  | "business"
  | "tasks"
  | "approvals"
  | "notifications"
  | "history"
  | "dlq"
  | "analytics"
  | "settings";

const TABS: Array<{ id: TabId; label: string; icon: typeof LayoutGrid }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { id: "builder", label: "Workflow Builder", icon: GitBranch },
  { id: "registry", label: "Event Registry", icon: Radio },
  { id: "rules", label: "Automation Rules", icon: Workflow },
  { id: "business", label: "Business Rules", icon: Scale },
  { id: "tasks", label: "Task Queue", icon: CheckSquare },
  { id: "approvals", label: "Approvals", icon: ClipboardCheck },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "history", label: "Execution History", icon: History },
  { id: "dlq", label: "Dead Letter Queue", icon: AlertTriangle },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings2 },
];

const NODE_TYPES: WorkflowNodeType[] = [
  "trigger",
  "condition",
  "decision",
  "task",
  "notification",
  "approval",
  "delay",
  "parallel",
  "merge",
  "end",
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
  if (["completed", "sent", "approved", "done", "active"].includes(status)) return "success";
  if (["failed", "rejected", "cancelled", "open"].includes(status) && status !== "open") return "danger";
  if (["failed", "rejected"].includes(status)) return "danger";
  if (["running", "pending", "queued", "waiting_approval", "paused"].includes(status)) return "warning";
  return "default";
}

export default function WorkflowAutomationPage() {
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

  const [analytics, setAnalytics] = useState<WorkflowAnalyticsSnapshot | null>(null);
  const [defs, setDefs] = useState<WorkflowDefinition[]>([]);
  const [selectedDefId, setSelectedDefId] = useState<string | null>(null);
  const [graphJson, setGraphJson] = useState("");
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [steps, setSteps] = useState<Awaited<ReturnType<typeof getInstanceHistory>>["steps"]>([]);
  const [registry, setRegistry] = useState<Awaited<ReturnType<typeof getEventRegistry>>>([]);
  const [rules, setRules] = useState<Awaited<ReturnType<typeof listRules>>>([]);
  const [tasks, setTasks] = useState<Awaited<ReturnType<typeof getWorkflowTasks>>>([]);
  const [approvals, setApprovals] = useState<Awaited<ReturnType<typeof listAllApprovals>>>([]);
  const [notifications, setNotifications] = useState<Awaited<ReturnType<typeof getNotifications>>>([]);
  const [dlq, setDlq] = useState<Awaited<ReturnType<typeof getDeadLetterQueue>>>([]);
  const [settingsForm, setSettingsForm] = useState({
    maxRetries: "3",
    defaultTimeoutMinutes: "60",
    enableAutomation: "true",
  });
  const [newNode, setNewNode] = useState({ type: "task" as WorkflowNodeType, label: "", config: "" });
  const [ruleForm, setRuleForm] = useState({
    code: "",
    name: "",
    eventType: "ReservationCreated",
    field: "guests",
    op: "gt",
    value: "20",
    actionType: "approval",
    actionTitle: "Manager approval",
  });
  const [manualEvent, setManualEvent] = useState({
    eventType: "CustomerBirthday",
    entityId: "demo-customer",
    payload: '{"customerName":"Demo Guest","vip":false}',
  });

  const selectedDef = useMemo(
    () => defs.find((d) => d.id === selectedDefId) ?? defs[0] ?? null,
    [defs, selectedDefId],
  );

  const refresh = useCallback(async () => {
    const [a, d, hist, reg, r, t, ap, n, dead, s] = await Promise.all([
      getWorkflowAnalytics(outlet),
      listDefinitions(outlet),
      getExecutionHistory({ locationId: outlet, limit: 100 }),
      getEventRegistry(),
      listRules(outlet),
      getWorkflowTasks({ locationId: outlet }),
      listAllApprovals(outlet),
      getNotifications({ locationId: outlet }),
      getDeadLetterQueue({ locationId: outlet }),
      getSettings(outlet),
    ]);
    setAnalytics(a);
    setDefs(d);
    setInstances(hist);
    setRegistry(reg);
    setRules(r);
    setTasks(t);
    setApprovals(ap);
    setNotifications(n);
    setDlq(dead);
    if (!selectedDefId && d[0]) setSelectedDefId(d[0].id);
    if (s) {
      setSettingsForm({
        maxRetries: String(s.maxRetries),
        defaultTimeoutMinutes: String(s.defaultTimeoutMinutes),
        enableAutomation: String(s.enableAutomation),
      });
    }
  }, [outlet, selectedDefId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!selectedDef) return;
    void getLatestVersion(selectedDef.id).then((v) => {
      setGraphJson(JSON.stringify(v?.graph ?? { nodes: [], edges: [] }, null, 2));
    });
  }, [selectedDef]);

  useEffect(() => {
    if (!selectedInstanceId) return;
    void getInstanceHistory(selectedInstanceId).then((h) => setSteps(h.steps));
  }, [selectedInstanceId]);

  const parsedGraph = useMemo((): WorkflowGraph | null => {
    try {
      return JSON.parse(graphJson) as WorkflowGraph;
    } catch {
      return null;
    }
  }, [graphJson]);

  const addNode = () => {
    if (!parsedGraph) {
      showToast("Invalid graph JSON", "error");
      return;
    }
    const id = `n_${Date.now().toString(36)}`;
    let config: Record<string, unknown> = {};
    try {
      if (newNode.config.trim()) config = JSON.parse(newNode.config) as Record<string, unknown>;
    } catch {
      showToast("Node config must be JSON", "error");
      return;
    }
    const nodes = [
      ...parsedGraph.nodes,
      { id, type: newNode.type, label: newNode.label || newNode.type, config },
    ];
    const last = parsedGraph.nodes[parsedGraph.nodes.length - 1];
    const edges = last
      ? [...parsedGraph.edges, { from: last.id, to: id }]
      : parsedGraph.edges;
    setGraphJson(JSON.stringify({ nodes, edges }, null, 2));
    setNewNode({ type: "task", label: "", config: "" });
  };

  const saveVersion = async () => {
    if (!selectedDef || !parsedGraph) {
      showToast("Select a workflow with valid graph", "error");
      return;
    }
    const next = selectedDef.currentVersion + 1;
    const saved = await insertVersion({
      definitionId: selectedDef.id,
      version: next,
      graph: parsedGraph,
      createdBy: "admin",
    });
    showToast(saved ? `Published v${next}` : "Save failed", saved ? "success" : "error");
    await refresh();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await setDefinitionActive(id, active);
    showToast(active ? "Activated" : "Deactivated");
    await refresh();
  };

  const publishManual = async () => {
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(manualEvent.payload) as Record<string, unknown>;
    } catch {
      showToast("Payload must be JSON", "error");
      return;
    }
    const { event, duplicate } = await publishDomainEvent({
      eventType: manualEvent.eventType,
      source: "system",
      entityType: "manual",
      entityId: manualEvent.entityId,
      locationId: outlet,
      payload,
      correlationId: `manual-${Date.now()}`,
    });
    showToast(
      duplicate ? "Duplicate event ignored" : event ? `Published ${event.eventType}` : "Publish failed",
      event || duplicate ? "success" : "error",
    );
    await refresh();
  };

  return (
    <div className="ai-concierge-page">
      <AdminBreadcrumbs
        items={[
          { label: "Mission Control", path: "/admin/operations" },
          { label: "Workflow Automation" },
        ]}
      />
      <PageHeader
        title="Workflow Automation"
        description="Event-driven automations — tasks, approvals, notifications, retries, and dead-letter recovery."
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
            <Metric label="Executions" value={analytics?.executions ?? "—"} />
            <Metric label="Success %" value={analytics?.successRate ?? "—"} />
            <Metric label="Failure %" value={analytics?.failureRate ?? "—"} />
            <Metric label="Avg duration (s)" value={analytics?.avgDurationSeconds ?? "—"} />
            <Metric label="Pending tasks" value={analytics?.pendingTasks ?? "—"} />
            <Metric label="Pending approvals" value={analytics?.pendingApprovals ?? "—"} />
            <Metric label="Dead letters" value={analytics?.deadLetters ?? "—"} />
            <Metric label="Notify success %" value={analytics?.notificationSuccessRate ?? "—"} />
          </div>
          <AdminCard>
            <strong className="text-sm">Publish test event</strong>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <AdminSelect
                label="Event type"
                value={manualEvent.eventType}
                onChange={(v) => setManualEvent({ ...manualEvent, eventType: v })}
                options={BUILTIN_EVENT_TYPES.map((e) => ({ value: e, label: e }))}
              />
              <AdminInput
                label="Entity ID"
                value={manualEvent.entityId}
                onChange={(e) => setManualEvent({ ...manualEvent, entityId: e.target.value })}
              />
            </div>
            <div className="mt-3">
              <AdminTextarea
                label="Payload JSON"
                value={manualEvent.payload}
                onChange={(e) => setManualEvent({ ...manualEvent, payload: e.target.value })}
                rows={4}
              />
            </div>
            <div className="mt-3">
              <AdminButton onClick={() => void publishManual()}>Publish & run workflows</AdminButton>
            </div>
          </AdminCard>
        </div>
      )}

      {tab === "builder" && (
        <div className="space-y-4">
          <AdminCard>
            <strong className="text-sm">Workflows</strong>
            <table className="mt-3 w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-admin-muted">
                  <th className="py-2">Name</th>
                  <th>Trigger</th>
                  <th>Version</th>
                  <th>Active</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {defs.map((d) => (
                  <tr key={d.id} className="border-t border-admin-border/40">
                    <td className="py-2">
                      <strong>{d.name}</strong>
                      <div className="text-xs text-admin-muted">{d.code}</div>
                    </td>
                    <td>{d.triggerEvent}</td>
                    <td>v{d.currentVersion}</td>
                    <td>
                      <AdminBadge variant={d.active ? "success" : "default"}>
                        {d.active ? "active" : "off"}
                      </AdminBadge>
                    </td>
                    <td className="space-x-1">
                      <AdminButton size="sm" variant="ghost" onClick={() => setSelectedDefId(d.id)}>
                        Edit
                      </AdminButton>
                      <AdminButton
                        size="sm"
                        variant="outline"
                        onClick={() => void toggleActive(d.id, !d.active)}
                      >
                        {d.active ? "Deactivate" : "Activate"}
                      </AdminButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminCard>
          {selectedDef && (
            <AdminCard>
              <strong className="text-sm">Builder · {selectedDef.name}</strong>
              <p className="mt-1 text-xs text-admin-muted">
                Add nodes, connect via ordered edges, version on save. Graph is configuration-driven.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <AdminSelect
                  label="Node type"
                  value={newNode.type}
                  onChange={(v) => setNewNode({ ...newNode, type: v as WorkflowNodeType })}
                  options={NODE_TYPES.map((t) => ({ value: t, label: t }))}
                />
                <AdminInput
                  label="Label"
                  value={newNode.label}
                  onChange={(e) => setNewNode({ ...newNode, label: e.target.value })}
                />
                <AdminInput
                  label="Config JSON"
                  value={newNode.config}
                  onChange={(e) => setNewNode({ ...newNode, config: e.target.value })}
                  placeholder='{"department":"kitchen"}'
                />
              </div>
              <div className="mt-3 flex gap-2">
                <AdminButton variant="secondary" onClick={addNode}>
                  Add node
                </AdminButton>
                <AdminButton onClick={() => void saveVersion()}>Publish new version</AdminButton>
              </div>
              <div className="mt-3">
                <AdminTextarea
                  label="Graph JSON"
                  value={graphJson}
                  onChange={(e) => setGraphJson(e.target.value)}
                  rows={16}
                />
              </div>
              {parsedGraph && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {parsedGraph.nodes.map((n) => (
                    <AdminBadge key={n.id} variant="outline">
                      {n.type}: {n.label}
                    </AdminBadge>
                  ))}
                </div>
              )}
            </AdminCard>
          )}
          <AdminCard>
            <strong className="text-sm">Create workflow</strong>
            <div className="mt-3">
              <AdminButton
                variant="outline"
                onClick={() =>
                  void upsertDefinition({
                    locationId: outlet,
                    code: `CUSTOM_${Date.now().toString(36).toUpperCase()}`,
                    name: "Custom Workflow",
                    triggerEvent: "ReservationCreated",
                    description: "Created from admin builder",
                    active: false,
                  }).then((d) => {
                    showToast(d ? "Created (inactive)" : "Failed", d ? "success" : "error");
                    return refresh();
                  })
                }
              >
                New blank workflow
              </AdminButton>
            </div>
          </AdminCard>
        </div>
      )}

      {tab === "registry" && (
        <AdminCard>
          <strong className="text-sm">Event registry</strong>
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-admin-muted">
                <th className="py-2">Type</th>
                <th>Source</th>
                <th>Description</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {registry.map((e) => (
                <tr key={e.id} className="border-t border-admin-border/40">
                  <td className="py-2 font-medium">{e.eventType}</td>
                  <td>{e.source}</td>
                  <td>{e.description ?? "—"}</td>
                  <td>
                    <AdminBadge variant={e.active ? "success" : "default"}>
                      {e.active ? "yes" : "no"}
                    </AdminBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminCard>
      )}

      {(tab === "rules" || tab === "business") && (
        <div className="space-y-4">
          <AdminCard>
            <strong className="text-sm">
              {tab === "business" ? "Business rules" : "Automation rules"}
            </strong>
            <table className="mt-3 w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-admin-muted">
                  <th className="py-2">Code</th>
                  <th>Event</th>
                  <th>Condition</th>
                  <th>Action</th>
                  <th>Priority</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id} className="border-t border-admin-border/40">
                    <td className="py-2">{r.code}</td>
                    <td>{r.eventType ?? "*"}</td>
                    <td className="text-xs">
                      {r.condition.field
                        ? `${r.condition.field} ${r.condition.op} ${String(r.condition.value)}`
                        : "always"}
                    </td>
                    <td className="text-xs">{JSON.stringify(r.action)}</td>
                    <td>{r.priority}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminCard>
          <AdminCard>
            <strong className="text-sm">Add rule</strong>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <AdminInput label="Code" value={ruleForm.code} onChange={(e) => setRuleForm({ ...ruleForm, code: e.target.value })} />
              <AdminInput label="Name" value={ruleForm.name} onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })} />
              <AdminSelect
                label="Event"
                value={ruleForm.eventType}
                onChange={(v) => setRuleForm({ ...ruleForm, eventType: v })}
                options={BUILTIN_EVENT_TYPES.map((e) => ({ value: e, label: e }))}
              />
              <AdminInput label="Field" value={ruleForm.field} onChange={(e) => setRuleForm({ ...ruleForm, field: e.target.value })} />
              <AdminSelect
                label="Op"
                value={ruleForm.op}
                onChange={(v) => setRuleForm({ ...ruleForm, op: v })}
                options={["eq", "neq", "gt", "gte", "lt", "lte", "contains", "exists"].map((o) => ({
                  value: o,
                  label: o,
                }))}
              />
              <AdminInput label="Value" value={ruleForm.value} onChange={(e) => setRuleForm({ ...ruleForm, value: e.target.value })} />
              <AdminSelect
                label="Action"
                value={ruleForm.actionType}
                onChange={(v) => setRuleForm({ ...ruleForm, actionType: v })}
                options={[
                  { value: "task", label: "Task" },
                  { value: "approval", label: "Approval" },
                  { value: "notify", label: "Notify" },
                ]}
              />
              <AdminInput
                label="Action title"
                value={ruleForm.actionTitle}
                onChange={(e) => setRuleForm({ ...ruleForm, actionTitle: e.target.value })}
              />
            </div>
            <div className="mt-3">
              <AdminButton
                onClick={() =>
                  void upsertRule({
                    locationId: outlet,
                    code: ruleForm.code || `RULE_${Date.now().toString(36).toUpperCase()}`,
                    name: ruleForm.name || "Custom rule",
                    eventType: ruleForm.eventType,
                    condition: {
                      field: ruleForm.field,
                      op: ruleForm.op as "eq" | "gt",
                      value: Number.isNaN(Number(ruleForm.value))
                        ? ruleForm.value
                        : Number(ruleForm.value),
                    },
                    action: { type: ruleForm.actionType, title: ruleForm.actionTitle },
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

      {tab === "tasks" && (
        <AdminCard>
          <strong className="text-sm">Task queue</strong>
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-admin-muted">
                <th className="py-2">Title</th>
                <th>Dept</th>
                <th>Priority</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className="border-t border-admin-border/40">
                  <td className="py-2">{t.title}</td>
                  <td>{t.department}</td>
                  <td>{t.priority}</td>
                  <td>
                    <AdminBadge variant={statusVariant(t.status)}>{t.status}</AdminBadge>
                  </td>
                  <td>
                    {t.status === "open" && (
                      <AdminButton
                        size="sm"
                        variant="ghost"
                        onClick={() => void completeWorkflowTask(t.id).then(refresh)}
                      >
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
          <div className="mt-2">
            <AdminButton
              size="sm"
              variant="outline"
              onClick={() => void getPendingApprovals(outlet).then(setApprovals)}
            >
              Show pending
            </AdminButton>
          </div>
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-admin-muted">
                <th className="py-2">Title</th>
                <th>Stage</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {approvals.map((a) => (
                <tr key={a.id} className="border-t border-admin-border/40">
                  <td className="py-2">{a.title}</td>
                  <td>{a.stage}</td>
                  <td>
                    <AdminBadge variant={statusVariant(a.status)}>{a.status}</AdminBadge>
                  </td>
                  <td className="space-x-1">
                    {a.status === "pending" && (
                      <>
                        <AdminButton
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            void decideApproval({
                              approvalId: a.id,
                              decision: "approved",
                              actor: "admin",
                            }).then(refresh)
                          }
                        >
                          Approve
                        </AdminButton>
                        <AdminButton
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void decideApproval({
                              approvalId: a.id,
                              decision: "rejected",
                              actor: "admin",
                            }).then(refresh)
                          }
                        >
                          Reject
                        </AdminButton>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminCard>
      )}

      {tab === "notifications" && (
        <AdminCard>
          <strong className="text-sm">Notifications</strong>
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-admin-muted">
                <th className="py-2">Channel</th>
                <th>Subject</th>
                <th>Status</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((n) => (
                <tr key={n.id} className="border-t border-admin-border/40">
                  <td className="py-2">{n.channel}</td>
                  <td>{n.subject ?? "—"}</td>
                  <td>
                    <AdminBadge variant={statusVariant(n.status)}>{n.status}</AdminBadge>
                  </td>
                  <td>{new Date(n.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminCard>
      )}

      {tab === "history" && (
        <div className="space-y-4">
          <AdminCard>
            <strong className="text-sm">Execution history</strong>
            <table className="mt-3 w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-admin-muted">
                  <th className="py-2">Instance</th>
                  <th>Status</th>
                  <th>Retries</th>
                  <th>Started</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {instances.map((i) => (
                  <tr key={i.id} className="border-t border-admin-border/40">
                    <td className="py-2 font-mono text-xs">{i.id.slice(0, 8)}</td>
                    <td>
                      <AdminBadge variant={statusVariant(i.status)}>{i.status}</AdminBadge>
                    </td>
                    <td>{i.retryCount}</td>
                    <td>{new Date(i.startedAt).toLocaleString()}</td>
                    <td className="space-x-1">
                      <AdminButton size="sm" variant="ghost" onClick={() => setSelectedInstanceId(i.id)}>
                        Steps
                      </AdminButton>
                      {i.status === "running" && (
                        <AdminButton size="sm" variant="outline" onClick={() => void pauseWorkflow(i.id).then(refresh)}>
                          Pause
                        </AdminButton>
                      )}
                      {i.status === "paused" && (
                        <AdminButton size="sm" variant="outline" onClick={() => void resumeWorkflow(i.id).then(refresh)}>
                          Resume
                        </AdminButton>
                      )}
                      {!["completed", "cancelled"].includes(i.status) && (
                        <AdminButton size="sm" variant="ghost" onClick={() => void cancelWorkflow(i.id).then(refresh)}>
                          Cancel
                        </AdminButton>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminCard>
          {selectedInstanceId && (
            <AdminCard>
              <strong className="text-sm">Step log · {selectedInstanceId.slice(0, 8)}</strong>
              <ul className="mt-2 space-y-1 text-sm">
                {steps.map((s) => (
                  <li key={s.id}>
                    <AdminBadge variant={statusVariant(s.status)}>{s.status}</AdminBadge>{" "}
                    <span className="font-medium">{s.nodeType}</span> · {s.nodeId}
                    {s.error ? <span className="text-admin-danger"> — {s.error}</span> : null}
                  </li>
                ))}
              </ul>
            </AdminCard>
          )}
        </div>
      )}

      {tab === "dlq" && (
        <AdminCard>
          <strong className="text-sm">Dead letter queue</strong>
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-admin-muted">
                <th className="py-2">Reason</th>
                <th>Status</th>
                <th>Retries</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {dlq.map((d) => (
                <tr key={d.id} className="border-t border-admin-border/40">
                  <td className="py-2">{d.reason ?? "—"}</td>
                  <td>
                    <AdminBadge variant={statusVariant(d.status)}>{d.status}</AdminBadge>
                  </td>
                  <td>{d.retryCount}</td>
                  <td className="space-x-1">
                    <AdminButton size="sm" variant="ghost" onClick={() => void retryDeadLetter(d.id).then(refresh)}>
                      Retry
                    </AdminButton>
                    <AdminButton size="sm" variant="outline" onClick={() => void cancelDeadLetter(d.id).then(refresh)}>
                      Cancel
                    </AdminButton>
                  </td>
                </tr>
              ))}
              {!dlq.length && (
                <tr>
                  <td colSpan={4} className="py-4 text-admin-muted">
                    No open dead letters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </AdminCard>
      )}

      {tab === "analytics" && analytics && (
        <div className="space-y-4">
          <div className="kb-metric-grid">
            <Metric label="Executions" value={analytics.executions} />
            <Metric label="Success %" value={analytics.successRate} />
            <Metric label="Failure %" value={analytics.failureRate} />
            <Metric label="Avg duration" value={analytics.avgDurationSeconds} />
            <Metric label="Retries" value={analytics.retries} />
            <Metric label="Notify %" value={analytics.notificationSuccessRate} />
          </div>
          {analytics.mostUsed.length > 0 && (
            <AdminChart
              title="Most used workflows"
              data={analytics.mostUsed.map((m) => ({ label: m.code, value: m.count }))}
            />
          )}
          {analytics.departmentWorkload.length > 0 && (
            <AdminChart
              title="Department workload"
              data={analytics.departmentWorkload.map((d) => ({
                label: d.department,
                value: d.count,
              }))}
            />
          )}
        </div>
      )}

      {tab === "settings" && (
        <AdminCard>
          <strong className="text-sm">Automation settings</strong>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <AdminInput
              label="Max retries"
              value={settingsForm.maxRetries}
              onChange={(e) => setSettingsForm({ ...settingsForm, maxRetries: e.target.value })}
            />
            <AdminInput
              label="Default timeout (min)"
              value={settingsForm.defaultTimeoutMinutes}
              onChange={(e) =>
                setSettingsForm({ ...settingsForm, defaultTimeoutMinutes: e.target.value })
              }
            />
            <AdminSelect
              label="Enable automation"
              value={settingsForm.enableAutomation}
              onChange={(v) => setSettingsForm({ ...settingsForm, enableAutomation: v })}
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
                  maxRetries: Number(settingsForm.maxRetries),
                  defaultTimeoutMinutes: Number(settingsForm.defaultTimeoutMinutes),
                  enableAutomation: settingsForm.enableAutomation === "true",
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
