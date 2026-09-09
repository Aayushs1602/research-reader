import type {
  DocumentMeta,
  Annotation,
  DocumentNote,
  AIDeepDiveResponse,
  User,
  AuthResponse
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const TOKEN_KEY = 'research_reader_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const token = getStoredToken();
  const headers: Record<string, string> = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// --- Auth Endpoints ---

export async function apiSignup(data: { email: string; username: string; password: string }): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to sign up' }));
    throw new Error(err.detail || 'Failed to sign up');
  }
  const result: AuthResponse = await res.json();
  setStoredToken(result.access_token);
  return result;
}

export async function apiLogin(data: { email: string; password: string }): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Invalid email or password' }));
    throw new Error(err.detail || 'Invalid email or password');
  }
  const result: AuthResponse = await res.json();
  setStoredToken(result.access_token);
  return result;
}

export async function apiGetMe(): Promise<User> {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    clearStoredToken();
    throw new Error('Session expired or invalid. Please log in.');
  }
  return res.json();
}

// --- Documents Endpoints ---

export async function getDocuments(): Promise<DocumentMeta[]> {
  const res = await fetch(`${API_BASE}/api/documents`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch documents');
  return res.json();
}

export async function uploadDocument(file: File): Promise<DocumentMeta> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/api/documents/upload`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to upload document' }));
    throw new Error(err.detail || 'Failed to upload document');
  }
  return res.json();
}

export async function getDocument(id: string): Promise<DocumentMeta> {
  const res = await fetch(`${API_BASE}/api/documents/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch document details');
  return res.json();
}

export function getDocumentFileUrl(id: string): string {
  // We can pass token via query parameter or fetch with bearer
  return `${API_BASE}/api/documents/${id}/file`;
}

// Helper to fetch protected PDF binary with bearer token
export async function fetchDocumentFileBlob(id: string): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/documents/${id}/file`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load document file');
  return res.blob();
}

export async function updateProgress(id: string, lastPage: number, progressPercent?: number): Promise<DocumentMeta> {
  const res = await fetch(`${API_BASE}/api/documents/${id}/progress`, {
    method: 'PATCH',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ last_page: lastPage, progress_percent: progressPercent }),
  });
  if (!res.ok) throw new Error('Failed to update progress');
  return res.json();
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/documents/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete document');
}

// --- Annotations Endpoints ---

export async function getAnnotations(docId: string): Promise<Annotation[]> {
  const res = await fetch(`${API_BASE}/api/documents/${docId}/annotations`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch annotations');
  return res.json();
}

export async function createAnnotation(
  docId: string,
  data: {
    page_number: number;
    color: string;
    selected_text: string;
    rects_json: string;
    comment_text?: string;
  }
): Promise<Annotation> {
  const res = await fetch(`${API_BASE}/api/documents/${docId}/annotations`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create annotation');
  return res.json();
}

export async function deleteAnnotation(annotationId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/annotations/${annotationId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete annotation');
}

// --- Notes Endpoints ---

export async function getDocumentNotes(docId: string): Promise<DocumentNote> {
  const res = await fetch(`${API_BASE}/api/documents/${docId}/notes`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch notes');
  return res.json();
}

export async function updateDocumentNotes(docId: string, content: string): Promise<DocumentNote> {
  const res = await fetch(`${API_BASE}/api/documents/${docId}/notes`, {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error('Failed to update notes');
  return res.json();
}

// --- AI Endpoint ---

export async function fetchAIDeepDive(selectedText: string, mode = 'explain'): Promise<AIDeepDiveResponse> {
  const res = await fetch(`${API_BASE}/api/ai/deep-dive`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ selected_text: selectedText, mode }),
  });
  if (!res.ok) throw new Error('Failed to run AI deep dive');
  return res.json();
}
