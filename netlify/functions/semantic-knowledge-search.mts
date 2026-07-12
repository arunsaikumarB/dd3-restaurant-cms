import { embedQuery } from "./lib/semanticEmbeddings";
import { createSemanticServiceClient, jsonResponse, readEnv } from "./lib/semanticSupabase";

type HttpEvent = {
  httpMethod?: string;
  body?: string | null;
};

type SearchBody = {
  query?: string;
  locationId?: string;
  categories?: string[];
  matchCount?: number;
};

export default async function handler(event: HttpEvent) {
  if (event.httpMethod === "OPTIONS") {
    return jsonResponse(204, {});
  }
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  let body: SearchBody = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const query = body.query?.trim();
  if (!query) {
    return jsonResponse(400, { error: "query is required" });
  }

  if (!readEnv("GEMINI_API_KEY")) {
    return jsonResponse(200, {
      available: false,
      query,
      chunks: [],
      categories: body.categories ?? [],
      tokenEstimate: 0,
      cached: false,
      reason: "embeddings_unconfigured",
    });
  }

  try {
    const supabase = createSemanticServiceClient();
    const embedding = await embedQuery(query);

    const { data, error } = await supabase.rpc("match_semantic_chunks", {
      query_embedding: embedding,
      match_count: Math.min(Math.max(body.matchCount ?? 5, 1), 10),
      filter_location_id: body.locationId ?? null,
      filter_categories: body.categories?.length ? body.categories : null,
      min_similarity: 0.52,
    });

    if (error) throw error;

    const rows = (data ?? []) as Array<{
      id: string;
      document_id: string;
      content: string;
      category: string;
      location_id: string | null;
      chunk_index: number;
      similarity: number;
      metadata: Record<string, unknown>;
    }>;

    const chunks = rows.map((row) => ({
      id: row.id,
      documentId: row.document_id,
      content: row.content,
      category: row.category,
      locationId: row.location_id,
      chunkIndex: row.chunk_index,
      similarity: row.similarity,
      metadata: row.metadata ?? {},
    }));

    const tokenEstimate = chunks.reduce((n, c) => n + Math.ceil(c.content.length / 4), 0);
    const avgSimilarity =
      chunks.length > 0 ? chunks.reduce((n, c) => n + c.similarity, 0) / chunks.length : 0;

    // Best-effort retrieval analytics (published docs only).
    const docIds = [...new Set(chunks.map((c) => c.documentId))];
    for (const id of docIds) {
      try {
        const { data: doc } = await supabase
          .from("semantic_documents")
          .select("retrieval_count")
          .eq("id", id)
          .maybeSingle();
        const count = ((doc as { retrieval_count?: number } | null)?.retrieval_count ?? 0) + 1;
        await supabase
          .from("semantic_documents")
          .update({
            retrieval_count: count,
            last_retrieval_at: new Date().toISOString(),
          })
          .eq("id", id);
      } catch {
        /* ignore analytics failures */
      }
    }

    try {
      await supabase.from("knowledge_metrics").insert({
        metric_key: "retrieval_avg_similarity",
        metric_value: Number(avgSimilarity.toFixed(4)),
        dimensions: { query: query.slice(0, 120), hits: chunks.length },
      });
      await supabase.from("knowledge_activity").insert({
        event_type: "search",
        summary: `Semantic search: “${query.slice(0, 80)}” → ${chunks.length} chunks`,
        metadata: { locationId: body.locationId ?? null, hits: chunks.length },
      });
    } catch {
      /* ignore */
    }

    return jsonResponse(200, {
      available: chunks.length > 0,
      query,
      chunks,
      categories: body.categories ?? [],
      tokenEstimate,
      cached: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return jsonResponse(200, {
      available: false,
      query,
      chunks: [],
      categories: body.categories ?? [],
      tokenEstimate: 0,
      cached: false,
      reason: message,
    });
  }
}
