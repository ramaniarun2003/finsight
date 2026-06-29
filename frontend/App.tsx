import React, { useState } from 'react';
import {
  LayoutDashboard, Files, MessageSquare, BarChart3,
  TrendingUp, Building2, Plus, Settings,
  PanelLeftClose, PanelLeftOpen,
  HelpCircle,
} from 'lucide-react';
import { ViewState, Document } from './types';
import { c, font } from './theme';
import HelpView from './components/HelpView';
import Dashboard from './components/Dashboard';
import DocumentManager from './components/DocumentManager';
import ChatInterface from './components/ChatInterface';
import AnalysisView from './components/AnalysisView';
import SplashScreen from './components/SplashScreen';
import GettingStarted from './components/GettingStarted';
import { extractCompany } from './services/gemini';

const NAV_ITEMS: { view: ViewState; label: string; icon: React.ReactNode }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={17} /> },
  { view: 'documents', label: 'Documents',  icon: <Files size={17} /> },
  { view: 'chat',      label: 'RAG chat',   icon: <MessageSquare size={17} /> },
  { view: 'analysis',  label: 'Analysis',   icon: <BarChart3 size={17} /> },
  { view: 'help', label: 'Help', icon: <HelpCircle size={17} /> },
];

const TOPBAR_SUBTITLES: Record<ViewState, string> = {
  dashboard: 'Financial research workspace',
  documents: 'Upload and manage filings',
  chat:      'Ask questions across your loaded filings',
  analysis:  'Metrics, charts, and peer comparisons',
  help: 'Tips for getting the best answers from FinSight',
};

const FF = font.ui;

const App: React.FC = () => {
  const [showSplash, setShowSplash]         = useState(true);
  const [currentView, setCurrentView]       = useState<ViewState>('dashboard');
  const [documents, setDocuments]           = useState<Document[]>([]);
  const [collapsed, setCollapsed]           = useState(false);
  // Which company the dashboard is showing. Keyed by ticker (or name fallback),
  // uppercased — same key the sidebar company list uses.
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  const companyKey = (d: Document) => (d.ticker || d.name).toUpperCase();

  // Adding a document selects it, so the dashboard follows whatever was just
  // added (via getting-started, the Documents fetch, or an upload).
  const handleAddDocument = (doc: Document) => {
    setDocuments(prev => [doc, ...prev]);
    setSelectedTicker(companyKey(doc));
  };
  const handleRemoveDocument = (id: string) => setDocuments(prev => prev.filter(d => d.id !== id));

  // Companies derived from loaded documents (deduped by ticker), so the sidebar
  // reflects what's actually ingested rather than a hardcoded list.
  const companies = React.useMemo(() => {
    const out: { key: string; label: string }[] = [];
    const seen = new Set<string>();
    for (const d of documents) {
      const label = d.ticker || d.name;
      const key = label.toUpperCase();
      if (!seen.has(key)) { seen.add(key); out.push({ key, label }); }
    }
    return out;
  }, [documents]);

  // Keep the selection valid: if nothing is selected yet, or the selected
  // company was deleted, fall back to the most recent filing (or clear it).
  React.useEffect(() => {
    if (documents.length === 0) { setSelectedTicker(null); return; }
    const exists = selectedTicker && documents.some(d => companyKey(d) === selectedTicker);
    if (!exists) setSelectedTicker(companyKey(documents[0]));
  }, [documents, selectedTicker]);

  // Entry point for the getting-started search:
  // 1. Add an optimistic placeholder so the dashboard appears immediately.
  // 2. Call /extract, which runs the EDGAR + companyfacts pipeline.
  // 3. Replace the placeholder with the real metrics-filled document.
  // While step 2 is in flight, doc.metrics is undefined, so the dashboard shows
  // its "fundamentals will appear once fetched" state — that's the loading state.
  const handleAddCompany = async (query: string) => {
    const ticker = query.trim().toUpperCase();
    if (!ticker) return;

    const id = Date.now().toString();
    handleAddDocument({
      id,
      name: ticker,
      uploadDate: new Date().toISOString().slice(0, 10),
      size: '—',
      content: '',
      ticker,
    });
    setCurrentView('dashboard');

    try {
      const data = await extractCompany(ticker, '10-K');
      setDocuments(prev =>
        prev.map(d =>
          d.id === id
            ? {
                ...d,
                name: data.ticker || ticker,
                form: data.form,
                metrics: data.metrics,
                ...(data.sector ? { sector: data.sector } : {}),
              }
            : d,
        ),
      );
    } catch (err) {
      // Leave the placeholder in place; the dashboard keeps showing the
      // "awaiting data" state. Surface the failure for now via the console.
      console.error(`Failed to extract ${ticker}:`, err);
    }
  };

  if (showSplash) {
    return <SplashScreen onGetStarted={() => setShowSplash(false)} />;
  }

  // First-run / empty workspace: no companies loaded yet. Full-screen gate,
  // same pattern as the splash — the app chrome (sidebar nav, company list) has
  // nothing to show until at least one filing exists.
  if (documents.length === 0) {
    return <GettingStarted onAddCompany={handleAddCompany} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard documents={documents} selectedTicker={selectedTicker} />;
      case 'documents': return <DocumentManager documents={documents} onAddDocument={handleAddDocument} onRemoveDocument={handleRemoveDocument} onFetched={() => setCurrentView('dashboard')} />;
      case 'chat':      return <ChatInterface documents={documents} />;
      case 'analysis':  return <AnalysisView documents={documents} />;
      case 'help':      return <HelpView />;
      default:          return <Dashboard documents={documents} selectedTicker={selectedTicker} />;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: FF }}>

      {/* ── Sidebar ── */}
      <aside
        style={{
          width:         collapsed ? 52 : 216,
          minWidth:      collapsed ? 52 : 216,
          background:    c.surface,
          borderRight:   `0.5px solid ${c.border}`,
          display:       'flex',
          flexDirection: 'column',
          flexShrink:    0,
          overflow:      'hidden',
          transition:    'width 0.2s ease, min-width 0.2s ease',
        }}
      >
        {/* Logo row */}
        <div style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 9, borderBottom: `0.5px solid ${c.border}`, flexShrink: 0 }}>
          <div style={{ width: 26, height: 26, minWidth: 26, borderRadius: 6, background: c.brandTint, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TrendingUp size={13} color={c.brand} />
          </div>
          {!collapsed && (
            <span style={{ fontSize: 15, fontWeight: 500, color: c.text, whiteSpace: 'nowrap' }}>
              Fin<span style={{ color: c.brand }}>Sight</span>
            </span>
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expand' : 'Collapse'}
            style={{ marginLeft: 'auto', width: 24, height: 24, minWidth: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: c.textFaint, flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget.style.background = c.hover)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </button>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
          {!collapsed && (
            <p style={{ fontSize: 11, color: c.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 8px 4px', margin: 0, whiteSpace: 'nowrap' }}>
              Main
            </p>
          )}

          {NAV_ITEMS.map(({ view, label, icon }) => {
            const active = currentView === view;
            return (
              <button
                key={view}
                onClick={() => setCurrentView(view)}
                title={collapsed ? label : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '7px 10px', borderRadius: 6,
                  fontSize: 13, fontWeight: active ? 500 : 400,
                  color: active ? c.brand : c.textMuted,
                  background: active ? c.brandTint : 'transparent',
                  border: 'none', cursor: 'pointer',
                  width: '100%', textAlign: 'left',
                  whiteSpace: 'nowrap', fontFamily: FF,
                  transition: 'background 0.1s, color 0.1s',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = c.hover; e.currentTarget.style.color = c.text; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = c.textMuted; } }}
              >
                <span style={{ flexShrink: 0, minWidth: 17, display: 'flex' }}>{icon}</span>
                {!collapsed && <span>{label}</span>}
                {!collapsed && view === 'documents' && documents.length > 0 && (
                  <span style={{ marginLeft: 'auto', fontSize: 11, padding: '1px 7px', borderRadius: 10, background: active ? c.peer : c.surfaceAlt, color: active ? c.brandDeep : c.textMuted, fontWeight: 500 }}>
                    {documents.length}
                  </span>
                )}
              </button>
            );
          })}

          {/* Companies — derived from loaded documents */}
          {!collapsed && companies.length > 0 && (
            <p style={{ fontSize: 11, color: c.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '12px 8px 4px', margin: 0, whiteSpace: 'nowrap' }}>
              Companies
            </p>
          )}
          {companies.map(({ key, label }) => {
            const active = key === selectedTicker && currentView === 'dashboard';
            return (
              <button
                key={key}
                onClick={() => { setSelectedTicker(key); setCurrentView('dashboard'); }}
                title={collapsed ? label : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 6,
                  fontSize: 12, fontWeight: active ? 500 : 400,
                  color: active ? c.brand : c.textMuted,
                  background: active ? c.brandTint : 'transparent',
                  border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', whiteSpace: 'nowrap', fontFamily: FF,
                  transition: 'background 0.1s, color 0.1s',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = c.hover; e.currentTarget.style.color = c.text; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = c.textMuted; } }}
              >
                <span style={{ flexShrink: 0, minWidth: 17, display: 'flex' }}><Building2 size={16} /></span>
                {!collapsed && <span>{label}</span>}
              </button>
            );
          })}
          <button
            onClick={() => setCurrentView('documents')}
            title={collapsed ? 'Add company' : undefined}
            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 6, fontSize: 12, color: c.textFaint, background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', whiteSpace: 'nowrap', fontFamily: FF }}
            onMouseEnter={e => { e.currentTarget.style.background = c.hover; e.currentTarget.style.color = c.textMuted; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = c.textFaint; }}
          >
            <span style={{ flexShrink: 0, minWidth: 17, display: 'flex' }}><Plus size={16} /></span>
            {!collapsed && <span>Add company</span>}
          </button>
        </nav>

        {/* Settings */}
        <div style={{ padding: 8, borderTop: `0.5px solid ${c.border}`, flexShrink: 0 }}>
          <button
            title="Settings"
            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 6, fontSize: 13, color: c.textMuted, background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', whiteSpace: 'nowrap', fontFamily: FF }}
            onMouseEnter={e => { e.currentTarget.style.background = c.hover; e.currentTarget.style.color = c.text; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = c.textMuted; }}
          >
            <span style={{ flexShrink: 0, minWidth: 17, display: 'flex' }}><Settings size={17} /></span>
            {!collapsed && <span>Settings</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: c.bg }}>

        {/* Topbar */}
        <header style={{ height: 52, borderBottom: `0.5px solid ${c.border}`, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 500, color: c.text }}>
            {NAV_ITEMS.find(n => n.view === currentView)?.label ?? 'Dashboard'}
          </span>
          <span style={{ color: c.border }}>·</span>
          <span style={{ fontSize: 13, color: c.textMuted }}>
            {TOPBAR_SUBTITLES[currentView]}
          </span>
          <div style={{ marginLeft: 'auto' }}>
            <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 10, background: c.posSurface, color: c.pos, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.pos, display: 'inline-block' }} />
              API connected
            </span>
          </div>
        </header>

        {/* Page content */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {renderView()}
        </div>
      </main>
    </div>
  );
};

export default App;