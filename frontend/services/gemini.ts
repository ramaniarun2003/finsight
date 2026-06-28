import { ChatSource } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

export interface ChatResult {
  answer: string;
  sources: ChatSource[];
}

export interface AskOptions {
  ticker?: string;
  form?: '10-K' | '10-Q';
  k?: number;
}

// Server-side RAG: retrieval (RavenDB vector search) + generation (Gemini)
// both happen in the FastAPI backend. The frontend sends only the question
// plus optional scope filters.
export async function askFinSight(question: string, opts: AskOptions = {}): Promise<ChatResult> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, ...opts }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`Chat failed (${res.status}): ${msg}`);
  }

  return (await res.json()) as ChatResult;
}

// Structured summary of a single filing (generation over provided text).
export async function generateSummary(content: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`Summary failed (${res.status}): ${msg}`);
  }
  const data = (await res.json()) as { summary: string };
  return data.summary;
}

// Compare two filings (generation over provided text).
export async function compareDocuments(
  nameA: string,
  contentA: string,
  nameB: string,
  contentB: string,
): Promise<string> {
  const res = await fetch(`${API_BASE}/api/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name_a: nameA, content_a: contentA, name_b: nameB, content_b: contentB }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`Compare failed (${res.status}): ${msg}`);
  }
  const data = (await res.json()) as { comparison: string };
  return data.comparison;
}