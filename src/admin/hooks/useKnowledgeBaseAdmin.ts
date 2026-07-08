import { useCallback, useEffect, useState } from "react";
import type { LocationId } from "../../config/locations";
import type {
  SemanticChunkRow,
  SemanticDocumentRow,
  SemanticDocumentVersionRow,
  SemanticIndexJobRow,
  SemanticRetrievalResult,
} from "../../types/semanticKnowledge";
import {
  deleteSemanticDocument,
  listDocumentChunks,
  listDocumentVersions,
  listIndexJobs,
  listSemanticDocuments,
  previewSemanticSearch,
  queueSemanticIndex,
  uploadSemanticDocument,
} from "../../services/rag";
import type { SemanticDocumentCategory } from "../../types/semanticKnowledge";

export function useKnowledgeBaseAdmin(testLocationId: LocationId) {
  const [documents, setDocuments] = useState<SemanticDocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listSemanticDocuments();
      setDocuments(rows);
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
      file: File;
      changeNotes?: string;
    }) => {
      setSaving(true);
      setError(null);
      try {
        await uploadSemanticDocument(input);
        await reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [reload],
  );

  const reindex = useCallback(
    async (documentId: string) => {
      setSaving(true);
      try {
        await queueSemanticIndex(documentId);
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

  const loadVersions = useCallback(async (documentId: string): Promise<SemanticDocumentVersionRow[]> => {
    return listDocumentVersions(documentId);
  }, []);

  const loadChunks = useCallback(async (documentId: string, version?: number): Promise<SemanticChunkRow[]> => {
    return listDocumentChunks(documentId, version);
  }, []);

  const loadJobs = useCallback(async (documentId?: string): Promise<SemanticIndexJobRow[]> => {
    return listIndexJobs(documentId);
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
    loading,
    saving,
    error,
    reload,
    upload,
    reindex,
    remove,
    loadVersions,
    loadChunks,
    loadJobs,
    searchPreview,
  };
}
