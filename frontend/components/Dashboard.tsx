import React, { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  type TooltipProps,
} from 'recharts';
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import { TrendingUp, TrendingDown, DollarSign, Activity, BarChart2, Download } from 'lucide-react';
import { MOCK_STOCK_DATA, MOCK_METRICS } from '../mockData';

const PERIODS = ['1D', '1W', '1M', '3M', '1Y'] as const;

const MARGIN_DATA = [
  { name: 'Gross',     value: 42.3, color: '#3730A3' },
  { name: 'Operating', value: 10.1, color: '#059669' },
  { name: 'Net',       value: 8.6,  color: '#7C3AED' },
  { name: 'FCF',       value: 6.4,  color: '#D97706' },
];

const REVENUE_DATA = [
  { year: 'FY22', revenue: 15.6 },
  { year: 'FY23', revenue: 14.9 },
  { year: 'FY24', revenue: 15.1 },
];

// ── shared style helpers ────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: '#FFFFFF',
  border: '0.5px solid #E5E7EB',
  borderRadius: 10,
  padding: '14px 16px',
};

const metricCard: React.CSSProperties = {
  background: '#F8F7F4',
  borderRadius: 8,
  padding: '13px 15px',
};

const label: React.CSSProperties = {
  fontSize: 11,
  color: '#9CA3AF',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: 4,
};

const bigNum: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 500,
  color: '#111827',
  margin: 0,
};

// ── component ───────────────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const [activePeriod, setActivePeriod] = useState<string>('1M');
  const isPositive = MOCK_METRICS.change >= 0;

  return (
    <div style={{ padding: 22, height: '100%', overflowY: 'auto', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 500, color: '#111827', margin: '0 0 2px' }}>
            Gap Inc. — FY2024
          </p>
          <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>
            10-K filed Feb 2024 · fiscal year ended Feb 1, 2025
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            style={{
              fontSize: 12, padding: '5px 10px',
              border: '0.5px solid #E5E7EB', borderRadius: 6,
              background: '#FFFFFF', color: '#374151',
              fontFamily: "'Inter', system-ui, sans-serif",
              cursor: 'pointer',
            }}
          >
            <option>FY2024</option>
            <option>FY2023</option>
            <option>FY2022</option>
          </select>
          <button
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 6, fontSize: 12,
              background: '#FFFFFF', color: '#374151',
              border: '0.5px solid #E5E7EB', cursor: 'pointer',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            <Download size={13} />
            Export PDF
          </button>
        </div>
      </div>

      {/* ── Metric cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>

        <div style={metricCard}>
          <p style={label}>{MOCK_METRICS.symbol} price</p>
          <p style={bigNum}>${MOCK_METRICS.currentPrice.toFixed(2)}</p>
          <p style={{ fontSize: 12, margin: '3px 0 0', color: isPositive ? '#059669' : '#DC2626' }}>
            {isPositive ? '↑' : '↓'} {Math.abs(MOCK_METRICS.change)} ({MOCK_METRICS.changePercent}%) today
          </p>
        </div>

        <div style={metricCard}>
          <p style={label}>Market cap</p>
          <p style={bigNum}>{MOCK_METRICS.marketCap}</p>
          <p style={{ fontSize: 12, color: '#9CA3AF', margin: '3px 0 0' }}>Large cap</p>
        </div>

        <div style={metricCard}>
          <p style={label}>Revenue FY24</p>
          <p style={bigNum}>$15.1B</p>
          <p style={{ fontSize: 12, margin: '3px 0 0', color: '#059669' }}>↑ 1.6% YoY</p>
        </div>

        <div style={metricCard}>
          <p style={label}>Gross margin</p>
          <p style={bigNum}>42.3%</p>
          <p style={{ fontSize: 12, margin: '3px 0 0', color: '#059669' }}>↑ 3.2pp YoY</p>
        </div>

        <div style={metricCard}>
          <p style={label}>Net income</p>
          <p style={bigNum}>$1.3B</p>
          <p style={{ fontSize: 12, margin: '3px 0 0', color: '#059669' }}>↑ 41% YoY</p>
        </div>

        <div style={metricCard}>
          <p style={label}>Inv. turnover</p>
          <p style={bigNum}>4.2×</p>
          <p style={{ fontSize: 12, margin: '3px 0 0', color: '#059669' }}>↑ from 3.8×</p>
        </div>

        <div style={metricCard}>
          <p style={label}>52-week range</p>
          <p style={{ fontSize: 16, fontWeight: 500, color: '#111827', margin: '0 0 6px' }}>
            ${MOCK_METRICS.low52w} – ${MOCK_METRICS.high52w}
          </p>
          <div style={{ height: 5, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                borderRadius: 4,
                background: '#4F46E5',
                width: `${((MOCK_METRICS.currentPrice - MOCK_METRICS.low52w) / (MOCK_METRICS.high52w - MOCK_METRICS.low52w)) * 100}%`,
              }}
            />
          </div>
        </div>

        <div style={metricCard}>
          <p style={label}>Avg volume</p>
          <p style={bigNum}>{MOCK_METRICS.volume}</p>
          <p style={{ fontSize: 12, color: '#9CA3AF', margin: '3px 0 0' }}>30-day avg</p>
        </div>
      </div>

      {/* ── Charts row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>

        {/* Price history */}
        <div style={{ ...card, gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', margin: 0 }}>
              {MOCK_METRICS.symbol} price history
            </p>
            <div style={{ display: 'flex', gap: 3 }}>
              {PERIODS.map(p => (
                <button
                  key={p}
                  onClick={() => setActivePeriod(p)}
                  style={{
                    padding: '3px 9px', borderRadius: 5, fontSize: 12,
                    border: 'none', cursor: 'pointer',
                    background: activePeriod === p ? '#EEF2FF' : 'transparent',
                    color:      activePeriod === p ? '#3730A3'  : '#9CA3AF',
                    fontWeight: activePeriod === p ? 500 : 400,
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_STOCK_DATA} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#4F46E5" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} dy={8} />
                <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '0.5px solid #E5E7EB', fontSize: 12, boxShadow: 'none' }}
                  itemStyle={{ color: '#111827', fontWeight: 500 }}
                  labelStyle={{ color: '#6B7280' }}
                />
                <Area type="monotone" dataKey="price" stroke="#4F46E5" strokeWidth={1.5} fill="url(#priceGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue bar */}
        <div style={card}>
          <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', margin: '0 0 14px' }}>
            Revenue by year ($B)
          </p>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={REVENUE_DATA} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <YAxis domain={[14, 16]} axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '0.5px solid #E5E7EB', fontSize: 12, boxShadow: 'none' }}
                  formatter={(value: ValueType | undefined) => [value != null ? `$${value}B` : '', 'Revenue']}
                  labelStyle={{ color: '#6B7280' }}
                />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                  {REVENUE_DATA.map((entry, i) => (
                    <rect
                      key={entry.year}
                      fill={i === REVENUE_DATA.length - 1 ? '#3730A3' : '#C7D2FE'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Margin breakdown ── */}
      <div style={card}>
        <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', margin: '0 0 14px' }}>
          Margin breakdown — FY2024
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {MARGIN_DATA.map(({ name, value, color }) => (
            <div key={name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: '#6B7280' }}>{name} margin</span>
                <span style={{ fontWeight: 500, color: '#111827' }}>{value}%</span>
              </div>
              <div style={{ height: 7, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Dashboard;