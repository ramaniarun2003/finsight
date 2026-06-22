import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Trash2, CheckCircle, Loader2 } from 'lucide-react';
import { Document } from '../types';
import { c, font } from '../theme';

interface DocumentManagerProps {
  documents: Document[];
  onAddDocument: (doc: Document) => void;
  onRemoveDocument: (id: string) => void;
}

const FF = font.ui;

const DocumentManager: React.FC<DocumentManagerProps> = ({ documents, onAddDocument, onRemoveDocument }) => {
  const [isDragging, setIsDragging]   = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [ticker, setTicker]           = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const simulateUpload = (file: File) => {
    setIsUploading(true);
    setTimeout(() => {
      onAddDocument({
        id: `doc-${Date.now()}`,
        name: file.name,
        uploadDate: new Date().toISOString().split('T')[0],
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        content: `Simulated extracted content for ${file.name}. This document contains financial data, revenue figures, and strategic outlook. (In a real app this would be parsed PDF text.)`,
      });
      setIsUploading(false);
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

  const handleFetchEdgar = () => {
    if (!ticker.trim()) return;
    setIsUploading(true);
    setTimeout(() => {
      onAddDocument({
        id: `doc-${Date.now()}`,
        name: `${ticker.toUpperCase()}_10K_FY2024.pdf`,
        uploadDate: new Date().toISOString().split('T')[0],
        size: '2.4 MB',
        content: `Simulated 10-K content for ${ticker.toUpperCase()} FY2024 fetched from SEC EDGAR.`,
      });
      setTicker('');
      setIsUploading(false);
    }, 1800);
  };

  return (
    <div style={{ padding: 22, height: '100%', overflowY: 'auto', fontFamily: FF, background: c.bg }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 15, fontWeight: 500, color: c.text, margin: '0 0 2px' }}>Document library</p>
        <p style={{ fontSize: 13, color: c.textMuted, margin: 0 }}>Upload 10-Ks, 10-Qs, and earnings PDFs for RAG analysis.</p>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${isDragging ? c.brand : c.border}`,
          borderRadius: 10,
          padding: '28px 20px',
          textAlign: 'center',
          cursor: isUploading ? 'default' : 'pointer',
          background: isDragging ? c.brandTint : c.surface,
          marginBottom: 16,
          transition: 'border-color 0.15s, background 0.15s',
        }}
        onMouseEnter={e => { if (!isUploading && !isDragging) (e.currentTarget as HTMLDivElement).style.background = c.surfaceAlt; }}
        onMouseLeave={e => { if (!isDragging) (e.currentTarget as HTMLDivElement).style.background = c.surface; }}
      >
        <input type="file" ref={fileInputRef} onChange={handleFileInput} style={{ display: 'none' }} accept=".pdf,.txt,.csv" />
        {isUploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <Loader2 size={26} color={c.brand} style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: 13, color: c.textMuted, margin: 0 }}>Processing document and generating embeddings…</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: c.brandTint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UploadCloud size={22} color={c.brand} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: c.text2, margin: '0 0 3px' }}>Click to upload or drag and drop</p>
              <p style={{ fontSize: 12, color: c.textFaint, margin: 0 }}>PDF, TXT, or CSV · max 10MB</p>
            </div>
          </div>
        )}
      </div>

      {/* EDGAR fetch row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input
          type="text"
          value={ticker}
          onChange={e => setTicker(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleFetchEdgar()}
          placeholder="Fetch by ticker from SEC EDGAR (e.g. GPS, PVH, AEO)…"
          style={{
            flex: 1, fontSize: 13,
            padding: '8px 12px',
            border: `0.5px solid ${c.border}`,
            borderRadius: 7, outline: 'none',
            fontFamily: FF, color: c.text,
            background: c.bg,
          }}
          onFocus={e  => (e.target.style.borderColor = c.brand)}
          onBlur={e   => (e.target.style.borderColor = c.border)}
        />
        <button
          onClick={handleFetchEdgar}
          disabled={!ticker.trim() || isUploading}
          style={{
            padding: '8px 16px', borderRadius: 7, fontSize: 13,
            background: ticker.trim() && !isUploading ? c.brandDeep : c.border,
            color:      ticker.trim() && !isUploading ? c.onBrand  : c.textFaint,
            border: 'none', cursor: ticker.trim() && !isUploading ? 'pointer' : 'not-allowed',
            fontFamily: FF, fontWeight: 500, flexShrink: 0,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { if (ticker.trim() && !isUploading) e.currentTarget.style.background = c.brandDeepHover; }}
          onMouseLeave={e => { if (ticker.trim() && !isUploading) e.currentTarget.style.background = c.brandDeep; }}
        >
          Fetch 10-K
        </button>
      </div>

      {/* Document list */}
      <div style={{ border: `0.5px solid ${c.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '11px 16px', borderBottom: `0.5px solid ${c.border}`, background: c.surface, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: c.text2, margin: 0 }}>
            Indexed documents ({documents.length})
          </p>
        </div>

        {documents.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center' }}>
            <FileText size={22} color={c.textFaint} style={{ margin: '0 auto 8px', display: 'block' }} />
            <p style={{ fontSize: 13, color: c.textFaint, margin: 0 }}>No filings yet — upload above or fetch from EDGAR.</p>
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

  const is10K = doc.name.toLowerCase().includes('10k') || doc.name.toLowerCase().includes('10-k') || doc.name.toLowerCase().includes('annual');
  const tag = is10K ? '10-K' : '10-Q';
  const tagStyle: React.CSSProperties = is10K
    ? { background: c.brandTint, color: c.brand }
    : { background: c.accentSoft, color: c.accentFg };

  return (
    <li
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '11px 16px',
        borderBottom: last ? 'none' : `0.5px solid ${c.border}`,
        background: hovered ? c.surface : c.bg,
        transition: 'background 0.1s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Icon */}
      <div style={{ width: 34, height: 34, borderRadius: 7, background: c.negSurface, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <FileText size={16} color={c.neg} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: c.text, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {doc.name}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: c.textFaint }}>
          <span>{doc.size}</span>
          <span>·</span>
          <span>Uploaded {doc.uploadDate}</span>
          <span>·</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: c.pos }}>
            <CheckCircle size={11} />
            Indexed
          </span>
        </div>
      </div>

      {/* Tag */}
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