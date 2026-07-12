import { COST_RATES, type KnowledgeCostRow } from "../../types/knowledgeIntelligence";
import { kiTable, writeAudit } from "./client";

export async function recordCostEvent(input: {
  metricKey: string;
  metricValue?: number;
  tokensIn?: number;
  tokensOut?: number;
  documentId?: string;
  category?: string;
  locationId?: string;
  dimensions?: Record<string, unknown>;
}): Promise<void> {
  const tokensIn = input.tokensIn ?? 0;
  const tokensOut = input.tokensOut ?? 0;
  let costUsd = 0;
  if (input.metricKey.includes("embed")) {
    costUsd = (tokensIn / 1000) * COST_RATES.embeddingPer1kTokensUsd;
  } else {
    costUsd =
      (tokensIn / 1_000_000) * COST_RATES.llmInputPer1mTokensUsd +
      (tokensOut / 1_000_000) * COST_RATES.llmOutputPer1mTokensUsd;
  }

  await kiTable("knowledge_cost").insert({
    metric_key: input.metricKey,
    metric_value: input.metricValue ?? 1,
    cost_usd: Number(costUsd.toFixed(8)),
    tokens_in: tokensIn,
    tokens_out: tokensOut,
    document_id: input.documentId ?? null,
    category: input.category ?? null,
    location_id: input.locationId ?? null,
    period: "event",
    dimensions: input.dimensions ?? {},
  });
}

export async function listCostEvents(limit = 300): Promise<KnowledgeCostRow[]> {
  const { data, error } = await kiTable("knowledge_cost")
    .select("*")
    .order("recorded_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as KnowledgeCostRow[];
}

export type CostAnalytics = {
  embeddingRequests: number;
  llmRequests: number;
  queries: number;
  totalEmbeddingCost: number;
  totalLlmCost: number;
  estimatedMonthlyCost: number;
  avgPromptTokens: number;
  avgCompletionTokens: number;
  avgCostPerQuestion: number;
  byCategory: Array<{ category: string; cost: number; queries: number }>;
  byOutlet: Array<{ locationId: string; cost: number; queries: number }>;
  daily: Array<{ day: string; cost: number; queries: number }>;
  mostExpensiveCategories: Array<{ category: string; cost: number }>;
  tokenConsumption: { in: number; out: number };
};

export async function getCostAnalytics(): Promise<CostAnalytics> {
  const rows = await listCostEvents(1000);
  const now = Date.now();
  const monthRows = rows.filter((r) => now - new Date(r.recorded_at).getTime() < 30 * 86400000);

  let embeddingRequests = 0;
  let llmRequests = 0;
  let totalEmbeddingCost = 0;
  let totalLlmCost = 0;
  let promptTokens = 0;
  let completionTokens = 0;
  let llmCount = 0;

  const byCategory = new Map<string, { cost: number; queries: number }>();
  const byOutlet = new Map<string, { cost: number; queries: number }>();
  const daily = new Map<string, { cost: number; queries: number }>();

  for (const row of monthRows) {
    const isEmbed = row.metric_key.includes("embed");
    if (isEmbed) {
      embeddingRequests += 1;
      totalEmbeddingCost += Number(row.cost_usd);
    } else {
      llmRequests += 1;
      totalLlmCost += Number(row.cost_usd);
      promptTokens += row.tokens_in;
      completionTokens += row.tokens_out;
      llmCount += 1;
    }
    const cat = row.category ?? "uncategorized";
    const c = byCategory.get(cat) ?? { cost: 0, queries: 0 };
    c.cost += Number(row.cost_usd);
    c.queries += 1;
    byCategory.set(cat, c);

    const loc = row.location_id ?? "global";
    const o = byOutlet.get(loc) ?? { cost: 0, queries: 0 };
    o.cost += Number(row.cost_usd);
    o.queries += 1;
    byOutlet.set(loc, o);

    const day = row.recorded_at.slice(0, 10);
    const d = daily.get(day) ?? { cost: 0, queries: 0 };
    d.cost += Number(row.cost_usd);
    d.queries += 1;
    daily.set(day, d);
  }

  // Supplement with document inventory estimates when cost table is empty
  const { data: docs } = await kiTable("semantic_documents").select("id, category, location_id, token_estimate, chunk_count");
  const docList = (docs ?? []) as Array<{
    category: string;
    location_id: string | null;
    token_estimate: number;
    chunk_count: number;
  }>;
  const storageTokens = docList.reduce((n, d) => n + (d.token_estimate ?? 0), 0);
  const estimatedIndexCost = (storageTokens / 1000) * COST_RATES.embeddingPer1kTokensUsd;

  const totalCost = totalEmbeddingCost + totalLlmCost + (monthRows.length ? 0 : estimatedIndexCost);
  const queries = Math.max(llmRequests, 1);

  await writeAudit({
    eventType: "cost_analytics_view",
    summary: "Cost analytics snapshot computed",
    metadata: { totalCost, queries },
  });

  return {
    embeddingRequests: embeddingRequests || docList.length,
    llmRequests,
    queries: llmRequests,
    totalEmbeddingCost: Number((totalEmbeddingCost || estimatedIndexCost).toFixed(6)),
    totalLlmCost: Number(totalLlmCost.toFixed(6)),
    estimatedMonthlyCost: Number(totalCost.toFixed(4)),
    avgPromptTokens: llmCount ? Math.round(promptTokens / llmCount) : 0,
    avgCompletionTokens: llmCount ? Math.round(completionTokens / llmCount) : 0,
    avgCostPerQuestion: Number((totalCost / queries).toFixed(6)),
    byCategory: [...byCategory.entries()].map(([category, v]) => ({ category, ...v })),
    byOutlet: [...byOutlet.entries()].map(([locationId, v]) => ({ locationId, ...v })),
    daily: [...daily.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, v]) => ({ day, ...v })),
    mostExpensiveCategories: [...byCategory.entries()]
      .map(([category, v]) => ({ category, cost: v.cost }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 8),
    tokenConsumption: { in: promptTokens || storageTokens, out: completionTokens },
  };
}
