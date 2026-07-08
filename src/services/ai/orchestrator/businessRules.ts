import type { SemanticChunkMatch } from "../../../types/semanticKnowledge";

/** Business rules injected into orchestrated context — never fabricate facts. */
export const ORCHESTRATOR_BUSINESS_RULES = {
  noFabrication: true,
  outletIsolation: true,
  preferToolResultsForLiveData: true,
  preferSemanticForPoliciesAndFaqs: true,
  maxSemanticChunks: 4,
  maxSemanticTokens: 1200,
} as const;

export function trimSemanticChunks(
  chunks: SemanticChunkMatch[],
  maxChunks: number,
  maxTokens: number,
): SemanticChunkMatch[] {
  const selected: SemanticChunkMatch[] = [];
  let tokens = 0;

  for (const chunk of chunks) {
    const estimate = Math.ceil(chunk.content.length / 4);
    if (selected.length >= maxChunks) break;
    if (tokens + estimate > maxTokens && selected.length > 0) break;
    selected.push(chunk);
    tokens += estimate;
  }

  return selected;
}

export function buildSemanticToolPayload(
  chunks: SemanticChunkMatch[],
  query: string,
): {
  query: string;
  chunkCount: number;
  sources: Array<{ documentId: string; category: string; similarity: number }>;
  excerpts: Array<{ category: string; content: string; similarity: number }>;
  rules: string[];
} {
  return {
    query,
    chunkCount: chunks.length,
    sources: chunks.map((c) => ({
      documentId: c.documentId,
      category: c.category,
      similarity: Number(c.similarity.toFixed(3)),
    })),
    excerpts: chunks.map((c) => ({
      category: c.category,
      content: c.content,
      similarity: Number(c.similarity.toFixed(3)),
    })),
    rules: [
      "Answer ONLY from these knowledge excerpts when they are relevant.",
      "If excerpts do not contain the answer, use CMS/tool results — never invent facts.",
      "Respect the active outlet — ignore excerpts for other locations.",
    ],
  };
}
