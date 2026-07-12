import type { KnowledgeValidationRow } from "../../types/knowledgeIntelligence";
import { kiClient, kiTable, writeAudit } from "./client";

const PRICE_RE = /\$\s?(\d+(?:\.\d{1,2})?)/g;
const DATE_RE = /\b(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s*\d{0,4})\b/gi;

export async function listValidationFindings(status: "open" | "all" = "open"): Promise<KnowledgeValidationRow[]> {
  let q = kiTable("knowledge_validation").select("*").order("created_at", { ascending: false }).limit(200);
  if (status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as KnowledgeValidationRow[];
}

export async function resolveValidationFinding(
  id: string,
  status: "ignored" | "resolved" | "fixed",
): Promise<void> {
  const { data: userData } = await kiClient().auth.getUser();
  const { error } = await kiTable("knowledge_validation")
    .update({
      status,
      resolved_by: userData.user?.id ?? null,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
  await writeAudit({
    eventType: "validation_resolve",
    summary: `Validation ${status}: ${id}`,
    entityType: "validation",
    entityId: id,
  });
}

export type ValidationRunResult = {
  runId: string;
  score: number;
  findings: KnowledgeValidationRow[];
};

/** Non-blocking knowledge validator — warns only, never blocks publish. */
export async function runKnowledgeValidation(): Promise<ValidationRunResult> {
  const runId = crypto.randomUUID();
  const findings: Array<Record<string, unknown>> = [];

  const { data: docs } = await kiTable("semantic_documents").select("*").limit(500);
  const documents = (docs ?? []) as Array<Record<string, unknown>>;

  const priceMap = new Map<string, Array<{ docId: string; title: string; price: string }>>();

  for (const doc of documents) {
    const id = String(doc.id);
    const title = String(doc.title ?? "Untitled");
    const meta = (doc.metadata ?? {}) as Record<string, unknown>;

    if (!doc.category) {
      findings.push({
        document_id: id,
        run_id: runId,
        finding_type: "missing_category",
        severity: "warning",
        title: `Missing category: ${title}`,
        details: "Document has no category assigned.",
        evidence: {},
        validation_score: 60,
      });
    }

    if (!doc.description && !meta.summary) {
      findings.push({
        document_id: id,
        run_id: runId,
        finding_type: "missing_metadata",
        severity: "info",
        title: `Thin metadata: ${title}`,
        details: "No description or summary metadata.",
        evidence: {},
        validation_score: 75,
      });
    }

    if (doc.ocr_status === "completed" && typeof doc.ocr_confidence === "number" && doc.ocr_confidence < 0.55) {
      findings.push({
        document_id: id,
        run_id: runId,
        finding_type: "low_ocr_confidence",
        severity: "warning",
        title: `Low OCR confidence: ${title}`,
        details: `OCR confidence ${(doc.ocr_confidence as number).toFixed(2)}`,
        evidence: { confidence: doc.ocr_confidence },
        validation_score: 55,
      });
    }

    if (doc.index_status === "indexed" && Number(doc.chunk_count ?? 0) === 0) {
      findings.push({
        document_id: id,
        run_id: runId,
        finding_type: "empty_chunks",
        severity: "error",
        title: `Empty chunks: ${title}`,
        details: "Document marked indexed but has zero chunks.",
        evidence: {},
        validation_score: 20,
      });
    }

    if (doc.index_status === "failed") {
      findings.push({
        document_id: id,
        run_id: runId,
        finding_type: "low_embedding_quality",
        severity: "error",
        title: `Embedding/index failure: ${title}`,
        details: String(doc.index_error ?? "Index failed"),
        evidence: {},
        validation_score: 10,
      });
    }

    const expiresAt = meta.expires_at ?? meta.expiry ?? meta.valid_until;
    if (typeof expiresAt === "string" && !Number.isNaN(Date.parse(expiresAt)) && Date.parse(expiresAt) < Date.now()) {
      findings.push({
        document_id: id,
        run_id: runId,
        finding_type: "expired_document",
        severity: "warning",
        title: `Expired document: ${title}`,
        details: `Marked expired at ${expiresAt}`,
        evidence: { expiresAt },
        validation_score: 40,
      });
    }

    // Sample preview text from versions for price/date conflict heuristics
    const { data: versions } = await kiTable("semantic_document_versions")
      .select("extracted_text_preview")
      .eq("document_id", id)
      .order("version_number", { ascending: false })
      .limit(1);
    const preview = String((versions?.[0] as { extracted_text_preview?: string } | undefined)?.extracted_text_preview ?? "");
    const prices = [...preview.matchAll(PRICE_RE)].map((m) => m[0]);
    for (const price of prices.slice(0, 5)) {
      const dishKey = preview.slice(0, 80).toLowerCase();
      const mapKey = `${dishKey.slice(0, 40)}|${price}`;
      const list = priceMap.get(mapKey) ?? [];
      list.push({ docId: id, title, price });
      priceMap.set(mapKey, list);
    }
    if (DATE_RE.test(preview) && /policy|cancel|valid|until|expire/i.test(preview)) {
      findings.push({
        document_id: id,
        run_id: runId,
        finding_type: "conflicting_dates",
        severity: "info",
        title: `Date-sensitive policy: ${title}`,
        details: "Contains policy dates — review for conflicts across documents.",
        evidence: {},
        validation_score: 70,
      });
    }
  }

  // Cross-doc price conflicts (same approximate dish text + different prices)
  const byDish = new Map<string, Set<string>>();
  for (const [key, entries] of priceMap) {
    const dish = key.split("|")[0] ?? key;
    const prices = byDish.get(dish) ?? new Set();
    for (const e of entries) prices.add(e.price);
    byDish.set(dish, prices);
    if (prices.size > 1 && entries.length > 1) {
      findings.push({
        document_id: entries[0].docId,
        run_id: runId,
        finding_type: "conflicting_prices",
        severity: "warning",
        title: `Possible price conflict near “${dish.slice(0, 40)}”`,
        details: `Prices seen: ${[...prices].join(", ")}`,
        evidence: { entries },
        validation_score: 50,
      });
    }
  }

  const { data: rels } = await kiTable("knowledge_relationships").select("*").limit(500);
  const docIds = new Set(documents.map((d) => String(d.id)));
  for (const rel of (rels ?? []) as Array<{ id: string; source_document_id: string; target_document_id: string }>) {
    if (!docIds.has(rel.source_document_id) || !docIds.has(rel.target_document_id)) {
      findings.push({
        document_id: docIds.has(rel.source_document_id) ? rel.source_document_id : rel.target_document_id,
        run_id: runId,
        finding_type: "broken_relationship",
        severity: "warning",
        title: "Broken relationship edge",
        details: `Relationship ${rel.id} references a missing document.`,
        evidence: { relationshipId: rel.id },
        validation_score: 45,
      });
    }
  }

  if (findings.length) {
    const { error } = await kiTable("knowledge_validation").insert(findings);
    if (error) throw error;
  }

  const score =
    findings.length === 0
      ? 100
      : Math.max(
          0,
          Math.round(
            100 -
              findings.reduce((n, f) => n + (f.severity === "error" ? 8 : f.severity === "warning" ? 4 : 1), 0),
          ),
        );

  await writeAudit({
    eventType: "validation_run",
    summary: `Validation run scored ${score} with ${findings.length} findings`,
    entityType: "validation_run",
    entityId: runId,
    metadata: { score, count: findings.length },
  });

  const saved = await listValidationFindings("open");
  return { runId, score, findings: saved.filter((f) => f.run_id === runId) };
}
