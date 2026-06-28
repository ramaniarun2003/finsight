export interface Document {
  id: string;
  name: string;
  uploadDate: string;
  size: string;
  content: string;
  ticker?: string;
  form?: string;
  sector?: string;   // GICS sector label, e.g. "Consumer Discretionary"
}

export interface ChatSource {
  ticker: string;
  form: string;
  chunk_index: number;
  source: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  sources?: ChatSource[]; // filings that grounded an assistant answer
}

export interface StockDataPoint {
  date: string;
  price: number;
  volume: number;
}

export interface CompanyMetrics {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  high52w: number;
  low52w: number;
  volume: string;
  marketCap: string;
}


export type ViewState = 'dashboard' | 'documents' | 'chat' | 'analysis' | 'help';