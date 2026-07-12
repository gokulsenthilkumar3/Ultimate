import React, { useState, useMemo, useEffect } from 'react';
import useStore, { selectMoodLogs, selectAddMoodLog } from '../store/useStore';
import { Brain, TrendingUp, Zap, Wind, Plus, Activity } from 'lucide-react';

const MOODS = [
  { value: 5, label: 'Excellent', icon: '😄', color: '#22c55e',  bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)' },
  { value: 4, label: 'Good',      icon: '😊', color: '#4ade80',  bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.3)' },
  { value: 3, label: 'Neutral',   icon: '😐', color: '#facc15',  bg: 'rgba(250,204,21,0.1)',  border: 'rgba(250,204,21,0.3)' },
  { value: 2, label: 'Low',       icon: '😔', color: '#fb923c',  bg: 'rgba(251,146,60,0.1)',  border: 'rgba(251,146,60,0.3)' },
  { value: 1, label: 'Rough',     icon: '😞', color: '#ef4444',  bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)' },
];
const ENERGY_LEVELS = [
  { value: 3, label: 'High', color: '#22c55e' },
  { value: 2, label: 'Med',  color: '#facc15' },
  { value: 1, label: 'Low',  color: '#ef4444' },
];
const TAGS = ['focused', 'anxious', 'calm', 'motivated', 'tired', 'grateful', 'irritable', 'creative', 'stressed', 'happy'];
const MOOD_COLORS_BY_VAL = { 1: '#ef4444', 2: '#fb923c', 3: '#facc15', 4: '#4ade80', 5: '#22c55e' };
const BREATH_PHASES = ['Inhale', 'Hold', 'Exhale', 'Hold'];
const BREATH_DURATION = [4, 4, 6, 2]; // seconds

function getMoodStreakCount(logs) {
  if (!logs.length) return 0;
  const logSet = new Set(logs.map(l => l.date));
  let streak = 0;
  const d = new Date();
  while (true) {
    const key = d.toISOString().slice(0, 10);
    if (!logSet.has(key)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function getLast14Days() {
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

// Correlation: mood vs sleep (zip last 7d)
function moodSleepCorrelation(moodLogs, sleepLogs) {
  if (!moodLogs.length || !sleepLogs.length) return null;
  const sleepMap = {};
  sleepLogs.forEach(l => { sleepMap[l.date] = parseFloat(l.duration) || 0; });
  const pairs = moodLogs.slice(0, 7).filter(l => sleepMap[l.date] !== undefined).map(l => ({
    mood: l.mood, sleep: sleepMap[l.date]
  }));
  if (pairs.length < 3) return null;
  const n = pairs.length;
  const moodAvg = pairs.reduce((s, p) => s + p.mood, 0) / n;
  const sleepAvg = pairs.reduce((s, p) => s + p.sleep, 0) / n;
  const numerator = pairs.reduce((s, p) => s + (p.mood - moodAvg) * (p.sleep - sleepAvg), 0);
  const denom = Math.sqrt(pairs.reduce((s, p) => s + Math.pow(p.mood - moodAvg, 2), 0) * pairs.reduce((s, p) => s + Math.pow(p.sleep - sleepAvg, 2), 0));
  return denom === 0 ? null : +(numerator / denom).toFixed(2);
}

// ── Breathing exercise component ───────────────────────────────────────────────
function BreathingExercise() {
  const [active, setActive] = useState(false);
  const [phase, setPhase] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) { setPhase(0); setCount(0); return; }
    const dur = BREATH_DURATION[phase] * 1000;
    const timer = setTimeout(() => {
      const nextPhase = (phase + 1) % BREATH_PHASES.length;
      setPhase(nextPhase);
      setCount(c => c + (nextPhase === 0 ? 1 : 0));
    }, dur);
    return () => clearTimeout(timer);
  }, [active, phase]);

  const isIn = phase === 0;
  const label = BREATH_PHASES[phase];
  const dur = BREATH_DURATION[phase];

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
        <span className="card-title" style={{ margin: 0 }}><Wind size={16} style={{ display: 'inline', marginRight: '6px' }} />Box Breathing</span>
        {count > 0 && <span style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 700 }}>{count} cycles</span>}
      </div>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', textAlign: 'center' }}>4-4-6-2 pattern · reduces cortisol and calms the nervous system</p>

      {/* Animated circle */}
      <div
        className={`breath-circle${active ? (isIn ? ' breath-circle--in' : ' breath-circle--out') : ''}`}
        style={{
          width: 120, height: 120,
          borderColor: active ? 'var(--accent)' : 'var(--border)',
          background: active ? 'radial-gradient(circle, var(--accent-soft) 0%, transparent 70%)' : 'transparent',
        }}
      >
        {active && (
          <div style={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-1)', fontFamily: 'var(--font-display)', lineHeight: 1, marginTop: '2px' }}>{dur}s</div>
          </div>
        )}
      </div>

      <button
        onClick={() => setActive(v => !v)}
        className={active ? 'btn-ghost' : 'btn-primary'}
        style={{ padding: '0.6rem 1.5rem' }}
      >
        {active ? 'Stop Exercise' : 'Start Breathing'}
      </button>
    </div>
  );
}

// ── Main MindWellness Component ─────────────────────────────────────────────────
export default function MindWellness() {
  const moodLogs   = useStore(selectMoodLogs);
  const addMoodLog = useStore(selectAddMoodLog);
  const sleepLogs  = useStore(s => s.sleepLogs) || [];
  const wellnessData = useStore(s => s.wellnessData) || {};

  const today    = new Date().toISOString().slice(0, 10);
  const todayLog = moodLogs.find(l => l.date === today);

  const [mood,   setMood]   = useState(todayLog?.mood || null);
  const [energy, setEnergy] = useState(todayLog?.energy || null);
  const [note,   setNote]   = useState(todayLog?.note || '');
  const [tags,   setTags]   = useState(todayLog?.tags || []);
  const [saved,  setSaved]  = useState(!!todayLog);
  const [activeTab, setActiveTab] = useState('checkin');

  const streak  = useMemo(() => getMoodStreakCount(moodLogs), [moodLogs]);
  const last14  = useMemo(() => getLast14Days(), []);
  const logMap  = useMemo(() => { const m = {}; moodLogs.forEach(l => { m[l.date] = l; }); return m; }, [moodLogs]);
  const avgMood = useMemo(() => {
    if (!moodLogs.length) return null;
    const recent = moodLogs.slice(0, 7);
    return (recent.reduce((s, l) => s + (l.mood || 0), 0) / recent.length).toFixed(1);
  }, [moodLogs]);

  const correlation = useMemo(() => moodSleepCorrelation(moodLogs, sleepLogs), [moodLogs, sleepLogs]);

  const toggleTag = (t) => setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const handleSave = async () => {
    if (!mood) return;
    await addMoodLog({ date: today, mood, energy, note, tags });
    setSaved(true);
  };

  const moodLabel = MOODS.find(m => m.value === mood);

  const TABS = ['checkin', 'trends', 'breathe'];

  return (
    <div className="fade-in" style={{ padding: '0.5rem 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <p className="label-caps" style={{ marginBottom: '0.35rem', color: '#a78bfa' }}>Mind & Wellness</p>
          <h2 className="text-display" style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.3rem' }}>
            <Brain size={24} color="#a78bfa" /> Mental Health
          </h2>
          <p className="text-secondary">Daily mood · energy · mindset check-in</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#a78bfa', fontFamily: 'var(--font-display)' }}>{streak}🔥</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>day streak</div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="stagger-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.85rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Streak', value: `${streak}d`, color: '#f59e0b', icon: Activity },
          { label: '7d Avg Mood', value: avgMood ? `${avgMood}/5` : '—', color: avgMood >= 3.5 ? '#22c55e' : '#fb923c', icon: TrendingUp },
          { label: 'Total Logs', value: moodLogs.length, color: '#a78bfa', icon: Brain },
          { label: 'Today', value: todayLog ? MOODS.find(m => m.value === todayLog.mood)?.icon || '?' : '—', color: 'var(--text-1)', icon: Zap },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="glass-card card-shine-wrap" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span className="label-caps">{label}</span>
              <Icon size={14} color={color} />
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color, fontFamily: 'var(--font-display)', lineHeight: 1, marginTop: '0.3rem' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {TABS.map(tab => (
          <button key={tab} className={`btn-sm${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)} style={{ textTransform: 'capitalize' }}>
            {tab === 'checkin' ? 'Check-In' : tab === 'trends' ? 'Trends' : 'Breathe'}
          </button>
        ))}
      </div>

      {/* CHECK-IN TAB */}
      {activeTab === 'checkin' && (
        <div className="glass-card" style={{ padding: '1.75rem', borderTop: '3px solid #a78bfa' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <span className="card-title" style={{ margin: 0 }}>Today's Check-in</span>
            {saved && (
              <span style={{ fontSize: '0.72rem', padding: '4px 12px', borderRadius: 'var(--radius-pill)', background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', fontWeight: 800 }}>
                ✓ Logged
              </span>
            )}
          </div>

          {/* Mood picker */}
          <div style={{ marginBottom: '1.25rem' }}>
            <p className="label-caps" style={{ marginBottom: '0.75rem' }}>How are you feeling?</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {MOODS.map(m => (
                <button key={m.value} onClick={() => { setMood(m.value); setSaved(false); }}
                  style={{
                    flex: '1 1 80px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                    padding: '0.85rem 0.5rem',
                    borderRadius: '14px',
                    border: `2px solid ${mood === m.value ? m.color : 'var(--border)'}`,
                    background: mood === m.value ? m.bg : 'var(--bg-elevated)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: mood === m.value ? `0 0 12px ${m.bg}` : 'none',
                  }}>
                  <span style={{ fontSize: '1.4rem' }}>{m.icon}</span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: mood === m.value ? m.color : 'var(--text-3)' }}>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Energy */}
          <div style={{ marginBottom: '1.25rem' }}>
            <p className="label-caps" style={{ marginBottom: '0.75rem' }}>Energy Level</p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {ENERGY_LEVELS.map(e => (
                <button key={e.value} onClick={() => { setEnergy(e.value); setSaved(false); }}
                  style={{
                    flex: 1, padding: '0.65rem', borderRadius: '12px',
                    border: `2px solid ${energy === e.value ? e.color : 'var(--border)'}`,
                    background: energy === e.value ? `${e.color}18` : 'transparent',
                    cursor: 'pointer', transition: 'all 0.2s',
                    fontSize: '0.8rem', fontWeight: 700, color: energy === e.value ? e.color : 'var(--text-3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: e.color, display: 'inline-block' }} />
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div style={{ marginBottom: '1.25rem' }}>
            <p className="label-caps" style={{ marginBottom: '0.75rem' }}>Tags <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>(optional)</span></p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {TAGS.map(t => (
                <button key={t} onClick={() => { toggleTag(t); setSaved(false); }}
                  style={{
                    padding: '4px 12px', borderRadius: 'var(--radius-pill)',
                    border: `1px solid ${tags.includes(t) ? '#a78bfa' : 'var(--border)'}`,
                    background: tags.includes(t) ? 'rgba(167,139,250,0.12)' : 'transparent',
                    color: tags.includes(t) ? '#a78bfa' : 'var(--text-3)',
                    cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600,
                    transition: 'all 0.15s', textTransform: 'capitalize',
                  }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div style={{ marginBottom: '1.25rem' }}>
            <p className="label-caps" style={{ marginBottom: '6px' }}>Note <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>(optional)</span></p>
            <textarea
              rows={2}
              placeholder="What's on your mind today?"
              value={note}
              onChange={e => { setNote(e.target.value); setSaved(false); }}
              className="form-input"
              style={{ width: '100%', resize: 'vertical', minHeight: '72px' }}
            />
          </div>

          <button onClick={handleSave} disabled={!mood || saved}
            className="btn-primary" style={{ width: '100%', justifyContent: 'center', background: !mood || saved ? undefined : 'linear-gradient(135deg, #7c3aed, #a78bfa)' }}>
            <Plus size={16} /> {saved ? '✓ Logged for Today' : 'Log Mood'}
          </button>
        </div>
      )}

      {/* TRENDS TAB */}
      {activeTab === 'trends' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* 14-day trend */}
          <div className="glass-card">
            <span className="card-title"><TrendingUp size={15} style={{ display: 'inline', marginRight: '6px' }} />14-Day Mood Trend</span>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', marginTop: '1rem', height: '80px' }}>
              {last14.map(d => {
                const log = logMap[d];
                const h = log ? Math.round((log.mood / 5) * 68) : 0;
                const color = log ? MOOD_COLORS_BY_VAL[log.mood] : 'var(--border)';
                const isToday = d === today;
                const moodObj = MOODS.find(m => m.value === log?.mood);
                return (
                  <div key={d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: '3px', height: '100%' }}
                    title={`${d}: ${log ? moodObj?.label + ' ' + moodObj?.icon : 'No log'}`}>
                    <div style={{ width: '100%', height: `${h || 3}px`, background: color, borderRadius: '3px 3px 0 0', opacity: log ? 1 : 0.3, transition: 'height 0.4s ease', boxShadow: isToday ? `0 0 8px ${color}` : 'none', border: isToday ? `1px solid ${color}` : 'none' }} />
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-3)', marginTop: '5px' }}>
              <span>{last14[0].slice(5)}</span><span style={{ color: 'var(--accent)', fontWeight: 700 }}>Today</span>
            </div>

            {/* Mood legend */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
              {MOODS.map(m => (
                <span key={m.value} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', color: m.color }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.color, display: 'inline-block' }} />
                  {m.icon} {m.label}
                </span>
              ))}
            </div>
          </div>

          {/* Mood-sleep correlation */}
          {correlation !== null && (
            <div className="glass-card" style={{ borderLeft: `4px solid ${correlation > 0 ? '#22c55e' : '#ef4444'}` }}>
              <span className="card-title">Mood × Sleep Correlation</span>
              <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: correlation > 0 ? '#22c55e' : correlation < 0 ? '#ef4444' : 'var(--text-3)' }}>
                    r = {correlation}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '4px' }}>
                    {Math.abs(correlation) > 0.7 ? 'Strong'
                      : Math.abs(correlation) > 0.4 ? 'Moderate'
                      : 'Weak'} {correlation > 0 ? 'positive' : 'negative'} correlation
                  </div>
                </div>
                <div style={{ flex: 1, fontSize: '0.78rem', color: 'var(--text-2)', lineHeight: 1.6 }}>
                  {correlation > 0.5
                    ? '✓ Better sleep consistently improves your mood. Keep prioritizing sleep!'
                    : correlation > 0
                    ? 'Some link between sleep and mood. More logs will improve this insight.'
                    : '⚠️ Your mood doesn\'t clearly improve with more sleep — stress or other factors may be at play.'}
                </div>
              </div>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '0.5rem' }}>Based on last {Math.min(7, moodLogs.length)} days with both mood and sleep logs.</p>
            </div>
          )}

          {/* Recent logs table */}
          {moodLogs.length > 0 && (
            <div className="glass-card" style={{ padding: 0 }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                <span className="card-title" style={{ margin: 0 }}>Recent Mood Log</span>
              </div>
              <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                {moodLogs.slice(0, 30).map((log, i) => {
                  const m = MOODS.find(x => x.value === log.mood);
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)' }} className="hover-bg-subtle">
                      <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{m?.icon || '?'}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: m?.color || 'var(--text-2)' }}>{m?.label}</span>
                          {log.energy && (
                            <span style={{ fontSize: '0.68rem', color: ENERGY_LEVELS.find(e => e.value === log.energy)?.color || 'var(--text-3)', fontWeight: 700 }}>
                              ⚡ {ENERGY_LEVELS.find(e => e.value === log.energy)?.label}
                            </span>
                          )}
                          {log.tags?.length > 0 && log.tags.slice(0, 3).map(t => (
                            <span key={t} style={{ fontSize: '0.62rem', padding: '2px 7px', borderRadius: '99px', background: 'rgba(167,139,250,0.1)', color: '#a78bfa', fontWeight: 600 }}>{t}</span>
                          ))}
                        </div>
                        {log.note && <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>{log.note}</p>}
                      </div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontFamily: 'monospace', flexShrink: 0 }}>{log.date}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* BREATHE TAB */}
      {activeTab === 'breathe' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <BreathingExercise />

          <div className="glass-card">
            <span className="card-title">Mindfulness Tips</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.75rem' }}>
              {[
                { tip: 'Spend 5 min in the morning before checking your phone — just breathe and set an intention.', priority: 'HIGH' },
                { tip: 'A 10-min midday walk without headphones can significantly reduce cortisol levels.', priority: 'MED' },
                { tip: 'Journal for 3 min each night: 1 thing that went well, 1 thing to improve.', priority: 'MED' },
                { tip: 'Avoid screens 30–60 min before sleep to improve sleep quality and morning mood.', priority: 'HIGH' },
              ].map(({ tip, priority }) => (
                <div key={tip} style={{ display: 'flex', gap: '0.75rem', padding: '0.85rem 1rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', borderLeft: `3px solid ${priority === 'HIGH' ? '#ef4444' : '#f59e0b'}` }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: 1.6 }}>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
