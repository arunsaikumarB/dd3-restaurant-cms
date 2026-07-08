import type { LocationId } from "../config/locations";

/** Supported knowledge document MIME categories. */
export type SemanticFileType = "pdf" | "docx" | "txt" | "markdown" | "html" | "csv";

export type SemanticDocumentVisibility = "public" | "private";

export type SemanticIndexStatus =
  | "pending"
  | "processing"
  | "indexed"
  | "failed"
  | "stale";

export type SemanticIndexJobStatus = "queued" | "processing" | "completed" | "failed";

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
  file: File;
  changeNotes?: string;
};

export const SEMANTIC_API = {
  index: "/.netlify/functions/semantic-knowledge-index",
  search: "/.netlify/functions/semantic-knowledge-search",
} as const;

export const SEMANTIC_STORAGE_BUCKET = "semantic-knowledge";
