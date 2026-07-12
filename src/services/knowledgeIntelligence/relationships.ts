import type { SemanticChunkMatch } from "../../types/semanticKnowledge";
import type {
  KnowledgeRelationshipRow,
  KnowledgeRelationshipType,
} from "../../types/knowledgeIntelligence";
import { kiClient, kiTable, writeAudit } from "./client";

export async function listRelationships(documentId?: string): Promise<KnowledgeRelationshipRow[]> {
  let q = kiTable("knowledge_relationships").select("*").order("created_at", { ascending: false });
  if (documentId) {
    q = q.or(`source_document_id.eq.${documentId},target_document_id.eq.${documentId}`);
  }
  const { data, error } = await q.limit(500);
  if (error) throw error;
  return (data ?? []) as KnowledgeRelationshipRow[];
}

export async function upsertRelationship(input: {
  sourceDocumentId: string;
  targetDocumentId: string;
  relationshipType: KnowledgeRelationshipType;
  weight?: number;
  notes?: string;
}): Promise<KnowledgeRelationshipRow> {
  const { data: userData } = await kiClient().auth.getUser();
  const { data, error } = await kiTable("knowledge_relationships")
    .upsert(
      {
        source_document_id: input.sourceDocumentId,
        target_document_id: input.targetDocumentId,
        relationship_type: input.relationshipType,
        weight: input.weight ?? 1,
        notes: input.notes ?? null,
        created_by: userData.user?.id ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "source_document_id,target_document_id,relationship_type" },
    )
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Failed to save relationship");
  await writeAudit({
    eventType: "relationship_upsert",
    summary: `Linked ${input.relationshipType}: ${input.sourceDocumentId.slice(0, 8)} → ${input.targetDocumentId.slice(0, 8)}`,
    entityType: "relationship",
    entityId: (data as KnowledgeRelationshipRow).id,
  });
  return data as KnowledgeRelationshipRow;
}

export async function deleteRelationship(id: string): Promise<void> {
  const { error } = await kiTable("knowledge_relationships").delete().eq("id", id);
  if (error) throw error;
  await writeAudit({
    eventType: "relationship_delete",
    summary: `Removed relationship ${id}`,
    entityType: "relationship",
    entityId: id,
  });
}

/** Related document IDs for boost (outgoing + inverse child/parent). */
export async function relatedDocumentIds(documentIds: string[]): Promise<Map<string, string>> {
  const reasonByTarget = new Map<string, string>();
  if (!documentIds.length) return reasonByTarget;

  const { data, error } = await kiTable("knowledge_relationships")
    .select("*")
    .or(
      `source_document_id.in.(${documentIds.join(",")}),target_document_id.in.(${documentIds.join(",")})`,
    );
  if (error || !data) return reasonByTarget;

  for (const row of data as KnowledgeRelationshipRow[]) {
    if (documentIds.includes(row.source_document_id)) {
      reasonByTarget.set(row.target_document_id, `relationship:${row.relationship_type}`);
    }
    if (documentIds.includes(row.target_document_id)) {
      const inverse =
        row.relationship_type === "parent"
          ? "child"
          : row.relationship_type === "child"
            ? "parent"
            : row.relationship_type;
      reasonByTarget.set(row.source_document_id, `relationship:${inverse}`);
    }
  }
  return reasonByTarget;
}

/**
 * Additive post-retrieval boost — does not change embedding/search internals.
 * Loads a few chunks from related published documents and merges them.
 */
export async function boostRelatedChunks(
  chunks: SemanticChunkMatch[],
  maxExtra = 3,
): Promise<SemanticChunkMatch[]> {
  if (!chunks.length) return chunks;
  const seedIds = [...new Set(chunks.map((c) => c.documentId))];
  const related = await relatedDocumentIds(seedIds);
  const extras: string[] = [];
  for (const [id] of related) {
    if (!seedIds.includes(id)) extras.push(id);
  }
  if (!extras.length) return chunks;

  const existing = new Set(chunks.map((c) => c.id));
  const { data } = await kiTable("semantic_chunks")
    .select("id, document_id, content, category, location_id, chunk_index, metadata")
    .in("document_id", extras.slice(0, 8))
    .order("chunk_index", { ascending: true })
    .limit(maxExtra * 2);

  const boosted: SemanticChunkMatch[] = [...chunks];
  const minSim = Math.max(0.45, Math.min(...chunks.map((c) => c.similarity)) * 0.92);

  for (const row of (data ?? []) as Array<{
    id: string;
    document_id: string;
    content: string;
    category: string;
    location_id: string | null;
    chunk_index: number;
    metadata: Record<string, unknown>;
  }>) {
    if (existing.has(row.id)) continue;
    if (boosted.length >= chunks.length + maxExtra) break;
    boosted.push({
      id: row.id,
      documentId: row.document_id,
      content: row.content,
      category: row.category as SemanticChunkMatch["category"],
      locationId: row.location_id as SemanticChunkMatch["locationId"],
      chunkIndex: row.chunk_index,
      similarity: minSim,
      metadata: {
        ...(row.metadata ?? {}),
        reasonSelected: related.get(row.document_id) ?? "relationship:related",
        relationshipBoost: true,
      },
    });
    existing.add(row.id);
  }

  return boosted.sort((a, b) => b.similarity - a.similarity);
}
