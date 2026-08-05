import React, { useMemo, useState } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, Legend,
} from 'recharts';
import {
  Target, TrendingUp, AlertTriangle, CheckCircle2, Zap, Clock,
  ChevronRight, Activity, Award,
} from 'lucide-react';

const METRICS = [
  { id: 'weight',      label: 'Bodyweight',     target: 73,    unit: 'kg',  shrink: false, domain: 'body'     },
  { id: 'shoulders',   label: 'Shoulders',      target: 48.5,  unit: 'in',  shrink: false, domain: 'body'     },
  { id: 'chest',       label: 'Chest',          target: 43,    unit: 'in',  shrink: false, domain: 'body'     },
  { id: 'waist',       label: 'Waist',          target: 30.5,  unit: 'in',  shrink: true,  domain: 'body'     },
  { id: 'arms',        label: 'Arms',           target: 16.25, unit: 'in',  shrink: false, domain: 'body'     },
  { id: 'memoryPower', label: 'Cognition',      target: 95,    unit: '%',   shrink: false, domain: 'neuro'    },
  { id: 'stamina',     label: 'Stamina',        target: 90,    unit: 'min', shrink: false, domain: 'fitness'  },
  { id: 'eyePower',    label: 'Eye Power',      target: 0,     unit: 'dp',  shrink: true,  domain: 'sensory'  },
];

const DOMAIN_COLORS = {
  body:    'var(--accent)',
  neuro:   '#a78bfa',
  fitness: '#34d399',
  sensory: '#38bdf8',
};

const DEFAULT_CYCLE_DAYS = 90;

function computePredictions(logs) {
  if (!logs || logs.length < 1) return null;

  const sorted = [...logs].sort((a, b) => new Date(b.date) - new Date(a.date));
  const latest   = sorted[0];
  const previous = sorted[1] || latest;

  const diffDays = (() => {
    const d1 = new Date(latest.date);
    const d2 = new Date(previous.date);
    const ms  = Math.abs(d1 - d2);
    return Math.max(1, Math.ceil(ms / 86_400_000));
  })();

  const confidence = Math.min(95, Math.max(20, logs.length * 8 + 10));

  return METRICS.map(metric => {
    const current = Number(latest[metric.id]) || 0;
    const prev    = Number(previous[metric.id]) || current;

    let velocity = (current - prev) / diffDays; // per day

    if (velocity === 0) {
      const needed = Math.abs(metric.target - current);
      // use DEFAULT_CYCLE_DAYS as the horizon when we have no velocity data
      velocity = (metric.shrink ? -1 : 1) * (needed / DEFAULT_CYCLE_DAYS) * 0.4;
    }

    const remaining = metric.target - current;
    const daysToTarget = velocity !== 0 ? Math.abs(remaining / velocity) : Infinity;

    // 30-day horizon
    const predicted30 = parseFloat((current + velocity * 30).toFixed(2));
    const isOnTrack = metric.shrink
      ? predicted30 <= metric.target
      : predicted30 >= metric.target;

    // Progress 0-100 toward target from a reasonable "start" value
    const range = Math.abs(metric.target - (current - velocity * 30 * 3)) || 1;
    const progress = Math.min(100, Math.max(0,
      metric.shrink
        ? ((metric.target + range - current) / range) * 100
        : ((current) / (metric.target || 1)) * 100
    ));

    const etaDate = isFinite(daysToTarget)
      ? new Date(Date.now() + daysToTarget * 86_400_000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : 'TBD';

    // Build 6-week projection for the timeline chart
    const weeks = Array.from({ length: 7 }, (_, i) => ({
      week: i === 0 ? 'Now' : `W${i}`,
      value: parseFloat((current + velocity * i * 7).toFixed(2)),
      target: metric.target,
    }));

    // Radar: pct toward target (0-100)
    const radarPct = Math.min(100, Math.max(0,
      metric.target === 0
        ? (current === 0 ? 100 : Math.max(0, 100 - current * 10))
        : metric.shrink
          ? Math.round(((metric.target / (current || 0.1)) * 100))
          : Math.round((current / metric.target) * 100)
    ));

    return {
      ...metric,
      current,
      velocity: parseFloat((velocity * 7).toFixed(3)), // per week
      predicted30,
      isOnTrack,
      progress: Math.round(progress),
      etaDate,
      weeks,
      radarPct,
      confidence,
    };
  });
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-glass)', border: '1px solid var(--border)',
      borderRadius: '10px', padding: '0.6rem 0.9rem', fontSize: '0.78rem',
      backdropFilter: 'blur(12px)',
    }}>
      <p style={{ color: 'var(--text-3)', marginBottom: '4px' }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color, fontWeight: 700 }}>
          {p.name}: {p.value} {p.payload?.unit || ''}
        </p>
      ))}
    </div>
  );
};

export default React.memo(function TransformationPredictor({ logs }) {
  const predictions = useMemo(() => computePredictions(logs), [logs]);
  const [selected, setSelected] = useState(null);
  const [view, setView]         = useState('cards'); // 'cards' | 'radar' | 'timeline'

  if (!predictions) {
    return (
      <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
        <TrendingUp size={48} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.2 }} />
        <p style={{ fontWeight: 700, color: 'var(--text-2)' }}>No metric logs yet</p>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', marginTop: '4px' }}>
          Log your first metrics in the Progress tab to unlock predictions.
        </p>
      </div>
    );
  }

  const onTrackCount  = predictions.filter(p => p.isOnTrack).length;
  const avgConfidence = Math.round(predictions.reduce((s, p) => s + p.confidence, 0) / predictions.length);
  const metricSel     = selected ? predictions.find(p => p.id === selected) : null;

  // Radar data — one point per metric
  const radarData = predictions.map(p => ({
    subject: p.label,
    pct:     p.radarPct,
    fullMark: 100,
  }));

  return (
    <div className="stagger-container">
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '8px', background: 'var(--accent)', borderRadius: '10px' }}>
            <TrendingUp color="var(--bg-base)" size={20} strokeWidth={3} />
          </div>
          <div>
            <h3 className="text-display" style={{ fontSize: '1.5rem' }}>Transformation Predictions</h3>
            <p className="text-secondary" style={{ fontSize: '0.8rem' }}>AI-driven trajectory · 30-day horizon</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {['cards', 'radar', 'timeline'].map(v => (
            <button key={v} className={`btn-sm${view === v ? ' active' : ''}`}
              onClick={() => setView(v)} style={{ textTransform: 'capitalize' }}>
              {v === 'cards' ? 'Cards' : v === 'radar' ? 'Radar' : 'Timeline'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Summary KPI row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.85rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'On Track',    value: `${onTrackCount}/${predictions.length}`, color: onTrackCount >= predictions.length * 0.6 ? '#22c55e' : '#f59e0b', icon: CheckCircle2 },
          { label: 'Confidence',  value: `${avgConfidence}%`,                     color: avgConfidence > 60 ? '#22c55e' : '#f59e0b',                         icon: Zap },
          { label: 'Data Points', value: logs?.length || 0,                       color: 'var(--accent)',                                                    icon: Activity },
          { label: 'Horizon',     value: '30 days',                               color: 'var(--text-2)',                                                    icon: Clock },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="glass-card card-shine-wrap" style={{ padding: '0.85rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span className="label-caps" style={{ fontSize: '0.65rem' }}>{label}</span>
              <Icon size={13} color={color} />
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color, fontFamily: 'var(--font-display)', lineHeight: 1, marginTop: '0.3rem' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Cards View ── */}
      {view === 'cards' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          {predictions.map(p => (
            <div
              key={p.id}
              className="glass-card ripple-effect"
              onClick={() => setSelected(selected === p.id ? null : p.id)}
              style={{
                padding: '1.25rem', position: 'relative', overflow: 'hidden', cursor: 'pointer',
                borderColor: selected === p.id ? DOMAIN_COLORS[p.domain] : 'var(--border)',
                transition: 'border-color 0.2s',
              }}
            >
              {/* Accent sidebar */}
              <div style={{
                position: 'absolute', top: 0, right: 0, width: '3px', height: '100%',
                background: p.isOnTrack ? '#22c55e' : '#f43f5e', opacity: 0.7,
              }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
                <div>
                  <p className="label-caps" style={{ fontSize: '0.65rem', color: DOMAIN_COLORS[p.domain] }}>{p.label}</p>
                  <h4 className="text-display" style={{ fontSize: '1.3rem', color: 'var(--text-1)', lineHeight: 1 }}>
                    {p.predicted30}&thinsp;
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 500 }}>{p.unit}</span>
                  </h4>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p className="label-caps" style={{ fontSize: '0.6rem', color: 'var(--text-3)' }}>Target</p>
                  <p style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--accent)' }}>{p.target} {p.unit}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '4px', fontWeight: 700 }}>
                  <span style={{ color: 'var(--text-3)' }}>Progress</span>
                  <span style={{ color: DOMAIN_COLORS[p.domain] }}>{p.progress}%</span>
                </div>
                <div style={{ height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${p.progress}%`, height: '100%', borderRadius: '3px',
                    background: `linear-gradient(90deg, ${DOMAIN_COLORS[p.domain]}, ${DOMAIN_COLORS[p.domain]}88)`,
                    boxShadow: `0 0 8px ${DOMAIN_COLORS[p.domain]}55`,
                    transition: 'width 0.8s var(--ease)',
                  }} />
                </div>
              </div>

              {/* Velocity */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Velocity</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: p.velocity !== 0 ? (p.shrink ? (p.velocity < 0 ? '#22c55e' : '#f43f5e') : (p.velocity > 0 ? '#22c55e' : '#f43f5e')) : 'var(--text-3)' }}>
                  {p.velocity > 0 ? '+' : ''}{p.velocity} {p.unit}/wk
                </span>
              </div>

              {/* Status pill */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 10px', borderRadius: '8px',
                background: p.isOnTrack ? 'rgba(34,197,94,0.08)' : 'rgba(244,63,94,0.08)',
                border: `1px solid ${p.isOnTrack ? 'rgba(34,197,94,0.2)' : 'rgba(244,63,94,0.2)'}`,
              }}>
                {p.isOnTrack
                  ? <CheckCircle2 size={12} color="#22c55e" />
                  : <AlertTriangle size={12} color="#f43f5e" />}
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: p.isOnTrack ? '#22c55e' : '#f43f5e' }}>
                  {p.isOnTrack ? `ETA ${p.etaDate}` : 'Velocity below target'}
                </span>
                <ChevronRight size={12} color="var(--text-3)" style={{ marginLeft: 'auto', transform: selected === p.id ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
              </div>

              {/* Expandable mini-chart */}
              {selected === p.id && (
                <div style={{ marginTop: '1rem' }}>
                  <p className="label-caps" style={{ fontSize: '0.6rem', marginBottom: '6px' }}>6-Week Projection</p>
                  <ResponsiveContainer width="100%" height={100}>
                    <LineChart data={p.weeks} margin={{ top: 4, right: 4, left: -30, bottom: 0 }}>
                      <XAxis dataKey="week" stroke="var(--text-3)" tick={{ fontSize: 9 }} />
                      <YAxis stroke="var(--text-3)" tick={{ fontSize: 9 }} domain={['auto', 'auto']} />
                      <ReferenceLine y={p.target} stroke={DOMAIN_COLORS[p.domain]} strokeDasharray="3 3" strokeWidth={1} />
                      <Line type="monotone" dataKey="value" stroke={DOMAIN_COLORS[p.domain]}
                        strokeWidth={2} dot={{ r: 2, fill: DOMAIN_COLORS[p.domain] }} name="Projected" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Confidence */}
              <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Zap size={9} color={p.confidence > 50 ? 'var(--accent)' : 'var(--text-3)'}
                  fill={p.confidence > 50 ? 'var(--accent)' : 'none'} />
                <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-3)', letterSpacing: '0.08em' }}>
                  CONFIDENCE: {p.confidence}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Radar View ── */}
      {view === 'radar' && (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <p className="label-caps" style={{ marginBottom: '0.5rem', color: 'var(--accent)' }}>Current Achievement vs Target (% of goal reached)</p>
          <ResponsiveContainer width="100%" height={380}>
            <RadarChart data={radarData} margin={{ top: 10, right: 40, bottom: 10, left: 40 }}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-2)', fontSize: 11, fontWeight: 700 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: 'var(--text-3)' }} tickCount={4} />
              <Radar
                name="Current %"
                dataKey="pct"
                stroke="var(--accent)"
                fill="var(--accent)"
                fillOpacity={0.18}
                strokeWidth={2}
                dot={{ r: 3, fill: 'var(--accent)' }}
              />
              <Tooltip
                contentStyle={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '0.78rem', backdropFilter: 'blur(12px)' }}
                formatter={(v, n) => [`${v}%`, n]}
              />
            </RadarChart>
          </ResponsiveContainer>
          <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '0.25rem' }}>
            100% = target reached · values capped at 100
          </p>
        </div>
      )}

      {/* ── Timeline View ── */}
      {view === 'timeline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {predictions.map(p => (
            <div key={p.id} className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: DOMAIN_COLORS[p.domain], display: 'inline-block' }} />
                  <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{p.label}</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Now: <strong style={{ color: 'var(--text-1)' }}>{p.current} {p.unit}</strong></span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Target: <strong style={{ color: 'var(--accent)' }}>{p.target} {p.unit}</strong></span>
                  {p.isOnTrack
                    ? <span style={{ fontSize: '0.65rem', color: '#22c55e', fontWeight: 800, background: 'rgba(34,197,94,0.1)', padding: '2px 8px', borderRadius: '10px' }}>ON TRACK</span>
                    : <span style={{ fontSize: '0.65rem', color: '#f43f5e', fontWeight: 800, background: 'rgba(244,63,94,0.1)', padding: '2px 8px', borderRadius: '10px' }}>LAGGING</span>
                  }
                </div>
              </div>
              <ResponsiveContainer width="100%" height={90}>
                <LineChart data={p.weeks} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="week" stroke="var(--text-3)" tick={{ fontSize: 9 }} />
                  <YAxis stroke="var(--text-3)" tick={{ fontSize: 9 }} domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={p.target} stroke={DOMAIN_COLORS[p.domain]} strokeDasharray="4 2" strokeWidth={1.5} label={{ value: 'Target', fill: DOMAIN_COLORS[p.domain], fontSize: 9 }} />
                  <Line type="monotone" dataKey="value" stroke={DOMAIN_COLORS[p.domain]}
                    strokeWidth={2.5} dot={{ r: 3, fill: DOMAIN_COLORS[p.domain] }}
                    name="Projected" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      )}

      {/* ── Peak State Summary ── */}
      <div className="glass-card" style={{
        marginTop: '1.5rem', padding: '1.75rem',
        display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap',
        background: 'linear-gradient(90deg, rgba(var(--accent-rgb), 0.05), transparent)',
        borderColor: 'var(--border-strong)',
      }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
            <Award size={18} color="var(--accent)" />
            <p className="label-caps" style={{ color: 'var(--accent)' }}>30-Day Peak State Forecast</p>
          </div>
          <h3 className="text-display" style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>
            Evolutionary Peak Profile
          </h3>
          <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', lineHeight: 1.6 }}>
            {onTrackCount} of {predictions.length} metrics are on trajectory.{' '}
            {onTrackCount >= predictions.length * 0.75
              ? 'Your digital twin is in elite adaptation mode — all systems converging toward peak state.'
              : 'Focus velocity on lagging metrics to synchronise full-body optimisation.'}
          </p>
        </div>
        <div style={{
          textAlign: 'center', padding: '1.25rem 1.75rem',
          background: 'rgba(0,0,0,0.3)', borderRadius: '20px',
          border: '1px solid var(--border)', minWidth: '120px',
        }}>
          <p className="label-caps" style={{ fontSize: '0.65rem', marginBottom: '4px' }}>Meta Score</p>
          <p className="text-display" style={{ fontSize: '2.8rem', color: 'var(--accent)', lineHeight: 1 }}>
            {Math.round((onTrackCount / predictions.length) * 100)}
            <span style={{ fontSize: '1.1rem', color: 'var(--text-3)' }}>/100</span>
          </p>
          <p style={{ fontSize: '0.65rem', fontWeight: 900, opacity: 0.5, marginTop: '4px' }}>TRAJECTORY SCORE</p>
        </div>
      </div>
    </div>
  );
});
