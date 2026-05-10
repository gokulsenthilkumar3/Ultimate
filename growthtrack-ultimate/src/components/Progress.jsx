import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import useStore, { selectUser } from '../store/useStore';
import {
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import {
  TrendingUp, Plus, Activity, RefreshCw, TrendingDown,
  Minus, Image, X, ChevronLeft, ChevronRight, ZoomIn
} from 'lucide-react';
import MetricLogger from './MetricLogger';
import TransformationPredictor from './TransformationPredictor';

// ── Delta badge
function DeltaBadge({ delta, unit = '' }) {
  if (delta === null || delta === undefined || isNaN(delta)) return null;
  const abs = Math.abs(delta).toFixed(1);
  const pos = delta > 0;
  const zero = delta === 0;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '3px',
      fontSize: '0.72rem', fontWeight: 800,
      color: zero ? 'var(--text-3)' : pos ? '#f87171' : '#34d399',
      background: zero ? 'rgba(255,255,255,0.05)' : pos ? 'rgba(248,113,113,0.12)' : 'rgba(52,211,153,0.12)',
      padding: '2px 7px', borderRadius: '10px',
    }}>
      {zero ? <Minus size={10} /> : pos ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {zero ? 'No change' : `${pos ? '+' : '-'}${abs}${unit}`}
    </span>
  );
}

const METRICS = [
  { key: 'weight',  label: 'Weight',    unit: 'kg',  color: 'var(--accent)',  yDomain: ['auto', 'auto'] },
  { key: 'sleep',   label: 'Sleep',     unit: 'hrs', color: '#8b5cf6',        yDomain: [0, 12] },
  { key: 'water',   label: 'Hydration', unit: 'L',   color: '#0ea5e9',        yDomain: [0, 5] },
  { key: 'stamina', label: 'Stamina',   unit: '%',   color: '#f43f5e',        yDomain: [0, 100] },
  { key: 'hr',      label: 'Heart Rate',unit: 'bpm', color: '#10b981',        yDomain: [40, 200] },
];

export default function Progress() {
  const user           = useStore(selectUser);
  const storeLogs      = useStore(state => state.metric_logs) || [];
  const saveMetricLog  = useStore(state => state.saveMetricLog);

  const [isLogging,     setIsLogging]     = useState(false);
  const [activeMetric,  setActiveMetric]  = useState('weight');

  // ── DB-backed progress entries
  const [progressEntries, setProgressEntries] = useState([]);
  const [loadingEntries,  setLoadingEntries]  = useState(false);

  // ── Photo gallery state
  const [galleryOpen, setGalleryOpen]   = useState(false);
  const [lightboxIdx, setLightboxIdx]   = useState(null);

  // ── Fetch all progress entries from DB
  const fetchProgressEntries = useCallback(async () => {
    setLoadingEntries(true);
    try {
      const res = await fetch('/api/progress_entries');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProgressEntries(Array.isArray(data) ? data.sort((a, b) => b.date?.localeCompare(a.date)) : []);
    } catch (e) {
      console.error('progress_entries fetch error', e);
    } finally {
      setLoadingEntries(false);
    }
  }, []);

  useEffect(() => { fetchProgressEntries(); }, [fetchProgressEntries]);

  // ── Build chart data from DB metric_logs (store)
  const chartData = useMemo(() => {
    return [...storeLogs]
      .filter(l => l.date)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(l => ({
        date:    l.date?.slice(5),
        weight:  l.weight  ? Number(l.weight)  : undefined,
        sleep:   l.sleep   ? Number(l.sleep)   : undefined,
        water:   l.water   ? Number(l.water)   : undefined,
        stamina: l.stamina ? Number(l.stamina) : undefined,
        hr:      l.hr      ? Number(l.hr)      : undefined,
      }));
  }, [storeLogs]);

  // ── 30-day delta: compare latest log vs log ~30 days ago
  const deltas = useMemo(() => {
    const result = {};
    const sorted = [...storeLogs]
      .filter(l => l.date)
      .sort((a, b) => b.date.localeCompare(a.date));
    if (sorted.length < 2) return result;
    const latest = sorted[0];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    // Find the entry closest to 30 days ago
    const old = sorted.find(l => l.date <= cutoffStr) || sorted[sorted.length - 1];
    METRICS.forEach(m => {
      const curr = latest[m.key] !== undefined ? Number(latest[m.key]) : null;
      const prev = old[m.key]   !== undefined ? Number(old[m.key])    : null;
      if (curr !== null && prev !== null) result[m.key] = parseFloat((curr - prev).toFixed(1));
    });
    return result;
  }, [storeLogs]);

  const latestLog = storeLogs[0] || { weight: user?.weight || 0, sleep: 7, water: 2.5, stamina: 40, hr: 72 };
  const selected  = METRICS.find(m => m.key === activeMetric) || METRICS[0];

  // ── Photos only (entries with photo_url)
  const photoEntries = useMemo(
    () => progressEntries.filter(e => e.photo_url),
    [progressEntries]
  );

  const handleSaveLog = async (newLog) => { await saveMetricLog(newLog); };

  // Lightbox nav
  const handleLightboxPrev = () => setLightboxIdx(i => (i > 0 ? i - 1 : photoEntries.length - 1));
  const handleLightboxNext = () => setLightboxIdx(i => (i < photoEntries.length - 1 ? i + 1 : 0));

  return (
    <div className="fade-in stagger-container">
      {isLogging && <MetricLogger onClose={() => setIsLogging(false)} onSave={handleSaveLog} />}

      {/* Lightbox */}
      {lightboxIdx !== null && photoEntries[lightboxIdx] && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 300,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setLightboxIdx(null)}>
          <button onClick={e => { e.stopPropagation(); handleLightboxPrev(); }}
            style={{ position: 'absolute', left: '1.5rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
            <ChevronLeft size={22} />
          </button>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: '560px', width: '90%', textAlign: 'center' }}>
            <img
              src={photoEntries[lightboxIdx].photo_url}
              alt={photoEntries[lightboxIdx].date}
              style={{ width: '100%', borderRadius: '16px', objectFit: 'cover', maxHeight: '70vh' }}
            />
            <p style={{ color: '#fff', fontSize: '0.85rem', marginTop: '12px', fontWeight: 700 }}>
              {photoEntries[lightboxIdx].date}
              {photoEntries[lightboxIdx].weight ? ` · ${photoEntries[lightboxIdx].weight}kg` : ''}
            </p>
            <p style={{ color: '#6b7280', fontSize: '0.72rem', marginTop: '4px' }}>
              {lightboxIdx + 1} / {photoEntries.length}
            </p>
          </div>
          <button onClick={e => { e.stopPropagation(); handleLightboxNext(); }}
            style={{ position: 'absolute', right: '1.5rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
            <ChevronRight size={22} />
          </button>
          <button onClick={() => setLightboxIdx(null)}
            style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
            <X size={22} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="section-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="text-display" style={{ fontSize: '2rem' }}>Progress Intelligence</h2>
          <p className="text-secondary" style={{ fontSize: '0.9rem' }}>Tracking the evolution of your digital twin across body, lifestyle, and holistic sensory data.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary" onClick={fetchProgressEntries} title="Refresh entries"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: loadingEntries ? 0.5 : 1 }}>
            <RefreshCw size={14} className={loadingEntries ? 'spin' : ''} /> Refresh
          </button>
          <button className="btn-primary" onClick={() => setIsLogging(true)}>
            <Plus size={18} /> NEW LOG ENTRY
          </button>
        </div>
      </div>

      {/* Snapshot Vitals Grid ─ with 30-day delta badges */}
      <div className="stagger-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {[
          { label: 'Current Weight', val: latestLog.weight,  unit: 'KG',  metricKey: 'weight',  sub: 'LIVE DATA' },
          { label: 'Avg Sleep',      val: latestLog.sleep,   unit: 'HRS', metricKey: 'sleep',   sub: latestLog.sleep < 7 ? 'RECOVERY NEEDED' : 'OPTIMAL' },
          { label: 'Hydration',      val: latestLog.water,   unit: 'L',   metricKey: 'water',   sub: 'DAILY TARGET' },
          { label: 'Stamina',        val: latestLog.stamina, unit: '%',   metricKey: 'stamina', sub: 'CAPACITY' },
        ].map((card, i) => (
          <div key={i} className="glass-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <p className="label-caps">{card.label}</p>
            <h3 className="text-display" style={{ fontSize: '2rem', margin: '0.5rem 0' }}>
              {card.val ?? '—'} <span style={{ fontSize: '1rem' }}>{card.unit}</span>
            </h3>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 700 }}>{card.sub}</span>
              {deltas[card.metricKey] !== undefined && (
                <DeltaBadge delta={deltas[card.metricKey]} unit={card.unit.toLowerCase()} />
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <TransformationPredictor logs={storeLogs} />
      </div>

      {/* Metric Trend Chart */}
      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={18} color="var(--accent)" />
            <p className="label-caps">Metric Trend — Real Data</p>
            <span className="badge">{storeLogs.length} entries</span>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {METRICS.map(m => (
              <button key={m.key} onClick={() => setActiveMetric(m.key)}
                style={{
                  padding: '4px 12px', borderRadius: '20px',
                  border: `1px solid ${activeMetric === m.key ? m.color : 'var(--border)'}`,
                  background: activeMetric === m.key ? `${m.color}22` : 'transparent',
                  color: activeMetric === m.key ? m.color : 'var(--text-3)',
                  cursor: 'pointer', fontWeight: 700, fontSize: '0.72rem', transition: 'all 0.2s',
                }}>
                {m.label}
                {deltas[m.key] !== undefined && (
                  <DeltaBadge delta={deltas[m.key]} unit={m.unit} />
                )}
              </button>
            ))}
          </div>
        </div>
        {chartData.length < 2 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-3)' }}>
            <TrendingUp size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p style={{ fontWeight: 700 }}>Log your first metrics to see trends here</p>
          </div>
        ) : (
          <div style={{ width: '100%', height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={selected.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={selected.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--text-3)" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis stroke="var(--text-3)" fontSize={10} tickLine={false} axisLine={false} domain={selected.yDomain} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '0.82rem' }}
                  formatter={v => [`${v} ${selected.unit}`, selected.label]}
                />
                <Area type="monotone" dataKey={selected.key} stroke={selected.color} fill="url(#metricGrad)"
                  strokeWidth={2.5} dot={chartData.length < 20 ? { r: 3, fill: selected.color } : false} connectNulls={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Holistic Evolution Matrix */}
      <div className="stagger-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Cognitive',  val: latestLog.memoryPower ?? '—', unit: '%',  icon: '🧠', color: '#8b5cf6', metricKey: null },
          { label: 'Eye Power',  val: latestLog.eyePower    ?? '—', unit: 'dp', icon: '👁️', color: '#06b6d4', metricKey: null },
          { label: 'Stamina',    val: latestLog.stamina     ?? '—', unit: 'm',  icon: '🏃', color: '#f43f5e', metricKey: 'stamina' },
          { label: 'Heart Rate', val: latestLog.hr          ?? '—', unit: 'bpm',icon: '❤️', color: '#10b981', metricKey: 'hr' },
        ].map((m, i) => (
          <div key={i} className="glass-card" style={{ padding: '1rem', borderLeft: `3px solid ${m.color}` }}>
            <p style={{ fontSize: '0.6rem', color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 800 }}>{m.label}</p>
            <h4 className="text-display" style={{ fontSize: '1.2rem', marginTop: '4px' }}>{m.val}{m.unit}</h4>
            {m.metricKey && deltas[m.metricKey] !== undefined && (
              <div style={{ marginTop: '4px' }}>
                <DeltaBadge delta={deltas[m.metricKey]} unit={m.unit} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Photo Gallery */}
      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Image size={18} color="var(--accent)" />
            <h3 className="card-title" style={{ margin: 0 }}>Progress Photos</h3>
            <span className="badge">{photoEntries.length} photos</span>
          </div>
          {photoEntries.length > 0 && (
            <button className="btn-secondary" style={{ fontSize: '0.72rem', padding: '4px 12px' }}
              onClick={() => { setGalleryOpen(g => !g); }}>
              {galleryOpen ? 'Hide Gallery' : 'View Gallery'}
            </button>
          )}
        </div>

        {photoEntries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)' }}>
            <Image size={28} style={{ opacity: 0.25, marginBottom: '8px' }} />
            <p style={{ fontSize: '0.82rem' }}>No progress photos yet.</p>
            <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>Photos uploaded via Log Entry will appear here.</p>
          </div>
        ) : galleryOpen ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
            {photoEntries.map((entry, i) => (
              <div key={entry.id || i}
                onClick={() => setLightboxIdx(i)}
                style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', aspectRatio: '1', background: 'var(--bg-dark)' }}
              >
                <img
                  src={entry.photo_url}
                  alt={entry.date}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                {/* Hover overlay */}
                <div style={{
                  position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  opacity: 0, transition: 'opacity 0.2s',
                }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = 0}
                >
                  <ZoomIn size={20} color="#fff" />
                  <p style={{ color: '#fff', fontSize: '0.65rem', marginTop: '4px' }}>{entry.date}</p>
                  {entry.weight && <p style={{ color: '#fbbf24', fontSize: '0.65rem' }}>{entry.weight}kg</p>}
                </div>
                {/* Date label */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                  padding: '6px 8px 4px',
                }}>
                  <p style={{ color: '#fff', fontSize: '0.6rem', fontWeight: 700 }}>{entry.date}</p>
                  {entry.weight && <p style={{ color: '#fbbf24', fontSize: '0.58rem' }}>{entry.weight}kg</p>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Compact strip — show first 5
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '4px' }}>
            {photoEntries.slice(0, 5).map((entry, i) => (
              <div key={entry.id || i}
                onClick={() => { setGalleryOpen(true); setLightboxIdx(i); }}
                style={{ flexShrink: 0, width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', position: 'relative' }}
              >
                <img src={entry.photo_url} alt={entry.date} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
            {photoEntries.length > 5 && (
              <div onClick={() => setGalleryOpen(true)}
                style={{ flexShrink: 0, width: '80px', height: '80px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexDirection: 'column', gap: '2px' }}
              >
                <span style={{ fontSize: '1.1rem', color: 'var(--text-2)', fontWeight: 800 }}>+{photoEntries.length - 5}</span>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-3)' }}>more</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* DB-backed Progress Entries Table */}
      <div className="glass-card" style={{ padding: 0, marginBottom: '2rem' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title" style={{ margin: 0 }}>Progress Entry Log</h3>
          <span className="badge">{progressEntries.length} entries</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ fontSize: '0.7rem', color: 'var(--text-3)', textTransform: 'uppercase' }}>
                <th style={{ padding: '1rem' }}>Date</th>
                <th style={{ padding: '1rem' }}>Weight</th>
                <th style={{ padding: '1rem' }}>Body Fat</th>
                <th style={{ padding: '1rem' }}>Measurements</th>
                <th style={{ padding: '1rem' }}>Note</th>
                <th style={{ padding: '1rem' }}>Photo</th>
              </tr>
            </thead>
            <tbody>
              {progressEntries.map((entry, i) => (
                <tr key={entry.id || i} style={{ borderTop: '1px solid var(--border)', fontSize: '0.85rem' }}>
                  <td style={{ padding: '1rem', fontWeight: 700 }}>{entry.date}</td>
                  <td style={{ padding: '1rem' }}>{entry.weight ? `${entry.weight}kg` : '—'}
                    {i < progressEntries.length - 1 && entry.weight && progressEntries[i+1]?.weight && (
                      <span style={{ marginLeft: '6px' }}>
                        <DeltaBadge delta={parseFloat((Number(entry.weight) - Number(progressEntries[i+1].weight)).toFixed(1))} unit="kg" />
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>{entry.body_fat ? `${entry.body_fat}%` : '—'}</td>
                  <td style={{ padding: '1rem', fontSize: '0.75rem', color: 'var(--text-3)' }}>
                    {[entry.chest && `Chest:${entry.chest}`, entry.waist && `Waist:${entry.waist}`, entry.hips && `Hips:${entry.hips}`]
                      .filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.78rem', color: 'var(--text-3)', maxWidth: '180px' }}>
                    <span style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {entry.note || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {entry.photo_url ? (
                      <img src={entry.photo_url} alt="progress" style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover', cursor: 'pointer' }}
                        onClick={() => { const idx = photoEntries.findIndex(p => p.id === entry.id); if (idx !== -1) { setGalleryOpen(true); setLightboxIdx(idx); } }} />
                    ) : '—'}
                  </td>
                </tr>
              ))}
              {progressEntries.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)' }}>
                  No progress entries yet.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Metric Audit Log (store-backed) */}
      <div className="glass-card" style={{ padding: 0 }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
          <h3 className="card-title" style={{ margin: 0 }}>Metric Audit Log</h3>
          <span className="badge">{storeLogs.length} Entries</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ fontSize: '0.7rem', color: 'var(--text-3)', textTransform: 'uppercase' }}>
                <th style={{ padding: '1rem' }}>Date</th>
                <th style={{ padding: '1rem' }}>Weight</th>
                <th style={{ padding: '1rem' }}>Sleep / Water</th>
                <th style={{ padding: '1rem' }}>Stamina</th>
                <th style={{ padding: '1rem' }}>HR</th>
              </tr>
            </thead>
            <tbody>
              {storeLogs.map(log => (
                <tr key={log.id} style={{ borderTop: '1px solid var(--border)', fontSize: '0.85rem' }}>
                  <td style={{ padding: '1rem', fontWeight: 700 }}>{log.date}</td>
                  <td style={{ padding: '1rem' }}>{log.weight ? `${log.weight}kg` : '—'}</td>
                  <td style={{ padding: '1rem' }}>{log.sleep ?? '—'}h / {log.water ?? '—'}L</td>
                  <td style={{ padding: '1rem' }}>{log.stamina ?? '—'}%</td>
                  <td style={{ padding: '1rem', color: 'var(--accent)', fontWeight: 800 }}>{log.hr ?? '—'}</td>
                </tr>
              ))}
              {storeLogs.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)' }}>No logs yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
