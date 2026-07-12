import type {
  KnowledgeActivityRow,
  KnowledgeDuplicateRow,
  KnowledgeHealthRow,
  KnowledgeJobRow,
  KnowledgeMetricRow,
  KnowledgeReviewRow,
  SemanticDocumentRow,
  SemanticWorkflowStatus,
} from "../../types/semanticKnowledge";
import { createClientIfConfigured } from "../../lib/supabase/client";

function supabase() {
  const client = createClientIfConfigured();
  if (!client) throw new Error("Supabase is not configured.");
  return client;
}

function table(name: string) {
  return (supabase() as unknown as { from: (t: string) => ReturnType<ReturnType<typeof supabase>["from"]> }).from(
    name,
  );
}

export async function logKnowledgeActivity(input: {
  documentId?: string | null;
  eventType: string;
  summary: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { data: userData } = await supabase().auth.getUser();
  await table("knowledge_activity").insert({
    document_id: input.documentId ?? null,
    event_type: input.eventType,
    actor_id: userData.user?.id ?? null,
    summary: input.summary,
    metadata: input.metadata ?? {},
  });
}

export async function listKnowledgeActivity(limit = 40): Promise<KnowledgeActivityRow[]> {
  const { data, error } = await table("knowledge_activity")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as KnowledgeActivityRow[];
}

export async function listKnowledgeDuplicates(status: "open" | "all" = "open"): Promise<KnowledgeDuplicateRow[]> {
  let query = table("knowledge_duplicates").select("*").order("created_at", { ascending: false }).limit(100);
  if (status !== "all") query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as KnowledgeDuplicateRow[];
}

export async function listKnowledgeReviews(documentId?: string): Promise<KnowledgeReviewRow[]> {
  let query = table("knowledge_reviews").select("*").order("created_at", { ascending: false }).limit(100);
  if (documentId) query = query.eq("document_id", documentId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as KnowledgeReviewRow[];
}

export async function listKnowledgeJobs(documentId?: string): Promise<KnowledgeJobRow[]> {
  let query = table("knowledge_jobs").select("*").order("created_at", { ascending: false }).limit(50);
  if (documentId) query = query.eq("document_id", documentId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as KnowledgeJobRow[];
}

export async function getLatestKnowledgeHealth(): Promise<KnowledgeHealthRow | null> {
  const { data, error } = await table("knowledge_health")
    .select("*")
    .order("snapshot_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as KnowledgeHealthRow | null) ?? null;
}

export async function listKnowledgeMetrics(metricKey?: string, limit = 30): Promise<KnowledgeMetricRow[]> {
  let query = table("knowledge_metrics").select("*").order("recorded_at", { ascending: false }).limit(limit);
  if (metricKey) query = query.eq("metric_key", metricKey);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as KnowledgeMetricRow[];
}

export async function refreshKnowledgeHealth(): Promise<KnowledgeHealthRow | null> {
  const client = supabase();
  const { error } = await (client as unknown as { rpc: (fn: string) => Promise<{ error: unknown }> }).rpc(
    "refresh_knowledge_health",
  );
  if (error) throw error;
  return getLatestKnowledgeHealth();
}

export async function findDocumentByFileHash(fileHash: string): Promise<SemanticDocumentRow | null> {
  const { data, error } = await table("semantic_documents")
    .select("*")
    .eq("file_hash", fileHash)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as SemanticDocumentRow | null) ?? null;
}

async function writeReview(input: {
  documentId: string;
  action: string;
  fromStatus: string | null;
  toStatus: string;
  comments?: string;
  rejectedReason?: string;
}) {
  const { data: userData } = await supabase().auth.getUser();
  await table("knowledge_reviews").insert({
    document_id: input.documentId,
    action: input.action,
    from_status: input.fromStatus,
    to_status: input.toStatus,
    reviewer_id: userData.user?.id ?? null,
    comments: input.comments ?? null,
    rejected_reason: input.rejectedReason ?? null,
  });
}

export async function submitForReview(documentId: string, comments?: string): Promise<SemanticDocumentRow> {
  const { data: current } = await table("semantic_documents").select("workflow_status").eq("id", documentId).single();
  const from = (current as { workflow_status?: string } | null)?.workflow_status ?? null;
  const { data, error } = await table("semantic_documents")
    .update({ workflow_status: "pending_review" satisfies SemanticWorkflowStatus })
    .eq("id", documentId)
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Submit failed");
  await writeReview({
    documentId,
    action: "submit",
    fromStatus: from,
    toStatus: "pending_review",
    comments,
  });
  await logKnowledgeActivity({
    documentId,
    eventType: "submitted_for_review",
    summary: "Document submitted for manager review",
  });
  return data as SemanticDocumentRow;
}

export async function approveDocument(
  documentId: string,
  comments?: string,
): Promise<SemanticDocumentRow> {
  const { data: userData } = await supabase().auth.getUser();
  const { data: current } = await table("semantic_documents").select("workflow_status").eq("id", documentId).single();
  const from = (current as { workflow_status?: string } | null)?.workflow_status ?? null;
  const { data, error } = await table("semantic_documents")
    .update({
      workflow_status: "approved",
      approved_by: userData.user?.id ?? null,
      approved_at: new Date().toISOString(),
      rejected_reason: null,
    })
    .eq("id", documentId)
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Approve failed");
  await writeReview({
    documentId,
    action: "approve",
    fromStatus: from,
    toStatus: "approved",
    comments,
  });
  await logKnowledgeActivity({
    documentId,
    eventType: "approved",
    summary: "Document approved — indexing will publish for Cheffy",
  });
  return data as SemanticDocumentRow;
}

export async function rejectDocument(
  documentId: string,
  reason: string,
  comments?: string,
): Promise<SemanticDocumentRow> {
  const { data: current } = await table("semantic_documents").select("workflow_status").eq("id", documentId).single();
  const from = (current as { workflow_status?: string } | null)?.workflow_status ?? null;
  const { data, error } = await table("semantic_documents")
    .update({
      workflow_status: "rejected",
      rejected_reason: reason.trim(),
    })
    .eq("id", documentId)
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Reject failed");
  await writeReview({
    documentId,
    action: "reject",
    fromStatus: from,
    toStatus: "rejected",
    comments,
    rejectedReason: reason.trim(),
  });
  await logKnowledgeActivity({
    documentId,
    eventType: "rejected",
    summary: `Document rejected: ${reason.trim()}`,
  });
  return data as SemanticDocumentRow;
}

export async function archiveDocument(documentId: string): Promise<SemanticDocumentRow> {
  const { data: current } = await table("semantic_documents").select("workflow_status").eq("id", documentId).single();
  const from = (current as { workflow_status?: string } | null)?.workflow_status ?? null;
  const { data, error } = await table("semantic_documents")
    .update({ workflow_status: "archived" })
    .eq("id", documentId)
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Archive failed");
  await writeReview({
    documentId,
    action: "archive",
    fromStatus: from,
    toStatus: "archived",
  });
  await logKnowledgeActivity({
    documentId,
    eventType: "archived",
    summary: "Document archived — removed from Cheffy retrieval",
  });
  return data as SemanticDocumentRow;
}

export async function bulkApprove(documentIds: string[]): Promise<number> {
  let count = 0;
  for (const id of documentIds) {
    await approveDocument(id);
    count += 1;
  }
  return count;
}

export async function bulkReject(documentIds: string[], reason: string): Promise<number> {
  let count = 0;
  for (const id of documentIds) {
    await rejectDocument(id, reason);
    count += 1;
  }
  return count;
}

export async function updateDocumentLanguage(
  documentId: string,
  language: string,
): Promise<SemanticDocumentRow> {
  const { data, error } = await table("semantic_documents")
    .update({ language, language_source: "manual" })
    .eq("id", documentId)
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Language update failed");
  await logKnowledgeActivity({
    documentId,
    eventType: "language_override",
    summary: `Language set to ${language}`,
  });
  return data as SemanticDocumentRow;
}

export async function resolveDuplicate(duplicateId: string, status: "ignored" | "resolved"): Promise<void> {
  const { error } = await table("knowledge_duplicates")
    .update({ status, resolved_at: new Date().toISOString() })
    .eq("id", duplicateId);
  if (error) throw error;
}

export async function listPendingReviews(): Promise<SemanticDocumentRow[]> {
  const { data, error } = await table("semantic_documents")
    .select("*")
    .eq("workflow_status", "pending_review")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SemanticDocumentRow[];
}
