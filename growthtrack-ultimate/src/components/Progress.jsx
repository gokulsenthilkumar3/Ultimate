import React, { useState, useMemo } from 'react';
import useStore, { selectUser } from '../store/useStore';
import { 
  XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area, LineChart, Line, ComposedChart
} from 'recharts';
import { TrendingUp, Plus, Calendar, Database, Heart, Zap, Activity } from 'lucide-react';
import MetricLogger from './MetricLogger';
import TransformationPredictor from './TransformationPredictor';

export default function Progress() {
  const user = useStore(selectUser);
  const logs = useStore(state => state.metric_logs) || [];
  const saveMetricLog = useStore(state => state.saveMetricLog);
  const [isLogging, setIsLogging] = useState(false);
  const [activeMetric, setActiveMetric] = useState('weight');

  // Build real chart data from metric_logs, sorted oldest → newest
  const chartData = useMemo(() => {
    const sorted = [...logs]
      .filter(l => l.date)
      .sort((a, b) => a.date.localeCompare(b.date));
    return sorted.map(l => ({
      date: l.date?.slice(5), // MM-DD for display
      weight: l.weight ? Number(l.weight) : undefined,
      sleep:  l.sleep  ? Number(l.sleep)  : undefined,
      water:  l.water  ? Number(l.water)  : undefined,
      stamina:l.stamina ? Number(l.stamina): undefined,
      hr:     l.hr      ? Number(l.hr)    : undefined,
    }));
  }, [logs]);

  const METRICS = [
    { key: 'weight',  label: 'Weight',   unit: 'kg',  color: 'var(--accent)',    yDomain: ['auto', 'auto'] },
    { key: 'sleep',   label: 'Sleep',    unit: 'hrs', color: '#8b5cf6',          yDomain: [0, 12] },
    { key: 'water',   label: 'Hydration',unit: 'L',   color: '#0ea5e9',          yDomain: [0, 5] },
    { key: 'stamina', label: 'Stamina',  unit: '%',   color: '#f43f5e',          yDomain: [0, 100] },
    { key: 'hr',      label: 'Heart Rate',unit:'bpm', color: '#10b981',          yDomain: [40, 200] },
  ];
  const selected = METRICS.find(m => m.key === activeMetric) || METRICS[0];

  const handleSaveLog = async (newLog) => {
    await saveMetricLog(newLog);
  };

  const latestLog = logs[0] || { weight: user?.weight || 0, sleep: 7, water: 2.5, stamina: 40, hr: 72 };

  return (
    <div className="fade-in stagger-container">
      {isLogging && <MetricLogger onClose={() => setIsLogging(false)} onSave={handleSaveLog} />}
      
      <div className="section-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="text-display" style={{ fontSize: '2rem' }}>Progress Intelligence</h2>
          <p className="text-secondary" style={{ fontSize: '0.9rem' }}>Tracking the evolution of your digital twin across body, lifestyle, and holistic sensory data.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-primary" onClick={() => setIsLogging(true)}>
            <Plus size={18} /> NEW LOG ENTRY
          </button>
        </div>
      </div>

      {/* Snapshot Vitals Grid */}
      <div className="stagger-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
         <div className="glass-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <p className="label-caps">Current Weight</p>
            <h3 className="text-display" style={{ fontSize: '2rem', margin: '0.5rem 0' }}>{latestLog.weight} <span style={{ fontSize: '1rem' }}>KG</span></h3>
            <div style={{ color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 700 }}>LIVE DATA</div>
         </div>
         <div className="glass-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <p className="label-caps">D Size Metric</p>
            <h3 className="text-display" style={{ fontSize: '2rem', margin: '0.5rem 0', color: 'var(--accent)' }}>{latestLog.d_size} <span style={{ fontSize: '1rem' }}>IN</span></h3>
            <div style={{ color: 'var(--text-3)', fontSize: '0.8rem', fontWeight: 700 }}>TARGET: 8.0 IN</div>
         </div>
         <div className="glass-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <p className="label-caps">Avg Sleep</p>
            <h3 className="text-display" style={{ fontSize: '2rem', margin: '0.5rem 0' }}>{latestLog.sleep} <span style={{ fontSize: '1rem' }}>HRS</span></h3>
            <div style={{ color: latestLog.sleep < 7 ? 'var(--danger)' : 'var(--success)', fontSize: '0.8rem', fontWeight: 700 }}>
              {latestLog.sleep < 7 ? 'RECOVERY NEEDED' : 'OPTIMAL'}
            </div>
         </div>
         <div className="glass-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <p className="label-caps">Hydration</p>
            <h3 className="text-display" style={{ fontSize: '2rem', margin: '0.5rem 0' }}>{latestLog.water} <span style={{ fontSize: '1rem' }}>L</span></h3>
            <div style={{ color: '#0ea5e9', fontSize: '0.8rem', fontWeight: 700 }}>DAILY TARGET</div>
         </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <TransformationPredictor logs={logs} />
      </div>

      {/* Real Metric Trend Chart */}
      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={18} color="var(--accent)" />
            <p className="label-caps">Metric Trend — Real Data</p>
            <span className="badge">{logs.length} log entries</span>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {METRICS.map(m => (
              <button key={m.key} onClick={() => setActiveMetric(m.key)}
                style={{ padding: '4px 12px', borderRadius: '20px', border: `1px solid ${activeMetric === m.key ? m.color : 'var(--border)'}`, background: activeMetric === m.key ? `${m.color}22` : 'transparent', color: activeMetric === m.key ? m.color : 'var(--text-3)', cursor: 'pointer', fontWeight: 700, fontSize: '0.72rem', transition: 'all 0.2s' }}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
        {chartData.length < 2 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-3)' }}>
            <TrendingUp size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p style={{ fontWeight: 700 }}>Log your first metrics to see trends here</p>
            <p style={{ fontSize: '0.82rem', marginTop: '6px' }}>Use the "New Log Entry" button above to start tracking</p>
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
                  contentStyle={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: '12px', backdropFilter: 'blur(12px)', fontSize: '0.82rem' }}
                  formatter={(v) => [`${v} ${selected.unit}`, selected.label]}
                />
                <Area
                  type="monotone"
                  dataKey={selected.key}
                  stroke={selected.color}
                  fill="url(#metricGrad)"
                  strokeWidth={2.5}
                  dot={chartData.length < 20 ? { r: 3, fill: selected.color } : false}
                  connectNulls={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

       {/* Holistic Evolution Matrix */}
       <div className="stagger-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Cognitive', val: latestLog.memoryPower ?? '—', unit: '%', icon: '🧠', color: '#8b5cf6' },
            { label: 'Eye Power', val: latestLog.eyePower ?? '—', unit: 'dp', icon: '👁️', color: '#06b6d4' },
            { label: 'Stamina', val: latestLog.stamina ?? '—', unit: 'm', icon: '🏃', color: '#f43f5e' },
            { label: 'Heart Rate', val: latestLog.hr ?? '—', unit: 'bpm', icon: '❤️', color: '#10b981' }
          ].map((m, i) => (
            <div key={i} className="glass-card" style={{ padding: '1rem', borderLeft: `3px solid ${m.color}` }}>
              <p style={{ fontSize: '0.6rem', color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 800 }}>{m.label}</p>
              <h4 className="text-display" style={{ fontSize: '1.2rem', marginTop: '4px' }}>
                 {m.val}{m.unit}
              </h4>
            </div>
          ))}
       </div>

      {/* Log History */}
      <div className="glass-card" style={{ padding: 0 }}>
         <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
            <h3 className="card-title" style={{ margin: 0 }}>Metric Audit Log</h3>
            <span className="badge">{logs.length} Entries</span>
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
                  {logs.map(log => (
                     <tr key={log.id} style={{ borderTop: '1px solid var(--border)', fontSize: '0.85rem' }}>
                        <td style={{ padding: '1rem', fontWeight: 700 }}>{log.date}</td>
                        <td style={{ padding: '1rem' }}>{log.weight ? `${log.weight}kg` : '—'}</td>
                        <td style={{ padding: '1rem' }}>{log.sleep ?? '—'}h / {log.water ?? '—'}L</td>
                        <td style={{ padding: '1rem' }}>{log.stamina ?? '—'}%</td>
                        <td style={{ padding: '1rem', color: 'var(--accent)', fontWeight: 800 }}>{log.hr ?? '—'}</td>
                     </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)' }}>No logs yet. Click "NEW LOG ENTRY" to start tracking.</td></tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}
