import React, { useState } from 'react';
import { Building2 } from 'lucide-react';
import { c } from '../theme';

// Ticker -> primary domain. Clearbit resolves logos by domain, so we map the
// tickers we care about; anything unmapped falls back to the ticker text badge.
// Extend freely, or pass an explicit `domain` (e.g. surfaced from the backend)
// to cover arbitrary filers.
export const TICKER_DOMAINS: Record<string, string> = {
  AAPL: 'apple.com',  MSFT: 'microsoft.com', NVDA: 'nvidia.com',
  GOOGL: 'google.com', GOOG: 'google.com',   AMZN: 'amazon.com',
  META: 'meta.com',   TSLA: 'tesla.com',     NFLX: 'netflix.com',
  NKE: 'nike.com',    GPS: 'gap.com',        PVH: 'pvh.com',     AEO: 'ae.com',
  LULU: 'lululemon.com', UAA: 'underarmour.com', DECK: 'deckers.com', CROX: 'crocs.com',
  WMT: 'walmart.com', TGT: 'target.com',     COST: 'costco.com',
  DIS: 'disney.com',  SBUX: 'starbucks.com', MCD: 'mcdonalds.com',
  KO: 'coca-cola.com', PEP: 'pepsico.com',
  INTC: 'intel.com',  AMD: 'amd.com',        IBM: 'ibm.com',
  CRM: 'salesforce.com', ORCL: 'oracle.com', ADBE: 'adobe.com',
  V: 'visa.com',      MA: 'mastercard.com',  JPM: 'jpmorganchase.com', BAC: 'bankofamerica.com',
};

interface CompanyLogoProps {
  ticker?: string;
  /** Explicit domain override; if absent, looked up from TICKER_DOMAINS. */
  domain?: string;
  /** Box size in px (default 42). */
  size?: number;
  /** Corner radius in px (default 8). */
  radius?: number;
}

/**
 * Company badge: real logo when we can resolve a domain, otherwise the steel
 * ticker badge, otherwise a neutral building icon (no ticker at all, e.g. an
 * uploaded file). The <img> onError flips to the text fallback if the logo
 * service 404s, so a broken image never shows.
 */
const CompanyLogo: React.FC<CompanyLogoProps> = ({ ticker, domain, size = 42, radius = 8 }) => {
  const [failed, setFailed] = useState(false);
  const resolved = domain || (ticker ? TICKER_DOMAINS[ticker.toUpperCase()] : undefined);

  const base: React.CSSProperties = {
    width: size, height: size, borderRadius: radius, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  // Logo image on a clean canvas (logos read best on white, not steel).
  if (resolved && !failed) {
    return (
      <div style={{ ...base, background: c.bg, border: `0.5px solid ${c.border}`, overflow: 'hidden' }}>
        <img
          src={`https://logo.clearbit.com/${resolved}`}
          alt={ticker || resolved}
          onError={() => setFailed(true)}
          style={{ width: '68%', height: '68%', objectFit: 'contain' }}
        />
      </div>
    );
  }

  // Ticker text badge (the original steel look).
  if (ticker) {
    return (
      <div style={{ ...base, background: c.brandTint }}>
        <span style={{ fontSize: Math.round(size * 0.31), fontWeight: 500, color: c.brand }}>
          {ticker}
        </span>
      </div>
    );
  }

  // No ticker (e.g. an uploaded file): neutral icon.
  return (
    <div style={{ ...base, background: c.surfaceAlt }}>
      <Building2 size={Math.round(size * 0.43)} color={c.textMuted} />
    </div>
  );
};

export default CompanyLogo;