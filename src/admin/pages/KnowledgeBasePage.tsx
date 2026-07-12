import { useCallback, useMemo, useState } from "react";
import {
  Activity,
  BookOpen,
  Copy,
  Gauge,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
} from "lucide-react";
import AdminBreadcrumbs from "../components/shared/Breadcrumbs";
import PageHeader from "../components/shared/PageHeader";
import AdminButton from "../components/ui/Button";
import AdminCard from "../components/ui/Card";
import AdminSelect from "../components/ui/Select";
import AdminToast from "../components/ui/Toast";
import DataTable from "../components/shared/DataTable";
import SettingsPageSkeleton from "../components/settings/SettingsPageSkeleton";
import {
  ActivityTimelineSection,
  ApprovalQueueSection,
  DuplicatesSection,
  HealthDashboardSection,
  KbSection,
  SearchPlaygroundSection,
  UploadSection,
  buildDocumentColumns,
  type DocRow,
} from "../components/knowledgeBase/KnowledgeBaseSections";
import { useKnowledgeBaseAdmin } from "../hooks/useKnowledgeBaseAdmin";
import { useLocation } from "../hooks/useLocation";
import { useAdminTheme } from "../context/AdminThemeContext";
import {
  DEFAULT_PUBLIC_LOCATION_ID,
  type LocationId,
} from "../../config/locations";
import { KNOWLEDGE_LANGUAGES, labelForCategory, labelForLanguage } from "../../services/rag";
import type { SemanticDocumentCategory, SemanticDocumentRow } from "../../types/semanticKnowledge";
import "../admin.css";

const KB_SECTIONS = [
  { id: "health", label: "Health" },
  { id: "upload", label: "Upload" },
  { id: "documents", label: "Documents" },
  { id: "approvals", label: "Approvals" },
  { id: "duplicates", label: "Duplicates" },
  { id: "activity", label: "Activity" },
  { id: "search", label: "Search" },
] as const;

export default function KnowledgeBasePage() {
  const { locationId, isAllLocations } = useLocation();
  const { dark } = useAdminTheme();
  const testLocationId = (isAllLocations ? DEFAULT_PUBLIC_LOCATION_ID : locationId) as LocationId;

  const {
    documents,
    pendingReviews,
    activity,
    duplicates,
    health,
    loading,
    saving,
    error,
    reload,
    upload,
    reindex,
    ocrRetry,
    remove,
    approve,
    reject,
    archive,
    approveMany,
    rejectMany,
    setLanguage,
    dismissDuplicate,
    refreshHealth,
    loadVersions,
    loadChunks,
    searchPreview,
  } = useKnowledgeBaseAdmin(testLocationId);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<SemanticDocumentCategory>("faqs");
  const [scopeLocation, setScopeLocation] = useState<string>("global");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [language, setLanguageState] = useState("auto");
  const [file, setFile] = useState<File | null>(null);
  const [languageFilter, setLanguageFilter] = useState("all");
  const [tableQuery, setTableQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState("");
  const [detailDoc, setDetailDoc] = useState<SemanticDocumentRow | null>(null);
  const [detailChunks, setDetailChunks] = useState("");
  const [detailVersions, setDetailVersions] = useState("");
  const [selectedPending, setSelectedPending] = useState<string[]>([]);
  const [approveComment, setApproveComment] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [dupModal, setDupModal] = useState<{
    matchId: string;
    matchTitle: string;
  } | null>(null);
  const [pendingUpload, setPendingUpload] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; variant: "success" | "error" }>({
    open: false,
    message: "",
    variant: "success",
  });

  const filteredDocs = useMemo(() => {
    return documents.filter((d) => {
      if (languageFilter !== "all" && d.language !== languageFilter) return false;
      if (!tableQuery.trim()) return true;
      const q = tableQuery.toLowerCase();
      return (
        d.title.toLowerCase().includes(q) ||
        d.file_name.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        d.workflow_status.includes(q)
      );
    }) as DocRow[];
  }, [documents, languageFilter, tableQuery]);

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

  const showToast = useCallback((message: string, variant: "success" | "error") => {
    setToast({ open: true, message, variant });
  }, []);

  const doUpload = useCallback(
    async (duplicateAction?: "replace" | "upload_anyway", replaceDocumentId?: string) => {
      if (!title.trim() || !file) {
        showToast("Title and file are required.", "error");
        return;
      }
      setPendingUpload(true);
      try {
        await upload({
          title,
          description,
          category,
          locationId: scopeLocation === "global" ? null : (scopeLocation as LocationId),
          visibility,
          language: language === "auto" ? undefined : language,
          file,
          changeNotes: "Uploaded via Knowledge Base CMS",
          duplicateAction,
          replaceDocumentId,
        });
        setTitle("");
        setDescription("");
        setFile(null);
        setDupModal(null);
        showToast("Document uploaded — pending manager review.", "success");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed.";
        if (message.startsWith("DUPLICATE:")) {
          const parts = message.split(":");
          setDupModal({ matchId: parts[1] ?? "", matchTitle: parts.slice(2).join(":") || "Existing document" });
          return;
        }
        showToast(message, "error");
      } finally {
        setPendingUpload(false);
      }
    },
    [title, description, category, scopeLocation, visibility, language, file, upload, showToast],
  );

  const columns = useMemo(
    () =>
      buildDocumentColumns({
        onPreview: (doc) => void openDetail(doc),
        onReindex: async (id) => {
          try {
            await reindex(id);
            showToast("Re-index queued.", "success");
          } catch {
            showToast("Re-index failed.", "error");
          }
        },
        onDelete: async (id) => {
          if (!window.confirm("Delete this document and all chunks?")) return;
          try {
            await remove(id);
            showToast("Document deleted.", "success");
          } catch {
            showToast("Delete failed.", "error");
          }
        },
        onOcrRetry: async (id) => {
          try {
            await ocrRetry(id);
            showToast("OCR retry queued.", "success");
          } catch {
            showToast("OCR retry failed.", "error");
          }
        },
        onArchive: async (id) => {
          try {
            await archive(id);
            showToast("Document archived.", "success");
          } catch {
            showToast("Archive failed.", "error");
          }
        },
        onLanguage: async (id, lang) => {
          try {
            await setLanguage(id, lang);
            showToast(`Language set to ${labelForLanguage(lang)}.`, "success");
          } catch {
            showToast("Language update failed.", "error");
          }
        },
      }),
    [openDetail, reindex, remove, ocrRetry, archive, setLanguage, showToast],
  );

  const handleSearchPreview = useCallback(async () => {
    if (!searchQuery.trim()) return;
    try {
      const result = await searchPreview(searchQuery);
      if (!result.available || !result.chunks.length) {
        setSearchResult("No relevant published chunks found. Cheffy will fall back to CMS and tools.");
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
        description="Enterprise document intelligence for Cheffy — OCR, multilingual search, governance, and health analytics."
      >
        <AdminButton variant="secondary" onClick={() => void reload()} disabled={saving}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </AdminButton>
      </PageHeader>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="ai-concierge-layout">
        <aside className="ai-concierge-layout__nav">
          <nav className="ai-concierge-nav" aria-label="Knowledge Base sections">
            <ul className="ai-concierge-nav__list">
              {KB_SECTIONS.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#kb-section-${section.id}`}
                    className={["ai-concierge-nav__link", dark ? "ai-concierge-nav__link--dark" : ""].join(" ")}
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="ai-concierge-layout__content">
          <KbSection id="health" title="Document Health Dashboard" icon={<Gauge className="h-5 w-5 text-admin-accent" />}>
            <HealthDashboardSection
              health={health}
              documents={documents}
              refreshing={saving}
              onRefresh={() => {
                void refreshHealth()
                  .then(() => showToast("Health metrics refreshed.", "success"))
                  .catch(() => showToast("Health refresh failed.", "error"));
              }}
            />
          </KbSection>

          <KbSection id="upload" title="Upload Document" icon={<Upload className="h-5 w-5 text-admin-accent" />}>
            <UploadSection
              title={title}
              setTitle={setTitle}
              description={description}
              setDescription={setDescription}
              category={category}
              setCategory={setCategory}
              scopeLocation={scopeLocation}
              setScopeLocation={setScopeLocation}
              visibility={visibility}
              setVisibility={setVisibility}
              language={language}
              setLanguage={setLanguageState}
              file={file}
              setFile={setFile}
              saving={saving || pendingUpload}
              onUpload={() => void doUpload()}
            />
          </KbSection>

          <KbSection id="documents" title="Documents" icon={<BookOpen className="h-5 w-5 text-admin-accent" />}>
            <AdminCard>
              <div className="mb-4 flex flex-wrap gap-3">
                <input
                  type="search"
                  value={tableQuery}
                  onChange={(e) => setTableQuery(e.target.value)}
                  placeholder="Search documents…"
                  className="kb-search-input"
                />
                <AdminSelect
                  label="Language filter"
                  value={languageFilter}
                  onChange={setLanguageFilter}
                  options={[
                    { value: "all", label: "All languages" },
                    ...KNOWLEDGE_LANGUAGES.map((l) => ({ value: l.code, label: l.label })),
                  ]}
                />
              </div>
              <DataTable
                columns={columns}
                data={filteredDocs}
                emptyTitle="No knowledge documents yet."
                hideToolbar
              />
            </AdminCard>
          </KbSection>

          <KbSection id="approvals" title="Approval Queue" icon={<ShieldCheck className="h-5 w-5 text-admin-accent" />}>
            <ApprovalQueueSection
              pending={pendingReviews}
              selected={selectedPending}
              setSelected={setSelectedPending}
              comment={approveComment}
              setComment={setApproveComment}
              rejectReason={rejectReason}
              setRejectReason={setRejectReason}
              saving={saving}
              onApprove={async (id) => {
                try {
                  await approve(id, approveComment || undefined);
                  showToast("Approved — indexing queued.", "success");
                } catch {
                  showToast("Approve failed.", "error");
                }
              }}
              onReject={async (id) => {
                if (!rejectReason.trim()) {
                  showToast("Reject reason is required.", "error");
                  return;
                }
                try {
                  await reject(id, rejectReason);
                  showToast("Document rejected.", "success");
                } catch {
                  showToast("Reject failed.", "error");
                }
              }}
              onBulkApprove={async () => {
                try {
                  await approveMany(selectedPending);
                  setSelectedPending([]);
                  showToast("Bulk approved — indexing queued.", "success");
                } catch {
                  showToast("Bulk approve failed.", "error");
                }
              }}
              onBulkReject={async () => {
                if (!rejectReason.trim()) {
                  showToast("Reject reason is required.", "error");
                  return;
                }
                try {
                  await rejectMany(selectedPending, rejectReason);
                  setSelectedPending([]);
                  showToast("Bulk rejected.", "success");
                } catch {
                  showToast("Bulk reject failed.", "error");
                }
              }}
            />
          </KbSection>

          <KbSection id="duplicates" title="Duplicate Report" icon={<Copy className="h-5 w-5 text-admin-accent" />}>
            <DuplicatesSection
              duplicates={duplicates}
              documents={documents}
              onDismiss={(id) => {
                void dismissDuplicate(id)
                  .then(() => showToast("Duplicate dismissed.", "success"))
                  .catch(() => showToast("Dismiss failed.", "error"));
              }}
            />
          </KbSection>

          <KbSection id="activity" title="Knowledge Activity Timeline" icon={<Activity className="h-5 w-5 text-admin-accent" />}>
            <ActivityTimelineSection activity={activity} />
          </KbSection>

          <KbSection id="search" title="Search Playground" icon={<Search className="h-5 w-5 text-admin-accent" />}>
            <SearchPlaygroundSection
              testLocationId={testLocationId}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchResult={searchResult}
              onSearch={() => void handleSearchPreview()}
            />
          </KbSection>

          {detailDoc && (
            <AdminCard className="mt-2">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{detailDoc.title} — Detail</h2>
                <AdminButton variant="ghost" size="sm" onClick={() => setDetailDoc(null)}>
                  Close
                </AdminButton>
              </div>
              <p className="mb-2 text-sm text-admin-muted">
                {detailDoc.workflow_status} · {detailDoc.index_status} · OCR {detailDoc.ocr_status} ·{" "}
                {labelForLanguage(detailDoc.language)} · v{detailDoc.current_version} · {detailDoc.chunk_count}{" "}
                chunks · {detailDoc.retrieval_count ?? 0} retrievals
              </p>
              {detailDoc.ocr_error ? (
                <p className="mb-2 text-sm text-red-600">OCR error: {detailDoc.ocr_error}</p>
              ) : null}
              {detailDoc.rejected_reason ? (
                <p className="mb-2 text-sm text-red-600">Rejected: {detailDoc.rejected_reason}</p>
              ) : null}
              <h3 className="mb-2 text-sm font-semibold">Version History</h3>
              <pre className="mb-4 max-h-32 overflow-auto rounded-lg bg-black/5 p-3 text-xs whitespace-pre-wrap">
                {detailVersions}
              </pre>
              <h3 className="mb-2 text-sm font-semibold">Indexed Chunks</h3>
              <pre className="max-h-80 overflow-auto rounded-lg bg-black/5 p-3 text-xs whitespace-pre-wrap">
                {detailChunks}
              </pre>
            </AdminCard>
          )}
        </div>
      </div>

      {dupModal && (
        <div className="kb-modal-backdrop" role="dialog" aria-modal="true">
          <div className="kb-modal">
            <h3 className="text-lg font-semibold">This document already exists</h3>
            <p className="mt-2 text-sm text-admin-muted">
              A file matching “{dupModal.matchTitle}” was found. Choose how to proceed — documents are never
              silently duplicated.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <AdminButton variant="secondary" onClick={() => setDupModal(null)}>
                Cancel Upload
              </AdminButton>
              <AdminButton
                onClick={() => void doUpload("replace", dupModal.matchId)}
                disabled={pendingUpload}
              >
                Replace Existing Version
              </AdminButton>
              <AdminButton
                variant="secondary"
                onClick={() => void doUpload("upload_anyway")}
                disabled={pendingUpload}
              >
                Upload Anyway
              </AdminButton>
            </div>
          </div>
        </div>
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
