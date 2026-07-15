import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, Sun, Moon, Droplets, Target, CheckSquare, Flame, Zap,
  TrendingUp, Award, Clock, RefreshCw, ChevronRight,
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import useStore from '../store/useStore';
import AnimatedNumber from './ui/AnimatedNumber';

const TOOLTIP_STYLE = {
  background: 'var(--bg-glass)', border: '1px solid var(--border)',
  borderRadius: '8px', color: 'var(--text-1)', backdropFilter: 'blur(12px)', fontSize: '0.75rem',
};

const QUOTES = [
  { text: "Small steps every day lead to massive results over time.", author: "James Clear" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "What gets measured gets managed.", author: "Peter Drucker" },
  { text: "Your only limit is you.", author: "Unknown" },
  { text: "Progress, not perfection.", author: "Unknown" },
  { text: "Every expert was once a beginner.", author: "Helen Hayes" },
];

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 5)  return { label: 'Night',      emoji: '🌙', color: '#818cf8' };
  if (h < 12) return { label: 'Morning',    emoji: '☀️',  color: '#f59e0b' };
  if (h < 17) return { label: 'Afternoon',  emoji: '🌤️', color: '#0ea5e9' };
  if (h < 20) return { label: 'Evening',    emoji: '🌇', color: '#f97316' };
  return              { label: 'Night',      emoji: '🌙', color: '#818cf8' };
}

function HealthScoreRing({ score }) {
  const size = 120;
  const r    = 50;
  const circ = 2 * Math.PI * r;
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#f43f5e';
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={10}
                strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ - (score / 100) * circ}
                style={{ transition: 'stroke-dashoffset 1.2s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '1.75rem', fontWeight: 900, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: '0.55rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Health</span>
      </div>
    </div>
  );
}

// ── Day-at-a-Glance hero ───────────────────────────────────────────────────
function DayAtAGlance({ tasks, habits, goals, sleepLogs, habitLogsByHabit, setActiveTab }) {
  const today   = new Date().toISOString().slice(0, 10);
  const tod     = getTimeOfDay();

  const todayTasks  = tasks.filter(t => !t.completed && (t.due_date || '').startsWith(today));
  const doneTasks   = tasks.filter(t => t.completed && (t.completed_at || '').startsWith(today));
  const activeGoals = goals.filter(g => g.status === 'active').length;

  const habitsToday = habits.filter(h => {
    const logs = habitLogsByHabit[h.id] || [];
    return logs.some(l => l.date === today && l.completed !== false);
  });
  const habitPct = habits.length > 0 ? Math.round((habitsToday.length / habits.length) * 100) : 0;

  const lastSleep = sleepLogs?.length > 0 ? sleepLogs[sleepLogs.length - 1] : null;

  const urgentTasks = todayTasks.filter(t => t.priority === 'high' || t.priority === 'urgent');

  return (
    <div style={{
      borderRadius: '20px', padding: '2rem', marginBottom: '1.5rem',
      background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(16,185,129,0.08))',
      border: '1px solid rgba(99,102,241,0.2)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Ambient glow */}
      <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: `${tod.color}20`, filter: 'blur(60px)', pointerEvents: 'none' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', position: 'relative', zIndex: 1 }}>
        {/* Greeting */}
        <div>
          <p style={{ fontSize: '0.7rem', color: tod.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
            {tod.emoji} Good {tod.label}
          </p>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-1)', marginBottom: '0.5rem', lineHeight: 1.2 }}>
            Day at a Glance
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', lineHeight: 1.5 }}>
            {new Date().toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Key metrics */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {[
            { icon: <CheckSquare size={16} color="#10b981" />, val: `${doneTasks.length}/${todayTasks.length + doneTasks.length}`, label: 'Tasks', color: '#10b981', action: () => setActiveTab('tasks') },
            { icon: <Flame size={16} color="#f97316" />,       val: `${habitPct}%`,         label: 'Habits',  color: '#f97316', action: () => setActiveTab('habits') },
            { icon: <Target size={16} color="#0ea5e9" />,      val: activeGoals,             label: 'Goals',   color: '#0ea5e9', action: () => setActiveTab('goals') },
            lastSleep ? { icon: <Moon size={16} color="#818cf8" />, val: `${lastSleep.duration}h`, label: 'Sleep', color: '#818cf8', action: null } : null,
          ].filter(Boolean).map(m => (
            <div key={m.label} onClick={m.action} style={{ padding: '0.65rem 0.9rem', background: 'rgba(255,255,255,0.06)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', cursor: m.action ? 'pointer' : 'default', textAlign: 'center', minWidth: '80px', transition: 'background 0.15s' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>{m.icon}</div>
              <p style={{ fontSize: '1.1rem', fontWeight: 900, color: m.color, lineHeight: 1 }}>{m.val}</p>
              <p style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginTop: '2px', fontWeight: 700 }}>{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Urgent tasks strip */}
      {urgentTasks.length > 0 && (
        <div style={{ marginTop: '1.25rem', padding: '0.65rem 1rem', background: 'rgba(239,68,68,0.1)', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 1 }}>
          <Zap size={14} color="#ef4444" />
          <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f87171' }}>
            {urgentTasks.length} high-priority task{urgentTasks.length > 1 ? 's' : ''} due today:
            <span style={{ color: 'var(--text-2)', fontWeight: 600, marginLeft: '6px' }}>
              {urgentTasks.slice(0, 2).map(t => t.title).join(', ')}{urgentTasks.length > 2 ? `…+${urgentTasks.length - 2}` : ''}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

export default function Overview({ setActiveTab }) {
  const state            = useStore();
  const metric_logs      = state.metric_logs      || [];
  const tasks            = state.tasks            || [];
  const habits           = state.habits           || [];
  const goals            = state.goals            || [];
  const sleep_logs       = state.sleep_logs       || [];
  const habitLogsByHabit = state.habitLogsByHabit || {};
  const user             = state.user             || {};

  const addMetricLog = useStore(s => s.addMetricLog);

  const [quote,       setQuote]       = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const [hydration,   setHydration]   = useState(0);

  // Rotate quote every 30s
  useEffect(() => {
    const t = setInterval(() => setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]), 30000);
    return () => clearInterval(t);
  }, []);

  // Fetch weather with React Query caching
  const { data: weather, isLoading: weatherLoading } = useQuery({
    queryKey: ['weather'],
    queryFn: () => new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(pos => {
        const { latitude, longitude } = pos.coords;
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weathercode,relativehumidity_2m&timezone=auto`)
          .then(r => r.json())
          .then(data => resolve(data.current))
          .catch(() => resolve(null));
      }, () => resolve(null));
    }),
    staleTime: 1000 * 60 * 15, // Cache for 15 minutes
    retry: false
  });

  // Compute health score from various factors
  const healthScore = useMemo(() => {
    let score = 50;
    const today = new Date().toISOString().slice(0, 10);

    // Habits today
    const habitsToday = habits.filter(h => {
      const logs = habitLogsByHabit[h.id] || [];
      return logs.some(l => l.date === today && l.completed !== false);
    });
    if (habits.length > 0) score += (habitsToday.length / habits.length) * 20;

    // Sleep (last night)
    const lastSleep = sleep_logs[sleep_logs.length - 1];
    if (lastSleep) {
      const dur = Number(lastSleep.duration) || 0;
      score += dur >= 7 ? 15 : dur >= 6 ? 8 : 0;
    }

    // Recent exercise
    const last3Days = Date.now() - 3 * 86400000;
    const hasExercise = metric_logs.some(l => l.type === 'strength' || l.type === 'workout' || l.exercise);
    if (hasExercise) score += 10;

    // Active goals
    const pct = goals.length > 0 ? goals.filter(g => g.status === 'active').length / goals.length : 0;
    score += pct * 5;

    return Math.min(100, Math.round(score));
  }, [habits, habitLogsByHabit, sleep_logs, metric_logs, goals]);

  // 30-day metric history for tiny chart
  const volumeHistory = useMemo(() => {
    const data = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayLogs = metric_logs.filter(l => (l.date || '').startsWith(key));
      data.push({ day: key.slice(5), value: dayLogs.length * 10 });
    }
    return data;
  }, [metric_logs]);

  // Strategy progress
  const strategyModules = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const taskPct = tasks.length > 0 ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) : 0;
    const goalPct = goals.length > 0 ? Math.round(goals.reduce((s, g) => {
      return s + Math.min(100, g.target_value ? (Number(g.current_value || 0) / Number(g.target_value)) * 100 : g.status === 'completed' ? 100 : 0);
    }, 0) / goals.length) : 0;
    const habitPct = habits.length > 0 ? Math.round(habits.filter(h => {
      const logs = habitLogsByHabit[h.id] || [];
      return logs.some(l => l.date === today && l.completed !== false);
    }).length / habits.length * 100) : 0;
    const lastSleep = sleep_logs[sleep_logs.length - 1];
    const sleepPct = lastSleep ? Math.min(100, Math.round((Number(lastSleep.duration) / 8) * 100)) : 0;
    return [
      { label: 'Tasks',  pct: taskPct,  color: '#10b981', icon: <CheckSquare size={14} />, tab: 'tasks'  },
      { label: 'Goals',  pct: goalPct,  color: '#0ea5e9', icon: <Target size={14} />,      tab: 'goals'  },
      { label: 'Habits', pct: habitPct, color: '#f97316', icon: <Flame size={14} />,       tab: 'habits' },
      { label: 'Sleep',  pct: sleepPct, color: '#818cf8', icon: <Moon size={14} />,        tab: null     },
    ];
  }, [tasks, goals, habits, habitLogsByHabit, sleep_logs]);

  const logHydration = async () => {
    const newH = Math.min(4000, hydration + 250);
    setHydration(newH);
    if (typeof addMetricLog === 'function') {
      await addMetricLog({ type: 'hydration', value: newH, unit: 'ml', date: new Date().toISOString().slice(0, 10) });
    }
  };

  const WMO_ICONS = { 0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 61: '🌧️', 63: '🌧️', 80: '🌦️' };
  const wIcon = weather ? (WMO_ICONS[weather.weathercode] || '🌡️') : '';

  return (
    <div style={{ padding: '0.5rem 0' }}>
      {/* Day at a Glance hero */}
      <DayAtAGlance tasks={tasks} habits={habits} goals={goals} sleepLogs={sleep_logs} habitLogsByHabit={habitLogsByHabit} setActiveTab={setActiveTab} />

      {/* Top row: Health Score + Environmental */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {/* Health score */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1.5rem', textAlign: 'center' }}>
          <HealthScoreRing score={healthScore} />
          <div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Digital Twin Score</p>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '2px' }}>Based on habits, sleep, activity & goals</p>
          </div>
        </div>

        {/* Weather */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
          {weatherLoading ? (
            <div style={{ color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem' }}>
              <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading weather…
            </div>
          ) : weather ? (
            <>
              <div style={{ fontSize: '3rem', lineHeight: 1 }}>{wIcon}</div>
              <div>
                <p style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-1)', lineHeight: 1 }}>{Math.round(weather.temperature_2m)}°C</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '4px' }}>Humidity {weather.relativehumidity_2m}%</p>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>Current weather</p>
              </div>
            </>
          ) : (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>Enable location for weather</p>
          )}
        </div>

        {/* Activity trend */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
            <Activity size={11} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />30-Day Activity
          </p>
          <p style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent)', marginBottom: '0.5rem' }}>
            {metric_logs.length} metric entries
          </p>
          <ResponsiveContainer width="100%" height={55}>
            <AreaChart data={volumeHistory} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gAct" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="value" stroke="var(--accent)" fill="url(#gAct)" strokeWidth={1.5} dot={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [v, 'Activity']} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Strategy progress bars */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem' }}>
          Today's Progress
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {strategyModules.map(m => (
            <div key={m.label} onClick={() => m.tab && setActiveTab && setActiveTab(m.tab)} style={{ cursor: m.tab ? 'pointer' : 'default' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: m.color }}>
                  {m.icon}
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-2)' }}>{m.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 900, color: m.pct >= 80 ? m.color : 'var(--text-2)' }}>{m.pct}%</span>
                  {m.tab && <ChevronRight size={12} color="var(--text-3)" />}
                </div>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: '99px', transition: 'width 0.8s ease',
                  width: `${m.pct}%`,
                  background: m.pct >= 80 ? m.color : `${m.color}88`,
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hydration + Quote row */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {/* Hydration tracker */}
        <div className="glass-card" style={{ textAlign: 'center', padding: '1.25rem' }}>
          <Droplets size={20} color="#0ea5e9" style={{ marginBottom: '0.5rem' }} />
          <p style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0ea5e9', lineHeight: 1, fontFamily: 'monospace' }}>{hydration}ml</p>
          <p style={{ fontSize: '0.62rem', color: 'var(--text-3)', marginTop: '4px', marginBottom: '0.75rem' }}>
            Goal: 2500ml · {Math.round((hydration / 2500) * 100)}%
          </p>
          <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', marginBottom: '0.75rem' }}>
            <div style={{ height: '100%', width: `${Math.min(100, (hydration / 2500) * 100)}%`, background: '#0ea5e9', borderRadius: '99px', transition: 'width 0.4s' }} />
          </div>
          <button onClick={logHydration} style={{ padding: '6px 14px', borderRadius: '8px', background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.4)', color: '#0ea5e9', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800, width: '100%' }}>
            + 250ml
          </button>
        </div>

        {/* Quote */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '1.5rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: '0.5rem' }}>✨ Daily Inspiration</p>
          <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.6, marginBottom: '0.5rem', fontStyle: 'italic' }}>"{quote.text}"</p>
          <p style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 700 }}>— {quote.author}</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="glass-card">
        <p style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Quick Actions</p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { label: '📝 Add Task',     tab: 'tasks'    },
            { label: '🎯 Check Goals',  tab: 'goals'    },
            { label: '💪 Log Workout',  tab: 'training' },
            { label: '💰 View Finance', tab: 'finance'  },
            { label: '📊 Analytics',    tab: 'analytics'},
            { label: '🤖 Ask AI',       tab: 'ai'       },
          ].map(a => (
            <button key={a.label} onClick={() => setActiveTab && setActiveTab(a.tab)} style={{
              padding: '7px 14px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--text-2)', cursor: 'pointer', transition: 'background 0.15s',
            }}>
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
