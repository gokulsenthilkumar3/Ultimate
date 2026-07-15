import React, { useMemo, useState, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, DollarSign, PiggyBank, Info } from 'lucide-react';

const TOOLTIP_STYLE = {
  background: 'var(--bg-glass)', border: '1px solid var(--border)',
  borderRadius: '8px', color: 'var(--text-1)',
  backdropFilter: 'blur(12px)', fontSize: '0.8rem',
};

function formatINR(val) {
  if (!val || isNaN(val)) return '₹0';
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
  if (val >= 100000)   return `₹${(val / 100000).toFixed(2)}L`;
  return `₹${Math.round(val).toLocaleString('en-IN')}`;
}

function Slider({ label, min, max, step, value, onChange, format, color = 'var(--accent)' }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: '1.1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
        <label style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 700 }}>{label}</label>
        <span style={{ fontSize: '0.88rem', fontWeight: 900, color, fontFamily: 'var(--font-mono, monospace)' }}>{format(value)}</span>
      </div>
      <div style={{ position: 'relative', height: '6px' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.08)', borderRadius: '99px' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${pct}%`, background: color, borderRadius: '99px', transition: 'width 0.1s' }} />
        <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))}
          style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', cursor: 'pointer', height: '100%' }} />
        <div style={{ position: 'absolute', top: '50%', left: `${pct}%`, transform: 'translate(-50%, -50%)', width: '14px', height: '14px', borderRadius: '50%', background: color, border: '2px solid var(--bg-card)', boxShadow: `0 0 8px ${color}66`, pointerEvents: 'none' }} />
      </div>
    </div>
  );
}

function buildSIPData({ monthly, rate, years, inflation, lumpsum, lumpsumRate }) {
  const monthlyRate   = rate / 12 / 100;
  const inflationRate = inflation / 12 / 100;
  const data = [];
  let corpus     = lumpsum  || 0;
  let lumpsumVal = lumpsum  || 0;
  let sipInvested = 0;

  for (let yr = 0; yr <= years; yr++) {
    if (yr > 0) {
      for (let m = 0; m < 12; m++) {
        corpus     = (corpus + monthly) * (1 + monthlyRate);
        lumpsumVal =  lumpsumVal         * (1 + (lumpsumRate || rate) / 12 / 100);
        sipInvested += monthly;
      }
    }
    const totalInvested = sipInvested + (lumpsum || 0);
    const realValue     = corpus / Math.pow(1 + inflation / 100, yr);
    data.push({
      year:        yr,
      label:       `Yr ${yr}`,
      corpus:      Math.round(corpus),
      invested:    Math.round(totalInvested),
      gains:       Math.round(corpus - totalInvested),
      realValue:   Math.round(realValue),
      lumpsum:     Math.round(lumpsumVal),
    });
  }
  return data;
}

// Estimate XIRR simply via annualized return formula
function estimateXIRR(data, monthly, years, lumpsum) {
  if (!data.length || years === 0) return 0;
  const totalInvested = monthly * 12 * years + (lumpsum || 0);
  const finalCorpus   = data[data.length - 1].corpus;
  if (totalInvested === 0) return 0;
  return ((Math.pow(finalCorpus / totalInvested, 1 / years) - 1) * 100).toFixed(2);
}

export default function SIPCalculator() {
  const [monthly,     setMonthly]     = useState(10000);
  const [rate,        setRate]        = useState(12);
  const [years,       setYears]       = useState(20);
  const [inflation,   setInflation]   = useState(6);
  const [lumpsum,     setLumpsum]     = useState(0);
  const [lumpsumRate, setLumpsumRate] = useState(8);
  const [showReal,    setShowReal]    = useState(true);
  const [showLumpsum, setShowLumpsum] = useState(false);
  const [view, setView] = useState('area');

  const data = useMemo(
    () => buildSIPData({ monthly, rate, years, inflation, lumpsum, lumpsumRate }),
    [monthly, rate, years, inflation, lumpsum, lumpsumRate]
  );

  const final       = data[data.length - 1] || {};
  const xirr        = estimateXIRR(data, monthly, years, lumpsum);
  const totalInvested = monthly * 12 * years + lumpsum;
  const realGain    = (final.corpus || 0) - totalInvested;
  const realValue   = final.realValue || 0;
  const lumpOnlyFinal = lumpsum ? final.lumpsum : null;

  const stepSize = (v) => v > 1000000 ? 10000 : v > 100000 ? 5000 : v > 10000 ? 1000 : 500;

  return (
    <div style={{ padding: '0.5rem 0' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.35rem' }}>Finance</p>
        <h2 className="text-display" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>SIP Calculator</h2>
        <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Systematic Investment Plan · Inflation-adjusted projections</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 380px) 1fr', gap: '1.5rem', flexWrap: 'wrap' }}>
        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="glass-card">
            <p style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-2)', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>SIP Parameters</p>
            <Slider label="Monthly SIP Amount" min={500} max={500000} step={500} value={monthly}
              onChange={setMonthly} format={v => formatINR(v)} color="var(--accent)" />
            <Slider label="Expected Return Rate (p.a.)" min={1} max={30} step={0.5} value={rate}
              onChange={setRate} format={v => `${v}%`} color="#10b981" />
            <Slider label="Investment Duration" min={1} max={40} step={1} value={years}
              onChange={setYears} format={v => `${v} yr`} color="#0ea5e9" />
            <Slider label="Inflation Rate (p.a.)" min={0} max={15} step={0.5} value={inflation}
              onChange={setInflation} format={v => `${v}%`} color="#f59e0b" />
          </div>

          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Lump Sum (Optional)</p>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <div onClick={() => setShowLumpsum(v => !v)} style={{ width: '32px', height: '18px', borderRadius: '99px', background: showLumpsum ? 'var(--accent)' : 'rgba(255,255,255,0.1)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                  <div style={{ position: 'absolute', top: '2px', left: showLumpsum ? '16px' : '2px', width: '14px', height: '14px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{showLumpsum ? 'On' : 'Off'}</span>
              </label>
            </div>
            {showLumpsum && (
              <>
                <Slider label="Lump Sum Investment" min={0} max={10000000} step={10000} value={lumpsum}
                  onChange={setLumpsum} format={formatINR} color="#8b5cf6" />
                <Slider label="Lump Sum Return Rate" min={1} max={20} step={0.5} value={lumpsumRate}
                  onChange={setLumpsumRate} format={v => `${v}%`} color="#a78bfa" />
              </>
            )}
            {!showLumpsum && <p style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Enable to combine a one-time lump sum investment with your monthly SIP.</p>}
          </div>

          {/* Chart toggles */}
          <div className="glass-card" style={{ padding: '0.75rem 1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <div onClick={() => setShowReal(v => !v)} style={{ width: '32px', height: '18px', borderRadius: '99px', background: showReal ? '#f59e0b' : 'rgba(255,255,255,0.1)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute', top: '2px', left: showReal ? '16px' : '2px', width: '14px', height: '14px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-2)', fontWeight: 600 }}>Show inflation-adjusted real value</span>
            </label>
          </div>
        </div>

        {/* Results + Chart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            {[
              { label: 'Projected Corpus',    val: formatINR(final.corpus),     icon: <TrendingUp size={16} color="var(--accent)" />,  color: 'var(--accent)' },
              { label: 'Total Invested',      val: formatINR(totalInvested),    icon: <PiggyBank  size={16} color="#10b981" />,         color: '#10b981'       },
              { label: 'Estimated Gains',     val: formatINR(realGain),         icon: <DollarSign size={16} color="#f59e0b" />,         color: '#f59e0b'       },
              { label: `Real Value (${inflation}% inf.)`, val: formatINR(realValue), icon: <Info size={16} color="#f97316" />,          color: '#f97316'       },
            ].map(m => (
              <div key={m.label} className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.35rem' }}>{m.icon}</div>
                <p style={{ fontSize: '1.35rem', fontWeight: 900, color: m.color, fontFamily: 'var(--font-mono, monospace)', lineHeight: 1 }}>{m.val}</p>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '4px' }}>{m.label}</p>
              </div>
            ))}
          </div>

          {/* XIRR + summary */}
          <div className="glass-card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '1rem' }}>
              {[
                { label: 'Annualized Return (XIRR est.)', val: `${xirr}%` },
                { label: 'Wealth Multiplier', val: totalInvested > 0 ? `${((final.corpus || 0) / totalInvested).toFixed(2)}×` : '—' },
                { label: 'Inflation Erosion', val: formatINR((final.corpus || 0) - realValue) },
                ...(lumpOnlyFinal ? [{ label: 'Lump Sum Only Final', val: formatINR(lumpOnlyFinal) }] : []),
              ].map(m => (
                <div key={m.label} style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-1)', fontFamily: 'var(--font-mono, monospace)' }}>{m.val}</p>
                  <p style={{ fontSize: '0.62rem', color: 'var(--text-3)', marginTop: '2px' }}>{m.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div className="glass-card" style={{ flexGrow: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span className="card-title" style={{ margin: 0 }}>Growth Projection</span>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                {['area', 'bar'].map(v => (
                  <button key={v} onClick={() => setView(v)} style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', background: view === v ? 'var(--accent)' : 'rgba(255,255,255,0.05)', color: view === v ? '#000' : 'var(--text-3)', border: 'none' }}>{v}</button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
                <defs>
                  <linearGradient id="gCorpus" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gInvested" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} interval={Math.floor(years / 8)} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} tickFormatter={v => formatINR(v)} width={68} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, name) => [formatINR(v), name]} />
                <Legend wrapperStyle={{ fontSize: '0.72rem', paddingTop: '8px' }} />
                <Area type="monotone" dataKey="corpus"   name="Corpus"    stroke="var(--accent)" fill="url(#gCorpus)"   strokeWidth={2} />
                <Area type="monotone" dataKey="invested" name="Invested"  stroke="#10b981"       fill="url(#gInvested)" strokeWidth={2} />
                {showReal  && <Area type="monotone" dataKey="realValue" name="Real Value (inf-adj)" stroke="#f59e0b" fill="url(#gReal)" strokeWidth={1.5} strokeDasharray="5 3" />}
                {lumpOnlyFinal && <Area type="monotone" dataKey="lumpsum"  name="Lump Sum Only"  stroke="#8b5cf6" fill="none" strokeWidth={1.5} strokeDasharray="4 2" />}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Milestone table */}
      <div className="glass-card" style={{ marginTop: '1rem', overflowX: 'auto' }}>
        <span className="card-title">Year-by-Year Milestones</span>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', marginTop: '0.75rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Year', 'Invested', 'Corpus', 'Gains', 'Real Value (inf-adj)', 'Wealth ×'].map(h => (
                <th key={h} style={{ padding: '0.5rem 0.6rem', textAlign: h === 'Year' ? 'center' : 'right', color: 'var(--text-3)', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.filter((_, i) => i % Math.max(1, Math.floor(years / 10)) === 0 || i === years).map(row => (
              <tr key={row.year} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center', fontWeight: 800, color: 'var(--accent)' }}>{row.year}</td>
                <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-mono,monospace)' }}>{formatINR(row.invested)}</td>
                <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-mono,monospace)', fontWeight: 700, color: 'var(--accent)' }}>{formatINR(row.corpus)}</td>
                <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-mono,monospace)', color: '#10b981' }}>{formatINR(row.gains)}</td>
                <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-mono,monospace)', color: '#f59e0b' }}>{formatINR(row.realValue)}</td>
                <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right', fontWeight: 700 }}>{row.invested > 0 ? `${(row.corpus / row.invested).toFixed(2)}×` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Disclaimer */}
      <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '1rem', textAlign: 'center', opacity: 0.6 }}>
        * Projections are hypothetical. Actual returns vary. Consult a qualified financial advisor before investing.
      </p>
    </div>
  );
}
