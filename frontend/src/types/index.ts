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
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}
