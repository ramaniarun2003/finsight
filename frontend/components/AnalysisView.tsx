import React, { useState } from 'react';
import { FileText, GitCompare, Download, Loader2, AlertCircle } from 'lucide-react';
import { Document } from '../types';
import { generateSummary, compareDocuments } from '../services/gemini';
import { c, font } from '../theme';

interface AnalysisViewProps {
  documents: Document[];
}

const FF = font.ui;

const btn = (active: boolean): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '7px 16px', borderRadius: 7, fontSize: 13,
  fontWeight: active ? 500 : 400,
  background: active ? c.bg : 'transparent',
  color:      active ? c.brand : c.textMuted,
  border:     active ? `0.5px solid ${c.border}` : 'none',
  cursor: 'pointer', fontFamily: FF,
  transition: 'background 0.1s, color 0.1s',
});

const selectStyle: React.CSSProperties = {
  width: '100%', fontSize: 13,
  padding: '8px 12px',
  border: `0.5px solid ${c.border}`,
  borderRadius: 7, outline: 'none',
  fontFamily: FF, color: c.text,
  background: c.bg, cursor: 'pointer',
};

const AnalysisView: React.FC<AnalysisViewProps> = ({ documents }) => {
  const [mode, setMode]                           = useState<'summary' | 'compare'>('summary');
  const [selectedDocForSummary, setSelectedDoc]   = useState('');
  const [summaryResult, setSummaryResult]         = useState('');
  const [doc1Id, setDoc1Id]                       = useState('');
  const [doc2Id, setDoc2Id]                       = useState('');
  const [compareResult, setCompareResult]         = useState('');
  const [isLoading, setIsLoading]                 = useState(false);
  const [error, setError]                         = useState<string | null>(null);

  const handleGenerateSummary = async () => {
    if (!selectedDocForSummary) return;
    const doc = documents.find(d => d.id === selectedDocForSummary);
    if (!doc) return;
    setIsLoading(true); setError(null);
    try   { setSummaryResult(await generateSummary(doc.content)); }
    catch (err: any) { setError(err.message); }
    finally { setIsLoading(false); }
  };

  const handleCompare = async () => {
    if (!doc1Id || !doc2Id || doc1Id === doc2Id) {
      setError('Please select two different documents to compare.'); return;
    }
    const d1 = documents.find(d => d.id === doc1Id);
    const d2 = documents.find(d => d.id === doc2Id);
    if (!d1 || !d2) return;
    setIsLoading(true); setError(null);
    try   { setCompareResult(await compareDocuments(d1.name, d1.content, d2.name, d2.content)); }
    catch (err: any) { setError(err.message); }
    finally { setIsLoading(false); }
  };

  const handleExport = (content: string, filename: string) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type: 'text/markdown' }));
    a.download = `${filename}.md`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
  };

  const renderMarkdown = (text: string) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      if (line.startsWith('## '))
        return <h2 key={i} style={{ fontSize: 16, fontWeight: 500, color: c.text, margin: '20px 0 8px' }}>{line.slice(3)}</h2>;
      if (line.startsWith('# '))
        return <h1 key={i} style={{ fontSize: 18, fontWeight: 500, color: c.text, margin: '20px 0 10px' }}>{line.slice(2)}</h1>;
      if (line.startsWith('- ') || line.startsWith('* '))
        return <li key={i} style={{ marginLeft: 16, marginBottom: 6, fontSize: 13, color: c.text2, lineHeight: 1.65 }}>{line.slice(2)}</li>;
      if (line.trim() === '') return <br key={i} />;
      const parts = line.split('**');
      if (parts.length > 1)
        return (
          <p key={i} style={{ fontSize: 13, color: c.text2, lineHeight: 1.7, marginBottom: 8 }}>
            {parts.map((p, j) => j % 2 === 1 ? <strong key={j} style={{ fontWeight: 500 }}>{p}</strong> : p)}
          </p>
        );
      return <p key={i} style={{ fontSize: 13, color: c.text2, lineHeight: 1.7, marginBottom: 8 }}>{line}</p>;
    });
  };

  const primaryBtn = (onClick: () => void, disabled: boolean, label: string, icon: React.ReactNode): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 18px', borderRadius: 7, fontSize: 13, fontWeight: 500,
    background: disabled ? c.border : c.brandDeep,
    color:      disabled ? c.textFaint : c.onBrand,
    border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: FF, transition: 'background 0.15s',
  });

  return (
    <div style={{ padding: 22, height: '100%', overflowY: 'auto', fontFamily: FF, background: c.bg }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 15, fontWeight: 500, color: c.text, margin: '0 0 2px' }}>Deep analysis</p>
        <p style={{ fontSize: 13, color: c.textMuted, margin: 0 }}>Generate structured summaries or compare multiple filings.</p>
      </div>

      {/* Mode toggle */}
      <div style={{ display: 'inline-flex', background: c.surfaceAlt, borderRadius: 8, padding: 3, gap: 2, marginBottom: 20 }}>
        <button style={btn(mode === 'summary')} onClick={() => setMode('summary')}>
          <FileText size={14} />
          Structured summary
        </button>
        <button style={btn(mode === 'compare')} onClick={() => setMode('compare')}>
          <GitCompare size={14} />
          Compare documents
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: c.negSurface, border: `0.5px solid ${c.negBorder}`, borderRadius: 8, marginBottom: 16, color: c.neg, fontSize: 13 }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          {error}
        </div>
      )}

      {/* Summary mode */}
      {mode === 'summary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: c.bg, border: `0.5px solid ${c.border}`, borderRadius: 10, padding: '16px 18px' }}>
            <label style={{ display: 'block', fontSize: 12, color: c.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Select document to summarize
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <select
                style={{ ...selectStyle, flex: 1 }}
                value={selectedDocForSummary}
                onChange={e => setSelectedDoc(e.target.value)}
                onFocus={e  => (e.target.style.borderColor = c.brand)}
                onBlur={e   => (e.target.style.borderColor = c.border)}
              >
                <option value="">— Select a document —</option>
                {documents.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <button
                onClick={handleGenerateSummary}
                disabled={!selectedDocForSummary || isLoading}
                style={primaryBtn(handleGenerateSummary, !selectedDocForSummary || isLoading, 'Generate', null)}
                onMouseEnter={e => { if (selectedDocForSummary && !isLoading) e.currentTarget.style.background = c.brandDeepHover; }}
                onMouseLeave={e => { if (selectedDocForSummary && !isLoading) e.currentTarget.style.background = c.brandDeep; }}
              >
                {isLoading
                  ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</>
                  : <><FileText size={14} /> Generate</>
                }
              </button>
            </div>
          </div>

          {summaryResult && (
            <ResultCard
              content={summaryResult}
              onExport={() => handleExport(summaryResult, 'Summary_Report')}
              renderMarkdown={renderMarkdown}
            />
          )}
        </div>
      )}

      {/* Compare mode */}
      {mode === 'compare' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: c.bg, border: `0.5px solid ${c.border}`, borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: c.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Document A — baseline
                </label>
                <select
                  style={selectStyle}
                  value={doc1Id}
                  onChange={e => setDoc1Id(e.target.value)}
                  onFocus={e  => (e.target.style.borderColor = c.brand)}
                  onBlur={e   => (e.target.style.borderColor = c.border)}
                >
                  <option value="">— Select first document —</option>
                  {documents.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: c.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Document B — comparison
                </label>
                <select
                  style={selectStyle}
                  value={doc2Id}
                  onChange={e => setDoc2Id(e.target.value)}
                  onFocus={e  => (e.target.style.borderColor = c.brand)}
                  onBlur={e   => (e.target.style.borderColor = c.border)}
                >
                  <option value="">— Select second document —</option>
                  {documents.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCompare}
                disabled={!doc1Id || !doc2Id || doc1Id === doc2Id || isLoading}
                style={primaryBtn(handleCompare, !doc1Id || !doc2Id || doc1Id === doc2Id || isLoading, 'Compare', null)}
                onMouseEnter={e => { if (doc1Id && doc2Id && doc1Id !== doc2Id && !isLoading) e.currentTarget.style.background = c.brandDeepHover; }}
                onMouseLeave={e => { if (doc1Id && doc2Id && doc1Id !== doc2Id && !isLoading) e.currentTarget.style.background = c.brandDeep; }}
              >
                {isLoading
                  ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Comparing…</>
                  : <><GitCompare size={14} /> Compare documents</>
                }
              </button>
            </div>
          </div>

          {compareResult && (
            <ResultCard
              content={compareResult}
              onExport={() => handleExport(compareResult, 'Comparison_Report')}
              renderMarkdown={renderMarkdown}
            />
          )}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

const ResultCard: React.FC<{
  content: string;
  onExport: () => void;
  renderMarkdown: (t: string) => React.ReactNode;
}> = ({ content, onExport, renderMarkdown }) => {
  const [exportHovered, setExportHovered] = useState(false);

  return (
    <div style={{ background: c.bg, border: `0.5px solid ${c.border}`, borderRadius: 10, padding: '18px 20px', position: 'relative' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <p style={{ fontSize: 11, color: c.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
          AI-generated analysis <span style={{ marginLeft: 4 }}>· grounded in your filings</span>
        </p>
        <button
          onClick={onExport}
          onMouseEnter={() => setExportHovered(true)}
          onMouseLeave={() => setExportHovered(false)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 12, padding: '4px 10px', borderRadius: 6,
            border: `0.5px solid ${c.border}`,
            background: exportHovered ? c.surface : c.bg,
            color: exportHovered ? c.brand : c.textMuted,
            cursor: 'pointer', fontFamily: font.ui,
            transition: 'background 0.1s, color 0.1s',
          }}
        >
          <Download size={13} /> Export .md
        </button>
      </div>

      <div style={{ fontFamily: font.prose, fontSize: 13, lineHeight: 1.75, color: c.text2 }}>
        {renderMarkdown(content)}
      </div>
    </div>
  );
};

export default AnalysisView;