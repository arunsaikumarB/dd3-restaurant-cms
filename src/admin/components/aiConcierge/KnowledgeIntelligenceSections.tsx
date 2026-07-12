import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminCard from "../ui/Card";
import AdminBadge from "../ui/Badge";
import AdminButton from "../ui/Button";
import AdminInput from "../ui/Input";
import AdminTextarea from "../ui/Textarea";
import AdminSelect from "../ui/Select";
import AdminToggle from "../ui/Toggle";
import { useAdminTheme } from "../../context/AdminThemeContext";
import { LOCATIONS, type LocationId } from "../../../config/locations";
import { SEMANTIC_CATEGORIES, labelForCategory } from "../../../services/rag";
import {
  RELATIONSHIP_TYPES,
  compareSearchLab,
  deleteRelationship,
  exportDebugReport,
  generateRecommendations,
  getCostAnalytics,
  getFeedbackDashboard,
  listAudit,
  listRelationships,
  listValidationFindings,
  refreshQualitySnapshot,
  resolveValidationFinding,
  runKnowledgeDebug,
  runKnowledgeValidation,
  updateRecommendationStatus,
  upsertRelationship,
  listRecommendations,
} from "../../../services/knowledgeIntelligence";
import { listSemanticDocuments, queueSemanticIndex } from "../../../services/rag";
import type { KnowledgeDebugReport } from "../../../types/knowledgeIntelligence";
import type { KnowledgeRelationshipType } from "../../../types/knowledgeIntelligence";
import type { AgentExecutionPlan } from "../../../services/ai/planner/types";
import type { AIConciergePermissions } from "../../../services/aiAdmin/permissions";

type Props = { locationId: LocationId; permissions: AIConciergePermissions; disabled?: boolean };

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

function StagePipeline({ report }: { report: KnowledgeDebugReport }) {
  return (
    <ol className="ki-pipeline">
      {report.stages.map((stage) => (
        <li key={stage.id} className={`ki-pipeline__item ki-pipeline__item--${stage.status}`}>
          <div className="flex flex-wrap items-center gap-2">
            <AdminBadge
              variant={
                stage.status === "ok"
                  ? "success"
                  : stage.status === "error"
                    ? "danger"
                    : stage.status === "warn"
                      ? "warning"
                      : "default"
              }
            >
              {stage.label}
            </AdminBadge>
            <span className="text-xs text-admin-muted">{stage.durationMs}ms</span>
          </div>
          <p className="mt-1 text-sm">{stage.summary}</p>
          {stage.data != null && (
            <details className="mt-1">
              <summary className="cursor-pointer text-xs text-admin-muted">Details</summary>
              <pre className="mt-1 max-h-40 overflow-auto text-xs whitespace-pre-wrap">
                {JSON.stringify(stage.data, null, 2)}
              </pre>
            </details>
          )}
        </li>
      ))}
    </ol>
  );
}

function ChunkTable({ report }: { report: KnowledgeDebugReport }) {
  return (
    <div className="space-y-3">
      {report.chunks.map((chunk, i) => (
        <AdminCard key={chunk.id} padding="sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium">
                #{i + 1} {chunk.documentTitle ?? chunk.documentId.slice(0, 8)}
              </p>
              <p className="text-xs text-admin-muted">
                {labelForCategory(chunk.category as never)} · outlet {chunk.locationId ?? "global"} · chunk{" "}
                {chunk.chunkIndex + 1} · {chunk.tokens} tok · {chunk.reasonSelected}
              </p>
            </div>
            <AdminBadge variant="info">sim {chunk.similarity.toFixed(3)}</AdminBadge>
          </div>
          <details className="mt-2">
            <summary className="cursor-pointer text-sm">Expand chunk</summary>
            <pre className="mt-2 max-h-48 overflow-auto text-xs whitespace-pre-wrap">{chunk.content}</pre>
            {chunk.highlightedText && (
              <p className="mt-2 text-xs text-admin-muted">Match highlights: {chunk.highlightedText}</p>
            )}
          </details>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              className="text-xs text-admin-accent underline"
              to={`/admin/integrations/knowledge-base`}
            >
              Jump to Knowledge Base
            </Link>
            <span className="text-xs text-admin-muted">Doc {chunk.documentId.slice(0, 8)}…</span>
          </div>
        </AdminCard>
      ))}
    </div>
  );
}

function PlannerPanel({ plan }: { plan: AgentExecutionPlan }) {
  return (
    <div className="space-y-3">
      <div className="kb-metric-grid">
        <Metric label="Intent" value={plan.intent} />
        <Metric label="Goal" value={plan.goal} />
        <Metric label="Complexity" value={plan.complexity} />
        <Metric label="Confidence" value={`${plan.confidence} (${plan.confidenceBand})`} />
        <Metric label="Escalate?" value={plan.humanEscalation ? "Recommended" : "No"} />
        <Metric label="Clarify?" value={plan.clarification.required ? "Yes" : "No"} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <AdminCard padding="sm">
          <strong className="text-sm">Knowledge Sources</strong>
          <p className="mt-1 text-sm">{plan.knowledgeSources.join(", ") || "—"}</p>
        </AdminCard>
        <AdminCard padding="sm">
          <strong className="text-sm">Required Tools</strong>
          <p className="mt-1 text-sm">{plan.requiredTools.join(", ") || "none"}</p>
        </AdminCard>
        <AdminCard padding="sm">
          <strong className="text-sm">Clarifications</strong>
          <p className="mt-1 text-sm">
            {plan.clarification.required ? plan.clarification.fields.join(", ") : "None required"}
          </p>
        </AdminCard>
        <AdminCard padding="sm">
          <strong className="text-sm">Workflow</strong>
          <p className="mt-1 text-sm">{plan.workflow.join(" → ")}</p>
        </AdminCard>
      </div>
      <AdminCard padding="sm">
        <strong className="text-sm">Reasoning (admin only)</strong>
        <ul className="mt-2 list-disc pl-5 text-xs space-y-1">
          {plan.reasoning.whyKnowledgeSelected.map((r) => (
            <li key={r}>Knowledge: {r}</li>
          ))}
          {plan.reasoning.whyToolsSelected.map((r) => (
            <li key={r}>Tools: {r}</li>
          ))}
          {plan.reasoning.clarificationReasons.map((r) => (
            <li key={r}>Clarify: {r}</li>
          ))}
          {plan.reasoning.escalationReasons.map((r) => (
            <li key={r}>Escalate: {r}</li>
          ))}
        </ul>
      </AdminCard>
      <details>
        <summary className="cursor-pointer text-sm font-medium">Execution Plan JSON</summary>
        <pre className="mt-2 max-h-64 overflow-auto text-xs whitespace-pre-wrap">
          {JSON.stringify(plan, null, 2)}
        </pre>
      </details>
    </div>
  );
}

export function KnowledgeDebuggerSection({ locationId, permissions, disabled }: Props) {
  const [question, setQuestion] = useState("Can I bring outside cake?");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<KnowledgeDebugReport | null>(null);

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await runKnowledgeDebug({
        question,
        locationId,
        locationName: LOCATIONS[locationId].name,
      });
      setReport(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Debug run failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <AdminCard id="ai-section-knowledge-debugger" className="ai-concierge-section">
      <SectionHeader
        title="Knowledge Debugger"
        description="Inspect every Cheffy pipeline stage for a guest question — explainable AI for operators."
      />
      <AdminTextarea
        label="Customer question"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        rows={2}
        disabled={disabled || !permissions.canRunSandbox}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <AdminButton onClick={() => void run()} disabled={running || disabled || !permissions.canRunSandbox}>
          {running ? "Running full pipeline…" : "Run Complete Pipeline"}
        </AdminButton>
        {report && (
          <AdminButton variant="secondary" onClick={() => exportDebugReport(report)}>
            Export Debug Report
          </AdminButton>
        )}
      </div>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {report && (
        <div className="mt-5 space-y-4">
          <div className="kb-metric-grid">
            <Metric label="Prompt Tokens" value={report.tokens.prompt} />
            <Metric label="Completion Tokens" value={report.tokens.completion} />
            <Metric label="Embedding Time" value={`${report.timings.embeddingMs}ms`} />
            <Metric label="Vector Search" value={`${report.timings.vectorSearchMs}ms`} />
            <Metric label="LLM Time" value={`${report.timings.llmMs}ms`} />
            <Metric label="Total" value={`${report.timings.totalMs}ms`} />
          </div>
          {report.executionPlan != null ? (
            <AdminCard>
              <h3 className="mb-3 text-sm font-semibold">AI Planner Output</h3>
              <PlannerPanel plan={report.executionPlan as AgentExecutionPlan} />
            </AdminCard>
          ) : null}
          <StagePipeline report={report} />
          <div>
            <h3 className="mb-2 text-sm font-semibold">Top Retrieved Chunks</h3>
            <ChunkTable report={report} />
          </div>
          <AdminCard>
            <strong>Final Cheffy Response</strong>
            <p className="mt-2 whitespace-pre-wrap text-sm">{report.response || "—"}</p>
          </AdminCard>
        </div>
      )}
    </AdminCard>
  );
}

export function SearchLabSection({ locationId, permissions, disabled }: Props) {
  const [qA, setQA] = useState("Birthday package options");
  const [qB, setQB] = useState("Can I bring a cake for a birthday?");
  const [threshold, setThreshold] = useState("0.55");
  const [maxChunks, setMaxChunks] = useState("8");
  const [includeRel, setIncludeRel] = useState(true);
  const [includeCms, setIncludeCms] = useState(true);
  const [includeTools, setIncludeTools] = useState(true);
  const [runLlm, setRunLlm] = useState(true);
  const [category, setCategory] = useState("all");
  const [running, setRunning] = useState(false);
  const [single, setSingle] = useState<KnowledgeDebugReport | null>(null);
  const [compare, setCompare] = useState<Awaited<ReturnType<typeof compareSearchLab>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(
    () => ({
      similarityThreshold: Number(threshold) || 0.55,
      maxChunks: Number(maxChunks) || 8,
      categories: category === "all" ? [] : [category],
      locationId,
      includeRelationships: includeRel,
      includeCms,
      includeTools,
      runLlm,
    }),
    [threshold, maxChunks, category, locationId, includeRel, includeCms, includeTools, runLlm],
  );

  return (
    <AdminCard id="ai-section-search-lab" className="ai-concierge-section">
      <SectionHeader
        title="Admin Search Lab"
        description="Advanced retrieval playground with thresholds, sources, and A/B question compare."
      />
      <div className="grid gap-3 md:grid-cols-2">
        <AdminTextarea label="Question A" value={qA} onChange={(e) => setQA(e.target.value)} rows={2} />
        <AdminTextarea label="Question B (compare)" value={qB} onChange={(e) => setQB(e.target.value)} rows={2} />
        <AdminInput label="Similarity threshold" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
        <AdminInput label="Max chunks" value={maxChunks} onChange={(e) => setMaxChunks(e.target.value)} />
        <AdminSelect
          label="Category"
          value={category}
          onChange={setCategory}
          options={[
            { value: "all", label: "All categories" },
            ...SEMANTIC_CATEGORIES.map((c) => ({ value: c.id, label: c.label })),
          ]}
        />
        <div className="space-y-2 pt-6">
          <AdminToggle label="Include relationships" checked={includeRel} onChange={setIncludeRel} />
          <AdminToggle label="Include CMS" checked={includeCms} onChange={setIncludeCms} />
          <AdminToggle label="Include tools" checked={includeTools} onChange={setIncludeTools} />
          <AdminToggle label="Run LLM" checked={runLlm} onChange={setRunLlm} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <AdminButton
          disabled={running || disabled || !permissions.canRunSandbox}
          onClick={() => {
            setRunning(true);
            setError(null);
            void runKnowledgeDebug({ question: qA, locationId, options })
              .then(setSingle)
              .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
              .finally(() => setRunning(false));
          }}
        >
          Run Question A
        </AdminButton>
        <AdminButton
          variant="secondary"
          disabled={running || disabled || !permissions.canRunSandbox}
          onClick={() => {
            setRunning(true);
            setError(null);
            void compareSearchLab(qA, qB, locationId, options)
              .then(setCompare)
              .catch((e) => setError(e instanceof Error ? e.message : "Compare failed"))
              .finally(() => setRunning(false));
          }}
        >
          Compare A vs B
        </AdminButton>
      </div>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {single && (
        <div className="mt-4 space-y-3">
          <ChunkTable report={single} />
          <details>
            <summary className="cursor-pointer font-medium">Final prompt payload</summary>
            <pre className="mt-2 max-h-48 overflow-auto text-xs">{single.promptPreview}</pre>
          </details>
          <AdminCard>
            <strong>Response</strong>
            <p className="mt-2 whitespace-pre-wrap text-sm">{single.response}</p>
          </AdminCard>
        </div>
      )}
      {compare && (
        <div className="mt-4 space-y-3">
          <AdminCard>
            <strong>Differences</strong>
            <ul className="mt-2 list-disc pl-5 text-sm">
              {compare.differences.length ? compare.differences.map((d) => <li key={d}>{d}</li>) : <li>No major differences</li>}
            </ul>
          </AdminCard>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold">A chunks</h3>
              <ChunkTable report={compare.a} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold">B chunks</h3>
              <ChunkTable report={compare.b} />
            </div>
          </div>
        </div>
      )}
    </AdminCard>
  );
}

export function FeedbackIntelligenceSection() {
  const [dash, setDash] = useState<Awaited<ReturnType<typeof getFeedbackDashboard>> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDash(await getFeedbackDashboard());
    } catch {
      setDash(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminCard id="ai-section-feedback" className="ai-concierge-section">
      <SectionHeader
        title="AI Feedback Loop"
        description="Guest ratings and failure themes — open documents and re-index in one click."
      />
      <AdminButton variant="secondary" size="sm" onClick={() => void load()} disabled={loading}>
        Refresh
      </AdminButton>
      {dash && (
        <div className="mt-4 space-y-4">
          <div className="kb-metric-grid">
            {Object.entries(dash.totals).map(([k, v]) => (
              <Metric key={k} label={k.replace(/_/g, " ")} value={v} />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <AdminCard>
              <h3 className="mb-2 text-sm font-semibold">Most Failed Questions</h3>
              <ul className="space-y-2 text-sm">
                {dash.mostFailed.map((r) => (
                  <li key={r.question}>
                    ({r.count}) {r.question}
                  </li>
                ))}
                {!dash.mostFailed.length && <li className="text-admin-muted">No data yet</li>}
              </ul>
            </AdminCard>
            <AdminCard>
              <h3 className="mb-2 text-sm font-semibold">Most Incorrect</h3>
              <ul className="space-y-2 text-sm">
                {dash.mostIncorrect.map((r) => (
                  <li key={r.question}>
                    ({r.count}) {r.question}
                  </li>
                ))}
                {!dash.mostIncorrect.length && <li className="text-admin-muted">No data yet</li>}
              </ul>
            </AdminCard>
            <AdminCard>
              <h3 className="mb-2 text-sm font-semibold">Missing Knowledge</h3>
              <ul className="space-y-2 text-sm">
                {dash.missingKnowledge.map((r) => (
                  <li key={r.question}>
                    ({r.count}) {r.question}
                  </li>
                ))}
                {!dash.missingKnowledge.length && <li className="text-admin-muted">No data yet</li>}
              </ul>
            </AdminCard>
            <AdminCard>
              <h3 className="mb-2 text-sm font-semibold">Most Downvoted Documents</h3>
              <ul className="space-y-2 text-sm">
                {dash.downvotedDocuments.map((r) => (
                  <li key={r.documentId} className="flex flex-wrap items-center gap-2">
                    <span>
                      ({r.count}) {r.documentId.slice(0, 8)}…
                    </span>
                    <Link className="text-xs underline text-admin-accent" to="/admin/integrations/knowledge-base">
                      Open
                    </Link>
                    <AdminButton
                      size="sm"
                      variant="secondary"
                      onClick={() => void queueSemanticIndex(r.documentId, undefined, { skipWorkflowGate: true })}
                    >
                      Re-index
                    </AdminButton>
                  </li>
                ))}
                {!dash.downvotedDocuments.length && <li className="text-admin-muted">No data yet</li>}
              </ul>
            </AdminCard>
          </div>
        </div>
      )}
    </AdminCard>
  );
}

export function RelationshipsSection({ disabled }: Props) {
  const [docs, setDocs] = useState<Array<{ id: string; title: string }>>([]);
  const [rels, setRels] = useState<Awaited<ReturnType<typeof listRelationships>>>([]);
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [type, setType] = useState<KnowledgeRelationshipType>("related");
  const [dragSource, setDragSource] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [d, r] = await Promise.all([listSemanticDocuments(), listRelationships()]);
    setDocs(d.map((x) => ({ id: x.id, title: x.title })));
    setRels(r);
    setSource((prev) => prev || d[0]?.id || "");
    setTarget((prev) => prev || d[1]?.id || d[0]?.id || "");
  }, []);

  useEffect(() => {
    void reload().catch(() => undefined);
  }, [reload]);

  const title = (id: string) => docs.find((d) => d.id === id)?.title ?? id.slice(0, 8);

  return (
    <AdminCard id="ai-section-relationships" className="ai-concierge-section">
      <SectionHeader
        title="Knowledge Relationships"
        description="Document graph — parent/child/related edges boost related retrieval after semantic search."
      />
      <div className="grid gap-3 md:grid-cols-3">
        <AdminSelect
          label="Source"
          value={source}
          onChange={setSource}
          options={docs.map((d) => ({ value: d.id, label: d.title }))}
        />
        <AdminSelect
          label="Relationship"
          value={type}
          onChange={(v) => setType(v as KnowledgeRelationshipType)}
          options={RELATIONSHIP_TYPES.map((t) => ({ value: t.id, label: t.label }))}
        />
        <AdminSelect
          label="Target"
          value={target}
          onChange={setTarget}
          options={docs.map((d) => ({ value: d.id, label: d.title }))}
        />
      </div>
      <AdminButton
        className="mt-3"
        disabled={disabled || !source || !target || source === target}
        onClick={() =>
          void upsertRelationship({
            sourceDocumentId: source,
            targetDocumentId: target,
            relationshipType: type,
          }).then(() => reload())
        }
      >
        Add Relationship
      </AdminButton>

      <div className="mt-5">
        <h3 className="mb-2 text-sm font-semibold">Drag-and-drop link</h3>
        <p className="mb-2 text-xs text-admin-muted">Drag a document onto another to create a “related” edge.</p>
        <div className="ki-graph">
          {docs.slice(0, 24).map((d) => (
            <button
              key={d.id}
              type="button"
              draggable
              className="ki-graph__node"
              onDragStart={() => setDragSource(d.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (!dragSource || dragSource === d.id) return;
                void upsertRelationship({
                  sourceDocumentId: dragSource,
                  targetDocumentId: d.id,
                  relationshipType: "related",
                }).then(() => reload());
                setDragSource(null);
              }}
            >
              {d.title}
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {rels.map((r) => (
          <li key={r.id} className="kb-queue-item flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm">
              {title(r.source_document_id)} <AdminBadge variant="outline">{r.relationship_type}</AdminBadge>{" "}
              {title(r.target_document_id)}
            </span>
            <AdminButton size="sm" variant="danger" onClick={() => void deleteRelationship(r.id).then(() => reload())}>
              Remove
            </AdminButton>
          </li>
        ))}
        {!rels.length && <li className="text-sm text-admin-muted">No relationships yet.</li>}
      </ul>
    </AdminCard>
  );
}

export function ValidatorSection({ disabled }: Props) {
  const [findings, setFindings] = useState<Awaited<ReturnType<typeof listValidationFindings>>>([]);
  const [score, setScore] = useState<number | null>(null);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    setFindings(await listValidationFindings("open"));
  }, []);

  useEffect(() => {
    void load().catch(() => undefined);
  }, [load]);

  return (
    <AdminCard id="ai-section-validator" className="ai-concierge-section">
      <SectionHeader
        title="AI Knowledge Validator"
        description="Pre-publish warnings only — never blocks indexing. Detects conflicts, gaps, and quality risks."
      />
      <div className="flex flex-wrap items-center gap-3">
        <AdminButton
          disabled={disabled || running}
          onClick={() => {
            setRunning(true);
            void runKnowledgeValidation()
              .then((r) => {
                setScore(r.score);
                setFindings(r.findings);
              })
              .finally(() => setRunning(false));
          }}
        >
          {running ? "Validating…" : "Run Validation"}
        </AdminButton>
        {score != null && <AdminBadge variant="info">Validation score {score}</AdminBadge>}
      </div>
      <ul className="mt-4 space-y-2">
        {findings.map((f) => (
          <li key={f.id} className="kb-queue-item">
            <div className="flex flex-wrap items-center gap-2">
              <AdminBadge variant={f.severity === "error" ? "danger" : f.severity === "warning" ? "warning" : "default"}>
                {f.finding_type.replace(/_/g, " ")}
              </AdminBadge>
              <span className="font-medium text-sm">{f.title}</span>
            </div>
            <p className="mt-1 text-xs text-admin-muted">{f.details}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <AdminButton size="sm" variant="secondary" onClick={() => void resolveValidationFinding(f.id, "ignored").then(load)}>
                Ignore
              </AdminButton>
              <AdminButton size="sm" onClick={() => void resolveValidationFinding(f.id, "resolved").then(load)}>
                Resolve
              </AdminButton>
              {f.document_id && (
                <AdminButton
                  size="sm"
                  variant="secondary"
                  onClick={() => void queueSemanticIndex(f.document_id!, undefined, { skipWorkflowGate: true })}
                >
                  Fix / Re-index
                </AdminButton>
              )}
            </div>
          </li>
        ))}
        {!findings.length && <li className="text-sm text-admin-muted">No open findings.</li>}
      </ul>
    </AdminCard>
  );
}

export function CostAnalyticsSection() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getCostAnalytics>> | null>(null);

  useEffect(() => {
    void getCostAnalytics()
      .then(setData)
      .catch(() => setData(null));
  }, []);

  return (
    <AdminCard id="ai-section-cost-analytics" className="ai-concierge-section">
      <SectionHeader title="AI Cost Analytics" description="Token and estimated USD cost for embeddings and LLM traffic." />
      {data && (
        <div className="space-y-4">
          <div className="kb-metric-grid">
            <Metric label="Embedding Requests" value={data.embeddingRequests} />
            <Metric label="LLM Requests" value={data.llmRequests} />
            <Metric label="Queries" value={data.queries} />
            <Metric label="Embedding Cost" value={`$${data.totalEmbeddingCost}`} />
            <Metric label="LLM Cost" value={`$${data.totalLlmCost}`} />
            <Metric label="Est. Monthly" value={`$${data.estimatedMonthlyCost}`} />
            <Metric label="Avg Prompt Tok" value={data.avgPromptTokens} />
            <Metric label="Avg Completion Tok" value={data.avgCompletionTokens} />
            <Metric label="Cost / Question" value={`$${data.avgCostPerQuestion}`} />
            <Metric label="Tokens In" value={data.tokenConsumption.in} />
            <Metric label="Tokens Out" value={data.tokenConsumption.out} />
          </div>
          <AdminCard>
            <h3 className="mb-2 text-sm font-semibold">Most Expensive Categories</h3>
            <ul className="text-sm space-y-1">
              {data.mostExpensiveCategories.map((c) => (
                <li key={c.category}>
                  {c.category}: ${c.cost.toFixed(6)}
                </li>
              ))}
              {!data.mostExpensiveCategories.length && <li className="text-admin-muted">No cost events yet — debugger runs will populate this.</li>}
            </ul>
          </AdminCard>
          <AdminCard>
            <h3 className="mb-2 text-sm font-semibold">Daily Trend</h3>
            <ul className="text-sm space-y-1">
              {data.daily.map((d) => (
                <li key={d.day}>
                  {d.day}: ${d.cost.toFixed(6)} · {d.queries} events
                </li>
              ))}
              {!data.daily.length && <li className="text-admin-muted">No daily samples yet.</li>}
            </ul>
          </AdminCard>
        </div>
      )}
    </AdminCard>
  );
}

export function QualityAnalyticsSection() {
  const [data, setData] = useState<Awaited<ReturnType<typeof refreshQualitySnapshot>> | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <AdminCard id="ai-section-quality-analytics" className="ai-concierge-section">
      <SectionHeader title="AI Quality Analytics" description="Retrieval accuracy, coverage, freshness, feedback, and risk." />
      <AdminButton
        disabled={loading}
        onClick={() => {
          setLoading(true);
          void refreshQualitySnapshot()
            .then(setData)
            .finally(() => setLoading(false));
        }}
      >
        {loading ? "Calculating…" : "Refresh Quality Score"}
      </AdminButton>
      {data && (
        <div className="mt-4 space-y-4">
          <div className="kb-health-score">
            <div>
              <p className="kb-metric__label">Overall AI Quality Score</p>
              <p className="kb-health-score__value">{data.overall_score}</p>
            </div>
          </div>
          <div className="kb-metric-grid">
            <Metric label="Retrieval Accuracy" value={data.retrieval_accuracy} />
            <Metric label="Chunk Quality" value={data.chunk_quality} />
            <Metric label="Avg Similarity" value={data.avg_similarity} />
            <Metric label="Hallucination Risk" value={data.hallucination_risk} />
            <Metric label="Coverage" value={data.knowledge_coverage} />
            <Metric label="Freshness" value={data.knowledge_freshness} />
            <Metric label="Approval Compliance" value={data.approval_compliance} />
            <Metric label="Feedback Score" value={data.feedback_score} />
            <Metric label="Avg Rating" value={data.avg_response_rating} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <AdminCard>
              <h3 className="mb-2 text-sm font-semibold">Top Performing Documents</h3>
              <ul className="text-sm space-y-1">
                {data.topDocuments.map((d) => (
                  <li key={d.id}>
                    {d.title} · {d.retrieval_count} retrievals
                  </li>
                ))}
              </ul>
            </AdminCard>
            <AdminCard>
              <h3 className="mb-2 text-sm font-semibold">Knowledge Gaps</h3>
              <ul className="text-sm space-y-1">
                {data.knowledgeGaps.map((q) => (
                  <li key={q}>{q}</li>
                ))}
                {!data.knowledgeGaps.length && <li className="text-admin-muted">No gaps from feedback yet.</li>}
              </ul>
            </AdminCard>
            <AdminCard>
              <h3 className="mb-2 text-sm font-semibold">Escalated To Humans</h3>
              <ul className="text-sm space-y-1">
                {data.escalatedQuestions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
                {!data.escalatedQuestions.length && <li className="text-admin-muted">None yet.</li>}
              </ul>
            </AdminCard>
            <AdminCard>
              <h3 className="mb-2 text-sm font-semibold">Below Threshold / Not Helpful</h3>
              <ul className="text-sm space-y-1">
                {data.lowSimilarityQuestions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
                {!data.lowSimilarityQuestions.length && <li className="text-admin-muted">None yet.</li>}
              </ul>
            </AdminCard>
          </div>
        </div>
      )}
    </AdminCard>
  );
}

export function ImprovementsSection({ disabled }: Props) {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listRecommendations>>>([]);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    setRows(await listRecommendations("open"));
  }, []);

  useEffect(() => {
    void load().catch(() => undefined);
  }, [load]);

  return (
    <AdminCard id="ai-section-improvements" className="ai-concierge-section">
      <SectionHeader
        title="Knowledge Improvement Suggestions"
        description="AI analyzes feedback and inventory to recommend FAQs, splits, merges, reindexes, and relationships."
      />
      <AdminButton
        disabled={disabled || running}
        onClick={() => {
          setRunning(true);
          void generateRecommendations()
            .then(setRows)
            .finally(() => setRunning(false));
        }}
      >
        {running ? "Analyzing…" : "Generate Suggestions"}
      </AdminButton>
      <ul className="mt-4 space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="kb-queue-item">
            <div className="flex flex-wrap gap-2 items-center">
              <AdminBadge variant={r.priority === "critical" || r.priority === "high" ? "warning" : "default"}>
                {r.priority}
              </AdminBadge>
              <AdminBadge variant="outline">{r.recommendation_type.replace(/_/g, " ")}</AdminBadge>
              <span className="font-medium text-sm">{r.title}</span>
            </div>
            <p className="mt-1 text-sm text-admin-muted">{r.rationale}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <AdminButton size="sm" onClick={() => void updateRecommendationStatus(r.id, "accepted").then(load)}>
                Accept
              </AdminButton>
              <AdminButton size="sm" variant="secondary" onClick={() => void updateRecommendationStatus(r.id, "dismissed").then(load)}>
                Dismiss
              </AdminButton>
              {r.document_id && (
                <AdminButton
                  size="sm"
                  variant="secondary"
                  onClick={() => void queueSemanticIndex(r.document_id!, undefined, { skipWorkflowGate: true })}
                >
                  Re-index Document
                </AdminButton>
              )}
              <Link className="text-xs underline text-admin-accent self-center" to="/admin/integrations/knowledge-base">
                Edit Knowledge
              </Link>
            </div>
          </li>
        ))}
        {!rows.length && <li className="text-sm text-admin-muted">No open suggestions.</li>}
      </ul>
    </AdminCard>
  );
}

export function KnowledgeAuditSection() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listAudit>>>([]);

  useEffect(() => {
    void listAudit(60)
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  return (
    <AdminCard id="ai-section-audit" className="ai-concierge-section">
      <SectionHeader
        title="Audit & History"
        description="Knowledge changes, validation, relationships, feedback, debug searches, and approvals."
      />
      <ol className="kb-timeline">
        {rows.map((r) => (
          <li key={r.id} className="kb-timeline__item">
            <span className="kb-timeline__icon">•</span>
            <div>
              <p className="text-sm font-medium">{r.summary}</p>
              <p className="text-xs text-admin-muted">
                {r.event_type} · {new Date(r.created_at).toLocaleString()}
              </p>
            </div>
          </li>
        ))}
        {!rows.length && <li className="text-sm text-admin-muted">No audit events yet.</li>}
      </ol>
    </AdminCard>
  );
}
