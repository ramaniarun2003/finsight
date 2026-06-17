import React, { useState } from 'react';
import {
  LayoutDashboard, Files, MessageSquare, BarChart3,
  TrendingUp, Building2, Plus, Settings,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { ViewState, Document } from './types';
import { MOCK_DOCUMENTS } from './mockData';

import Dashboard from './components/Dashboard';
import DocumentManager from './components/DocumentManager';
import ChatInterface from './components/ChatInterface';
import AnalysisView from './components/AnalysisView';
import SplashScreen from './components/SplashScreen';
const NAV_ITEMS: { view: ViewState; label: string; icon: React.ReactNode }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={17} /> },
  { view: 'documents', label: 'Documents',  icon: <Files size={17} /> },
  { view: 'chat',      label: 'RAG chat',   icon: <MessageSquare size={17} /> },
  { view: 'analysis',  label: 'Analysis',   icon: <BarChart3 size={17} /> },
];

const COMPANIES = ['Gap Inc. (GPS)', 'PVH Corp (PVH)', 'AEO'];

const TOPBAR_SUBTITLES: Record<ViewState, string> = {
  dashboard: 'Financial research workspace',
  documents: 'Upload and manage filings',
  chat:      'Ask questions across your loaded filings',
  analysis:  'Metrics, charts, and peer comparisons',
};

const FF = "'Inter', system-ui, sans-serif";

const App: React.FC = () => {
  const [showSplash, setShowSplash]       = useState(true);
  const [currentView, setCurrentView]     = useState<ViewState>('dashboard');
  const [documents, setDocuments]         = useState<Document[]>(MOCK_DOCUMENTS);
  const [collapsed, setCollapsed]         = useState(false);

  const handleAddDocument    = (doc: Document) => setDocuments(prev => [doc, ...prev]);
  const handleRemoveDocument = (id: string)    => setDocuments(prev => prev.filter(d => d.id !== id));

  if (showSplash) {
    return <SplashScreen onGetStarted={() => setShowSplash(false)} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'documents': return <DocumentManager documents={documents} onAddDocument={handleAddDocument} onRemoveDocument={handleRemoveDocument} />;
      case 'chat':      return <ChatInterface documents={documents} />;
      case 'analysis':  return <AnalysisView documents={documents} />;
      default:          return <Dashboard />;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: FF }}>

      {/* ── Sidebar ── */}
      <aside
        style={{
          width:         collapsed ? 52 : 216,
          minWidth:      collapsed ? 52 : 216,
          background:    '#F8F7F4',
          borderRight:   '0.5px solid #E5E7EB',
          display:       'flex',
          flexDirection: 'column',
          flexShrink:    0,
          overflow:      'hidden',
          transition:    'width 0.2s ease, min-width 0.2s ease',
        }}
      >
        {/* Logo row */}
        <div style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 9, borderBottom: '0.5px solid #E5E7EB', flexShrink: 0 }}>
          <div style={{ width: 26, height: 26, minWidth: 26, borderRadius: 6, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TrendingUp size={13} color="#3730A3" />
          </div>
          {!collapsed && (
            <span style={{ fontSize: 15, fontWeight: 500, color: '#111827', whiteSpace: 'nowrap' }}>
              Fin<span style={{ color: '#3730A3' }}>Sight</span>
            </span>
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expand' : 'Collapse'}
            style={{ marginLeft: 'auto', width: 24, height: 24, minWidth: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#9CA3AF', flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget.style.background = '#E5E7EB')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </button>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
          {!collapsed && (
            <p style={{ fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 8px 4px', margin: 0, whiteSpace: 'nowrap' }}>
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
                  color: active ? '#3730A3' : '#6B7280',
                  background: active ? '#EEF2FF' : 'transparent',
                  border: 'none', cursor: 'pointer',
                  width: '100%', textAlign: 'left',
                  whiteSpace: 'nowrap', fontFamily: FF,
                  transition: 'background 0.1s, color 0.1s',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#EDEDEA'; e.currentTarget.style.color = '#111827'; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6B7280'; } }}
              >
                <span style={{ flexShrink: 0, minWidth: 17, display: 'flex' }}>{icon}</span>
                {!collapsed && <span>{label}</span>}
                {!collapsed && view === 'documents' && documents.length > 0 && (
                  <span style={{ marginLeft: 'auto', fontSize: 11, padding: '1px 7px', borderRadius: 10, background: active ? '#C7D2FE' : '#F3F4F6', color: active ? '#3730A3' : '#6B7280', fontWeight: 500 }}>
                    {documents.length}
                  </span>
                )}
              </button>
            );
          })}

          {/* Companies */}
          {!collapsed && (
            <p style={{ fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '12px 8px 4px', margin: 0, whiteSpace: 'nowrap' }}>
              Companies
            </p>
          )}
          {COMPANIES.map(name => (
            <button
              key={name}
              title={collapsed ? name : undefined}
              style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 6, fontSize: 12, color: '#6B7280', background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', whiteSpace: 'nowrap', fontFamily: FF }}
              onMouseEnter={e => { e.currentTarget.style.background = '#EDEDEA'; e.currentTarget.style.color = '#111827'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6B7280'; }}
            >
              <span style={{ flexShrink: 0, minWidth: 17, display: 'flex' }}><Building2 size={16} /></span>
              {!collapsed && <span>{name}</span>}
            </button>
          ))}
          <button
            title={collapsed ? 'Add company' : undefined}
            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 6, fontSize: 12, color: '#9CA3AF', background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', whiteSpace: 'nowrap', fontFamily: FF }}
            onMouseEnter={e => { e.currentTarget.style.background = '#EDEDEA'; e.currentTarget.style.color = '#6B7280'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9CA3AF'; }}
          >
            <span style={{ flexShrink: 0, minWidth: 17, display: 'flex' }}><Plus size={16} /></span>
            {!collapsed && <span>Add company</span>}
          </button>
        </nav>

        {/* Settings */}
        <div style={{ padding: 8, borderTop: '0.5px solid #E5E7EB', flexShrink: 0 }}>
          <button
            title="Settings"
            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 6, fontSize: 13, color: '#6B7280', background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', whiteSpace: 'nowrap', fontFamily: FF }}
            onMouseEnter={e => { e.currentTarget.style.background = '#EDEDEA'; e.currentTarget.style.color = '#111827'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6B7280'; }}
          >
            <span style={{ flexShrink: 0, minWidth: 17, display: 'flex' }}><Settings size={17} /></span>
            {!collapsed && <span>Settings</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#FFFFFF' }}>

        {/* Topbar */}
        <header style={{ height: 52, borderBottom: '0.5px solid #E5E7EB', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 500, color: '#111827' }}>
            {NAV_ITEMS.find(n => n.view === currentView)?.label ?? 'Dashboard'}
          </span>
          <span style={{ color: '#E5E7EB' }}>·</span>
          <span style={{ fontSize: 13, color: '#6B7280' }}>
            {TOPBAR_SUBTITLES[currentView]}
          </span>
          <div style={{ marginLeft: 'auto' }}>
            <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 10, background: '#ECFDF5', color: '#065F46', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
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