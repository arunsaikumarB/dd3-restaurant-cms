import { createHash } from "node:crypto";
import { embedTexts } from "./lib/semanticEmbeddings";
import { chunkText, extractTextFromBuffer, estimateTokens } from "./lib/semanticTextExtractor";
import { needsOcr, runGeminiOcr } from "./lib/semanticOcr";
import { createSemanticServiceClient, jsonResponse, readEnv } from "./lib/semanticSupabase";

type HttpEvent = {
  httpMethod?: string;
  body?: string | null;
};

type IndexBody = {
  documentId?: string;
  versionNumber?: number;
  /** Force OCR retry even if text already exists. */
  forceOcr?: boolean;
  /** Index without requiring approved/published workflow (admin reindex of approved docs). */
  skipWorkflowGate?: boolean;
};

const BUCKET = "semantic-knowledge";
const OCR_MIN_CHARS = 40;

function detectLanguage(text: string): string {
  const sample = text.slice(0, 4000);
  if (!sample.trim()) return "unknown";
  const telugu = (sample.match(/[\u0C00-\u0C7F]/g) ?? []).length;
  const hindi = (sample.match(/[\u0900-\u097F]/g) ?? []).length;
  const latin = (sample.match(/[A-Za-z]/g) ?? []).length;
  const total = Math.max(telugu + hindi + latin, 1);
  if (telugu / total > 0.2) return "te";
  if (hindi / total > 0.2) return "hi";
  if (latin / total > 0.2) return "en";
  return "unknown";
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

async function logActivity(
  supabase: ReturnType<typeof createSemanticServiceClient>,
  documentId: string,
  eventType: string,
  summary: string,
  metadata: Record<string, unknown> = {},
) {
  await supabase.from("knowledge_activity").insert({
    document_id: documentId,
    event_type: eventType,
    summary,
    metadata,
  });
}

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
  const indexStarted = Date.now();

  const { data: doc, error: docError } = await supabase
    .from("semantic_documents")
    .select("*")
    .eq("id", documentId)
    .maybeSingle();

  if (docError || !doc) {
    return jsonResponse(404, { error: "Document not found" });
  }

  const workflow = (doc as { workflow_status?: string }).workflow_status ?? "published";
  if (!body.skipWorkflowGate && !["approved", "published"].includes(workflow)) {
    return jsonResponse(409, {
      error: "Document must be approved before indexing. Current workflow: " + workflow,
      workflow_status: workflow,
    });
  }

  const versionNumber = body.versionNumber ?? doc.current_version;

  const { data: knowledgeJob } = await supabase
    .from("knowledge_jobs")
    .insert({
      document_id: documentId,
      job_type: body.forceOcr ? "ocr" : "index",
      status: "processing",
      progress: 5,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

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
    let text = await extractTextFromBuffer(buffer, doc.file_type, doc.file_name);
    let ocrUsed = false;
    let ocrConfidence: number | null = null;
    let ocrLanguage: string | null = null;
    let ocrDurationMs: number | null = null;
    let ocrStatus: string = "not_needed";
    let ocrError: string | null = null;

    if (body.forceOcr || needsOcr(text, doc.file_type, OCR_MIN_CHARS)) {
      ocrStatus = "processing";
      await supabase
        .from("semantic_documents")
        .update({ ocr_status: "processing", ocr_error: null })
        .eq("id", documentId);

      if (knowledgeJob?.id) {
        await supabase.from("knowledge_jobs").update({ progress: 25, job_type: "ocr" }).eq("id", knowledgeJob.id);
      }

      try {
        const ocr = await runGeminiOcr(buffer, doc.file_type, doc.file_name);
        ocrUsed = true;
        ocrConfidence = ocr.confidence;
        ocrDurationMs = ocr.durationMs;
        if (ocr.text.trim().length > text.trim().length) {
          text = ocr.text.trim();
        }
        ocrStatus = text.trim().length >= OCR_MIN_CHARS ? "completed" : "failed";
        if (ocrStatus === "failed") {
          ocrError = "OCR returned insufficient text.";
        }
        await logActivity(supabase, documentId, "ocr", `OCR ${ocrStatus}`, {
          confidence: ocrConfidence,
          durationMs: ocrDurationMs,
        });
      } catch (ocrErr) {
        ocrStatus = "failed";
        ocrError = ocrErr instanceof Error ? ocrErr.message : "OCR failed";
        await logActivity(supabase, documentId, "ocr_failed", ocrError);
        if (!text.trim()) throw new Error(ocrError);
      }
    }

    if (!text.trim()) {
      throw new Error("No extractable text found (parser and OCR both empty).");
    }

    const languageSource = (doc as { language_source?: string }).language_source ?? "auto";
    const detectedLanguage = detectLanguage(text);
    const language =
      languageSource === "manual"
        ? ((doc as { language?: string }).language ?? detectedLanguage)
        : detectedLanguage;
    if (ocrUsed) ocrLanguage = language;

    const contentHash = sha256(text.replace(/\s+/g, " ").trim().toLowerCase());

    if (knowledgeJob?.id) {
      await supabase.from("knowledge_jobs").update({ progress: 45 }).eq("id", knowledgeJob.id);
    }

    const chunks = chunkText(text);
    if (!chunks.length) throw new Error("Chunking produced no segments.");

    if (knowledgeJob?.id) {
      await supabase.from("knowledge_jobs").update({ progress: 60, job_type: "embed" }).eq("id", knowledgeJob.id);
    }

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
      metadata: {
        title: doc.title,
        file_name: doc.file_name,
        language,
        ocr_used: ocrUsed,
      },
    }));

    const batchSize = 50;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error: insertError } = await supabase.from("semantic_chunks").insert(batch);
      if (insertError) throw insertError;
    }

    // Near-duplicate chunk scan (content equality against other docs)
    const sampleContents = chunks.slice(0, 8).map((c) => c.content.slice(0, 280));
    for (const sample of sampleContents) {
      const { data: near } = await supabase
        .from("semantic_chunks")
        .select("id, document_id")
        .neq("document_id", documentId)
        .ilike("content", `%${sample.slice(0, 80).replace(/%/g, "")}%`)
        .limit(3);
      for (const match of near ?? []) {
        await supabase.from("knowledge_duplicates").insert({
          document_id: documentId,
          match_document_id: match.document_id,
          match_chunk_id: match.id,
          duplicate_type: "near_duplicate",
          similarity: 0.9,
          details: { sample: sample.slice(0, 120) },
        });
      }
    }

    const tokenEstimate = estimateTokens(text);
    const preview = text.slice(0, 500);
    const indexDurationMs = Date.now() - indexStarted;
    const nextWorkflow = workflow === "approved" || workflow === "published" ? "published" : workflow;

    await supabase
      .from("semantic_documents")
      .update({
        index_status: "indexed",
        index_error: null,
        chunk_count: chunks.length,
        token_estimate: tokenEstimate,
        language,
        content_hash: contentHash,
        ocr_status: ocrStatus,
        ocr_confidence: ocrConfidence,
        ocr_language: ocrLanguage,
        ocr_duration_ms: ocrDurationMs,
        ocr_error: ocrError,
        ocr_used: ocrUsed,
        index_duration_ms: indexDurationMs,
        workflow_status: nextWorkflow,
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

    if (knowledgeJob?.id) {
      await supabase
        .from("knowledge_jobs")
        .update({
          status: "completed",
          progress: 100,
          completed_at: new Date().toISOString(),
          result: { chunkCount: chunks.length, ocrUsed, language },
        })
        .eq("id", knowledgeJob.id);
    }

    await logActivity(supabase, documentId, "index_completed", `Indexed ${chunks.length} chunks`, {
      ocrUsed,
      language,
      indexDurationMs,
    });

    try {
      await supabase.rpc("refresh_knowledge_health");
    } catch {
      /* health snapshot is best-effort */
    }

    return jsonResponse(200, {
      ok: true,
      documentId,
      versionNumber,
      chunkCount: chunks.length,
      tokenEstimate,
      ocrStatus,
      ocrUsed,
      language,
      indexDurationMs,
      workflow_status: nextWorkflow,
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

    if (knowledgeJob?.id) {
      await supabase
        .from("knowledge_jobs")
        .update({
          status: "failed",
          error: message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", knowledgeJob.id);
    }

    await logActivity(supabase, documentId, "index_failed", message);

    return jsonResponse(500, { error: message });
  }
}
