import type {
  DocumentMeta,
  Annotation,
  DocumentNote,
  AIDeepDiveResponse
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function getDocuments(): Promise<DocumentMeta[]> {
  const res = await fetch(`${API_BASE}/api/documents`);
  if (!res.ok) throw new Error('Failed to fetch documents');
  return res.json();
}

export async function uploadDocument(file: File): Promise<DocumentMeta> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/api/documents/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to upload document' }));
    throw new Error(err.detail || 'Failed to upload document');
  }
  return res.json();
}

export async function getDocument(id: string): Promise<DocumentMeta> {
  const res = await fetch(`${API_BASE}/api/documents/${id}`);
  if (!res.ok) throw new Error('Failed to fetch document details');
  return res.json();
}

export function getDocumentFileUrl(id: string): string {
  return `${API_BASE}/api/documents/${id}/file`;
}

export async function updateProgress(id: string, lastPage: number, progressPercent?: number): Promise<DocumentMeta> {
  const res = await fetch(`${API_BASE}/api/documents/${id}/progress`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ last_page: lastPage, progress_percent: progressPercent }),
  });
  if (!res.ok) throw new Error('Failed to update progress');
  return res.json();
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/documents/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete document');
}

export async function getAnnotations(docId: string): Promise<Annotation[]> {
  const res = await fetch(`${API_BASE}/api/documents/${docId}/annotations`);
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create annotation');
  return res.json();
}

export async function deleteAnnotation(annotationId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/annotations/${annotationId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete annotation');
}

export async function getDocumentNotes(docId: string): Promise<DocumentNote> {
  const res = await fetch(`${API_BASE}/api/documents/${docId}/notes`);
  if (!res.ok) throw new Error('Failed to fetch notes');
  return res.json();
}

export async function updateDocumentNotes(docId: string, content: string): Promise<DocumentNote> {
  const res = await fetch(`${API_BASE}/api/documents/${docId}/notes`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error('Failed to update notes');
  return res.json();
}

export async function fetchAIDeepDive(selectedText: string, mode = 'explain'): Promise<AIDeepDiveResponse> {
  const res = await fetch(`${API_BASE}/api/ai/deep-dive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selected_text: selectedText, mode }),
  });
  if (!res.ok) throw new Error('Failed to run AI deep dive');
  return res.json();
}
