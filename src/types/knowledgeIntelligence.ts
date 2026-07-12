/** Types for AI Knowledge Intelligence & Observability (additive layer). */

export type KnowledgeFeedbackType =
  | "helpful"
  | "not_helpful"
  | "incorrect"
  | "missing_information"
  | "needs_human";

export type KnowledgeRelationshipType =
  | "parent"
  | "child"
  | "related"
  | "duplicate"
  | "supersedes"
  | "depends_on"
  | "see_also";

export type KnowledgeValidationFindingType =
  | "conflicting_prices"
  | "conflicting_policies"
  | "conflicting_dates"
  | "duplicate_facts"
  | "missing_metadata"
  | "expired_document"
  | "broken_relationship"
  | "empty_chunks"
  | "low_ocr_confidence"
  | "low_embedding_quality"
  | "missing_category"
  | "other";

export type KnowledgeRecommendationType =
  | "upload_faq"
  | "upload_policy"
  | "split_document"
  | "merge_duplicates"
  | "reindex"
  | "improve_metadata"
  | "improve_categories"
  | "create_relationship"
  | "update_expired"
  | "other";

export type KnowledgeFeedbackRow = {
  id: string;
  conversation_id: string | null;
  session_id: string | null;
  location_id: string | null;
  question: string;
  response: string | null;
  feedback_type: KnowledgeFeedbackType;
  rating: number | null;
  retrieved_chunks: unknown[];
  document_ids: string[];
  chunk_ids: string[];
  prompt_version: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type KnowledgeRelationshipRow = {
  id: string;
  source_document_id: string;
  target_document_id: string;
  relationship_type: KnowledgeRelationshipType;
  weight: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type KnowledgeValidationRow = {
  id: string;
  document_id: string | null;
  run_id: string;
  finding_type: KnowledgeValidationFindingType;
  severity: "info" | "warning" | "error";
  title: string;
  details: string | null;
  evidence: Record<string, unknown>;
  validation_score: number | null;
  status: "open" | "ignored" | "resolved" | "fixed";
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
};

export type KnowledgeCostRow = {
  id: string;
  metric_key: string;
  metric_value: number;
  cost_usd: number;
  tokens_in: number;
  tokens_out: number;
  document_id: string | null;
  category: string | null;
  location_id: string | null;
  period: "event" | "daily" | "weekly" | "monthly";
  dimensions: Record<string, unknown>;
  recorded_at: string;
};

export type KnowledgeDebugRow = {
  id: string;
  question: string;
  location_id: string | null;
  stages: KnowledgeDebugStage[];
  retrieved_chunks: KnowledgeDebugChunk[];
  prompt_preview: string | null;
  response_preview: string | null;
  timings: Record<string, number>;
  token_counts: Record<string, number>;
  lab_options: Record<string, unknown>;
  actor_id: string | null;
  created_at: string;
};

export type KnowledgeQualityRow = {
  id: string;
  snapshot_at: string;
  overall_score: number;
  retrieval_accuracy: number;
  chunk_quality: number;
  avg_similarity: number;
  hallucination_risk: number;
  knowledge_coverage: number;
  knowledge_freshness: number;
  approval_compliance: number;
  feedback_score: number;
  avg_response_rating: number;
  metrics: Record<string, unknown>;
};

export type KnowledgeRecommendationRow = {
  id: string;
  recommendation_type: KnowledgeRecommendationType;
  title: string;
  rationale: string;
  priority: "low" | "medium" | "high" | "critical";
  document_id: string | null;
  evidence: Record<string, unknown>;
  status: "open" | "accepted" | "dismissed" | "completed";
  created_at: string;
  updated_at: string;
};

export type KnowledgeAuditRow = {
  id: string;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  actor_id: string | null;
  summary: string;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type KnowledgeDebugStage = {
  id: string;
  label: string;
  status: "ok" | "skip" | "warn" | "error";
  durationMs: number;
  summary: string;
  data?: unknown;
};

export type KnowledgeDebugChunk = {
  id: string;
  documentId: string;
  documentTitle?: string;
  category: string;
  locationId: string | null;
  chunkIndex: number;
  similarity: number;
  tokens: number;
  content: string;
  reasonSelected: string;
  highlightedText?: string;
  retrievalTimeMs?: number;
};

export type KnowledgeDebugReport = {
  question: string;
  locationId: string;
  stages: KnowledgeDebugStage[];
  chunks: KnowledgeDebugChunk[];
  promptPreview: string;
  response: string;
  timings: {
    embeddingMs: number;
    vectorSearchMs: number;
    llmMs: number;
    totalMs: number;
  };
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  intent?: string;
  sourcePlan?: unknown;
  toolCalls?: unknown[];
  memory?: unknown;
  /** Agentic planner output — admin only */
  executionPlan?: unknown;
  /** Tool orchestrator timeline + package — admin only */
  toolOrchestration?: unknown;
  /** Reflection Layer — evaluate Gemini only; admin only */
  reflection?: unknown;
  /** Guest-visible final text (Gemini + optional additive suffix) */
  finalResponse?: string;
};

export type SearchLabOptions = {
  similarityThreshold: number;
  maxChunks: number;
  categories: string[];
  locationId: string;
  language?: string;
  includeRelationships: boolean;
  includeCms: boolean;
  includeTools: boolean;
  runLlm: boolean;
};

export const RELATIONSHIP_TYPES: Array<{ id: KnowledgeRelationshipType; label: string }> = [
  { id: "parent", label: "Parent" },
  { id: "child", label: "Child" },
  { id: "related", label: "Related" },
  { id: "duplicate", label: "Duplicate" },
  { id: "supersedes", label: "Supersedes" },
  { id: "depends_on", label: "Depends On" },
  { id: "see_also", label: "See Also" },
];

/** Approximate Gemini Flash pricing — override via metadata later. */
export const COST_RATES = {
  embeddingPer1kTokensUsd: 0.00001,
  llmInputPer1mTokensUsd: 0.1,
  llmOutputPer1mTokensUsd: 0.4,
} as const;
