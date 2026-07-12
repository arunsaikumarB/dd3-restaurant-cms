import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Copy,
  FileSearch,
  Gauge,
  Languages,
  ScanText,
  ShieldCheck,
} from "lucide-react";
import AdminCard from "../ui/Card";
import AdminBadge from "../ui/Badge";
import AdminButton from "../ui/Button";
import AdminInput from "../ui/Input";
import AdminSelect from "../ui/Select";
import AdminTextarea from "../ui/Textarea";
import { getLocationConfig, LOCATION_IDS, type LocationId } from "../../../config/locations";
import {
  ACCEPTED_FILE_EXTENSIONS,
  KNOWLEDGE_LANGUAGES,
  SEMANTIC_CATEGORIES,
  labelForCategory,
  labelForLanguage,
} from "../../../services/rag";
import type {
  KnowledgeActivityRow,
  KnowledgeDuplicateRow,
  KnowledgeHealthRow,
  SemanticDocumentCategory,
  SemanticDocumentRow,
} from "../../../types/semanticKnowledge";
import type { TableColumn } from "../../types";

type DocRow = SemanticDocumentRow & Record<string, unknown>;

const INDEX_VARIANT: Record<string, "success" | "warning" | "danger" | "default"> = {
  indexed: "success",
  pending: "warning",
  processing: "warning",
  failed: "danger",
  stale: "default",
};

const WORKFLOW_VARIANT: Record<string, "success" | "warning" | "danger" | "default"> = {
  published: "success",
  approved: "success",
  pending_review: "warning",
  draft: "default",
  rejected: "danger",
  archived: "default",
};

const OCR_VARIANT: Record<string, "success" | "warning" | "danger" | "default"> = {
  completed: "success",
  not_needed: "default",
  skipped: "default",
  pending: "warning",
  processing: "warning",
  failed: "danger",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatMs(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function MetricTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="kb-metric">
      <p className="kb-metric__label">{label}</p>
      <p className="kb-metric__value">{value}</p>
      {hint ? <p className="kb-metric__hint">{hint}</p> : null}
    </div>
  );
}

function SimpleBars({
  items,
}: {
  items: Array<{ label: string; value: number; max?: number }>;
}) {
  const max = Math.max(...items.map((i) => i.max ?? i.value), 1);
  return (
    <div className="kb-bars">
      {items.map((item) => (
        <div key={item.label} className="kb-bars__row">
          <span className="kb-bars__label">{item.label}</span>
          <div className="kb-bars__track">
            <div
              className="kb-bars__fill"
              style={{ width: `${Math.min(100, (item.value / max) * 100)}%` }}
            />
          </div>
          <span className="kb-bars__value">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export function KbSection({
  id,
  title,
  icon,
  children,
}: {
  id: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={`kb-section-${id}`} className="ai-concierge-section mb-8">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export type UploadFormProps = {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  category: SemanticDocumentCategory;
  setCategory: (v: SemanticDocumentCategory) => void;
  scopeLocation: string;
  setScopeLocation: (v: string) => void;
  visibility: "public" | "private";
  setVisibility: (v: "public" | "private") => void;
  language: string;
  setLanguage: (v: string) => void;
  file: File | null;
  setFile: (f: File | null) => void;
  saving: boolean;
  onUpload: () => void;
};

export function UploadSection(props: UploadFormProps) {
  return (
    <AdminCard>
      <div className="space-y-3">
        <AdminInput label="Title" value={props.title} onChange={(e) => props.setTitle(e.target.value)} />
        <AdminTextarea
          label="Description"
          value={props.description}
          onChange={(e) => props.setDescription(e.target.value)}
          rows={2}
        />
        <AdminSelect
          label="Category"
          value={props.category}
          onChange={(v) => props.setCategory(v as SemanticDocumentCategory)}
          options={SEMANTIC_CATEGORIES.map((c) => ({ value: c.id, label: c.label }))}
        />
        <AdminSelect
          label="Outlet Scope"
          value={props.scopeLocation}
          onChange={props.setScopeLocation}
          options={[
            { value: "global", label: "Global (all outlets)" },
            ...LOCATION_IDS.map((id) => ({ value: id, label: getLocationConfig(id).shortName })),
          ]}
        />
        <AdminSelect
          label="Visibility"
          value={props.visibility}
          onChange={(v) => props.setVisibility(v as "public" | "private")}
          options={[
            { value: "public", label: "Public (Cheffy can retrieve when published)" },
            { value: "private", label: "Private (admin reference only)" },
          ]}
        />
        <AdminSelect
          label="Language"
          value={props.language}
          onChange={props.setLanguage}
          options={[
            { value: "auto", label: "Auto-detect on index" },
            ...KNOWLEDGE_LANGUAGES.filter((l) => l.code !== "unknown").map((l) => ({
              value: l.code,
              label: `${l.label} (${l.nativeLabel})`,
            })),
          ]}
        />
        <div>
          <label className="mb-1 block text-sm font-medium">File</label>
          <input
            type="file"
            accept={ACCEPTED_FILE_EXTENSIONS}
            onChange={(e) => props.setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm"
          />
          <p className="mt-1 text-xs text-admin-muted">
            PDF, DOCX, TXT, Markdown, HTML, CSV, JPEG, PNG, WEBP — scanned docs use OCR automatically
          </p>
        </div>
        <AdminButton onClick={props.onUpload} disabled={props.saving}>
          Upload for Review
        </AdminButton>
        <p className="text-xs text-admin-muted">
          Uploads enter Pending Review. After manager approval, indexing runs and the document is Published for
          semantic search.
        </p>
      </div>
    </AdminCard>
  );
}

export function HealthDashboardSection({
  health,
  documents,
  onRefresh,
  refreshing,
}: {
  health: KnowledgeHealthRow | null;
  documents: SemanticDocumentRow[];
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const categoryDist = SEMANTIC_CATEGORIES.map((c) => ({
    label: c.label,
    value: documents.filter((d) => d.category === c.id).length,
  })).filter((x) => x.value > 0);

  const outletDist = [
    { label: "Global", value: documents.filter((d) => !d.location_id).length },
    ...LOCATION_IDS.map((id) => ({
      label: getLocationConfig(id).shortName,
      value: documents.filter((d) => d.location_id === id).length,
    })),
  ].filter((x) => x.value > 0);

  const sortedByChunks = [...documents].sort((a, b) => b.chunk_count - a.chunk_count);
  const largest = sortedByChunks.slice(0, 5);
  const smallest = [...documents]
    .filter((d) => d.chunk_count > 0)
    .sort((a, b) => a.chunk_count - b.chunk_count)
    .slice(0, 5);
  const mostRetrieved = [...documents]
    .sort((a, b) => (b.retrieval_count ?? 0) - (a.retrieval_count ?? 0))
    .slice(0, 5);
  const leastUsed = [...documents]
    .filter((d) => d.workflow_status === "published")
    .sort((a, b) => (a.retrieval_count ?? 0) - (b.retrieval_count ?? 0))
    .slice(0, 5);

  const ocrSuccessRate =
    health && health.ocr_completed + health.ocr_failed > 0
      ? Math.round((health.ocr_completed / (health.ocr_completed + health.ocr_failed)) * 100)
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-admin-muted">
          {health
            ? `Snapshot ${new Date(health.snapshot_at).toLocaleString()}`
            : "No health snapshot yet — refresh to calculate."}
        </p>
        <AdminButton variant="secondary" size="sm" onClick={onRefresh} disabled={refreshing}>
          Recalculate Health
        </AdminButton>
      </div>

      <div className="kb-health-hero">
        <div className="kb-health-score">
          <Gauge className="h-6 w-6 text-admin-accent" />
          <div>
            <p className="kb-metric__label">Knowledge Health Score</p>
            <p className="kb-health-score__value">{health?.health_score ?? "—"}</p>
          </div>
        </div>
        <div className="kb-metric-grid">
          <MetricTile label="Total Documents" value={health?.total_documents ?? documents.length} />
          <MetricTile label="Indexed" value={health?.indexed_documents ?? 0} />
          <MetricTile label="Published" value={health?.published_documents ?? 0} />
          <MetricTile label="Pending Review" value={health?.approval_pending ?? 0} />
          <MetricTile label="Failed" value={health?.failed_documents ?? 0} />
          <MetricTile label="Duplicates" value={health?.duplicate_documents ?? 0} />
          <MetricTile label="Near Dup Chunks" value={health?.near_duplicates ?? 0} />
          <MetricTile label="OCR Failures" value={health?.ocr_failed ?? 0} />
          <MetricTile label="Embedding Failures" value={health?.embedding_failures ?? 0} />
          <MetricTile
            label="Avg Similarity"
            value={health ? health.avg_similarity.toFixed(3) : "—"}
          />
          <MetricTile label="Avg Chunks" value={health ? health.avg_chunk_count.toFixed(1) : "—"} />
          <MetricTile label="Avg Tokens" value={health ? Math.round(health.avg_token_estimate) : "—"} />
          <MetricTile
            label="Storage"
            value={health ? formatBytes(health.storage_bytes) : "—"}
          />
          <MetricTile
            label="Avg Index Time"
            value={formatMs(health?.avg_index_duration_ms)}
          />
          <MetricTile label="Stale / Reindex" value={health?.stale_documents ?? 0} />
          <MetricTile
            label="OCR Success"
            value={ocrSuccessRate != null ? `${ocrSuccessRate}%` : "—"}
          />
          <MetricTile label="Public" value={health?.public_documents ?? 0} />
          <MetricTile label="Private" value={health?.private_documents ?? 0} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Category Distribution</h3>
          {categoryDist.length ? <SimpleBars items={categoryDist} /> : <p className="text-sm text-admin-muted">No data</p>}
        </AdminCard>
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Outlet Distribution</h3>
          {outletDist.length ? <SimpleBars items={outletDist} /> : <p className="text-sm text-admin-muted">No data</p>}
        </AdminCard>
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Largest Documents</h3>
          <SimpleBars items={largest.map((d) => ({ label: d.title.slice(0, 28), value: d.chunk_count }))} />
        </AdminCard>
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Most Retrieved</h3>
          <SimpleBars
            items={mostRetrieved.map((d) => ({
              label: d.title.slice(0, 28),
              value: d.retrieval_count ?? 0,
            }))}
          />
        </AdminCard>
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Smallest Indexed</h3>
          <SimpleBars items={smallest.map((d) => ({ label: d.title.slice(0, 28), value: d.chunk_count }))} />
        </AdminCard>
        <AdminCard>
          <h3 className="mb-3 text-sm font-semibold">Least Used (Published)</h3>
          <SimpleBars
            items={leastUsed.map((d) => ({
              label: d.title.slice(0, 28),
              value: d.retrieval_count ?? 0,
            }))}
          />
        </AdminCard>
      </div>
    </div>
  );
}

export function ApprovalQueueSection({
  pending,
  selected,
  setSelected,
  comment,
  setComment,
  rejectReason,
  setRejectReason,
  saving,
  onApprove,
  onReject,
  onBulkApprove,
  onBulkReject,
}: {
  pending: SemanticDocumentRow[];
  selected: string[];
  setSelected: (ids: string[]) => void;
  comment: string;
  setComment: (v: string) => void;
  rejectReason: string;
  setRejectReason: (v: string) => void;
  saving: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onBulkApprove: () => void;
  onBulkReject: () => void;
}) {
  const toggle = (id: string) => {
    setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  return (
    <AdminCard>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-admin-muted">{pending.length} document(s) awaiting manager approval</p>
        <div className="flex flex-wrap gap-2">
          <AdminButton size="sm" disabled={!selected.length || saving} onClick={onBulkApprove}>
            Bulk Approve
          </AdminButton>
          <AdminButton
            size="sm"
            variant="danger"
            disabled={!selected.length || saving}
            onClick={onBulkReject}
          >
            Bulk Reject
          </AdminButton>
        </div>
      </div>
      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <AdminTextarea
          label="Approval comments"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
        />
        <AdminTextarea
          label="Reject reason"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          rows={2}
        />
      </div>
      {pending.length === 0 ? (
        <p className="text-sm text-admin-muted">Approval queue is clear.</p>
      ) : (
        <ul className="space-y-3">
          {pending.map((doc) => (
            <li key={doc.id} className="kb-queue-item">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected.includes(doc.id)}
                  onChange={() => toggle(doc.id)}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{doc.title}</p>
                  <p className="text-xs text-admin-muted">
                    {labelForCategory(doc.category)} · {labelForLanguage(doc.language)} ·{" "}
                    {doc.file_name}
                  </p>
                </div>
              </label>
              <div className="mt-2 flex flex-wrap gap-2 pl-7">
                <AdminButton size="sm" disabled={saving} onClick={() => onApprove(doc.id)}>
                  Approve &amp; Index
                </AdminButton>
                <AdminButton
                  size="sm"
                  variant="danger"
                  disabled={saving}
                  onClick={() => onReject(doc.id)}
                >
                  Reject
                </AdminButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminCard>
  );
}

export function DuplicatesSection({
  duplicates,
  documents,
  onDismiss,
}: {
  duplicates: KnowledgeDuplicateRow[];
  documents: SemanticDocumentRow[];
  onDismiss: (id: string) => void;
}) {
  const titleFor = (id: string | null) =>
    documents.find((d) => d.id === id)?.title ?? id?.slice(0, 8) ?? "—";

  return (
    <AdminCard>
      {duplicates.length === 0 ? (
        <p className="text-sm text-admin-muted">No open duplicate reports.</p>
      ) : (
        <ul className="space-y-3">
          {duplicates.map((dup) => (
            <li key={dup.id} className="kb-queue-item flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">
                  {dup.duplicate_type.replace(/_/g, " ")}
                  {dup.similarity != null ? ` · ${(dup.similarity * 100).toFixed(0)}% similar` : ""}
                </p>
                <p className="text-xs text-admin-muted">
                  {titleFor(dup.document_id)} ↔ {titleFor(dup.match_document_id)}
                </p>
              </div>
              <AdminButton size="sm" variant="secondary" onClick={() => onDismiss(dup.id)}>
                Dismiss
              </AdminButton>
            </li>
          ))}
        </ul>
      )}
    </AdminCard>
  );
}

export function ActivityTimelineSection({ activity }: { activity: KnowledgeActivityRow[] }) {
  const iconFor = (type: string) => {
    if (type.includes("ocr")) return <ScanText className="h-4 w-4" />;
    if (type.includes("approv") || type.includes("reject")) return <ShieldCheck className="h-4 w-4" />;
    if (type.includes("dup")) return <Copy className="h-4 w-4" />;
    if (type.includes("fail")) return <AlertTriangle className="h-4 w-4" />;
    if (type.includes("search")) return <FileSearch className="h-4 w-4" />;
    if (type.includes("index")) return <CheckCircle2 className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  return (
    <AdminCard>
      {activity.length === 0 ? (
        <p className="text-sm text-admin-muted">No recent activity.</p>
      ) : (
        <ol className="kb-timeline">
          {activity.map((ev) => (
            <li key={ev.id} className="kb-timeline__item">
              <span className="kb-timeline__icon">{iconFor(ev.event_type)}</span>
              <div>
                <p className="text-sm font-medium">{ev.summary}</p>
                <p className="text-xs text-admin-muted">
                  {ev.event_type} · {new Date(ev.created_at).toLocaleString()}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </AdminCard>
  );
}

export function SearchPlaygroundSection({
  testLocationId,
  searchQuery,
  setSearchQuery,
  searchResult,
  onSearch,
}: {
  testLocationId: LocationId;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  searchResult: string;
  onSearch: () => void;
}) {
  return (
    <AdminCard>
      <p className="mb-3 text-sm text-admin-muted">
        Tests published documents only for outlet: {getLocationConfig(testLocationId).shortName}. Cross-language
        retrieval uses multilingual embeddings.
      </p>
      <AdminInput
        label="Test query"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder='e.g. Birthday Package'
      />
      <AdminButton className="mt-3" variant="secondary" onClick={onSearch}>
        Run Semantic Search
      </AdminButton>
      {searchResult ? (
        <pre className="mt-4 max-h-80 overflow-auto rounded-lg bg-black/5 p-3 text-xs whitespace-pre-wrap">
          {searchResult}
        </pre>
      ) : null}
    </AdminCard>
  );
}

export function buildDocumentColumns(handlers: {
  onPreview: (doc: SemanticDocumentRow) => void;
  onReindex: (id: string) => void;
  onDelete: (id: string) => void;
  onOcrRetry: (id: string) => void;
  onArchive: (id: string) => void;
  onLanguage: (id: string, lang: string) => void;
}): TableColumn<DocRow>[] {
  return [
    {
      key: "title",
      label: "Document",
      render: (row) => (
        <div>
          <p className="font-medium">{row.title}</p>
          <p className="text-xs text-admin-muted">{row.file_name}</p>
        </div>
      ),
    },
    {
      key: "health",
      label: "Health",
      render: (row) => {
        if (row.index_status === "failed" || row.ocr_status === "failed") {
          return <AdminBadge variant="danger">At risk</AdminBadge>;
        }
        if (row.workflow_status === "published" && row.index_status === "indexed") {
          return <AdminBadge variant="success">Healthy</AdminBadge>;
        }
        if (row.workflow_status === "pending_review") {
          return <AdminBadge variant="warning">Awaiting</AdminBadge>;
        }
        return <AdminBadge variant="default">Watch</AdminBadge>;
      },
    },
    {
      key: "workflow",
      label: "Approval",
      render: (row) => (
        <AdminBadge variant={WORKFLOW_VARIANT[row.workflow_status] ?? "default"}>
          {row.workflow_status.replace(/_/g, " ")}
        </AdminBadge>
      ),
    },
    {
      key: "status",
      label: "Index",
      render: (row) => (
        <AdminBadge variant={INDEX_VARIANT[row.index_status] ?? "default"}>{row.index_status}</AdminBadge>
      ),
    },
    {
      key: "language",
      label: "Language",
      render: (row) => (
        <span className="kb-lang-badge">
          <Languages className="h-3 w-3" />
          {labelForLanguage(row.language)}
        </span>
      ),
    },
    {
      key: "ocr",
      label: "OCR",
      render: (row) => (
        <div>
          <AdminBadge variant={OCR_VARIANT[row.ocr_status] ?? "default"}>
            {row.ocr_status === "not_needed" ? "N/A" : row.ocr_status}
          </AdminBadge>
          {row.ocr_confidence != null ? (
            <p className="mt-1 text-[10px] text-admin-muted">
              {(row.ocr_confidence * 100).toFixed(0)}% · {formatMs(row.ocr_duration_ms)}
            </p>
          ) : null}
        </div>
      ),
    },
    { key: "chunks", label: "Chunks", render: (row) => String(row.chunk_count) },
    {
      key: "embeddings",
      label: "Embeddings",
      render: (row) => (row.index_status === "indexed" ? "Ready" : "—"),
    },
    {
      key: "duplicates",
      label: "Dup",
      render: (row) => (row.is_duplicate ? <AdminBadge variant="warning">Yes</AdminBadge> : "—"),
    },
    {
      key: "retrieval",
      label: "Last Retrieval",
      render: (row) =>
        row.last_retrieval_at ? new Date(row.last_retrieval_at).toLocaleDateString() : "—",
    },
    {
      key: "indexed",
      label: "Updated",
      render: (row) => new Date(row.updated_at).toLocaleDateString(),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <AdminButton size="sm" variant="secondary" onClick={() => handlers.onPreview(row)}>
            Preview
          </AdminButton>
          {(row.ocr_status === "failed" || row.ocr_status === "pending") && (
            <AdminButton size="sm" variant="secondary" onClick={() => handlers.onOcrRetry(row.id)}>
              Retry OCR
            </AdminButton>
          )}
          <select
            className="kb-inline-select"
            value={row.language}
            onChange={(e) => handlers.onLanguage(row.id, e.target.value)}
            aria-label="Document language"
          >
            {KNOWLEDGE_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          <AdminButton size="sm" variant="secondary" onClick={() => handlers.onReindex(row.id)}>
            Re-index
          </AdminButton>
          {row.workflow_status !== "archived" && (
            <AdminButton size="sm" variant="secondary" onClick={() => handlers.onArchive(row.id)}>
              Archive
            </AdminButton>
          )}
          <AdminButton size="sm" variant="danger" onClick={() => handlers.onDelete(row.id)}>
            Delete
          </AdminButton>
        </div>
      ),
    },
  ];
}

export { type DocRow };
