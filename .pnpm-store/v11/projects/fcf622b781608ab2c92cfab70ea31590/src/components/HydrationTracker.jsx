import React, { useEffect, useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { PieChart, Pie } from 'recharts';
import { Droplets, Plus, Minus, Award, Clock, RefreshCw } from 'lucide-react';
import useStore, { apiSync } from '../store/useStore';
import { useToast } from '../hooks/useToast';

const DONUT_COLORS = ['var(--accent)', 'var(--bg-elevated)'];
const DAILY_GOAL = 3000;

// Build 24 hourly buckets from a list of log rows { amount, at }
function buildHourlyBuckets(logs) {
  const now = Date.now();
  const cutoff = now - 24 * 60 * 60 * 1000;
  const buckets = Array.from({ length: 24 }, (_, i) => {
    const label = String(i).padStart(2, '0') + 'h';
    return { hour: label, ml: 0 };
  });
  logs.forEach(log => {
    const ts = new Date(log.at || log.created_at).getTime();
    if (ts < cutoff) return;
    const h = new Date(ts).getHours();
    buckets[h].ml += Number(log.amount || 0);
  });
  // Rotate so current hour is last
  const currentHour = new Date().getHours();
  return [...buckets.slice(currentHour + 1), ...buckets.slice(0, currentHour + 1)];
}

export default function HydrationTracker() {
  const user = useStore(s => s.user);
  const updateUser = useStore(s => s.setUser);
  const toast = useToast();

  // True 24h rolling window — fetched from server
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    const res = await apiSync('/hydration/logs', 'GET');
    if (Array.isArray(res)) setLogs(res);
    setLoadingLogs(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  // Rolling 24h total
  const current = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return logs
      .filter(l => new Date(l.at || l.created_at).getTime() > cutoff)
      .reduce((s, l) => s + Number(l.amount || 0), 0);
  }, [logs]);

  const goal = user?.hydration?.goal || DAILY_GOAL;
  const pct = Math.min(Math.round((current / goal) * 100), 100);

  const hourlyData = useMemo(() => buildHourlyBuckets(logs), [logs]);

  // Add water event
  const addWater = async (amount) => {
    const now = new Date().toISOString();
    try {
      await apiSync('/hydration/log', 'POST', { amount, at: now });
      // Optimistic local append
      setLogs(prev => [{ amount, at: now, id: Date.now() }, ...prev]);
      toast.success(`${amount > 0 ? '+' : ''}${amount} ml logged`);
    } catch {
      toast.error('Hydration sync failed');
    }
  };

  const pieData = [
    { name: 'Completed', value: current },
    { name: 'Remaining', value: Math.max(0, goal - current) },
  ];

  return (
    <div className="fade-in" style={{ padding: '0.5rem 0' }}>
      <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p className="label-caps" style={{ marginBottom: '0.35rem', color: 'var(--accent)' }}>Hydration</p>
          <h2 className="text-display" style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>
            <Droplets size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3rem' }} />
            Hydration Tracker
          </h2>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>True rolling 24-hour window — auto-refreshes from server.</p>
        </div>
        <button onClick={fetchLogs} title="Refresh" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem' }}>
          <RefreshCw size={14} className={loadingLogs ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {/* Animated Wave Visual */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div className="wave-container" style={{
            width: '120px', height: '200px', position: 'relative', marginBottom: '1.5rem',
            borderRadius: '0 0 30px 30px',
            borderTopLeftRadius: '12px', borderTopRightRadius: '12px',
          }}>
            {/* Background fill */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              height: `${pct}%`, transition: 'height 0.8s var(--ease)',
              overflow: 'hidden', zIndex: 0, borderRadius: '0 0 28px 28px',
            }}>
              <div className="wave-body" style={{ background: `linear-gradient(180deg, rgba(14,165,233,0.4) 0%, rgba(14,165,233,0.8) 100%)` }} />
              <div className="wave-body wave-body--2" />
            </div>
            {/* Percentage overlay */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: '1.5rem', fontFamily: 'var(--font-display)',
              zIndex: 2, color: pct > 45 ? '#fff' : 'var(--text-1)',
              textShadow: pct > 45 ? '0 2px 8px rgba(0,0,0,0.4)' : 'none',
            }}>
              {pct}%
            </div>
            {/* Goal markers */}
            {[25, 50, 75].map(mark => (
              <div key={mark} style={{
                position: 'absolute', left: '0', right: '0', bottom: `${mark}%`,
                borderBottom: '1px dashed rgba(14,165,233,0.25)', zIndex: 3,
              }} />
            ))}
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-1)', fontFamily: 'var(--font-display)', lineHeight: 1 }}>
            {current.toLocaleString()}<span style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontWeight: 500 }}> ml</span>
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '4px' }}>
            {Math.max(0, goal - current).toLocaleString()} ml remaining · Goal: {goal.toLocaleString()} ml
          </p>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={10} /> Rolling last 24 hours
          </p>
          {pct >= 100 && (
            <div style={{ marginTop: '0.75rem', padding: '4px 12px', borderRadius: 'var(--radius-pill)', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontSize: '0.72rem', fontWeight: 800 }}>
              ✓ Goal Reached!
            </div>
          )}
        </div>


        {/* Quick Add */}
        <div className="glass-card">
          <span className="card-title">Quick Add</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.85rem' }}>
            {[250, 500, 750, 1000].map(amount => (
              <button key={amount} onClick={() => addWater(amount)} className="btn-ghost" style={{
                padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
              }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-1)' }}>+{amount}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>ml</span>
              </button>
            ))}
          </div>
          <div style={{
            marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
          }}>
            <button onClick={() => addWater(-100)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', padding: '4px', display: 'flex' }}>
              <Minus size={20} />
            </button>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>Adjust (-100ml)</span>
            <button onClick={() => addWater(100)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', padding: '4px', display: 'flex' }}>
              <Plus size={20} />
            </button>
          </div>
        </div>

        {/* Progress Donut */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span className="card-title" style={{ alignSelf: 'flex-start' }}>Progress Summary</span>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} innerRadius={55} outerRadius={72} paddingAngle={4} dataKey="value">
                {pieData.map((_, i) => (
                  <Cell key={`cell-${i}`} fill={DONUT_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <Award size={28} color="var(--warning)" />
            <div>
              <p className="label-caps">Hydration Streak</p>
              <p style={{ fontSize: '1.3rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-1)' }}>
                {user?.hydrationStreak || 0} Days
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Hourly breakdown chart */}
      <div className="glass-card">
        <span className="card-title">Hourly Intake \u2014 Last 24 Hours</span>
        {loadingLogs ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.85rem' }}>Loading logs\u2026</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hourlyData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="hour" stroke="var(--text-3)" tick={{ fontSize: 10 }} interval={2} />
              <YAxis stroke="var(--text-3)" tick={{ fontSize: 10 }} unit="ml" />
              <Tooltip
                contentStyle={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
                formatter={v => [`${v} ml`, 'Intake']}
              />
              <Bar dataKey="ml" fill="var(--accent)" radius={[3, 3, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        )}
        <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', textAlign: 'center', marginTop: '0.25rem' }}>
          Each bar = intake logged in that hour. Only the last 24 hours shown.
        </p>
      </div>
    </div>
  );
}
