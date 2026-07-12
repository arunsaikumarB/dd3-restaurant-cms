import type { LocationId } from "../config/locations";

/** Supported knowledge document MIME categories. */
export type SemanticFileType =
  | "pdf"
  | "docx"
  | "txt"
  | "markdown"
  | "html"
  | "csv"
  | "jpeg"
  | "png"
  | "webp";

export type SemanticDocumentVisibility = "public" | "private";

export type SemanticIndexStatus =
  | "pending"
  | "processing"
  | "indexed"
  | "failed"
  | "stale";

export type SemanticIndexJobStatus = "queued" | "processing" | "completed" | "failed";

export type SemanticWorkflowStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "published"
  | "archived";

export type SemanticOcrStatus =
  | "not_needed"
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "skipped";

export type SemanticLanguageSource = "auto" | "manual";

/** Enterprise knowledge document categories. */
export type SemanticDocumentCategory =
  | "restaurant_policies"
  | "faqs"
  | "catering"
  | "private_parties"
  | "events"
  | "festival_info"
  | "brand_story"
  | "press_releases"
  | "awards"
  | "training"
  | "future_menu";

/** Translation-ready language codes — do not hardcode UI rules on these. */
export type SemanticLanguageCode = string;

export type SemanticDocumentRow = {
  id: string;
  title: string;
  description: string | null;
  category: SemanticDocumentCategory;
  location_id: LocationId | null;
  visibility: SemanticDocumentVisibility;
  file_name: string;
  file_type: SemanticFileType;
  storage_path: string;
  file_size_bytes: number | null;
  current_version: number;
  index_status: SemanticIndexStatus;
  index_error: string | null;
  chunk_count: number;
  token_estimate: number;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  language: SemanticLanguageCode;
  language_source: SemanticLanguageSource;
  file_hash: string | null;
  content_hash: string | null;
  workflow_status: SemanticWorkflowStatus;
  ocr_status: SemanticOcrStatus;
  ocr_confidence: number | null;
  ocr_language: string | null;
  ocr_duration_ms: number | null;
  ocr_error: string | null;
  ocr_used: boolean;
  duplicate_of: string | null;
  is_duplicate: boolean;
  last_retrieval_at: string | null;
  retrieval_count: number;
  index_duration_ms: number | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_reason: string | null;
};

export type SemanticDocumentVersionRow = {
  id: string;
  document_id: string;
  version_number: number;
  storage_path: string;
  file_name: string;
  file_type: SemanticFileType;
  extracted_text_preview: string | null;
  change_notes: string | null;
  chunk_count: number;
  indexed_at: string | null;
  created_by: string | null;
  created_at: string;
};

export type SemanticChunkRow = {
  id: string;
  document_id: string;
  version_number: number;
  location_id: LocationId | null;
  category: SemanticDocumentCategory;
  visibility: SemanticDocumentVisibility;
  chunk_index: number;
  content: string;
  token_estimate: number;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type SemanticIndexJobRow = {
  id: string;
  document_id: string;
  version_number: number;
  status: SemanticIndexJobStatus;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type SemanticChunkMatch = {
  id: string;
  documentId: string;
  content: string;
  category: SemanticDocumentCategory;
  locationId: LocationId | null;
  chunkIndex: number;
  similarity: number;
  metadata: Record<string, unknown>;
};

export type SemanticRetrievalResult = {
  available: boolean;
  query: string;
  chunks: SemanticChunkMatch[];
  categories: SemanticDocumentCategory[];
  tokenEstimate: number;
  cached: boolean;
  reason?: string;
};

export type SemanticUploadInput = {
  title: string;
  description?: string;
  category: SemanticDocumentCategory;
  locationId?: LocationId | null;
  visibility?: SemanticDocumentVisibility;
  language?: SemanticLanguageCode;
  languageSource?: SemanticLanguageSource;
  file: File;
  changeNotes?: string;
  /** When a duplicate is found: cancel | replace | upload_anyway */
  duplicateAction?: "cancel" | "replace" | "upload_anyway";
  replaceDocumentId?: string;
};

export type DuplicateCheckResult = {
  isDuplicate: boolean;
  matchDocumentId?: string;
  matchTitle?: string;
  duplicateType?: "file_hash" | "content_hash";
  message?: string;
};

export type KnowledgeReviewRow = {
  id: string;
  document_id: string;
  action: string;
  from_status: string | null;
  to_status: string;
  reviewer_id: string | null;
  comments: string | null;
  rejected_reason: string | null;
  created_at: string;
};

export type KnowledgeDuplicateRow = {
  id: string;
  document_id: string;
  match_document_id: string | null;
  match_chunk_id: string | null;
  duplicate_type: string;
  similarity: number | null;
  status: string;
  details: Record<string, unknown>;
  created_at: string;
  resolved_at: string | null;
};

export type KnowledgeActivityRow = {
  id: string;
  document_id: string | null;
  event_type: string;
  actor_id: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type KnowledgeJobRow = {
  id: string;
  document_id: string | null;
  job_type: string;
  status: string;
  progress: number;
  error: string | null;
  result: Record<string, unknown>;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type KnowledgeHealthRow = {
  id: string;
  snapshot_at: string;
  health_score: number;
  total_documents: number;
  indexed_documents: number;
  pending_documents: number;
  failed_documents: number;
  published_documents: number;
  private_documents: number;
  public_documents: number;
  approval_pending: number;
  duplicate_documents: number;
  duplicate_chunks: number;
  near_duplicates: number;
  ocr_completed: number;
  ocr_failed: number;
  embedding_failures: number;
  avg_chunk_count: number;
  avg_token_estimate: number;
  avg_similarity: number;
  avg_index_duration_ms: number;
  storage_bytes: number;
  stale_documents: number;
  need_reindex: number;
  metrics: Record<string, unknown>;
};

export type KnowledgeMetricRow = {
  id: string;
  metric_key: string;
  metric_value: number;
  dimensions: Record<string, unknown>;
  recorded_at: string;
};

export const SEMANTIC_API = {
  index: "/.netlify/functions/semantic-knowledge-index",
  search: "/.netlify/functions/semantic-knowledge-search",
  ocrRetry: "/.netlify/functions/semantic-knowledge-index",
} as const;

export const SEMANTIC_STORAGE_BUCKET = "semantic-knowledge";

/** Minimum extracted characters before OCR is considered unnecessary. */
export const OCR_MIN_TEXT_CHARS = 40;
