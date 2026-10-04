import { embedQuery } from "./lib/semanticEmbeddings";
import { createSemanticServiceClient, jsonResponse, readEnv } from "./lib/semanticSupabase";
import {
  clientIp,
  corsFor,
  enforceRateLimit,
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

type SearchBody = {
  query?: string;
  locationId?: string;
  categories?: string[];
  matchCount?: number;
};

function respond(status: number, body: Record<string, unknown>, cors: CorsDecision, extra?: Record<string, string>) {
  return jsonResponse(status, body, { ...cors.headers, ...extra });
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

  const maxBytes = maxBodyBytes("semantic-search");
  if (isBodyTooLarge(event.body, maxBytes, readHeader(event.headers, "content-length"))) {
    return respond(413, { error: "Request body is too large." }, cors);
  }

  const limit = await enforceRateLimit("semantic-search", clientIp(event.headers));
  if (!limit.ok) {
    return respond(
      429,
      { error: "Too many requests. Please try again shortly." },
      cors,
      { "Retry-After": String(limit.retryAfterSeconds) },
    );
  }

  let body: SearchBody = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return respond(400, { error: "Invalid JSON body" }, cors);
  }

  const query = body.query?.trim();
  if (!query) {
    return respond(400, { error: "query is required" }, cors);
  }

  if (!readEnv("GEMINI_API_KEY")) {
    return respond(200, {
      available: false,
      query,
      chunks: [],
      categories: body.categories ?? [],
      tokenEstimate: 0,
      cached: false,
      reason: "embeddings_unconfigured",
    }, cors);
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

    return respond(200, {
      available: chunks.length > 0,
      query,
      chunks,
      categories: body.categories ?? [],
      tokenEstimate,
      cached: false,
    }, cors);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return respond(200, {
      available: false,
      query,
      chunks: [],
      categories: body.categories ?? [],
      tokenEstimate: 0,
      cached: false,
      reason: message,
    }, cors);
  }
}
