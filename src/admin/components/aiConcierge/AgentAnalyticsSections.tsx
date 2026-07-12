import { useCallback, useEffect, useMemo, useState } from "react";
import AdminCard from "../ui/Card";
import AdminBadge from "../ui/Badge";
import AdminButton from "../ui/Button";
import AdminInput from "../ui/Input";
import AdminSelect from "../ui/Select";
import AdminChart from "../ui/Chart";
import { useAdminTheme } from "../../context/AdminThemeContext";
import {
  buildConversationReplay,
  exportOpsPdf,
  exportOpsReport,
  generateOpsRecommendations,
  getEscalationAnalytics,
  getGoalAnalytics,
  getHealthDashboard,
  getOpsOverview,
  getPerformanceAnalytics,
  getPlannerAnalytics,
  getQualityAnalytics,
  getRealtimeSnapshot,
  getReflectionOpsAnalytics,
  getToolAnalytics,
  getWorkflow,
  listWorkflows,
  searchWorkflows,
  workflowStageGraph,
  type OpsOverview,
  type ReplayStep,
  type WorkflowRecord,
} from "../../../services/ai/analytics";
import { getCostAnalytics, getFeedbackDashboard, getLatestQuality } from "../../../services/knowledgeIntelligence";

type TabId =
  | "overview"
  | "workflows"
  | "replay"
  | "planner"
  | "tools"
  | "reflection"
  | "escalation"
  | "goals"
  | "performance"
  | "knowledge"
  | "quality"
  | "health"
  | "recommendations"
  | "realtime"
  | "export";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "workflows", label: "Workflow Explorer" },
  { id: "replay", label: "Conversation Replay" },
  { id: "planner", label: "Planner Analytics" },
  { id: "tools", label: "Tool Analytics" },
  { id: "reflection", label: "Reflection Analytics" },
  { id: "escalation", label: "Escalation Analytics" },
  { id: "goals", label: "Goal Analytics" },
  { id: "performance", label: "Performance" },
  { id: "knowledge", label: "Knowledge Analytics" },
  { id: "quality", label: "Quality" },
  { id: "health", label: "AI Health" },
  { id: "recommendations", label: "Recommendations" },
  { id: "realtime", label: "Realtime" },
  { id: "export", label: "Export" },
];

function SectionHeader({ title, description }: { title: string; description?: string }) {
  const { dark } = useAdminTheme();
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && (
        <p className={`mt-1 text-sm ${dark ? "text-white/50" : "text-admin-muted"}`}>{description}</p>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="kb-metric">
      <p className="kb-metric__label">{label}</p>
      <p className="kb-metric__value">{value}</p>
    </div>
  );
}

function WorkflowPipeline({ workflow }: { workflow: WorkflowRecord }) {
  const stages = workflowStageGraph(workflow);
  return (
    <ol className="ki-pipeline">
      {stages.map((s) => (
        <li key={s.label} className={`ki-pipeline__item ki-pipeline__item--${s.status}`}>
          <div className="flex flex-wrap items-center gap-2">
            <AdminBadge variant={s.status === "error" ? "danger" : s.status === "warn" ? "warning" : "success"}>
              {s.label}
            </AdminBadge>
            {s.ms > 0 && <span className="text-xs text-admin-muted">{s.ms}ms</span>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function AgentAnalyticsSection() {
  const [tab, setTab] = useState<TabId>("overview");
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<OpsOverview | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replaySteps, setReplaySteps] = useState<ReplayStep[]>([]);
  const [replayIndex, setReplayIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [planner, setPlanner] = useState<Awaited<ReturnType<typeof getPlannerAnalytics>> | null>(null);
  const [tools, setTools] = useState<Awaited<ReturnType<typeof getToolAnalytics>> | null>(null);
  const [reflection, setReflection] = useState<Awaited<ReturnType<typeof getReflectionOpsAnalytics>> | null>(null);
  const [escalation, setEscalation] = useState<Awaited<ReturnType<typeof getEscalationAnalytics>> | null>(null);
  const [goals, setGoals] = useState<Awaited<ReturnType<typeof getGoalAnalytics>> | null>(null);
  const [perf, setPerf] = useState<Awaited<ReturnType<typeof getPerformanceAnalytics>> | null>(null);
  const [quality, setQuality] = useState<Awaited<ReturnType<typeof getQualityAnalytics>> | null>(null);
  const [health, setHealth] = useState<Awaited<ReturnType<typeof getHealthDashboard>> | null>(null);
  const [recs, setRecs] = useState<Awaited<ReturnType<typeof generateOpsRecommendations>>>([]);
  const [realtime, setRealtime] = useState<Awaited<ReturnType<typeof getRealtimeSnapshot>> | null>(null);
  const [knowledge, setKnowledge] = useState<{
    cost: Awaited<ReturnType<typeof getCostAnalytics>> | null;
    feedback: Awaited<ReturnType<typeof getFeedbackDashboard>> | null;
    quality: Awaited<ReturnType<typeof getLatestQuality>> | null;
  }>({ cost: null, feedback: null, quality: null });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, wf] = await Promise.all([getOpsOverview(), listWorkflows(80)]);
      setOverview(ov);
      setWorkflows(wf);
      setSelectedId((prev) => prev ?? wf[0]?.workflowId ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Agent Analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (tab === "overview" || tab === "workflows") return;
    void (async () => {
      if (tab === "planner") setPlanner(await getPlannerAnalytics());
      if (tab === "tools") setTools(await getToolAnalytics());
      if (tab === "reflection") setReflection(await getReflectionOpsAnalytics());
      if (tab === "escalation") setEscalation(await getEscalationAnalytics());
      if (tab === "goals") setGoals(await getGoalAnalytics());
      if (tab === "performance") setPerf(await getPerformanceAnalytics());
      if (tab === "quality") setQuality(await getQualityAnalytics());
      if (tab === "health") setHealth(await getHealthDashboard());
      if (tab === "recommendations") setRecs(await generateOpsRecommendations());
      if (tab === "realtime") setRealtime(await getRealtimeSnapshot());
      if (tab === "knowledge") {
        const [cost, feedback, q] = await Promise.all([
          getCostAnalytics().catch(() => null),
          getFeedbackDashboard().catch(() => null),
          getLatestQuality().catch(() => null),
        ]);
        setKnowledge({ cost, feedback, quality: q });
      }
      if (tab === "replay" && selectedId) {
        const replay = await buildConversationReplay(selectedId);
        setReplaySteps(replay?.steps ?? []);
        setReplayIndex(0);
      }
    })();
  }, [tab, selectedId]);

  useEffect(() => {
    if (tab !== "realtime") return;
    const id = window.setInterval(() => {
      void getRealtimeSnapshot().then(setRealtime);
    }, 15000);
    return () => window.clearInterval(id);
  }, [tab]);

  const selected = useMemo(
    () => workflows.find((w) => w.workflowId === selectedId) ?? null,
    [workflows, selectedId],
  );

  const runSearch = async () => {
    const rows = await searchWorkflows({ query, limit: 100 });
    setWorkflows(rows);
    if (rows[0]) setSelectedId(rows[0].workflowId);
  };

  const openReplay = async (id: string) => {
    setSelectedId(id);
    setTab("replay");
    const full = await getWorkflow(id);
    if (full) {
      setWorkflows((prev) => {
        const others = prev.filter((w) => w.workflowId !== id);
        return [full, ...others];
      });
    }
    const replay = await buildConversationReplay(id);
    setReplaySteps(replay?.steps ?? []);
    setReplayIndex(0);
  };

  return (
    <AdminCard id="ai-section-agent-analytics" className="ai-concierge-section">
      <SectionHeader
        title="Agent Analytics — AI Operations Center"
        description="Observe, replay, and optimize every Cheffy workflow. Read-only over Planner, Orchestrator, Reflection, RAG, and Gemini."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              tab === t.id
                ? "border-admin-accent bg-admin-accent/15 text-admin-accent"
                : "border-admin-border/50 text-admin-muted hover:border-admin-accent/40"
            }`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <AdminButton variant="secondary" onClick={() => void refresh()} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </AdminButton>
      </div>

      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      {tab === "overview" && overview && (
        <div className="space-y-4">
          <div className="kb-metric-grid">
            <Metric label="Workflows" value={overview.totalWorkflows} />
            <Metric label="Success Rate" value={`${overview.successRate}%`} />
            <Metric label="Avg Confidence" value={overview.avgConfidence} />
            <Metric label="Avg Latency" value={`${overview.avgTotalMs}ms`} />
            <Metric label="Escalation Rate" value={`${overview.escalationRate}%`} />
            <Metric label="Clarification Rate" value={`${overview.clarificationRate}%`} />
            <Metric label="Active Conversations" value={overview.activeConversations} />
            <Metric label="Health Score" value={overview.healthScore} />
          </div>
          <AdminCard padding="sm">
            <strong className="text-sm">Recent Workflows</strong>
            <ul className="mt-2 space-y-2 text-xs">
              {overview.recentWorkflows.map((w) => (
                <li key={w.workflowId} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {w.messagePreview.slice(0, 80) || w.intent} · {w.intent} · {w.timings.totalMs}ms
                  </span>
                  <AdminButton variant="secondary" onClick={() => void openReplay(w.workflowId)}>
                    Replay
                  </AdminButton>
                </li>
              ))}
              {!overview.recentWorkflows.length && (
                <li>No workflows yet — guest chats populate this after migration 043.</li>
              )}
            </ul>
          </AdminCard>
        </div>
      )}

      {tab === "workflows" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <AdminInput
              label="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Conversation, intent, goal…"
            />
            <div className="flex items-end">
              <AdminButton onClick={() => void runSearch()}>Search</AdminButton>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <AdminCard padding="sm">
              <strong className="text-sm">Workflows</strong>
              <ul className="mt-2 max-h-96 space-y-2 overflow-auto text-xs">
                {workflows.map((w) => (
                  <li key={w.workflowId}>
                    <button
                      type="button"
                      className={`w-full rounded-md border px-2 py-2 text-left ${
                        selectedId === w.workflowId ? "border-admin-accent" : "border-admin-border/40"
                      }`}
                      onClick={() => setSelectedId(w.workflowId)}
                    >
                      <div className="font-medium">{w.messagePreview.slice(0, 90) || "(empty)"}</div>
                      <div className="text-admin-muted">
                        {w.intent} · {w.goal} · conf {w.confidence ?? "—"} · {w.timings.totalMs}ms
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </AdminCard>
            <AdminCard padding="sm">
              <strong className="text-sm">Execution Graph</strong>
              {selected ? (
                <div className="mt-3 space-y-3">
                  <WorkflowPipeline workflow={selected} />
                  <div className="kb-metric-grid">
                    <Metric label="Total" value={`${selected.timings.totalMs}ms`} />
                    <Metric label="Tools" value={`${selected.timings.toolMs}ms`} />
                    <Metric label="Gemini" value={`${selected.timings.geminiMs}ms`} />
                    <Metric label="Reflection" value={`${selected.timings.reflectionMs}ms`} />
                  </div>
                  <AdminButton onClick={() => void openReplay(selected.workflowId)}>Open Replay</AdminButton>
                </div>
              ) : (
                <p className="mt-2 text-sm text-admin-muted">Select a workflow</p>
              )}
            </AdminCard>
          </div>
        </div>
      )}

      {tab === "replay" && (
        <div className="space-y-4">
          <AdminSelect
            label="Conversation / workflow"
            value={selectedId ?? ""}
            onChange={(v) => void openReplay(v)}
            options={workflows.map((w) => ({
              value: w.workflowId,
              label: `${w.messagePreview.slice(0, 60) || w.intent} (${w.workflowId.slice(0, 8)})`,
            }))}
          />
          {selected && <WorkflowPipeline workflow={selected} />}
          <div className="flex flex-wrap gap-2">
            <AdminButton
              variant="secondary"
              disabled={replayIndex <= 0}
              onClick={() => setReplayIndex((i) => Math.max(0, i - 1))}
            >
              Previous step
            </AdminButton>
            <AdminButton
              disabled={replayIndex >= replaySteps.length - 1}
              onClick={() => setReplayIndex((i) => Math.min(replaySteps.length - 1, i + 1))}
            >
              Next step
            </AdminButton>
            <AdminBadge variant="info">
              Step {replaySteps.length ? replayIndex + 1 : 0}/{replaySteps.length}
            </AdminBadge>
          </div>
          {replaySteps[replayIndex] && (
            <AdminCard padding="sm">
              <div className="flex flex-wrap items-center gap-2">
                <strong>{replaySteps[replayIndex]!.label}</strong>
                <AdminBadge
                  variant={
                    replaySteps[replayIndex]!.status === "error"
                      ? "danger"
                      : replaySteps[replayIndex]!.status === "warn"
                        ? "warning"
                        : "success"
                  }
                >
                  {replaySteps[replayIndex]!.status}
                </AdminBadge>
                <span className="text-xs text-admin-muted">{replaySteps[replayIndex]!.durationMs}ms</span>
              </div>
              <p className="mt-2 text-sm">{replaySteps[replayIndex]!.summary}</p>
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-admin-muted">Step payload</summary>
                <pre className="mt-1 max-h-64 overflow-auto text-xs whitespace-pre-wrap">
                  {JSON.stringify(replaySteps[replayIndex]!.data, null, 2)}
                </pre>
              </details>
            </AdminCard>
          )}
          {!replaySteps.length && (
            <p className="text-sm text-admin-muted">Select a workflow to replay step-by-step.</p>
          )}
        </div>
      )}

      {tab === "planner" && planner && (
        <div className="space-y-4">
          <div className="kb-metric-grid">
            <Metric label="Plans" value={planner.totalPlans} />
            <Metric label="Avg Confidence" value={planner.avgConfidence} />
            <Metric label="Clarification Rate" value={`${planner.clarificationRate}%`} />
            <Metric label="Escalation Rate" value={`${planner.escalationRate}%`} />
            <Metric label="Unknown Intents" value={planner.unknownIntents} />
          </div>
          {planner.intentDistribution.length > 0 && (
            <AdminChart title="Intent Distribution" data={planner.intentDistribution.slice(0, 10)} />
          )}
          {planner.goalDistribution.length > 0 && (
            <AdminChart title="Goal Distribution" data={planner.goalDistribution.slice(0, 10)} />
          )}
          {planner.plannerTrends.length > 0 && (
            <AdminChart title="Planner Trends" data={planner.plannerTrends} type="area" />
          )}
          <AdminCard padding="sm">
            <strong className="text-sm">Most Complex Requests</strong>
            <ul className="mt-2 list-disc pl-5 text-xs space-y-1">
              {planner.mostComplexRequests.length
                ? planner.mostComplexRequests.map((r) => <li key={r}>{r}</li>)
                : <li>None</li>}
            </ul>
          </AdminCard>
        </div>
      )}

      {tab === "tools" && tools && (
        <div className="space-y-4">
          <div className="kb-metric-grid">
            <Metric label="Executions" value={tools.totalExecutions} />
            <Metric label="Success Rate" value={`${tools.overallSuccessRate}%`} />
            <Metric label="Failure Rate" value={`${tools.overallFailureRate}%`} />
            <Metric label="Avg Duration" value={`${tools.avgDurationMs}ms`} />
            <Metric label="Cache Hit Rate" value={`${tools.cacheHitRate}%`} />
            <Metric label="Most Used" value={tools.mostUsed ?? "—"} />
            <Metric label="Parallel Runs" value={tools.parallelFrequency} />
            <Metric label="Sequential Runs" value={tools.sequentialFrequency} />
          </div>
          <div className="space-y-2">
            {tools.perTool.map((t) => (
              <AdminCard key={t.toolId} padding="sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <strong className="text-sm">{t.toolId}</strong>
                  <span className="text-xs text-admin-muted">
                    {t.executions} runs · {t.successRate}% ok · {t.avgDurationMs}ms · retries {t.retries} ·
                    timeouts {t.timeouts}
                  </span>
                </div>
              </AdminCard>
            ))}
            {!tools.perTool.length && <p className="text-sm text-admin-muted">No tool executions yet.</p>}
          </div>
        </div>
      )}

      {tab === "reflection" && reflection && (
        <div className="space-y-4">
          <div className="kb-metric-grid">
            <Metric label="Avg Confidence" value={reflection.averageConfidence} />
            <Metric label="Reflection Score" value={reflection.averageReflectionScore} />
            <Metric label="Clarification Rate" value={`${reflection.clarificationRate}%`} />
            <Metric label="Escalation Rate" value={`${reflection.escalationRate}%`} />
            <Metric label="Fallback Rate" value={`${reflection.fallbackRate}%`} />
            <Metric label="Goal Completion" value={`${reflection.goalCompletionRate}%`} />
          </div>
          {reflection.confidenceTrend.length > 0 && (
            <AdminChart title="Confidence Trend" data={reflection.confidenceTrend} type="area" />
          )}
          <AdminCard padding="sm">
            <strong className="text-sm">Low Confidence Topics</strong>
            <ul className="mt-2 list-disc pl-5 text-xs space-y-1">
              {reflection.lowConfidenceTopics.length
                ? reflection.lowConfidenceTopics.map((t) => <li key={t}>{t}</li>)
                : <li>None</li>}
            </ul>
          </AdminCard>
        </div>
      )}

      {tab === "escalation" && escalation && (
        <div className="space-y-4">
          <div className="kb-metric-grid">
            <Metric label="Escalations" value={escalation.total} />
            <Metric label="Pending" value={escalation.pending} />
            <Metric label="Repeated" value={escalation.repeated} />
          </div>
          {escalation.byReason.length > 0 && (
            <AdminChart title="Reasons" data={escalation.byReason.slice(0, 8)} />
          )}
          {escalation.byDepartment.length > 0 && (
            <AdminChart title="Departments" data={escalation.byDepartment} />
          )}
          {escalation.byPriority.length > 0 && (
            <AdminChart title="Priority" data={escalation.byPriority} />
          )}
        </div>
      )}

      {tab === "goals" && goals && (
        <div className="space-y-4">
          <div className="kb-metric-grid">
            <Metric label="Completed" value={goals.completed} />
            <Metric label="Incomplete" value={goals.incomplete} />
            <Metric label="Abandoned" value={goals.abandoned} />
            <Metric label="Completion Rate" value={`${goals.averageCompletion}%`} />
            <Metric label="Avg Progress" value={`${goals.averageCompletionPercent}%`} />
          </div>
          {goals.mostCommonGoals.length > 0 && (
            <AdminChart title="Most Common Goals" data={goals.mostCommonGoals} />
          )}
        </div>
      )}

      {tab === "performance" && perf && (
        <div className="space-y-4">
          <div className="kb-metric-grid">
            <Metric label="Planner" value={`${perf.avgPlannerMs}ms`} />
            <Metric label="Tools" value={`${perf.avgToolMs}ms`} />
            <Metric label="Retrieval" value={`${perf.avgRetrievalMs}ms`} />
            <Metric label="Aggregation" value={`${perf.avgAggregationMs}ms`} />
            <Metric label="Gemini" value={`${perf.avgGeminiMs}ms`} />
            <Metric label="Reflection" value={`${perf.avgReflectionMs}ms`} />
            <Metric label="Total" value={`${perf.avgTotalMs}ms`} />
          </div>
          {perf.bottlenecks.length > 0 && (
            <AdminChart
              title="Bottlenecks"
              data={perf.bottlenecks.map((b) => ({ label: b.stage, value: b.avgMs }))}
            />
          )}
          <AdminCard padding="sm">
            <strong className="text-sm">AI Bottleneck Detection</strong>
            <ul className="mt-2 list-disc pl-5 text-xs space-y-1">
              {perf.detections.length ? perf.detections.map((d) => <li key={d}>{d}</li>) : <li>No bottlenecks detected</li>}
            </ul>
          </AdminCard>
        </div>
      )}

      {tab === "knowledge" && (
        <div className="space-y-4">
          <div className="kb-metric-grid">
            <Metric
              label="Est. Monthly Cost"
              value={
                knowledge.cost?.estimatedMonthlyCost != null
                  ? `$${knowledge.cost.estimatedMonthlyCost}`
                  : "—"
              }
            />
            <Metric
              label="Feedback Events"
              value={
                knowledge.feedback
                  ? Object.values(knowledge.feedback.totals).reduce((a, b) => a + b, 0)
                  : "—"
              }
            />
            <Metric label="Quality Score" value={knowledge.quality?.overall_score ?? "—"} />
            <Metric label="Hallucination Risk" value={knowledge.quality?.hallucination_risk ?? "—"} />
          </div>
          <p className="text-xs text-admin-muted">
            Knowledge metrics reuse existing Knowledge Intelligence tables — no schema redesign.
          </p>
        </div>
      )}

      {tab === "quality" && quality && (
        <div className="space-y-4">
          <div className="kb-metric-grid">
            <Metric label="Answer Quality" value={quality.answerQualityScore} />
            <Metric label="Avg Confidence" value={quality.avgConfidence} />
            <Metric label="Knowledge Coverage" value={quality.avgKnowledgeCoverage} />
            <Metric label="Hallucination Risk" value={quality.avgHallucinationRisk} />
            <Metric label="Successful" value={quality.successfulConversations} />
            <Metric label="Incomplete" value={quality.incompleteConversations} />
            <Metric label="Repeated Clarifications" value={quality.repeatedClarifications} />
          </div>
        </div>
      )}

      {tab === "health" && health && (
        <div className="space-y-4">
          <div className="kb-metric-grid">
            <Metric label="Overall Health" value={health.overallScore} />
            <Metric label="Status" value={health.overallStatus} />
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {health.components.map((c) => (
              <AdminCard key={c.component} padding="sm">
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-sm">{c.component}</strong>
                  <AdminBadge
                    variant={
                      c.status === "healthy" ? "success" : c.status === "degraded" ? "warning" : "danger"
                    }
                  >
                    {c.status}
                  </AdminBadge>
                </div>
                <p className="mt-2 text-xs text-admin-muted">
                  Score {c.healthScore.toFixed(1)} · avail {c.availability.toFixed(1)}% · fail{" "}
                  {c.failureRate.toFixed(1)}% · {c.avgLatencyMs}ms · warnings {c.warnings}
                </p>
              </AdminCard>
            ))}
          </div>
        </div>
      )}

      {tab === "recommendations" && (
        <div className="space-y-3">
          <AdminButton variant="secondary" onClick={() => void generateOpsRecommendations().then(setRecs)}>
            Regenerate
          </AdminButton>
          {recs.map((r) => (
            <AdminCard key={r.id} padding="sm">
              <div className="flex flex-wrap items-center gap-2">
                <strong className="text-sm">{r.title}</strong>
                <AdminBadge variant={r.priority === "high" ? "danger" : r.priority === "medium" ? "warning" : "default"}>
                  {r.priority}
                </AdminBadge>
                <AdminBadge variant="outline">{r.type}</AdminBadge>
              </div>
              <p className="mt-1 text-sm text-admin-muted">{r.reason}</p>
            </AdminCard>
          ))}
        </div>
      )}

      {tab === "realtime" && realtime && (
        <div className="space-y-4">
          <div className="kb-metric-grid">
            <Metric label="Current Conversations" value={realtime.currentConversations} />
            <Metric label="Planner Jobs (15m)" value={realtime.recentPlannerJobs} />
            <Metric label="Tool Executions" value={realtime.recentToolExecutions} />
            <Metric label="RAG Queries" value={realtime.recentRagQueries} />
            <Metric label="Escalations" value={realtime.recentEscalations} />
            <Metric label="Failures" value={realtime.recentFailures} />
            <Metric label="Avg Response" value={`${realtime.avgResponseMs}ms`} />
            <Metric label="Live Health" value={realtime.healthScore} />
          </div>
          <p className="text-xs text-admin-muted">Auto-refreshes every 15s · updated {realtime.updatedAt}</p>
        </div>
      )}

      {tab === "export" && (
        <div className="space-y-3">
          <p className="text-sm text-admin-muted">Export ops reports as JSON, CSV, or printable PDF.</p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                "workflow",
                "analytics",
                "performance",
                "planner",
                "reflection",
                "escalation",
              ] as const
            ).map((kind) => (
              <AdminButton key={kind} variant="secondary" onClick={() => void exportOpsReport(kind, "json")}>
                {kind} JSON
              </AdminButton>
            ))}
            <AdminButton variant="secondary" onClick={() => void exportOpsReport("workflow", "csv")}>
              Workflows CSV
            </AdminButton>
            <AdminButton onClick={() => void exportOpsPdf("analytics")}>Print / PDF</AdminButton>
          </div>
        </div>
      )}
    </AdminCard>
  );
}
