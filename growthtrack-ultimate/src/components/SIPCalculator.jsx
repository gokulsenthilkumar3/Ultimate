import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, IndianRupee } from 'lucide-react';

const fmt = (n) =>
  n >= 1e7
    ? `₹${(n / 1e7).toFixed(2)} Cr`
    : n >= 1e5
    ? `₹${(n / 1e5).toFixed(1)} L`
    : `₹${Math.round(n).toLocaleString('en-IN')}`;

const TOOLTIP_STYLE = {
  background: 'var(--bg-glass)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  backdropFilter: 'blur(12px)',
  color: 'var(--text-1)',
  fontSize: '0.8rem',
};

export default function SIPCalculator() {
  const [monthly, setMonthly] = useState(5000);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(15);
  const [inflation, setInflation] = useState(6);

  const { corpus, invested, gains, realCorpus, chartData } = useMemo(() => {
    const r = rate / 100 / 12;
    const n = years * 12;
    const corpus = monthly * (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
    const invested = monthly * n;
    const gains = corpus - invested;
    const realCorpus = corpus / Math.pow(1 + inflation / 100, years);

    const chartData = Array.from({ length: years }, (_, i) => {
      const months = (i + 1) * 12;
      const c = monthly * (((Math.pow(1 + r, months) - 1) / r) * (1 + r));
      const rc = c / Math.pow(1 + inflation / 100, i + 1);
      return {
        year: `Yr ${i + 1}`,
        invested: Math.round(monthly * months),
        corpus: Math.round(c),
        realCorpus: Math.round(rc),
      };
    });

    return { corpus, invested, gains, realCorpus, chartData };
  }, [monthly, rate, years, inflation]);

  const xirr = ((corpus / invested - 1) * 100).toFixed(1);

  return (
    <div className="glass-card" style={{ padding: '2rem', marginTop: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
        <div style={{ background: 'var(--accent-soft)', padding: '10px', borderRadius: '12px', color: 'var(--accent)' }}>
          <TrendingUp size={22} />
        </div>
        <div>
          <h3 className="card-title" style={{ margin: 0 }}>SIP Compound Growth Projector</h3>
          <p className="text-secondary" style={{ fontSize: '0.78rem', marginTop: '2px' }}>See how your monthly SIP grows over time</p>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Monthly SIP */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <label className="label-caps">Monthly SIP</label>
            <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '0.9rem' }}>{fmt(monthly)}</span>
          </div>
          <input
            type="range" min={500} max={100000} step={500}
            value={monthly}
            onChange={e => setMonthly(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '4px' }}>
            <span>₹500</span><span>₹1L</span>
          </div>
        </div>

        {/* Return Rate */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <label className="label-caps">Expected Return</label>
            <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '0.9rem' }}>{rate}% p.a.</span>
          </div>
          <input
            type="range" min={6} max={30} step={0.5}
            value={rate}
            onChange={e => setRate(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '4px' }}>
            <span>6%</span><span>30%</span>
          </div>
        </div>

        {/* Inflation Rate */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <label className="label-caps">Inflation Rate</label>
            <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '0.9rem' }}>{inflation}% p.a.</span>
          </div>
          <input
            type="range" min={0} max={15} step={0.5}
            value={inflation}
            onChange={e => setInflation(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '4px' }}>
            <span>0%</span><span>15%</span>
          </div>
        </div>

        {/* Duration */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <label className="label-caps">Duration</label>
            <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '0.9rem' }}>{years} yrs</span>
          </div>
          <input
            type="range" min={1} max={40} step={1}
            value={years}
            onChange={e => setYears(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '4px' }}>
            <span>1yr</span><span>40yrs</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Invested', value: fmt(invested), color: 'var(--info)' },
          { label: 'Projected Corpus', value: fmt(corpus), color: 'var(--accent)' },
          { label: 'Real Value (Infl. Adj)', value: fmt(realCorpus), color: 'var(--warning)' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--bg-elevated)', padding: '1.25rem', borderRadius: '16px',
            border: `1px solid ${s.color}33`, textAlign: 'center'
          }}>
            <p className="label-caps" style={{ marginBottom: '6px', fontSize: '0.6rem' }}>{s.label}</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 900, color: s.color, fontFamily: 'var(--font-display)' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Gain multiplier badge */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
        <span style={{
          padding: '6px 18px', borderRadius: '999px',
          background: 'var(--accent-soft)', color: 'var(--accent)',
          fontWeight: 900, fontSize: '0.85rem'
        }}>
          💰 Your money grows {(corpus / invested).toFixed(1)}× in {years} years
        </span>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
          <defs>
            <linearGradient id="sipInvested" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--info)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--info)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="sipCorpus" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4} />
              <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--text-3)' }}
            tickFormatter={v => v >= 1e7 ? `${(v / 1e7).toFixed(0)}Cr` : v >= 1e5 ? `${(v / 1e5).toFixed(0)}L` : v}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value, name) => [fmt(value), name === 'corpus' ? 'Corpus' : name === 'realCorpus' ? 'Real Value' : 'Invested']}
          />
          <Area type="monotone" dataKey="invested" stroke="var(--info)" fill="url(#sipInvested)" strokeWidth={2} />
          <Area type="monotone" dataKey="corpus" stroke="var(--accent)" fill="url(#sipCorpus)" strokeWidth={2} />
          <Area type="monotone" dataKey="realCorpus" stroke="var(--warning)" fill="none" strokeWidth={2} strokeDasharray="5 5" />
        </AreaChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '0.75rem', fontSize: '0.72rem', color: 'var(--text-3)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '3px', background: 'var(--info)', display: 'inline-block', borderRadius: '2px' }} />
          Total Invested
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '3px', background: 'var(--accent)', display: 'inline-block', borderRadius: '2px' }} />
          Projected Corpus
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '3px', borderTop: '2px dashed var(--warning)', display: 'inline-block' }} />
          Real Value (Inflation Adjusted)
        </span>
      </div>
    </div>
  );
}
