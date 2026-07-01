import { ChatSource, FilingMetrics } from '../types';

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

// Extraction: ticker -> structured XBRL data (income statement, balance sheet,
// cash flow, ratios) from the FastAPI /extract endpoint, which runs the EDGAR
// + companyfacts pipeline (backend/data_extract/extractor.py).
export interface ExtractResponse {
  ticker: string;
  form: string;
  filing_date: string;
  accession_number: string;
  source_url: string;
  char_count: number;
  metrics: FilingMetrics;
  sections?: Record<string, unknown>;
  sector?: string; // present only if the backend resolves SIC -> sector
}

export async function extractCompany(ticker: string, form: '10-K' | '10-Q' = '10-K'): Promise<ExtractResponse> {
  const res = await fetch(`${API_BASE}/extract/${encodeURIComponent(ticker)}?form=${form}`);
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`Extract failed (${res.status}): ${msg}`);
  }
  return (await res.json()) as ExtractResponse;
}

// Market data: current snapshot + price history from the /market endpoint
// (yfinance-backed). Independent of /extract; a market failure never blanks
// the filing fundamentals.
export interface MarketSnapshot {
  price?: number;
  market_cap?: number;
  volume?: number;
  high_52w?: number;
  low_52w?: number;
  pe_ratio?: number;
  change_pct?: number;
}

export interface MarketHistoryPoint {
  date: string;
  close: number;
}

export interface MarketResponse {
  ticker: string;
  period: string;
  snapshot: MarketSnapshot;
  history: MarketHistoryPoint[];
}

export async function fetchMarketData(ticker: string, period = '1y'): Promise<MarketResponse> {
  const res = await fetch(`${API_BASE}/market/${encodeURIComponent(ticker)}?period=${period}`);
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`Market fetch failed (${res.status}): ${msg}`);
  }
  return (await res.json()) as MarketResponse;
}