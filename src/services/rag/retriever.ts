import type { LocationId } from "../../config/locations";
import type { CheffyIntent } from "../ai/emotionEngine";
import type { SemanticDocumentCategory, SemanticRetrievalResult } from "../../types/semanticKnowledge";
import { categoriesForIntent } from "./categories";
import { readSemanticCache, writeSemanticCache } from "./cache";
import { isSemanticRagEnabled, retrieveSemanticKnowledge } from "./repository";

export type SemanticRetrieveOptions = {
  query: string;
  locationId: LocationId;
  intent: CheffyIntent;
  signal?: AbortSignal;
  matchCount?: number;
};

const RAG_INTENTS = new Set<CheffyIntent>([
  "faq",
  "catering",
  "party",
  "buffet",
  "kids",
  "greeting",
  "unknown",
]);

export function shouldUseSemanticRag(intent: CheffyIntent, message: string): boolean {
  if (RAG_INTENTS.has(intent)) return true;
  const lower = message.toLowerCase();
  return /\b(policy|policies|faq|catering|party|event|festival|award|press|training|private dining)\b/.test(lower);
}

export async function retrieveForIntent(
  options: SemanticRetrieveOptions,
): Promise<SemanticRetrievalResult> {
  const { query, locationId, intent, signal, matchCount } = options;

  if (!shouldUseSemanticRag(intent, query)) {
    return emptyResult(query, "intent_skip");
  }

  const enabled = await isSemanticRagEnabled();
  if (!enabled) return emptyResult(query, "feature_disabled");

  const categories = categoriesForIntent(intent);
  const cached = readSemanticCache(query, locationId, categories);
  if (cached) return cached;

  const result = await retrieveSemanticKnowledge({
    query,
    locationId,
    categories,
    matchCount,
    signal,
  });

  if (result.available && result.chunks.length > 0) {
    writeSemanticCache(query, locationId, result, categories);
  }

  return result;
}

function emptyResult(query: string, reason: string): SemanticRetrievalResult {
  return {
    available: false,
    query,
    chunks: [],
    categories: [] as SemanticDocumentCategory[],
    tokenEstimate: 0,
    cached: false,
    reason,
  };
}
