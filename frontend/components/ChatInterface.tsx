import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, FileText, ChevronDown } from 'lucide-react';
import { Document, ChatMessage } from '../types';
import { askQuestion } from '../services/gemini';
import { c, font } from '../theme';

interface ChatInterfaceProps {
  documents: Document[];
}

// ── style helpers ────────────────────────────────────────────────────────────

const fs: React.CSSProperties = { fontFamily: font.ui };

const pillBase: React.CSSProperties = {
  fontSize: 11, padding: '3px 10px', borderRadius: 10,
  cursor: 'pointer', border: 'none', fontFamily: font.ui,
  fontWeight: 500, whiteSpace: 'nowrap',
};

const pillActive: React.CSSProperties   = { ...pillBase, background: c.brandTint, color: c.brand };
const pillInactive: React.CSSProperties = { ...pillBase, background: c.surfaceAlt, color: c.textMuted };

// ── component ────────────────────────────────────────────────────────────────

const ChatInterface: React.FC<ChatInterfaceProps> = ({ documents }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: documents.length > 0
        ? `Hi! I have ${documents.length} filing${documents.length > 1 ? 's' : ''} loaded. What would you like to know?`
        : "Hi! No filings loaded yet. Upload a PDF or tell me a ticker and I'll fetch it from SEC EDGAR — try \"Load Gap's FY2024 10-K\".",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput]                 = useState('');
  const [isLoading, setIsLoading]         = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [sectionFilters, setSectionFilters] = useState({
    mda: true, risks: true, financials: true, business: false,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const docsToUse = selectedDocIds.length > 0
        ? documents.filter(d => selectedDocIds.includes(d.id))
        : documents;

      const context = docsToUse.map(d => `--- Document: ${d.name} ---\n${d.content}`).join('\n\n');

      if (!context) throw new Error('No documents available. Please upload filings first.');

      const answer = await askQuestion(userMsg.text, context);

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: answer,
        timestamp: new Date(),
      }]);
    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: `Error: ${error.message || 'Failed to get a response.'}`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const toggleDoc = (id: string) =>
    setSelectedDocIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleSection = (key: keyof typeof sectionFilters) =>
    setSectionFilters(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div style={{ display: 'flex', height: '100%', ...fs }}>

      {/* ── Left panel ── */}
      <div
        style={{
          width: 176, flexShrink: 0,
          background: c.surface,
          borderRight: `0.5px solid ${c.border}`,
          padding: '14px 12px',
          display: 'flex', flexDirection: 'column', gap: 16,
          overflowY: 'auto',
        }}
      >
        {/* Companies */}
        <div>
          <p style={{ fontSize: 11, color: c.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>
            Companies
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {documents.length === 0 ? (
              <span style={{ fontSize: 12, color: c.textFaint, fontStyle: 'italic' }}>No filings loaded</span>
            ) : (
              <>
                <button
                  style={selectedDocIds.length === 0 ? pillActive : pillInactive}
                  onClick={() => setSelectedDocIds([])}
                >
                  All
                </button>
                {documents.map(doc => (
                  <button
                    key={doc.id}
                    style={selectedDocIds.includes(doc.id) ? pillActive : pillInactive}
                    onClick={() => toggleDoc(doc.id)}
                    title={doc.name}
                  >
                    {doc.name.length > 12 ? doc.name.slice(0, 12) + '…' : doc.name}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Sections */}
        <div>
          <p style={{ fontSize: 11, color: c.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>
            Sections
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(Object.entries({ mda: 'MD&A', risks: 'Risk factors', financials: 'Financials', business: 'Business' }) as [keyof typeof sectionFilters, string][]).map(([key, label]) => (
              <label
                key={key}
                style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 7, color: c.text2, cursor: 'pointer' }}
              >
                <input
                  type="checkbox"
                  checked={sectionFilters[key]}
                  onChange={() => toggleSection(key)}
                  style={{ accentColor: c.brand, margin: 0, cursor: 'pointer' }}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* Loaded filings list */}
        {documents.length > 0 && (
          <div>
            <p style={{ fontSize: 11, color: c.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>
              Loaded filings
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {documents.map(doc => (
                <div
                  key={doc.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: c.textMuted }}
                >
                  <FileText size={12} style={{ flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Chat area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: c.bg }}>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {messages.map(msg => {
            const isUser = msg.role === 'user';
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, maxWidth: '85%' }}>

                  {/* Avatar */}
                  <div
                    style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: isUser ? c.brandDeep : c.surfaceAlt,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {isUser
                      ? <User size={14} color={c.onBrand} />
                      : <Bot size={14} color={c.textMuted} />
                    }
                  </div>

                  {/* Bubble */}
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      ...(isUser
                        ? { background: c.brandTint, color: c.brandDeep, borderBottomRightRadius: 3 }
                        : { background: c.surface, color: c.text, borderBottomLeftRadius: 3 }
                      ),
                      fontSize: 13, lineHeight: 1.65,
                      whiteSpace: 'pre-wrap',
                      fontFamily: font.ui,
                    }}
                  >
                    {msg.text}

                    {/* Timestamp */}
                    <p style={{ fontSize: 10, color: isUser ? c.textMuted : c.textFaint, margin: '6px 0 0', textAlign: isUser ? 'right' : 'left' }}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Loading indicator */}
          {isLoading && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: c.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={14} color={c.textMuted} />
              </div>
              <div style={{ padding: '10px 14px', borderRadius: 10, borderBottomLeftRadius: 3, background: c.surface, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Loader2 size={14} color={c.brand} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 13, color: c.textMuted }}>Searching filings…</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input row */}
        <div style={{ padding: '10px 16px 12px', borderTop: `0.5px solid ${c.border}`, background: c.bg }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about revenue, risks, guidance…"
              rows={1}
              style={{
                flex: 1,
                padding: '9px 13px',
                fontSize: 13,
                border: `0.5px solid ${c.border}`,
                borderRadius: 8,
                outline: 'none',
                resize: 'none',
                fontFamily: font.ui,
                color: c.text,
                background: c.bg,
                lineHeight: 1.5,
                height: 40,
                overflowY: 'hidden',
              }}
              onFocus={e  => (e.target.style.borderColor = c.brand)}
              onBlur={e   => (e.target.style.borderColor = c.border)}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              style={{
                width: 38, height: 38, flexShrink: 0,
                borderRadius: 8, border: 'none', cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                background: input.trim() && !isLoading ? c.brandDeep : c.border,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (input.trim() && !isLoading) e.currentTarget.style.background = c.brandDeepHover; }}
              onMouseLeave={e => { e.currentTarget.style.background = input.trim() && !isLoading ? c.brandDeep : c.border; }}
            >
              <Send size={15} color={input.trim() && !isLoading ? c.onBrand : c.textFaint} />
            </button>
          </div>
          <p style={{ fontSize: 11, color: c.textFaint, textAlign: 'center', margin: '6px 0 0' }}>
            AI responses are grounded in your loaded filings — always verify key figures.
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ChatInterface;