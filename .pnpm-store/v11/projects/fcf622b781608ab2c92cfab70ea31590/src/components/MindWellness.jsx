import safeLocalStorage from '../utils/safeLocalStorage';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import useStore, { selectMoodLogs, selectAddMoodLog } from '../store/useStore';
import {
  Brain, TrendingUp, Zap, Wind, Plus, Activity,
  BookOpen, BarChart2, Heart, ChevronDown, ChevronUp, Trash2,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useToast } from '../hooks/useToast';

const MOODS = [
  { value: 5, label: 'Excellent', icon: '😄', color: '#22c55e',  bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)' },
  { value: 4, label: 'Good',      icon: '😊', color: '#4ade80',  bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.3)' },
  { value: 3, label: 'Neutral',   icon: '😐', color: '#facc15',  bg: 'rgba(250,204,21,0.1)',  border: 'rgba(250,204,21,0.3)' },
  { value: 2, label: 'Low',       icon: '😔', color: '#fb923c',  bg: 'rgba(251,146,60,0.1)',  border: 'rgba(251,146,60,0.3)' },
  { value: 1, label: 'Rough',     icon: '😞', color: '#ef4444',  bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)' },
];
const ENERGY_LEVELS = [
  { value: 3, label: 'High',    icon: '⚡', color: '#22c55e' },
  { value: 2, label: 'Medium',  icon: '🔆', color: '#facc15' },
  { value: 1, label: 'Low',     icon: '🔋', color: '#ef4444' },
];
const TAGS = [
  'focused','anxious','calm','motivated','tired','grateful',
  'irritable','creative','stressed','happy','overwhelmed','proud',
];
const MOOD_COLORS = { 1: '#ef4444', 2: '#fb923c', 3: '#facc15', 4: '#4ade80', 5: '#22c55e' };

const BREATH_PHASES    = ['Inhale', 'Hold', 'Exhale', 'Hold'];
const BREATH_DURATIONS = [4, 4, 6, 2];

// ── helpers ────────────────────────────────────────────────────────────────────
function getMoodStreak(logs) {
  const set = new Set(logs.map(l => l.date));
  let streak = 0;
  const d = new Date();
  while (true) {
    const key = d.toISOString().slice(0, 10);
    if (!set.has(key)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function getLast14Days() {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().slice(0, 10);
  });
}

function moodSleepCorrelation(moodLogs, sleepLogs) {
  if (!moodLogs.length || !sleepLogs.length) return null;
  const sleepMap = {};
  sleepLogs.forEach(l => { sleepMap[l.date] = parseFloat(l.duration) || 0; });
  const pairs = moodLogs.slice(0, 14)
    .filter(l => sleepMap[l.date] !== undefined)
    .map(l => ({ mood: l.mood, sleep: sleepMap[l.date] }));
  if (pairs.length < 3) return null;
  const n    = pairs.length;
  const mAvg = pairs.reduce((s, p) => s + p.mood, 0) / n;
  const sAvg = pairs.reduce((s, p) => s + p.sleep, 0) / n;
  const num  = pairs.reduce((s, p) => s + (p.mood - mAvg) * (p.sleep - sAvg), 0);
  const den  = Math.sqrt(
    pairs.reduce((s, p) => s + (p.mood - mAvg) ** 2, 0) *
    pairs.reduce((s, p) => s + (p.sleep - sAvg) ** 2, 0)
  );
  return den === 0 ? null : +(num / den).toFixed(2);
}

// ── Box Breathing component ──────────────────────────────────────────────────
function BreathingExercise() {
  const [active, setActive] = useState(false);
  const [phase,  setPhase]  = useState(0);
  const [cycles, setCycles] = useState(0);
  const [timer,  setTimer]  = useState(BREATH_DURATIONS[0]);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!active) { setPhase(0); setCycles(0); setTimer(BREATH_DURATIONS[0]); clearInterval(intervalRef.current); return; }

    let remaining = BREATH_DURATIONS[phase];
    setTimer(remaining);
    intervalRef.current = setInterval(() => {
      remaining -= 1;
      setTimer(remaining);
      if (remaining <= 0) {
        clearInterval(intervalRef.current);
        const next = (phase + 1) % 4;
        setPhase(next);
        if (next === 0) setCycles(c => c + 1);
      }
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [active, phase]);

  const phaseColors = ['#3b82f6', '#a78bfa', '#22c55e', '#a78bfa'];
  const isExpand    = phase === 0;

  return (
    <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
        <span className="card-title" style={{ margin: 0 }}>
          <Wind size={16} style={{ display: 'inline', marginRight: '6px' }} />Box Breathing
        </span>
        {cycles > 0 && (
          <span style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 800, background: 'rgba(var(--accent-rgb),0.1)', padding: '2px 10px', borderRadius: '20px' }}>
            {cycles} cycle{cycles > 1 ? 's' : ''}
          </span>
        )}
      </div>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', textAlign: 'center' }}>
        4-4-6-2 pattern · reduces cortisol and activates parasympathetic nervous system
      </p>

      {/* Animated circle */}
      <div style={{
        width: 140, height: 140, borderRadius: '50%', position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `3px solid ${active ? phaseColors[phase] : 'var(--border)'}`,
        background: active ? `radial-gradient(circle, ${phaseColors[phase]}22 0%, transparent 70%)` : 'transparent',
        transition: 'all 0.5s ease',
        transform: active ? (isExpand ? 'scale(1.12)' : 'scale(0.92)') : 'scale(1)',
        boxShadow: active ? `0 0 30px ${phaseColors[phase]}44` : 'none',
      }}>
        {active ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 900, color: phaseColors[phase], textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              {BREATH_PHASES[phase]}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-1)', fontFamily: 'var(--font-display)', lineHeight: 1 }}>
              {timer}
            </div>
            <div style={{ fontSize: '0.58rem', color: 'var(--text-3)', fontWeight: 700 }}>seconds</div>
          </div>
        ) : (
          <Wind size={32} color="var(--text-3)" opacity={0.4} />
        )}
      </div>

      {/* Phase indicator */}
      {active && (
        <div style={{ display: 'flex', gap: '8px' }}>
          {BREATH_PHASES.map((p, i) => (
            <div key={p} style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: i === phase ? phaseColors[i] : 'rgba(255,255,255,0.1)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>
      )}

      <button onClick={() => setActive(v => !v)} className={active ? 'btn-ghost' : 'btn-primary'} style={{ padding: '0.6rem 2rem', width: '100%', maxWidth: '200px' }}>
        {active ? 'Stop' : 'Start Breathing'}
      </button>

      <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', textAlign: 'center' }}>
        Aim for 4+ cycles to feel the calming effect. Best before sleep or stressful events.
      </p>
    </div>
  );
}

// ── Journal component ─────────────────────────────────────────────────────────
const JOURNAL_KEY = 'gt_journal_entries';
function loadJournal() {
  try { return JSON.parse(safeLocalStorage.getItem(JOURNAL_KEY) || '[]'); } catch { return []; }
}

function Journal() {
  const [entries,   setEntries]   = useState(() => loadJournal());
  const [text,      setText]      = useState('');
  const [expanded,  setExpanded]  = useState(null);
  const [prompt,    setPrompt]    = useState('');
  const toast = useToast();

  const PROMPTS = [
    'What are three things you are grateful for today?',
    'What challenged you today and what did you learn?',
    'Describe one moment today when you felt fully present.',
    'What would make tomorrow 1% better than today?',
    'Who positively impacted your life this week and why?',
    'What emotion dominated today? Was it useful or not?',
    'Write down one fear you want to release.',
  ];

  const randomPrompt = () => setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
  useEffect(() => { randomPrompt(); }, []);

  const save = () => {
    if (!text.trim()) return toast.error('Write something first');
    const entry = {
      id:   Date.now(),
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      text: text.trim(),
      prompt: prompt || null,
      wordCount: text.trim().split(/\s+/).filter(Boolean).length,
    };
    const updated = [entry, ...entries].slice(0, 50); // keep last 50
    setEntries(updated);
    safeLocalStorage.setItem(JOURNAL_KEY, JSON.stringify(updated));
    setText('');
    randomPrompt();
    toast.success('Journal entry saved');
  };

  const remove = (id) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    safeLocalStorage.setItem(JOURNAL_KEY, JSON.stringify(updated));
  };

  const totalWords = entries.reduce((s, e) => s + (e.wordCount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem' }}>
        {[
          { label: 'Entries',    value: entries.length,                    color: 'var(--accent)'  },
          { label: 'Total Words', value: totalWords.toLocaleString(),      color: '#a78bfa'         },
          { label: 'This Month', value: entries.filter(e => e.date.slice(0,7) === new Date().toISOString().slice(0,7)).length, color: '#22c55e' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-card" style={{ padding: '0.85rem', textAlign: 'center' }}>
            <p className="label-caps" style={{ fontSize: '0.6rem' }}>{label}</p>
            <p style={{ fontSize: '1.4rem', fontWeight: 900, color, fontFamily: 'var(--font-display)' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* New entry */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="card-title" style={{ margin: 0 }}>
            <BookOpen size={15} style={{ display: 'inline', marginRight: '6px' }} />New Entry
          </h3>
          <button
            onClick={randomPrompt}
            className="btn-sm"
            style={{ fontSize: '0.65rem' }}
          >✨ New prompt</button>
        </div>

        {prompt && (
          <div style={{
            padding: '0.75rem 1rem', background: 'rgba(167,139,250,0.08)', borderRadius: '10px',
            border: '1px solid rgba(167,139,250,0.2)', marginBottom: '0.85rem',
            fontSize: '0.82rem', color: '#a78bfa', fontStyle: 'italic', lineHeight: 1.6,
          }}>
            "{prompt}"
          </div>
        )}

        <textarea
          className="form-input"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Start writing here..."
          rows={5}
          style={{ width: '100%', resize: 'vertical', lineHeight: 1.7, fontSize: '0.9rem' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>
            {text.trim().split(/\s+/).filter(Boolean).length} words
          </span>
          <button className="btn-primary" onClick={save} disabled={!text.trim()} style={{ padding: '0.5rem 1.5rem' }}>
            Save Entry
          </button>
        </div>
      </div>

      {/* Past entries */}
      {entries.length > 0 && (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>Past Entries</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {entries.map(e => (
              <div key={e.id} style={{ background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.85rem 1rem', cursor: 'pointer',
                  }}
                  onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                >
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <BookOpen size={14} color="#a78bfa" />
                    <div>
                      <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-1)' }}>{e.date}</p>
                      <p style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>{e.time} · {e.wordCount} words</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      className="btn-icon"
                      style={{ color: 'var(--danger)', padding: '4px' }}
                      onClick={ev => { ev.stopPropagation(); remove(e.id); }}
                    >
                      <Trash2 size={13} />
                    </button>
                    {expanded === e.id ? <ChevronUp size={14} color="var(--text-3)" /> : <ChevronDown size={14} color="var(--text-3)" />}
                  </div>
                </div>
                {expanded === e.id && (
                  <div style={{ padding: '0 1rem 1rem' }}>
                    {e.prompt && (
                      <p style={{ fontSize: '0.72rem', color: '#a78bfa', fontStyle: 'italic', marginBottom: '0.5rem' }}>
                        "{e.prompt}"
                      </p>
                    )}
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                      {e.text}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Trends component ──────────────────────────────────────────────────────────
function MoodTrends({ moodLogs, sleepLogs }) {
  const last14  = useMemo(() => getLast14Days(), []);
  const logMap  = useMemo(() => {
    const m = {};
    moodLogs.forEach(l => { m[l.date] = l; });
    return m;
  }, [moodLogs]);

  const chartData = last14.map(date => ({
    date: date.slice(5),
    mood:   logMap[date]?.mood   ?? null,
    energy: logMap[date]?.energy ?? null,
  }));

  const correlation = useMemo(() => moodSleepCorrelation(moodLogs, sleepLogs), [moodLogs, sleepLogs]);

  const tagFreq = useMemo(() => {
    const freq = {};
    moodLogs.slice(0, 30).forEach(l => {
      (l.tags || []).forEach(t => { freq[t] = (freq[t] || 0) + 1; });
    });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [moodLogs]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.6rem 0.9rem', fontSize: '0.78rem', backdropFilter: 'blur(12px)' }}>
        <p style={{ color: 'var(--text-3)', marginBottom: '4px' }}>{label}</p>
        {payload.map(p => p.value !== null && (
          <p key={p.dataKey} style={{ color: p.color, fontWeight: 700 }}>
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 14-day mood trend */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h3 className="card-title" style={{ marginBottom: '1rem' }}>14-Day Mood Trend</h3>
        {moodLogs.length < 2 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)' }}>
            <p style={{ fontWeight: 700 }}>Not enough data yet</p>
            <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Log your mood for a few days to see trends.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#a78bfa" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#facc15" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#facc15" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--text-3)" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 5]} stroke="var(--text-3)" tick={{ fontSize: 10 }} tickCount={6} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="mood"   stroke="#a78bfa" fill="url(#moodGrad)"   strokeWidth={2.5} dot={{ r: 3, fill: '#a78bfa'  }} name="Mood"   connectNulls={false} />
              <Area type="monotone" dataKey="energy" stroke="#facc15" fill="url(#energyGrad)" strokeWidth={2}   dot={{ r: 2, fill: '#facc15'  }} name="Energy" connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Correlation + tag frequency */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        {/* Sleep-mood correlation */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h4 style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-2)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Heart size={14} color="#f43f5e" /> Sleep × Mood Correlation
          </h4>
          {correlation !== null ? (
            <>
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <p style={{ fontSize: '3rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: correlation > 0.3 ? '#22c55e' : correlation < -0.3 ? '#f43f5e' : '#f59e0b', lineHeight: 1 }}>
                  {correlation > 0 ? '+' : ''}{correlation}
                </p>
                <p className="label-caps" style={{ fontSize: '0.65rem', marginTop: '6px' }}>Pearson r</p>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', lineHeight: 1.6, textAlign: 'center' }}>
                {correlation > 0.5 ? '🌟 Strong positive link — better sleep = better mood for you.'
                 : correlation > 0.2 ? '📊 Moderate positive link — sleep quality influences your mood.'
                 : correlation < -0.3 ? '⚠️ Negative correlation — investigate lifestyle factors.'
                 : '📉 Weak correlation — other factors may dominate your mood.'}
              </p>
            </>
          ) : (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', padding: '1.5rem 0', textAlign: 'center' }}>
              Log both mood and sleep entries to unlock correlation analysis.
            </p>
          )}
        </div>

        {/* Top tags */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h4 style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-2)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BarChart2 size={14} color="#a78bfa" /> Emotional Fingerprint (30d)
          </h4>
          {tagFreq.length === 0 ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', padding: '1.5rem 0', textAlign: 'center' }}>
              Add tags during check-in to track your emotional patterns.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {tagFreq.map(([tag, count]) => (
                <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-2)', width: '80px', textTransform: 'capitalize' }}>{tag}</span>
                  <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${(count / tagFreq[0][1]) * 100}%`, height: '100%', borderRadius: '3px',
                      background: 'linear-gradient(90deg, #a78bfa, #a78bfa88)',
                      transition: 'width 0.6s var(--ease)',
                    }} />
                  </div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 700, minWidth: '24px', textAlign: 'right' }}>{count}×</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mood calendar (14d) */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h4 style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-2)', marginBottom: '1rem' }}>
          Mood Calendar — Last 14 Days
        </h4>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {last14.map(date => {
            const entry = logMap[date];
            const color = entry ? MOOD_COLORS[entry.mood] : 'rgba(255,255,255,0.04)';
            return (
              <div key={date} title={entry ? `${date}: ${MOODS.find(m => m.value === entry.mood)?.label}` : date}
                style={{
                  flex: '1 1 40px', height: '44px', borderRadius: '8px',
                  background: color,
                  border: '1px solid rgba(255,255,255,0.07)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px',
                  cursor: entry ? 'default' : 'default',
                }}>
                {entry && <span style={{ fontSize: '1rem' }}>{MOODS.find(m => m.value === entry.mood)?.icon}</span>}
                <span style={{ fontSize: '0.55rem', color: entry ? 'rgba(255,255,255,0.6)' : 'var(--text-3)', fontWeight: 700 }}>
                  {new Date(date).toLocaleDateString('en-US', { weekday: 'short' }).slice(0,1)}
                  {date.slice(8)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function MindWellness() {
  const moodLogs    = useStore(selectMoodLogs);
  const addMoodLog  = useStore(selectAddMoodLog);
  const sleepLogs   = useStore(s => s.sleepLogs) || [];
  const toast       = useToast();

  const today    = new Date().toISOString().slice(0, 10);
  const todayLog = moodLogs.find(l => l.date === today);

  const [mood,      setMood]      = useState(todayLog?.mood    || null);
  const [energy,    setEnergy]    = useState(todayLog?.energy  || null);
  const [note,      setNote]      = useState(todayLog?.note    || '');
  const [tags,      setTags]      = useState(todayLog?.tags    || []);
  const [saved,     setSaved]     = useState(!!todayLog);
  const [activeTab, setActiveTab] = useState('checkin');

  const streak  = useMemo(() => getMoodStreak(moodLogs), [moodLogs]);
  const avgMood = useMemo(() => {
    if (!moodLogs.length) return null;
    const r = moodLogs.slice(0, 7);
    return (r.reduce((s, l) => s + (l.mood || 0), 0) / r.length).toFixed(1);
  }, [moodLogs]);
  const moodLabel = MOODS.find(m => m.value === mood);

  const toggleTag = (t) => {
    setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
    setSaved(false);
  };

  const handleSave = async () => {
    if (!mood) return toast.error('Select a mood first');
    await addMoodLog({ date: today, mood, energy, note, tags });
    setSaved(true);
    toast.success('Check-in saved ✓');
  };

  const TABS = [
    { id: 'checkin', label: 'Check-In', icon: Heart     },
    { id: 'trends',  label: 'Trends',   icon: TrendingUp },
    { id: 'journal', label: 'Journal',  icon: BookOpen  },
    { id: 'breathe', label: 'Breathe',  icon: Wind      },
  ];

  return (
    <div className="fade-in" style={{ padding: '0.5rem 0' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <p className="label-caps" style={{ marginBottom: '0.35rem', color: '#a78bfa' }}>Mind & Wellness</p>
          <h2 className="text-display" style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.3rem' }}>
            <Brain size={24} color="#a78bfa" /> Mental Health
          </h2>
          <p className="text-secondary">Daily mood · energy · breathwork · journaling</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#a78bfa', fontFamily: 'var(--font-display)' }}>
            {streak > 0 ? `${streak}🔥` : '—'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>day streak</div>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div className="stagger-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.85rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Streak',     value: `${streak}d`,                                                color: '#f59e0b', icon: Activity  },
          { label: '7d Avg Mood',value: avgMood ? `${avgMood}/5` : '—',                              color: Number(avgMood) >= 3.5 ? '#22c55e' : '#fb923c', icon: TrendingUp },
          { label: 'Total Logs', value: moodLogs.length,                                             color: '#a78bfa', icon: Brain     },
          { label: 'Today',      value: todayLog ? MOODS.find(m => m.value === todayLog.mood)?.icon || '?' : '—', color: 'var(--text-1)', icon: Zap },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="glass-card card-shine-wrap" style={{ padding: '0.85rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span className="label-caps" style={{ fontSize: '0.65rem' }}>{label}</span>
              <Icon size={13} color={color} />
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color, fontFamily: 'var(--font-display)', lineHeight: 1, marginTop: '0.3rem' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`btn-sm${activeTab === id ? ' active' : ''}`}
            onClick={() => setActiveTab(id)}
            style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* ── CHECK-IN TAB ── */}
      {activeTab === 'checkin' && (
        <div className="glass-card" style={{ padding: '1.75rem', borderTop: '3px solid #a78bfa' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <span className="card-title" style={{ margin: 0 }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
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
                    flex: '1 1 70px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                    padding: '0.85rem 0.5rem', borderRadius: '14px',
                    border: `2px solid ${mood === m.value ? m.color : 'var(--border)'}`,
                    background: mood === m.value ? m.bg : 'var(--bg-elevated)',
                    cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: mood === m.value ? `0 0 14px ${m.bg}` : 'none',
                    transform: mood === m.value ? 'translateY(-2px)' : 'none',
                  }}>
                  <span style={{ fontSize: '1.5rem' }}>{m.icon}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: mood === m.value ? m.color : 'var(--text-3)' }}>{m.label}</span>
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
                  <span>{e.icon}</span> {e.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div style={{ marginBottom: '1.25rem' }}>
            <p className="label-caps" style={{ marginBottom: '0.75rem' }}>Emotional Tags <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>(optional)</span></p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {TAGS.map(t => (
                <button key={t} onClick={() => toggleTag(t)}
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
              className="form-input"
              rows={2}
              value={note}
              onChange={e => { setNote(e.target.value); setSaved(false); }}
              placeholder="What's on your mind today?"
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          <button
            className="btn-primary"
            style={{ width: '100%', padding: '0.85rem', opacity: saved ? 0.7 : 1 }}
            onClick={handleSave}
            disabled={!mood}
          >
            {saved ? '✓ Check-in Saved — Update' : `Log ${moodLabel ? moodLabel.icon + ' ' + moodLabel.label : 'Mood'}`}
          </button>
        </div>
      )}

      {/* ── TRENDS TAB ── */}
      {activeTab === 'trends' && (
        <MoodTrends moodLogs={moodLogs} sleepLogs={sleepLogs} />
      )}

      {/* ── JOURNAL TAB ── */}
      {activeTab === 'journal' && <Journal />}

      {/* ── BREATHE TAB ── */}
      {activeTab === 'breathe' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          <BreathingExercise />
          <div className="glass-card" style={{ padding: '1.75rem' }}>
            <h3 className="card-title" style={{ marginBottom: '1.25rem' }}>
              <Brain size={16} style={{ display: 'inline', marginRight: '6px' }} />Mindfulness Tips
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { title: 'Morning Sunlight', tip: 'Get 10 min of bright light within 30 min of waking to anchor your cortisol rhythm and improve alertness.' },
                { title: 'Cold Exposure',    tip: 'A 30-60 second cold shower triggers a dopamine spike that lasts 2–3 hours, sharpening focus and mood.' },
                { title: 'Non-Sleep Rest',   tip: '10–20 min NSDR (yoga nidra or guided relaxation) accelerates neuroplasticity after learning.' },
                { title: 'Gratitude Stack',  tip: 'Writing 3 specific gratitudes daily reshapes the anterior cingulate cortex over 8 weeks.' },
              ].map(({ title, tip }) => (
                <div key={title} style={{ padding: '1rem', background: 'rgba(167,139,250,0.06)', borderRadius: '12px', border: '1px solid rgba(167,139,250,0.12)' }}>
                  <p style={{ fontWeight: 800, fontSize: '0.85rem', color: '#a78bfa', marginBottom: '4px' }}>{title}</p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-2)', lineHeight: 1.6 }}>{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
