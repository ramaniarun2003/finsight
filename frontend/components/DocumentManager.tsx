import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Trash2, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import { Document } from '../types';
import { c, font } from '../theme';
import { extractCompany } from '../services/gemini';

interface DocumentManagerProps {
  documents: Document[];
  onAddDocument: (doc: Document) => void;
  onRemoveDocument: (id: string) => void;
  // Optional: called after a successful EDGAR fetch. Wire to a view switch in
  // App (e.g. () => setCurrentView('dashboard')) to jump to the populated
  // dashboard automatically. If omitted, the new filing simply appears in the
  // list and the dashboard shows it on next navigation.
  onFetched?: () => void;
}

const FF = font.ui;
type Form = '10-K' | '10-Q';

const inputStyle: React.CSSProperties = {
  flex: 1, minWidth: 0, fontSize: 13,
  padding: '8px 12px',
  border: `0.5px solid ${c.border}`,
  borderRadius: 7, outline: 'none',
  fontFamily: FF, color: c.text, background: c.bg,
};

const selectStyle: React.CSSProperties = {
  fontSize: 13, padding: '8px 12px',
  border: `0.5px solid ${c.border}`,
  borderRadius: 7, outline: 'none',
  fontFamily: FF, color: c.text, background: c.bg,
  cursor: 'pointer', flexShrink: 0,
};

const DocumentManager: React.FC<DocumentManagerProps> = ({ documents, onAddDocument, onRemoveDocument, onFetched }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [fetching, setFetching]     = useState(false);
  const [ticker, setTicker]         = useState('');
  const [form, setForm]             = useState<Form>('10-K');
  const [error, setError]           = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const busy = uploading || fetching;

  const simulateUpload = (file: File) => {
    setUploading(true);
    setTimeout(() => {
      onAddDocument({
        id: `doc-${Date.now()}`,
        name: file.name,
        uploadDate: new Date().toISOString().split('T')[0],
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        content: `Simulated extracted content for ${file.name}. (In a real app this would be parsed PDF text.)`,
      });
      setUploading(false);
    }, 1500);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) simulateUpload(e.dataTransfer.files[0]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) simulateUpload(e.target.files[0]);
  };

  // Real EDGAR fetch: hit the backend /extract pipeline and store the structured
  // metrics on the document so the dashboard can render them.
  const handleFetchEdgar = async () => {
    const t = ticker.trim().toUpperCase();
    if (!t || busy) return;
    setError(null);
    setFetching(true);
    try {
      const data = await extractCompany(t, form);
      onAddDocument({
        id: `doc-${Date.now()}`,
        name: `${t} ${data.form}`,
        uploadDate: new Date().toISOString().split('T')[0],
        size: data.char_count ? `${Math.round(data.char_count / 1024)} KB` : '—',
        content: '',
        ticker: t,
        form: data.form,
        metrics: data.metrics,
        ...(data.sector ? { sector: data.sector } : {}),
      });
      setTicker('');
      onFetched?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fetch failed. Is the backend running?');
    } finally {
      setFetching(false);
    }
  };

  return (
    <div style={{ padding: 22, height: '100%', overflowY: 'auto', fontFamily: FF, background: c.bg }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 15, fontWeight: 500, color: c.text, margin: '0 0 2px' }}>Document library</p>
        <p style={{ fontSize: 13, color: c.textMuted, margin: 0 }}>
          Fetch filings from SEC EDGAR or upload your own. Each is parsed, embedded, and made queryable.
        </p>
      </div>

      {/* Primary: fetch from EDGAR */}
      <div style={{ background: c.surface, borderRadius: 12, padding: '16px 18px', marginBottom: 12 }}>
        <p style={{ fontSize: 12, color: c.textMuted, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Fetch from SEC EDGAR
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="text"
            value={ticker}
            onChange={e => { setTicker(e.target.value); if (error) setError(null); }}
            onKeyDown={e => e.key === 'Enter' && handleFetchEdgar()}
            placeholder="Company name or ticker"
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = c.brand)}
            onBlur={e  => (e.target.style.borderColor = c.border)}
          />
          <select
            value={form}
            onChange={e => setForm(e.target.value as Form)}
            style={selectStyle}
            aria-label="Filing type"
          >
            <option value="10-K">10-K</option>
            <option value="10-Q">10-Q</option>
          </select>
          <button
            onClick={handleFetchEdgar}
            disabled={!ticker.trim() || busy}
            style={{
              padding: '8px 16px', borderRadius: 7, fontSize: 13,
              background: ticker.trim() && !busy ? c.brandDeep : c.border,
              color:      ticker.trim() && !busy ? c.onBrand  : c.textFaint,
              border: 'none', cursor: ticker.trim() && !busy ? 'pointer' : 'not-allowed',
              fontFamily: FF, fontWeight: 500, flexShrink: 0,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (ticker.trim() && !busy) e.currentTarget.style.background = c.brandDeepHover; }}
            onMouseLeave={e => { if (ticker.trim() && !busy) e.currentTarget.style.background = c.brandDeep; }}
          >
            {fetching
              ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Fetching…</>
              : 'Fetch filing'}
          </button>
        </div>

        {/* Fetch error (honey warn tokens — never red, which is reserved for financials) */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            marginTop: 10, padding: '8px 12px', borderRadius: 7,
            background: c.warnSurface, border: `0.5px solid ${c.warnBorder}`,
            fontSize: 12, color: c.warnFg, lineHeight: 1.5,
          }}>
            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 14px' }}>
        <div style={{ flex: 1, height: '0.5px', background: c.border }} />
        <span style={{ fontSize: 12, color: c.textFaint }}>or upload a file</span>
        <div style={{ flex: 1, height: '0.5px', background: c.border }} />
      </div>

      {/* Secondary: upload */}
      <div
        onClick={() => !busy && fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          border: `1px dashed ${isDragging ? c.brand : c.border}`,
          borderRadius: 8, padding: '12px 16px', marginBottom: 24,
          cursor: busy ? 'default' : 'pointer',
          background: isDragging ? c.brandTint : 'transparent',
          color: c.textMuted, fontSize: 13,
          transition: 'border-color 0.15s, background 0.15s',
        }}
        onMouseEnter={e => { if (!busy && !isDragging) (e.currentTarget as HTMLDivElement).style.background = c.surface; }}
        onMouseLeave={e => { if (!isDragging) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
      >
        <input type="file" ref={fileInputRef} onChange={handleFileInput} style={{ display: 'none' }} accept=".pdf,.txt,.csv" />
        {uploading ? (
          <>
            <Loader2 size={16} color={c.brand} style={{ animation: 'spin 1s linear infinite' }} />
            Processing and generating embeddings…
          </>
        ) : (
          <>
            <UploadCloud size={18} color={c.textMuted} />
            Click to upload or drag and drop · PDF, TXT, CSV · max 10MB
          </>
        )}
      </div>

      {/* Document list */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ fontSize: 13, color: c.textMuted, margin: 0 }}>Indexed documents</p>
        <span style={{ fontSize: 13, color: c.textFaint }}>
          {documents.length} {documents.length === 1 ? 'filing' : 'filings'}
        </span>
      </div>

      <div style={{ border: `0.5px solid ${c.border}`, borderRadius: 12, overflow: 'hidden' }}>
        {documents.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center' }}>
            <FileText size={22} color={c.textFaint} style={{ margin: '0 auto 8px', display: 'block' }} />
            <p style={{ fontSize: 13, color: c.textFaint, margin: 0 }}>No filings yet. Fetch from EDGAR or upload a file above.</p>
          </div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {documents.map((doc, i) => (
              <DocRow
                key={doc.id}
                doc={doc}
                last={i === documents.length - 1}
                onRemove={() => onRemoveDocument(doc.id)}
              />
            ))}
          </ul>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

const DocRow: React.FC<{ doc: Document; last: boolean; onRemove: () => void }> = ({ doc, last, onRemove }) => {
  const [hovered, setHovered] = useState(false);

  // Prefer the structured ticker; fall back to leading caps in the name.
  const ticker = doc.ticker || doc.name.match(/^([A-Za-z]{1,5})/)?.[1]?.toUpperCase();

  // Prefer the structured form; otherwise infer from the name.
  const lower = doc.name.toLowerCase();
  const is10K = doc.form ? doc.form === '10-K' : (lower.includes('10k') || lower.includes('10-k') || lower.includes('annual'));
  const tag = doc.form || (is10K ? '10-K' : '10-Q');
  const tagStyle: React.CSSProperties = is10K
    ? { background: c.brandTint, color: c.brand }
    : { background: c.accentSoft, color: c.accentFg };

  return (
    <li
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px',
        borderBottom: last ? 'none' : `0.5px solid ${c.border}`,
        background: hovered ? c.surface : c.bg,
        transition: 'background 0.1s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Ticker badge, or a file icon when there's no ticker */}
      {ticker ? (
        <div style={{ width: 36, height: 36, borderRadius: 7, background: c.brandTint, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: c.brand }}>{ticker}</span>
        </div>
      ) : (
        <div style={{ width: 36, height: 36, borderRadius: 7, background: c.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FileText size={16} color={c.textMuted} />
        </div>
      )}

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: c.text, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {doc.name}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: c.textFaint }}>
          <span>{doc.size}</span>
          <span>·</span>
          <span>Added {doc.uploadDate}</span>
          <span>·</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: c.textMuted }}>
            <CheckCircle size={11} />
            Indexed
          </span>
        </div>
      </div>

      {/* Form tag */}
      <span style={{ ...tagStyle, fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 500, flexShrink: 0 }}>
        {tag}
      </span>

      {/* Delete */}
      <button
        onClick={onRemove}
        title="Remove"
        style={{
          width: 28, height: 28, borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: 'none', cursor: 'pointer', flexShrink: 0,
          background: hovered ? c.negSurface : 'transparent',
          color: hovered ? c.neg : c.textFaint,
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.15s, background 0.1s, color 0.1s',
          fontFamily: font.ui,
        }}
      >
        <Trash2 size={15} />
      </button>
    </li>
  );
};

export default DocumentManager;