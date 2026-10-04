import { verifyAdminAccessToken } from "../../src/integrations/chefgaa/automation/verifyAdmin";
import { embedTexts } from "./lib/semanticEmbeddings";
import { chunkText, extractTextFromBuffer, estimateTokens } from "./lib/semanticTextExtractor";
import { createSemanticServiceClient, jsonResponse, readEnv } from "./lib/semanticSupabase";
import {
  corsFor,
  isBodyTooLarge,
  maxBodyBytes,
  readHeader,
  type CorsDecision,
} from "./lib/requestGuards";

type HttpEvent = {
  httpMethod?: string;
  headers?: Record<string, string | undefined>;
  body?: string | null;
};

type IndexBody = {
  documentId?: string;
  versionNumber?: number;
};

const BUCKET = "semantic-knowledge";

function respond(status: number, body: Record<string, unknown>, cors: CorsDecision) {
  return jsonResponse(status, body, cors.headers);
}

export default async function handler(event: HttpEvent) {
  const cors = corsFor(event.headers);

  if (event.httpMethod === "OPTIONS") {
    if (!cors.allowed) return respond(403, { error: "Origin not allowed." }, cors);
    return { statusCode: 204, headers: cors.headers, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return respond(405, { error: "Method not allowed" }, cors);
  }
  if (!cors.allowed) {
    return respond(403, { error: "Origin not allowed." }, cors);
  }

  const maxBytes = maxBodyBytes("semantic-index");
  if (isBodyTooLarge(event.body, maxBytes, readHeader(event.headers, "content-length"))) {
    return respond(413, { error: "Request body is too large." }, cors);
  }

  const authHeader = readHeader(event.headers, "authorization");
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return respond(401, { error: "Admin access required." }, cors);
  }

  const auth = await verifyAdminAccessToken(token);
  if (!auth.ok) {
    return respond(401, { error: auth.error ?? "Admin access required." }, cors);
  }

  let body: IndexBody = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return respond(400, { error: "Invalid JSON body" }, cors);
  }

  const documentId = body.documentId;
  if (!documentId) {
    return respond(400, { error: "documentId is required" }, cors);
  }

  if (!readEnv("GEMINI_API_KEY")) {
    return respond(503, { error: "GEMINI_API_KEY is not configured for embeddings." }, cors);
  }

  const supabase = createSemanticServiceClient();

  const { data: doc, error: docError } = await supabase
    .from("semantic_documents")
    .select("*")
    .eq("id", documentId)
    .maybeSingle();

  if (docError || !doc) {
    return respond(404, { error: "Document not found" }, cors);
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

    return respond(200, {
      ok: true,
      documentId,
      versionNumber,
      chunkCount: chunks.length,
      tokenEstimate,
    }, cors);
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

    return respond(500, { error: message }, cors);
  }
}
