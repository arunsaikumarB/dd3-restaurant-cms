import type { LocationId } from "../../config/locations";
import type {
  SemanticChunkRow,
  SemanticDocumentCategory,
  SemanticDocumentRow,
  SemanticDocumentVersionRow,
  SemanticIndexJobRow,
  SemanticRetrievalResult,
  SemanticUploadInput,
} from "../../types/semanticKnowledge";
import { SEMANTIC_API, SEMANTIC_STORAGE_BUCKET } from "../../types/semanticKnowledge";
import { createClientIfConfigured } from "../../lib/supabase/client";
import { detectFileType } from "./categories";

function supabase() {
  const client = createClientIfConfigured();
  if (!client) throw new Error("Supabase is not configured.");
  return client;
}

function semanticTable(name: string) {
  return (supabase() as unknown as { from: (table: string) => ReturnType<ReturnType<typeof supabase>["from"]> }).from(name);
}

function storagePath(documentId: string, version: number, fileName: string): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${documentId}/v${version}/${safe}`;
}

export async function listSemanticDocuments(): Promise<SemanticDocumentRow[]> {
  const { data, error } = await semanticTable("semantic_documents")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SemanticDocumentRow[];
}

export async function getSemanticDocument(id: string): Promise<SemanticDocumentRow | null> {
  const { data, error } = await semanticTable("semantic_documents")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as SemanticDocumentRow | null) ?? null;
}

export async function listDocumentVersions(documentId: string): Promise<SemanticDocumentVersionRow[]> {
  const { data, error } = await semanticTable("semantic_document_versions")
    .select("*")
    .eq("document_id", documentId)
    .order("version_number", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SemanticDocumentVersionRow[];
}

export async function listDocumentChunks(
  documentId: string,
  version?: number,
): Promise<SemanticChunkRow[]> {
  let query = semanticTable("semantic_chunks")
    .select("id, document_id, version_number, location_id, category, visibility, chunk_index, content, token_estimate, metadata, created_at")
    .eq("document_id", documentId)
    .order("chunk_index", { ascending: true })
    .limit(200);
  if (version != null) query = query.eq("version_number", version);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as SemanticChunkRow[];
}

export async function listIndexJobs(documentId?: string): Promise<SemanticIndexJobRow[]> {
  let query = semanticTable("semantic_index_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (documentId) query = query.eq("document_id", documentId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as SemanticIndexJobRow[];
}

export async function uploadSemanticDocument(input: SemanticUploadInput): Promise<SemanticDocumentRow> {
  const fileType = detectFileType(input.file.name);
  if (!fileType) throw new Error("Unsupported file type. Use PDF, DOCX, TXT, Markdown, HTML, or CSV.");

  const client = supabase();
  const { data: userData } = await client.auth.getUser();
  const userId = userData.user?.id ?? null;

  const { data: doc, error: insertError } = await semanticTable("semantic_documents")
    .insert({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      category: input.category,
      location_id: input.locationId ?? null,
      visibility: input.visibility ?? "public",
      file_name: input.file.name,
      file_type: fileType,
      storage_path: "pending",
      file_size_bytes: input.file.size,
      index_status: "pending",
      created_by: userId,
    })
    .select("*")
    .single();

  if (insertError || !doc) throw insertError ?? new Error("Failed to create document record.");

  const docRow = doc as SemanticDocumentRow;
  const path = storagePath(docRow.id, 1, input.file.name);
  const { error: uploadError } = await client.storage
    .from(SEMANTIC_STORAGE_BUCKET)
    .upload(path, input.file, { upsert: false, contentType: input.file.type || undefined });

  if (uploadError) {
    await semanticTable("semantic_documents").delete().eq("id", docRow.id);
    throw uploadError;
  }

  const { data: updated, error: updateError } = await semanticTable("semantic_documents")
    .update({ storage_path: path })
    .eq("id", docRow.id)
    .select("*")
    .single();

  if (updateError || !updated) throw updateError ?? new Error("Failed to finalize document.");

  await semanticTable("semantic_document_versions").insert({
    document_id: docRow.id,
    version_number: 1,
    storage_path: path,
    file_name: input.file.name,
    file_type: fileType,
    change_notes: input.changeNotes ?? "Initial upload",
    created_by: userId,
  });

  await queueSemanticIndex(docRow.id, 1);
  return updated as SemanticDocumentRow;
}

export async function queueSemanticIndex(documentId: string, versionNumber?: number): Promise<void> {
  const doc = await getSemanticDocument(documentId);
  if (!doc) throw new Error("Document not found.");

  const version = versionNumber ?? doc.current_version;

  await semanticTable("semantic_documents")
    .update({ index_status: "pending", index_error: null })
    .eq("id", documentId);

  const { error } = await semanticTable("semantic_index_jobs").insert({
    document_id: documentId,
    version_number: version,
    status: "queued",
  });
  if (error) throw error;

  void fetch(SEMANTIC_API.index, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId, versionNumber: version }),
  }).catch(() => undefined);
}

export async function deleteSemanticDocument(documentId: string): Promise<void> {
  const client = supabase();
  const doc = await getSemanticDocument(documentId);
  if (!doc) return;

  const versions = await listDocumentVersions(documentId);
  const paths = [...new Set(versions.map((v) => v.storage_path))];
  if (paths.length) {
    await client.storage.from(SEMANTIC_STORAGE_BUCKET).remove(paths);
  }

  const { error } = await semanticTable("semantic_documents").delete().eq("id", documentId);
  if (error) throw error;
}

export async function previewSemanticSearch(input: {
  query: string;
  locationId: LocationId;
  categories?: SemanticDocumentCategory[];
  matchCount?: number;
}): Promise<SemanticRetrievalResult> {
  const response = await fetch(SEMANTIC_API.search, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: input.query,
      locationId: input.locationId,
      categories: input.categories,
      matchCount: input.matchCount ?? 5,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Search failed (${response.status})`);
  }

  return (await response.json()) as SemanticRetrievalResult;
}

/** Runtime retrieval for Cheffy — uses semantic search API. */
export async function retrieveSemanticKnowledge(input: {
  query: string;
  locationId: LocationId;
  categories?: SemanticDocumentCategory[];
  matchCount?: number;
  signal?: AbortSignal;
}): Promise<SemanticRetrievalResult> {
  const response = await fetch(SEMANTIC_API.search, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: input.signal,
    body: JSON.stringify({
      query: input.query,
      locationId: input.locationId,
      categories: input.categories,
      matchCount: input.matchCount ?? 4,
    }),
  });

  if (!response.ok) {
    return {
      available: false,
      query: input.query,
      chunks: [],
      categories: input.categories ?? [],
      tokenEstimate: 0,
      cached: false,
      reason: `search_unavailable_${response.status}`,
    };
  }

  return (await response.json()) as SemanticRetrievalResult;
}

export async function isSemanticRagEnabled(): Promise<boolean> {
  const client = createClientIfConfigured();
  if (!client) return false;
  const { data } = await (client as unknown as { from: (t: string) => ReturnType<ReturnType<typeof supabase>["from"]> })
    .from("ai_feature_flags")
    .select("enabled")
    .eq("key", "semantic_rag")
    .maybeSingle();
  return data?.enabled ?? true;
}
