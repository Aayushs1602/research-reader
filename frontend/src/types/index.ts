export interface NormalizedRect {
  x: number;      // 0.0 to 1.0 (relative to page width)
  y: number;      // 0.0 to 1.0 (relative to page height)
  width: number;  // 0.0 to 1.0
  height: number; // 0.0 to 1.0
}

export interface Annotation {
  id: string;
  document_id: string;
  page_number: number;
  color: string;
  selected_text: string;
  rects_json: string; // JSON representation of NormalizedRect[]
  comment_text?: string;
  created_at: string;
}

export interface ParsedAnnotation extends Omit<Annotation, 'rects_json'> {
  rects: NormalizedRect[];
}

export interface DocumentMeta {
  id: string;
  original_name: string;
  file_size: number;
  page_count: number;
  last_page: number;
  progress_percent: number;
  chunk_count?: number;
  is_chunked?: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentNote {
  id: string;
  document_id: string;
  content: string;
  updated_at: string;
}

export interface TOCItem {
  title: string;
  pageNumber: number;
  children?: TOCItem[];
}

export type ReadingTheme = 'light' | 'sepia' | 'dark';

export interface SearchMatch {
  pageNumber: number;
  matchIndex: number;
  globalIndex?: number;
  contextText: string;
}

export interface AIDeepDiveResponse {
  query: string;
  explanation: string;
  google_search_url: string;
  suggested_followups: string[];
}

export interface User {
  id: string;
  email: string;
  username: string;
  is_admin?: boolean;
  created_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  page_number: number;
  content: string;
  token_count: number;
  created_at: string;
}

export interface ChunkSummary {
  document_id: string;
  document_name: string;
  pages_processed: number;
  chunks_generated: number;
  total_tokens_estimated: number;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}
