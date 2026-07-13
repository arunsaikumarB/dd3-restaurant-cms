import { useEffect, useState } from "react";
import AdminCard from "../ui/Card";
import AdminBadge from "../ui/Badge";
import AdminButton from "../ui/Button";
import AdminInput from "../ui/Input";
import AdminSelect from "../ui/Select";
import AdminTextarea from "../ui/Textarea";
import {
  acceptTransfer,
  buildAgentAssist,
  completeTransfer,
  downloadTranscriptFilename,
  getHandoffAnalytics,
  getHandoffDashboard,
  getLiveTranscript,
  getTransfer,
  listCallbacks,
  listCallTasks,
  listDepartments,
  listEscalationRules,
  listEscalations,
  listLiveAgents,
  listTransfers,
  listWaitingTransfers,
  markCallbackDone,
  missTransferAndCallback,
  searchTranscript,
  transcriptToText,
  updateAgentStatus,
  upsertEscalationRule,
  upsertLiveAgent,
  type AgentAssistBundle,
  type CallbackQueueItem,
  type EscalationRule,
  type HandoffAnalyticsSnapshot,
  type HandoffDashboardSnapshot,
  type VoiceDepartment,
  type VoiceEscalation,
  type VoiceLiveAgent,
  type VoiceTransfer,
} from "../../../services/voice";

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="kb-metric">
      <p className="kb-metric__label">{label}</p>
      <p className="kb-metric__value">{value}</p>
    </div>
  );
}

type Props = {
  outlet: string;
  tab: string;
  showToast: (message: string, variant?: "success" | "error") => void;
};

export default function VoiceHandoffPanels({ outlet, tab, showToast }: Props) {
  const [dashboard, setDashboard] = useState<HandoffDashboardSnapshot | null>(null);
  const [analytics, setAnalytics] = useState<HandoffAnalyticsSnapshot | null>(null);
  const [departments, setDepartments] = useState<VoiceDepartment[]>([]);
  const [rules, setRules] = useState<EscalationRule[]>([]);
  const [agents, setAgents] = useState<VoiceLiveAgent[]>([]);
  const [escalations, setEscalations] = useState<VoiceEscalation[]>([]);
  const [waiting, setWaiting] = useState<VoiceTransfer[]>([]);
  const [transfers, setTransfers] = useState<VoiceTransfer[]>([]);
  const [callbacks, setCallbacks] = useState<CallbackQueueItem[]>([]);
  const [tasks, setTasks] = useState<Awaited<ReturnType<typeof listCallTasks>>>([]);
  const [selectedTransferId, setSelectedTransferId] = useState("");
  const [activeTransfer, setActiveTransfer] = useState<VoiceTransfer | null>(null);
  const [assist, setAssist] = useState<AgentAssistBundle | null>(null);
  const [transcriptQuery, setTranscriptQuery] = useState("");
  const [transcriptLines, setTranscriptLines] = useState<
    Awaited<ReturnType<typeof getLiveTranscript>>
  >([]);
  const [agentName, setAgentName] = useState("Front Desk Host");
  const [agentDept, setAgentDept] = useState("host");
  const [agentRole, setAgentRole] = useState("host");
  const [wrapNotes, setWrapNotes] = useState("");

  const refresh = async () => {
    const [d, a, deps, r, ag, esc, w, tr, cb, tk] = await Promise.all([
      getHandoffDashboard(outlet),
      getHandoffAnalytics(outlet),
      listDepartments(outlet),
      listEscalationRules(outlet),
      listLiveAgents(outlet),
      listEscalations(outlet, 40),
      listWaitingTransfers(outlet),
      listTransfers(outlet, 40),
      listCallbacks(outlet, 40),
      listCallTasks(outlet, 40),
    ]);
    setDashboard(d);
    setAnalytics(a);
    setDepartments(deps);
    setRules(r);
    setAgents(ag);
    setEscalations(esc);
    setWaiting(w);
    setTransfers(tr);
    setCallbacks(cb);
    setTasks(tk);
  };

  useEffect(() => {
    void refresh();
  }, [outlet, tab]);

  useEffect(() => {
    if (!selectedTransferId) {
      setActiveTransfer(null);
      setAssist(null);
      setTranscriptLines([]);
      return;
    }
    void (async () => {
      const t = await getTransfer(selectedTransferId);
      setActiveTransfer(t);
      if (t) {
        setAssist(buildAgentAssist(t.contextPayload));
        const lines = await getLiveTranscript(t.sessionId);
        setTranscriptLines(lines);
      }
    })();
  }, [selectedTransferId]);

  if (tab === "human_handoff") {
    return (
      <AdminCard>
        <h3 className="mb-3 text-sm font-semibold">Human Handoff</h3>
        <p className="mb-3 text-sm opacity-80">
          Cheffy recommends or queues staff collaboration without disconnecting. Full conversation, CRM,
          reservation progress, and AI summary transfer with every handoff.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Escalations (open)" value={dashboard?.escalated ?? 0} />
          <Metric label="Waiting transfers" value={dashboard?.waitingTransfers ?? 0} />
          <Metric label="Agents available" value={dashboard?.agentsAvailable ?? 0} />
          <Metric label="Avg wait (ms)" value={dashboard?.averageWaitMs ?? 0} />
        </div>
        <AdminButton className="mt-3" variant="outline" onClick={() => void refresh()}>
          Refresh
        </AdminButton>
      </AdminCard>
    );
  }

  if (tab === "transfer_rules") {
    return (
      <AdminCard>
        <h3 className="mb-3 text-sm font-semibold">Transfer Rules</h3>
        <ul className="max-h-96 space-y-2 overflow-auto text-sm">
          {rules.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2 border-b border-admin-border/30 pb-2">
              <AdminBadge variant={r.enabled ? "success" : "outline"}>{r.code}</AdminBadge>
              <span>{r.name}</span>
              <span className="opacity-60">→ {r.departmentCode}</span>
              <span className="opacity-60">P{r.priority}</span>
              <span className="opacity-60">{r.transferMode}</span>
              <AdminButton
                size="sm"
                variant="outline"
                onClick={async () => {
                  await upsertEscalationRule({
                    id: r.id,
                    locationId: outlet,
                    code: r.code,
                    name: r.name,
                    triggers: r.triggers,
                    departmentCode: r.departmentCode,
                    priority: r.priority,
                    transferMode: r.transferMode,
                    autoQueue: r.autoQueue,
                    enabled: !r.enabled,
                  });
                  showToast(r.enabled ? "Rule disabled" : "Rule enabled");
                  void refresh();
                }}
              >
                {r.enabled ? "Disable" : "Enable"}
              </AdminButton>
            </li>
          ))}
          {!rules.length && (
            <li className="opacity-60">No rules yet — apply migration 053 to seed defaults.</li>
          )}
        </ul>
      </AdminCard>
    );
  }

  if (tab === "departments") {
    return (
      <AdminCard>
        <h3 className="mb-3 text-sm font-semibold">Departments</h3>
        <ul className="space-y-2 text-sm">
          {departments.map((d) => (
            <li key={d.id}>
              <AdminBadge variant="info">{d.code}</AdminBadge> {d.name}
              {d.description ? <span className="opacity-60"> — {d.description}</span> : null}
            </li>
          ))}
          {!departments.length && <li className="opacity-60">Apply migration 053 to seed departments.</li>}
        </ul>
      </AdminCard>
    );
  }

  if (tab === "staff_routing") {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Staff Routing</h3>
          <AdminInput label="Display name" value={agentName} onChange={(e) => setAgentName(e.target.value)} />
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <AdminSelect
              label="Department"
              value={agentDept}
              onChange={setAgentDept}
              options={(departments.length ? departments : [{ code: "host", name: "Host" }]).map((d) => ({
                value: "code" in d ? d.code : "host",
                label: "name" in d ? d.name : "Host",
              }))}
            />
            <AdminSelect
              label="Role"
              value={agentRole}
              onChange={setAgentRole}
              options={[
                { value: "super_admin", label: "Super Admin" },
                { value: "manager", label: "Manager" },
                { value: "host", label: "Host" },
                { value: "reservations", label: "Reservations" },
                { value: "support", label: "Support" },
                { value: "catering", label: "Catering" },
                { value: "events", label: "Events" },
                { value: "staff", label: "Staff" },
              ]}
            />
          </div>
          <AdminButton
            className="mt-3"
            onClick={async () => {
              const a = await upsertLiveAgent({
                locationId: outlet,
                displayName: agentName,
                departmentCode: agentDept,
                role: agentRole as VoiceLiveAgent["role"],
                status: "available",
              });
              showToast(a ? "Agent saved & available" : "Could not save agent", a ? "success" : "error");
              void refresh();
            }}
          >
            Register / update agent
          </AdminButton>
        </AdminCard>
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Live agents</h3>
          <ul className="max-h-80 space-y-2 overflow-auto text-sm">
            {agents.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2">
                <AdminBadge variant={a.status === "available" ? "success" : "outline"}>{a.status}</AdminBadge>
                {a.displayName} · {a.departmentCode} · {a.role}
                <AdminButton
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await updateAgentStatus(a.id, a.status === "available" ? "offline" : "available");
                    void refresh();
                  }}
                >
                  {a.status === "available" ? "Go offline" : "Go available"}
                </AdminButton>
              </li>
            ))}
            {!agents.length && <li className="opacity-60">No agents registered for this outlet.</li>}
          </ul>
        </AdminCard>
      </div>
    );
  }

  if (tab === "live_calls") {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Live Collaboration Dashboard</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Metric label="AI handling" value={dashboard?.aiHandling ?? 0} />
            <Metric label="Escalated" value={dashboard?.escalated ?? 0} />
            <Metric label="Waiting" value={dashboard?.waitingTransfers ?? 0} />
            <Metric label="Transferred" value={dashboard?.transferred ?? 0} />
            <Metric label="Completed" value={dashboard?.completed ?? 0} />
            <Metric label="Avg wait ms" value={dashboard?.averageWaitMs ?? 0} />
          </div>
          <h4 className="mb-2 mt-4 text-xs font-semibold uppercase opacity-70">Waiting transfers</h4>
          <ul className="max-h-64 space-y-2 overflow-auto text-sm">
            {waiting.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-2">
                <AdminBadge variant="warning">{t.departmentCode}</AdminBadge>
                {t.contextPayload.customerName ?? "Guest"} · {t.transferMode}
                <AdminButton size="sm" onClick={() => setSelectedTransferId(t.id)}>
                  Open panel
                </AdminButton>
                {agents[0] && (
                  <AdminButton
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const res = await acceptTransfer({
                        transferId: t.id,
                        agentId: agents[0]!.id,
                        acceptedBy: agents[0]!.displayName,
                      });
                      showToast(res.message, res.ok ? "success" : "error");
                      if (res.ok) setSelectedTransferId(t.id);
                      void refresh();
                    }}
                  >
                    Accept
                  </AdminButton>
                )}
              </li>
            ))}
            {!waiting.length && <li className="opacity-60">No waiting transfers.</li>}
          </ul>
        </AdminCard>
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Recent escalations</h3>
          <ul className="max-h-96 space-y-2 overflow-auto text-sm">
            {escalations.map((e) => (
              <li key={e.id}>
                <AdminBadge variant="info">{e.status}</AdminBadge> {e.scenario} · P{e.priority} ·{" "}
                {e.reason.slice(0, 80)}
              </li>
            ))}
            {!escalations.length && <li className="opacity-60">No escalations yet.</li>}
          </ul>
        </AdminCard>
      </div>
    );
  }

  if (tab === "agent_assist") {
    const lines = searchTranscript(transcriptLines, transcriptQuery);
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Live Agent Panel</h3>
          <AdminSelect
            label="Transfer"
            value={selectedTransferId}
            onChange={setSelectedTransferId}
            options={[
              { value: "", label: "Select a transfer…" },
              ...transfers.map((t) => ({
                value: t.id,
                label: `${t.id.slice(0, 8)} · ${t.status} · ${t.contextPayload.customerName ?? "Guest"}`,
              })),
            ]}
          />
          {activeTransfer && (
            <div className="mt-3 space-y-2 text-sm">
              <p>
                <strong>{activeTransfer.contextPayload.customerName ?? "Guest"}</strong> ·{" "}
                {activeTransfer.contextPayload.phone ?? "no phone"} ·{" "}
                {activeTransfer.contextPayload.language ?? "en"}
              </p>
              <p className="opacity-80">Goal: {activeTransfer.contextPayload.currentGoal ?? "—"}</p>
              <p className="opacity-80">Planner: {activeTransfer.contextPayload.plannerGoal ?? "—"}</p>
              <p className="opacity-80">
                Reservation: {activeTransfer.contextPayload.reservationStatus ?? "—"}{" "}
                {activeTransfer.contextPayload.confirmationCode ?? ""}
              </p>
              <p className="opacity-80">AI summary: {activeTransfer.contextPayload.aiSummary}</p>
              <p className="opacity-80">
                Next: {activeTransfer.contextPayload.suggestedNextAction}
              </p>
              <AdminTextarea label="Agent notes" value={wrapNotes} onChange={(e) => setWrapNotes(e.target.value)} rows={2} />
              <div className="flex flex-wrap gap-2">
                <AdminButton
                  onClick={async () => {
                    const { wrapUp } = await completeTransfer({
                      transferId: activeTransfer.id,
                      outcome: "resolved",
                      agentNotes: wrapNotes,
                      agentId: activeTransfer.toAgentId,
                    });
                    showToast(`Wrap-up saved · ${wrapUp.suggestedTasks.join(", ")}`);
                    void refresh();
                  }}
                >
                  Complete + wrap-up
                </AdminButton>
                <AdminButton
                  variant="outline"
                  onClick={async () => {
                    await missTransferAndCallback({ transferId: activeTransfer.id });
                    showToast("Marked missed · callback queued");
                    void refresh();
                  }}
                >
                  Miss → callback
                </AdminButton>
              </div>
            </div>
          )}
        </AdminCard>
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">AI Agent Assist (silent)</h3>
          {assist ? (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase opacity-60">Suggested responses</p>
                <ul className="list-disc pl-5">
                  {assist.suggestedResponses.map((s: string) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase opacity-60">Policies</p>
                <ul className="list-disc pl-5">
                  {assist.policyReferences.map((s: string) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase opacity-60">History / reservation</p>
                <ul className="list-disc pl-5">
                  {[...assist.customerHistory, ...assist.reservationInfo].map((s: string) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-sm opacity-60">Accept or select a transfer to see assist.</p>
          )}
          <h4 className="mb-2 mt-4 text-xs font-semibold uppercase opacity-70">Live transcript</h4>
          <AdminInput
            label="Search"
            value={transcriptQuery}
            onChange={(e) => setTranscriptQuery(e.target.value)}
          />
          <ul className="mt-2 max-h-48 space-y-1 overflow-auto text-xs">
            {lines.map((l: { id: string; role: string; text: string }) => (
              <li key={l.id}>
                <span className="opacity-60">{l.role}</span> · {l.text}
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-2">
            <AdminButton
              size="sm"
              variant="outline"
              onClick={async () => {
                const text = transcriptToText(lines);
                await navigator.clipboard.writeText(text);
                showToast("Transcript copied");
              }}
            >
              Copy
            </AdminButton>
            <AdminButton
              size="sm"
              variant="outline"
              onClick={() => {
                const text = transcriptToText(lines);
                const blob = new Blob([text], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = downloadTranscriptFilename(activeTransfer?.sessionId ?? "session");
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download
            </AdminButton>
          </div>
        </AdminCard>
      </div>
    );
  }

  if (tab === "escalation_analytics") {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Escalation Analytics</h3>
          {analytics && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label="Total escalations" value={analytics.totalEscalations} />
              <Metric label="Total transfers" value={analytics.totalTransfers} />
              <Metric label="Transfer success" value={`${Math.round(analytics.transferSuccess * 100)}%`} />
              <Metric label="Missed" value={analytics.missedTransfers} />
              <Metric label="Avg wait ms" value={analytics.averageWaitMs} />
              <Metric label="Avg handle ms" value={analytics.averageHandleTimeMs} />
              <Metric label="AI resolution rate" value={`${Math.round(analytics.aiResolutionRate * 100)}%`} />
              <Metric label="Human resolution" value={`${Math.round(analytics.humanResolutionRate * 100)}%`} />
            </div>
          )}
        </AdminCard>
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Recent transfers</h3>
          <ul className="max-h-80 space-y-2 overflow-auto text-sm">
            {transfers.map((t) => (
              <li key={t.id}>
                {t.status} · {t.departmentCode} · wait {t.waitMs}ms ·{" "}
                {t.contextPayload.customerName ?? "Guest"}
              </li>
            ))}
          </ul>
        </AdminCard>
      </div>
    );
  }

  if (tab === "callbacks") {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Callback Queue</h3>
          <ul className="max-h-96 space-y-2 overflow-auto text-sm">
            {callbacks.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2">
                <AdminBadge variant={c.status === "queued" ? "warning" : "success"}>{c.status}</AdminBadge>
                {c.customerName ?? "Guest"} · {c.customerPhone ?? "—"} · {c.reason ?? ""}
                {c.status === "queued" && (
                  <AdminButton
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await markCallbackDone(c.id);
                      showToast("Callback completed");
                      void refresh();
                    }}
                  >
                    Complete
                  </AdminButton>
                )}
              </li>
            ))}
            {!callbacks.length && <li className="opacity-60">No callbacks queued.</li>}
          </ul>
        </AdminCard>
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Staff tasks</h3>
          <ul className="max-h-96 space-y-2 overflow-auto text-sm">
            {tasks.map((t: { id: string; taskType: string; title: string; status: string }) => (
              <li key={t.id}>
                <AdminBadge variant="outline">{t.taskType}</AdminBadge> {t.title} · {t.status}
              </li>
            ))}
            {!tasks.length && <li className="opacity-60">No tasks yet — complete a transfer wrap-up.</li>}
          </ul>
        </AdminCard>
      </div>
    );
  }

  return null;
}
