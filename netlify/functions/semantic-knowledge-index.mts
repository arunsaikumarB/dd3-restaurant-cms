import { embedTexts } from "./lib/semanticEmbeddings";
import { chunkText, extractTextFromBuffer, estimateTokens } from "./lib/semanticTextExtractor";
import { createSemanticServiceClient, jsonResponse, readEnv } from "./lib/semanticSupabase";

type HttpEvent = {
  httpMethod?: string;
  body?: string | null;
};

type IndexBody = {
  documentId?: string;
  versionNumber?: number;
};

const BUCKET = "semantic-knowledge";

export default async function handler(event: HttpEvent) {
  if (event.httpMethod === "OPTIONS") {
    return jsonResponse(204, {});
  }
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  let body: IndexBody = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const documentId = body.documentId;
  if (!documentId) {
    return jsonResponse(400, { error: "documentId is required" });
  }

  if (!readEnv("GEMINI_API_KEY")) {
    return jsonResponse(503, { error: "GEMINI_API_KEY is not configured for embeddings." });
  }

  const supabase = createSemanticServiceClient();

  const { data: doc, error: docError } = await supabase
    .from("semantic_documents")
    .select("*")
    .eq("id", documentId)
    .maybeSingle();

  if (docError || !doc) {
    return jsonResponse(404, { error: "Document not found" });
  }

  const versionNumber = body.versionNumber ?? doc.current_version;

  await supabase
    .from("semantic_documents")
    .update({ index_status: "processing", index_error: null })
    .eq("id", documentId);

  const { data: job } = await supabase
    .from("semantic_index_jobs")
    .insert({
      document_id: documentId,
      version_number: versionNumber,
      status: "processing",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  try {
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(doc.storage_path);

    if (downloadError || !fileData) {
      throw new Error(downloadError?.message ?? "Failed to download document.");
    }

    const buffer = await fileData.arrayBuffer();
    const text = await extractTextFromBuffer(buffer, doc.file_type, doc.file_name);
    if (!text) throw new Error("No extractable text found in document.");

    const chunks = chunkText(text);
    if (!chunks.length) throw new Error("Chunking produced no segments.");

    const embeddings = await embedTexts(chunks.map((c) => c.content));

    await supabase
      .from("semantic_chunks")
      .delete()
      .eq("document_id", documentId)
      .eq("version_number", versionNumber);

    const rows = chunks.map((chunk, i) => ({
      document_id: documentId,
      version_number: versionNumber,
      location_id: doc.location_id,
      category: doc.category,
      visibility: doc.visibility,
      chunk_index: chunk.index,
      content: chunk.content,
      token_estimate: chunk.tokenEstimate,
      embedding: embeddings[i],
      metadata: { title: doc.title, file_name: doc.file_name },
    }));

    const batchSize = 50;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error: insertError } = await supabase.from("semantic_chunks").insert(batch);
      if (insertError) throw insertError;
    }

    const tokenEstimate = estimateTokens(text);
    const preview = text.slice(0, 500);

    await supabase
      .from("semantic_documents")
      .update({
        index_status: "indexed",
        index_error: null,
        chunk_count: chunks.length,
        token_estimate: tokenEstimate,
      })
      .eq("id", documentId);

    await supabase
      .from("semantic_document_versions")
      .update({
        chunk_count: chunks.length,
        extracted_text_preview: preview,
        indexed_at: new Date().toISOString(),
      })
      .eq("document_id", documentId)
      .eq("version_number", versionNumber);

    if (job?.id) {
      await supabase
        .from("semantic_index_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);
    }

    return jsonResponse(200, {
      ok: true,
      documentId,
      versionNumber,
      chunkCount: chunks.length,
      tokenEstimate,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Indexing failed";

    await supabase
      .from("semantic_documents")
      .update({ index_status: "failed", index_error: message })
      .eq("id", documentId);

    if (job?.id) {
      await supabase
        .from("semantic_index_jobs")
        .update({
          status: "failed",
          error: message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);
    }

    return jsonResponse(500, { error: message });
  }
}
