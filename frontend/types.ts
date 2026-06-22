export interface Document {
  id: string;
  name: string;
  uploadDate: string;
  size: string;
  content: string; // Simulated extracted text for RAG
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
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