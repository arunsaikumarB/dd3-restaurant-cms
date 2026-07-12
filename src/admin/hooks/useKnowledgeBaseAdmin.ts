import { useCallback, useEffect, useState } from "react";
import type { LocationId } from "../../config/locations";
import type {
  KnowledgeActivityRow,
  KnowledgeDuplicateRow,
  KnowledgeHealthRow,
  KnowledgeReviewRow,
  SemanticChunkRow,
  SemanticDocumentRow,
  SemanticDocumentVersionRow,
  SemanticIndexJobRow,
  SemanticRetrievalResult,
  SemanticDocumentCategory,
} from "../../types/semanticKnowledge";
import {
  approveDocument,
  archiveDocument,
  bulkApprove,
  bulkReject,
  checkDuplicateFile,
  deleteSemanticDocument,
  getLatestKnowledgeHealth,
  listDocumentChunks,
  listDocumentVersions,
  listIndexJobs,
  listKnowledgeActivity,
  listKnowledgeDuplicates,
  listKnowledgeReviews,
  listPendingReviews,
  listSemanticDocuments,
  previewSemanticSearch,
  queueSemanticIndex,
  refreshKnowledgeHealth,
  rejectDocument,
  resolveDuplicate,
  retryOcr,
  updateDocumentLanguage,
  uploadSemanticDocument,
} from "../../services/rag";

export function useKnowledgeBaseAdmin(testLocationId: LocationId) {
  const [documents, setDocuments] = useState<SemanticDocumentRow[]>([]);
  const [pendingReviews, setPendingReviews] = useState<SemanticDocumentRow[]>([]);
  const [activity, setActivity] = useState<KnowledgeActivityRow[]>([]);
  const [duplicates, setDuplicates] = useState<KnowledgeDuplicateRow[]>([]);
  const [health, setHealth] = useState<KnowledgeHealthRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rows, pending, acts, dups, healthSnap] = await Promise.all([
        listSemanticDocuments(),
        listPendingReviews(),
        listKnowledgeActivity(40),
        listKnowledgeDuplicates("open"),
        getLatestKnowledgeHealth(),
      ]);
      setDocuments(rows);
      setPendingReviews(pending);
      setActivity(acts);
      setDuplicates(dups);
      setHealth(healthSnap);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load knowledge base.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const upload = useCallback(
    async (input: {
      title: string;
      description?: string;
      category: SemanticDocumentCategory;
      locationId?: LocationId | null;
      visibility?: "public" | "private";
      language?: string;
      file: File;
      changeNotes?: string;
      duplicateAction?: "cancel" | "replace" | "upload_anyway";
      replaceDocumentId?: string;
    }) => {
      setSaving(true);
      setError(null);
      try {
        const result = await uploadSemanticDocument({
          ...input,
          languageSource: input.language ? "manual" : "auto",
        });
        await reload();
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [reload],
  );

  const checkDuplicate = useCallback(async (file: File) => checkDuplicateFile(file), []);

  const reindex = useCallback(
    async (documentId: string) => {
      setSaving(true);
      try {
        await queueSemanticIndex(documentId, undefined, { skipWorkflowGate: true });
        await reload();
      } finally {
        setSaving(false);
      }
    },
    [reload],
  );

  const ocrRetry = useCallback(
    async (documentId: string) => {
      setSaving(true);
      try {
        await retryOcr(documentId);
        await reload();
      } finally {
        setSaving(false);
      }
    },
    [reload],
  );

  const remove = useCallback(
    async (documentId: string) => {
      setSaving(true);
      try {
        await deleteSemanticDocument(documentId);
        await reload();
      } finally {
        setSaving(false);
      }
    },
    [reload],
  );

  const approve = useCallback(
    async (documentId: string, comments?: string) => {
      setSaving(true);
      try {
        await approveDocument(documentId, comments);
        await queueSemanticIndex(documentId);
        await reload();
      } finally {
        setSaving(false);
      }
    },
    [reload],
  );

  const reject = useCallback(
    async (documentId: string, reason: string) => {
      setSaving(true);
      try {
        await rejectDocument(documentId, reason);
        await reload();
      } finally {
        setSaving(false);
      }
    },
    [reload],
  );

  const archive = useCallback(
    async (documentId: string) => {
      setSaving(true);
      try {
        await archiveDocument(documentId);
        await reload();
      } finally {
        setSaving(false);
      }
    },
    [reload],
  );

  const approveMany = useCallback(
    async (ids: string[]) => {
      setSaving(true);
      try {
        await bulkApprove(ids);
        for (const id of ids) {
          await queueSemanticIndex(id);
        }
        await reload();
      } finally {
        setSaving(false);
      }
    },
    [reload],
  );

  const rejectMany = useCallback(
    async (ids: string[], reason: string) => {
      setSaving(true);
      try {
        await bulkReject(ids, reason);
        await reload();
      } finally {
        setSaving(false);
      }
    },
    [reload],
  );

  const setLanguage = useCallback(
    async (documentId: string, language: string) => {
      await updateDocumentLanguage(documentId, language);
      await reload();
    },
    [reload],
  );

  const dismissDuplicate = useCallback(
    async (duplicateId: string) => {
      await resolveDuplicate(duplicateId, "ignored");
      await reload();
    },
    [reload],
  );

  const refreshHealth = useCallback(async () => {
    const snap = await refreshKnowledgeHealth();
    setHealth(snap);
    return snap;
  }, []);

  const loadVersions = useCallback(async (documentId: string): Promise<SemanticDocumentVersionRow[]> => {
    return listDocumentVersions(documentId);
  }, []);

  const loadChunks = useCallback(async (documentId: string, version?: number): Promise<SemanticChunkRow[]> => {
    return listDocumentChunks(documentId, version);
  }, []);

  const loadJobs = useCallback(async (documentId?: string): Promise<SemanticIndexJobRow[]> => {
    return listIndexJobs(documentId);
  }, []);

  const loadReviews = useCallback(async (documentId?: string): Promise<KnowledgeReviewRow[]> => {
    return listKnowledgeReviews(documentId);
  }, []);

  const searchPreview = useCallback(
    async (query: string, categories?: SemanticDocumentCategory[]): Promise<SemanticRetrievalResult> => {
      return previewSemanticSearch({
        query,
        locationId: testLocationId,
        categories,
        matchCount: 5,
      });
    },
    [testLocationId],
  );

  return {
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
    checkDuplicate,
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
    loadJobs,
    loadReviews,
    searchPreview,
  };
}
