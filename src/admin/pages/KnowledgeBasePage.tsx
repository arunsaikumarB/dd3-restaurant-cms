import { useCallback, useMemo, useState } from "react";
import { BookOpen, RefreshCw, Search, Upload } from "lucide-react";
import AdminBreadcrumbs from "../components/shared/Breadcrumbs";
import PageHeader from "../components/shared/PageHeader";
import AdminButton from "../components/ui/Button";
import AdminCard from "../components/ui/Card";
import AdminInput from "../components/ui/Input";
import AdminSelect from "../components/ui/Select";
import AdminTextarea from "../components/ui/Textarea";
import AdminBadge from "../components/ui/Badge";
import AdminToast from "../components/ui/Toast";
import DataTable from "../components/shared/DataTable";
import SettingsPageSkeleton from "../components/settings/SettingsPageSkeleton";
import { useKnowledgeBaseAdmin } from "../hooks/useKnowledgeBaseAdmin";
import { useLocation } from "../hooks/useLocation";
import {
  DEFAULT_PUBLIC_LOCATION_ID,
  getLocationConfig,
  LOCATION_IDS,
  type LocationId,
} from "../../config/locations";
import { SEMANTIC_CATEGORIES, ACCEPTED_FILE_EXTENSIONS, labelForCategory } from "../../services/rag";
import type { SemanticDocumentCategory, SemanticDocumentRow } from "../../types/semanticKnowledge";
import type { TableColumn } from "../types";
import "../admin.css";

type DocRow = SemanticDocumentRow & Record<string, unknown>;

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "default"> = {
  indexed: "success",
  pending: "warning",
  processing: "warning",
  failed: "danger",
  stale: "default",
};

export default function KnowledgeBasePage() {
  const { locationId, isAllLocations } = useLocation();
  const testLocationId = (isAllLocations ? DEFAULT_PUBLIC_LOCATION_ID : locationId) as LocationId;

  const {
    documents,
    loading,
    saving,
    error,
    reload,
    upload,
    reindex,
    remove,
    loadVersions,
    loadChunks,
    searchPreview,
  } = useKnowledgeBaseAdmin(testLocationId);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<SemanticDocumentCategory>("faqs");
  const [scopeLocation, setScopeLocation] = useState<string>("global");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [file, setFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<string>("");
  const [detailDoc, setDetailDoc] = useState<SemanticDocumentRow | null>(null);
  const [detailChunks, setDetailChunks] = useState<string>("");
  const [detailVersions, setDetailVersions] = useState<string>("");
  const [toast, setToast] = useState<{ open: boolean; message: string; variant: "success" | "error" }>({
    open: false,
    message: "",
    variant: "success",
  });

  const tableData = useMemo(() => documents as DocRow[], [documents]);

  const openDetail = useCallback(
    async (doc: SemanticDocumentRow) => {
      setDetailDoc(doc);
      const [chunks, versions] = await Promise.all([
        loadChunks(doc.id, doc.current_version),
        loadVersions(doc.id),
      ]);
      setDetailChunks(
        chunks.length
          ? chunks.map((c) => `#${c.chunk_index + 1} (${c.token_estimate} tok)\n${c.content}`).join("\n\n---\n\n")
          : "No chunks indexed yet.",
      );
      setDetailVersions(
        versions.length
          ? versions
              .map(
                (v) =>
                  `v${v.version_number} — ${v.indexed_at ?? "not indexed"} — ${v.chunk_count} chunks\n${v.change_notes ?? ""}`,
              )
              .join("\n\n")
          : "No versions.",
      );
    },
    [loadChunks, loadVersions],
  );

  const handleReindex = useCallback(
    async (documentId: string) => {
      try {
        await reindex(documentId);
        setToast({ open: true, message: "Re-index queued.", variant: "success" });
      } catch {
        setToast({ open: true, message: "Re-index failed.", variant: "error" });
      }
    },
    [reindex],
  );

  const handleDelete = useCallback(
    async (documentId: string) => {
      if (!window.confirm("Delete this document and all chunks?")) return;
      try {
        await remove(documentId);
        setToast({ open: true, message: "Document deleted.", variant: "success" });
      } catch {
        setToast({ open: true, message: "Delete failed.", variant: "error" });
      }
    },
    [remove],
  );

  const columns = useMemo<TableColumn<DocRow>[]>(
    () => [
      { key: "title", label: "Title", render: (row) => row.title },
      {
        key: "category",
        label: "Category",
        render: (row) => labelForCategory(row.category),
      },
      {
        key: "scope",
        label: "Scope",
        render: (row) =>
          row.location_id ? getLocationConfig(row.location_id).shortName : "Global",
      },
      {
        key: "status",
        label: "Index Status",
        render: (row) => (
          <AdminBadge variant={STATUS_VARIANT[row.index_status] ?? "default"}>{row.index_status}</AdminBadge>
        ),
      },
      { key: "chunks", label: "Chunks", render: (row) => String(row.chunk_count) },
      {
        key: "embedding",
        label: "Embeddings",
        render: (row) => (row.index_status === "indexed" ? "Ready" : "—"),
      },
      {
        key: "actions",
        label: "Actions",
        render: (row) => (
          <div className="flex flex-wrap gap-2">
            <AdminButton size="sm" variant="secondary" onClick={() => void openDetail(row)}>
              Preview
            </AdminButton>
            <AdminButton size="sm" variant="secondary" onClick={() => void handleReindex(row.id)}>
              Re-index
            </AdminButton>
            <AdminButton size="sm" variant="danger" onClick={() => void handleDelete(row.id)}>
              Delete
            </AdminButton>
          </div>
        ),
      },
    ],
    [handleDelete, handleReindex, openDetail],
  );

  const handleUpload = useCallback(async () => {
    if (!title.trim() || !file) {
      setToast({ open: true, message: "Title and file are required.", variant: "error" });
      return;
    }
    try {
      await upload({
        title,
        description,
        category,
        locationId: scopeLocation === "global" ? null : (scopeLocation as LocationId),
        visibility,
        file,
        changeNotes: "Uploaded via Knowledge Base CMS",
      });
      setTitle("");
      setDescription("");
      setFile(null);
      setToast({ open: true, message: "Document uploaded. Indexing started in background.", variant: "success" });
    } catch {
      setToast({ open: true, message: "Upload failed.", variant: "error" });
    }
  }, [title, description, category, scopeLocation, visibility, file, upload]);

  const handleSearchPreview = useCallback(async () => {
    if (!searchQuery.trim()) return;
    try {
      const result = await searchPreview(searchQuery);
      if (!result.available || !result.chunks.length) {
        setSearchResult("No relevant chunks found. Cheffy will fall back to CMS and tools.");
        return;
      }
      setSearchResult(
        result.chunks
          .map(
            (c, i) =>
              `${i + 1}. [${labelForCategory(c.category)}] similarity ${c.similarity.toFixed(3)}\n${c.content}`,
          )
          .join("\n\n---\n\n"),
      );
    } catch (err) {
      setSearchResult(err instanceof Error ? err.message : "Search preview failed.");
    }
  }, [searchQuery, searchPreview]);

  if (loading) {
    return (
      <div>
        <AdminBreadcrumbs items={[{ label: "Knowledge Base" }]} />
        <PageHeader title="Semantic Knowledge Base" description="Enterprise RAG documents for Cheffy." />
        <SettingsPageSkeleton />
      </div>
    );
  }

  return (
    <div className="kb-admin">
      <AdminBreadcrumbs items={[{ label: "Knowledge Base" }]} />
      <PageHeader
        title="Semantic Knowledge Base"
        description="Upload policies, FAQs, catering guides, and brand documents. Cheffy retrieves only the most relevant chunks — never full documents."
      >
        <AdminButton variant="secondary" onClick={() => void reload()} disabled={saving}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </AdminButton>
      </PageHeader>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminCard>
          <div className="mb-4 flex items-center gap-2">
            <Upload className="h-5 w-5 text-admin-accent" />
            <h2 className="text-lg font-semibold">Upload Document</h2>
          </div>
          <div className="space-y-3">
            <AdminInput label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <AdminTextarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            <AdminSelect
              label="Category"
              value={category}
              onChange={(v) => setCategory(v as SemanticDocumentCategory)}
              options={SEMANTIC_CATEGORIES.map((c) => ({ value: c.id, label: c.label }))}
            />
            <AdminSelect
              label="Outlet Scope"
              value={scopeLocation}
              onChange={setScopeLocation}
              options={[
                { value: "global", label: "Global (all outlets)" },
                ...LOCATION_IDS.map((id) => ({ value: id, label: getLocationConfig(id).shortName })),
              ]}
            />
            <AdminSelect
              label="Visibility"
              value={visibility}
              onChange={(v) => setVisibility(v as "public" | "private")}
              options={[
                { value: "public", label: "Public (Cheffy can retrieve)" },
                { value: "private", label: "Private (admin reference only)" },
              ]}
            />
            <div>
              <label className="mb-1 block text-sm font-medium">File</label>
              <input
                type="file"
                accept={ACCEPTED_FILE_EXTENSIONS}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm"
              />
              <p className="mt-1 text-xs text-admin-muted">PDF, DOCX, TXT, Markdown, HTML, CSV</p>
            </div>
            <AdminButton onClick={() => void handleUpload()} disabled={saving}>
              Upload &amp; Index
            </AdminButton>
          </div>
        </AdminCard>

        <AdminCard>
          <div className="mb-4 flex items-center gap-2">
            <Search className="h-5 w-5 text-admin-accent" />
            <h2 className="text-lg font-semibold">Search Preview</h2>
          </div>
          <p className="mb-3 text-sm text-admin-muted">
            Test semantic retrieval for outlet: {getLocationConfig(testLocationId).shortName}
          </p>
          <AdminInput
            label="Test query"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="e.g. What is your cancellation policy?"
          />
          <AdminButton className="mt-3" variant="secondary" onClick={() => void handleSearchPreview()}>
            Run Semantic Search
          </AdminButton>
          {searchResult && (
            <pre className="mt-4 max-h-64 overflow-auto rounded-lg bg-black/5 p-3 text-xs whitespace-pre-wrap">{searchResult}</pre>
          )}
        </AdminCard>
      </div>

      <AdminCard className="mt-6">
        <div className="mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-admin-accent" />
          <h2 className="text-lg font-semibold">Documents</h2>
        </div>
        <DataTable columns={columns} data={tableData} emptyTitle="No knowledge documents yet." hideToolbar />
      </AdminCard>

      {detailDoc && (
        <AdminCard className="mt-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{detailDoc.title} — Chunk Preview</h2>
            <AdminButton variant="ghost" size="sm" onClick={() => setDetailDoc(null)}>
              Close
            </AdminButton>
          </div>
          <p className="mb-2 text-sm text-admin-muted">
            Status: {detailDoc.index_status} · Version {detailDoc.current_version} · {detailDoc.chunk_count} chunks
          </p>
          <h3 className="mb-2 text-sm font-semibold">Version History</h3>
          <pre className="mb-4 max-h-32 overflow-auto rounded-lg bg-black/5 p-3 text-xs whitespace-pre-wrap">{detailVersions}</pre>
          <h3 className="mb-2 text-sm font-semibold">Indexed Chunks</h3>
          <pre className="max-h-80 overflow-auto rounded-lg bg-black/5 p-3 text-xs whitespace-pre-wrap">{detailChunks}</pre>
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
