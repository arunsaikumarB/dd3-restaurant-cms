import type { KnowledgeRecommendationRow } from "../../types/knowledgeIntelligence";
import { listKnowledgeFeedback } from "./feedback";
import { listRelationships } from "./relationships";
import { kiTable, writeAudit } from "./client";

export async function listRecommendations(
  status: "open" | "all" = "open",
): Promise<KnowledgeRecommendationRow[]> {
  let q = kiTable("knowledge_recommendations").select("*").order("created_at", { ascending: false }).limit(100);
  if (status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as KnowledgeRecommendationRow[];
}

export async function updateRecommendationStatus(
  id: string,
  status: KnowledgeRecommendationRow["status"],
): Promise<void> {
  const { error } = await kiTable("knowledge_recommendations")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  await writeAudit({
    eventType: "recommendation_update",
    summary: `Recommendation ${status}`,
    entityType: "recommendation",
    entityId: id,
  });
}

/** Analyze feedback + inventory and upsert open improvement suggestions. */
export async function generateRecommendations(): Promise<KnowledgeRecommendationRow[]> {
  const feedback = await listKnowledgeFeedback(400);
  const { data: docs } = await kiTable("semantic_documents").select(
    "id, title, category, chunk_count, workflow_status, index_status, is_duplicate, updated_at, metadata",
  );
  const documents = (docs ?? []) as Array<{
    id: string;
    title: string;
    category: string;
    chunk_count: number;
    workflow_status: string;
    index_status: string;
    is_duplicate: boolean;
    updated_at: string;
    metadata: Record<string, unknown>;
  }>;
  const relationships = await listRelationships();

  const inserts: Array<Record<string, unknown>> = [];

  const missing = feedback.filter((f) => f.feedback_type === "missing_information");
  const byQuestion = new Map<string, number>();
  for (const m of missing) {
    const key = m.question.trim().toLowerCase();
    byQuestion.set(key, (byQuestion.get(key) ?? 0) + 1);
  }
  for (const [q, count] of [...byQuestion.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
    if (count < 2) continue;
    inserts.push({
      recommendation_type: /policy|cake|outside|cancel|dress/i.test(q) ? "upload_policy" : "upload_faq",
      title: count >= 5 ? `Upload knowledge for frequent gap (${count} asks)` : "Upload FAQ for missing answers",
      rationale: `${count} customers asked about this with no matching knowledge: “${q.slice(0, 120)}”`,
      priority: count >= 10 ? "critical" : count >= 5 ? "high" : "medium",
      evidence: { question: q, count },
      status: "open",
    });
  }

  for (const doc of documents) {
    if (doc.chunk_count > 120) {
      inserts.push({
        recommendation_type: "split_document",
        title: `Split large document: ${doc.title}`,
        rationale: `Document has ${doc.chunk_count} chunks — splitting improves retrieval precision.`,
        priority: "medium",
        document_id: doc.id,
        evidence: { chunk_count: doc.chunk_count },
        status: "open",
      });
    }
    if (doc.is_duplicate) {
      inserts.push({
        recommendation_type: "merge_duplicates",
        title: `Merge duplicate: ${doc.title}`,
        rationale: "Document flagged as duplicate — consolidate to reduce noise.",
        priority: "high",
        document_id: doc.id,
        evidence: {},
        status: "open",
      });
    }
    if (doc.index_status === "failed" || doc.index_status === "stale") {
      inserts.push({
        recommendation_type: "reindex",
        title: `Re-index: ${doc.title}`,
        rationale: `Index status is ${doc.index_status}.`,
        priority: "high",
        document_id: doc.id,
        evidence: { index_status: doc.index_status },
        status: "open",
      });
    }
    const expires = doc.metadata?.expires_at;
    if (typeof expires === "string" && Date.parse(expires) < Date.now()) {
      inserts.push({
        recommendation_type: "update_expired",
        title: `Update expired knowledge: ${doc.title}`,
        rationale: `Expired at ${expires}.`,
        priority: "high",
        document_id: doc.id,
        evidence: { expires },
        status: "open",
      });
    }
    const hasRel = relationships.some(
      (r) => r.source_document_id === doc.id || r.target_document_id === doc.id,
    );
    if (doc.workflow_status === "published" && !hasRel && /policy|party|catering|cake/i.test(doc.title)) {
      inserts.push({
        recommendation_type: "create_relationship",
        title: `Link related docs for: ${doc.title}`,
        rationale: "Policy-like document has no graph relationships — linking improves boost retrieval.",
        priority: "low",
        document_id: doc.id,
        evidence: {},
        status: "open",
      });
    }
  }

  // Clear prior open auto-suggestions of same types to avoid duplicates flooding
  if (inserts.length) {
    await kiTable("knowledge_recommendations").delete().eq("status", "open");
    const { error } = await kiTable("knowledge_recommendations").insert(inserts);
    if (error) throw error;
  }

  await writeAudit({
    eventType: "recommendations_generated",
    summary: `Generated ${inserts.length} knowledge improvement suggestions`,
    metadata: { count: inserts.length },
  });

  return listRecommendations("open");
}
