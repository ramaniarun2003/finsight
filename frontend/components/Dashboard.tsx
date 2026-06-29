import React from 'react';
import { Building2, LineChart, Lock } from 'lucide-react';
import { Document } from '../types';
import { c, font } from '../theme';

// --- Shape of the extractor's `metrics` object (backend/data_extract/extractor.py).
// All fields optional: XBRL extraction may not resolve every concept for every filer.

export interface IncomeStatement {
  total_revenue_millions?: number;
  cost_of_revenue_millions?: number;
  gross_margin_millions?: number;
  gross_margin_pct?: number;
  rd_expense_millions?: number;
  sga_expense_millions?: number;
  total_opex_millions?: number;
  operating_income_millions?: number;
  income_tax_millions?: number;
  net_income_millions?: number;
  eps_basic?: number;
  eps_diluted?: number;
  effective_tax_rate_pct?: number;
}

export interface BalanceSheet {
  cash_and_equivalents_millions?: number;
  total_current_assets_millions?: number;
  total_assets_millions?: number;
  total_current_liabilities?: number;
  total_liabilities_millions?: number;
  shareholders_equity_millions?: number;
  long_term_debt_millions?: number;
  retained_earnings_millions?: number;
  ppe_net_millions?: number;
  inventories_millions?: number;
  accounts_receivable_millions?: number;
  working_capital_millions?: number;
}

export interface CashFlow {
  operating_cash_flow_millions?: number;
  investing_cash_flow_millions?: number;
  financing_cash_flow_millions?: number;
  capex_millions?: number;
  dividends_paid_millions?: number;
  share_repurchases_millions?: number;
  depreciation_amortization?: number;
  share_based_comp_millions?: number;
  free_cash_flow_millions?: number;
}

export interface FilingMetrics {
  income_statement?: IncomeStatement;
  balance_sheet?: BalanceSheet;
  cash_flow?: CashFlow;
  computed_ratios?: Record<string, number>;
  qualitative?: Record<string, unknown>;
}

interface DashboardProps {
  documents: Document[];
}

// --- Formatting helpers (values arrive in millions of USD) -------------------

const fmtUSD = (m?: number): string => {
  if (m == null) return '—';
  const a = Math.abs(m);
  if (a >= 1_000_000) return `$${(m / 1_000_000).toFixed(2)}T`;
  if (a >= 1_000)     return `$${(m / 1_000).toFixed(1)}B`;
  return `$${Math.round(m).toLocaleString()}M`;
};

const fmtPct = (p?: number): string => (p == null ? '—' : `${p.toFixed(1)}%`);
const fmtEps = (e?: number): string => (e == null ? '—' : `$${e.toFixed(2)}`);

const pctOf = (part?: number, whole?: number): number | undefined =>
  part != null && whole ? (part / whole) * 100 : undefined;

// --- Styles ------------------------------------------------------------------

const card: React.CSSProperties = {
  background: c.surface, borderRadius: 8, padding: '13px 15px',
};
const panel: React.CSSProperties = {
  background: c.bg, border: `0.5px solid ${c.border}`, borderRadius: 12, padding: '14px 16px',
};
const lbl: React.CSSProperties = {
  fontSize: 11, color: c.textFaint, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 4px',
};
const bigNum: React.CSSProperties = { fontSize: 22, fontWeight: 500, color: c.text, margin: 0 };
const sub: React.CSSProperties = { fontSize: 12, color: c.textMuted, margin: '3px 0 0' };

const MetricCard: React.FC<{ label: string; value: string; note?: string }> = ({ label, value, note }) => (
  <div style={card}>
    <p style={lbl}>{label}</p>
    <p style={bigNum}>{value}</p>
    {note && <p style={sub}>{note}</p>}
  </div>
);

const BlankPanel: React.FC<{ title: string; note: string; icon: React.ReactNode }> = ({ title, note, icon }) => (
  <div style={panel}>
    <p style={{ fontSize: 13, fontWeight: 500, color: c.text, margin: '0 0 14px' }}>{title}</p>
    <div style={{ height: 150, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: c.textFaint }}>
      {icon}
      <p style={{ fontSize: 12, color: c.textFaint, margin: 0, textAlign: 'center', maxWidth: 240, lineHeight: 1.5 }}>{note}</p>
    </div>
  </div>
);

// --- Component ---------------------------------------------------------------

const Dashboard: React.FC<DashboardProps> = ({ documents }) => {
  // Active company = most recently added filing (handleAddDocument prepends).
  const doc = documents[0];
  const ticker = doc?.ticker || doc?.name?.match(/^([A-Za-z]{1,5})/)?.[1]?.toUpperCase();
  const name = doc?.name ?? 'No company selected';
  const meta = [doc?.form, doc?.sector, doc?.uploadDate && `added ${doc.uploadDate}`].filter(Boolean).join(' · ');

  const m   = doc?.metrics;
  const inc = m?.income_statement;
  const bal = m?.balance_sheet;
  const cf  = m?.cash_flow;
  const rev = inc?.total_revenue_millions;

  // Margins — single-period, all derivable from one filing.
  const grossPct = inc?.gross_margin_pct ?? pctOf(inc?.gross_margin_millions, rev);
  const opPct    = pctOf(inc?.operating_income_millions, rev);
  const netPct   = pctOf(inc?.net_income_millions, rev);
  const fcfPct   = pctOf(cf?.free_cash_flow_millions, rev);

  const margins = ([
    { name: 'Gross margin',     value: grossPct, color: c.brandDeep },
    { name: 'Operating margin', value: opPct,    color: c.brand },
    { name: 'Net margin',       value: netPct,   color: c.brandLight },
    { name: 'FCF margin',       value: fcfPct,   color: c.accent },
  ].filter(x => x.value != null)) as { name: string; value: number; color: string }[];

  return (
    <div style={{ padding: 22, height: '100%', overflowY: 'auto', fontFamily: font.ui }}>

      {/* Header — real identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        {ticker ? (
          <div style={{ width: 42, height: 42, borderRadius: 8, background: c.brandTint, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: c.brand }}>{ticker}</span>
          </div>
        ) : (
          <div style={{ width: 42, height: 42, borderRadius: 8, background: c.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Building2 size={18} color={c.textMuted} />
          </div>
        )}
        <div>
          <p style={{ fontSize: 16, fontWeight: 500, color: c.text, margin: 0 }}>{name}</p>
          <p style={{ fontSize: 12, color: c.textMuted, margin: 0 }}>{meta || 'Financial research workspace'}</p>
        </div>
      </div>

      {!m && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: c.surface, borderRadius: 8, marginBottom: 16, fontSize: 13, color: c.textMuted }}>
          <LineChart size={15} />
          Filing fundamentals will appear once this company's XBRL data is fetched from EDGAR.
        </div>
      )}

      {/* Filing fundamentals — from the extractor */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        <MetricCard label="Revenue"          value={fmtUSD(rev)} />
        <MetricCard label="Gross margin"     value={fmtPct(grossPct)} note={inc?.gross_margin_millions != null ? `${fmtUSD(inc.gross_margin_millions)} gross profit` : undefined} />
        <MetricCard label="Operating income" value={fmtUSD(inc?.operating_income_millions)} note={opPct != null ? `${fmtPct(opPct)} margin` : undefined} />
        <MetricCard label="Net income"       value={fmtUSD(inc?.net_income_millions)} note={netPct != null ? `${fmtPct(netPct)} margin` : undefined} />
        <MetricCard label="EPS (diluted)"    value={fmtEps(inc?.eps_diluted ?? inc?.eps_basic)} />
        <MetricCard label="Free cash flow"   value={fmtUSD(cf?.free_cash_flow_millions)} note={fcfPct != null ? `${fmtPct(fcfPct)} margin` : undefined} />
        <MetricCard label="Total assets"     value={fmtUSD(bal?.total_assets_millions)} />
        <MetricCard label="Cash & equiv."    value={fmtUSD(bal?.cash_and_equivalents_millions)} />
      </div>

      {/* Margin breakdown (filled) + Market snapshot (blank) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>

        <div style={panel}>
          <p style={{ fontSize: 13, fontWeight: 500, color: c.text, margin: '0 0 14px' }}>Margin breakdown</p>
          {margins.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {margins.map(({ name: n, value, color }) => (
                <div key={n}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: c.textMuted }}>{n}</span>
                    <span style={{ fontWeight: 500, color: c.text }}>{value.toFixed(1)}%</span>
                  </div>
                  <div style={{ height: 7, background: c.borderFaint, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, value))}%`, background: color, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: c.textFaint }}>
              Margin data not available for this filing.
            </div>
          )}
        </div>

        <BlankPanel
          title="Market snapshot"
          icon={<Lock size={18} color={c.textFaint} />}
          note="Price, market cap, and volume aren't in the filing. Connect a market-data feed (yfinance) to populate these."
        />
      </div>

      {/* Price history (blank — market data) */}
      <BlankPanel
        title={`${ticker ?? 'Price'} price history`}
        icon={<LineChart size={18} color={c.textFaint} />}
        note="Price history requires a market-data feed. The filing provides fundamentals, not daily quotes."
      />

    </div>
  );
};

export default Dashboard;