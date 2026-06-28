import React, { useRef, useState } from 'react';
import { Search, TrendingUp, Layers, MessageSquare } from 'lucide-react';
import { c, font } from '../theme';

interface GettingStartedProps {
  /** Called when the user submits a company name or ticker to add. */
  onAddCompany: (query: string) => void;
}

interface Example {
  name: string;
  ticker: string;
}

interface Step {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  title: string;
  sub: string;
}

// Generic, large-cap examples — shown only as a hint of what to type, not as a
// claim that FinSight is scoped to these companies. Clicking one fills the
// search box rather than adding it, so no accidental ingestion of a 300-page 10-K.
const EXAMPLES: Example[] = [
  { name: 'Apple', ticker: 'AAPL' },
  { name: 'Nike', ticker: 'NKE' },
  { name: 'Walmart', ticker: 'WMT' },
];

const STEPS: Step[] = [
  { icon: Search, title: 'Search EDGAR', sub: 'find any public filer' },
  { icon: Layers, title: 'Fetch and index', sub: '10-K and 10-Q parsed' },
  { icon: MessageSquare, title: 'Ask anything', sub: 'summarize and compare' },
];

const GettingStarted: React.FC<GettingStartedProps> = ({ onAddCompany }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    const q = query.trim();
    if (q) onAddCompany(q);
    else inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  };

  const pickExample = (ex: Example) => {
    setQuery(ex.ticker);
    inputRef.current?.focus();
  };

  return (
    <div style={{ height: '100%', background: c.bg, fontFamily: font.ui, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: `1px solid ${c.borderFaint}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <TrendingUp size={18} color={c.brand} />
          <span style={{ fontWeight: 500, fontSize: 15, color: c.text }}>FinSight</span>
        </div>
        <span style={{ fontSize: 12, color: c.textFaint }}>No companies yet</span>
      </div>

      {/* Hero — vertically centered in the remaining space */}
      <div
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '2.5rem 1rem', textAlign: 'center',
        }}
      >
        <h1 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 500, color: c.text }}>
          Start with a company
        </h1>
        <p style={{ color: c.text2, maxWidth: 440, margin: '0 0 1.75rem', lineHeight: 1.7, fontSize: 15 }}>
          Search any public company. FinSight pulls its latest 10-K and 10-Q from SEC EDGAR,
          indexes them, and lets you ask questions, summarize, and compare.
        </p>

        {/* Search row */}
        <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 480, marginBottom: 16 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={18}
              color={c.textFaint}
              style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Company name or ticker"
              aria-label="Search for a company"
              style={{
                width: '100%', height: 40, padding: '0 12px 0 38px',
                border: `1px solid ${c.border}`, borderRadius: 8, fontSize: 14,
                fontFamily: font.ui, color: c.text, outline: 'none', background: c.bg,
              }}
              onFocus={e => (e.target.style.borderColor = c.brand)}
              onBlur={e => (e.target.style.borderColor = c.border)}
            />
          </div>
          <button
            onClick={submit}
            style={{
              height: 40, padding: '0 18px', background: c.brandDeep, color: c.onBrand,
              border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500,
              fontFamily: font.ui, cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = c.brandDeepHover)}
            onMouseLeave={e => (e.currentTarget.style.background = c.brandDeep)}
          >
            Add company
          </button>
        </div>

        {/* Example chips — fill the search box on click */}
        <div style={{ width: '100%', maxWidth: 480, marginBottom: '2.5rem' }}>
          <p style={{ fontSize: 13, color: c.textFaint, margin: '0 0 10px' }}>For example</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {EXAMPLES.map(ex => (
              <button
                key={ex.ticker}
                onClick={() => pickExample(ex)}
                style={{
                  border: `1px solid ${c.border}`, borderRadius: 999, padding: '7px 14px',
                  fontSize: 14, background: c.surface, fontFamily: font.ui,
                  cursor: 'pointer', color: c.text, transition: 'background 0.1s, border-color 0.1s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = c.brandTint;
                  e.currentTarget.style.borderColor = c.brand;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = c.surface;
                  e.currentTarget.style.borderColor = c.border;
                }}
              >
                {ex.name}&nbsp;<span style={{ color: c.textMuted }}>{ex.ticker}</span>
              </button>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div
          style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 16, width: '100%', maxWidth: 560,
            borderTop: `1px solid ${c.borderFaint}`, paddingTop: '1.75rem',
          }}
        >
          {STEPS.map(step => {
            const Icon = step.icon;
            return (
              <div key={step.title} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <Icon size={22} color={c.textMuted} />
                <span style={{ fontSize: 14, fontWeight: 500, color: c.text }}>{step.title}</span>
                <span style={{ fontSize: 13, color: c.textFaint }}>{step.sub}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GettingStarted;