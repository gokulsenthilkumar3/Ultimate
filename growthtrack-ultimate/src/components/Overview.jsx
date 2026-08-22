import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, Sun, Moon, Droplets, Target, CheckSquare, Flame, Zap,
  TrendingUp, Award, Clock, RefreshCw, ChevronRight, User,
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
  if (h < 5)  return { 
    label: 'Night',      
    emoji: '🌙', 
    color: '#818cf8',
    gradient: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(79, 70, 229, 0.05))',
    glow: 'rgba(99, 102, 241, 0.15)'
  };
  if (h < 12) return { 
    label: 'Morning',    
    emoji: '☀️',  
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(239, 68, 68, 0.06))',
    glow: 'rgba(245, 158, 11, 0.15)'
  };
  if (h < 17) return { 
    label: 'Afternoon',  
    emoji: '🌤️', 
    color: '#0ea5e9',
    gradient: 'linear-gradient(135deg, rgba(14, 165, 233, 0.18), rgba(245, 158, 11, 0.06))',
    glow: 'rgba(14, 165, 233, 0.15)'
  };
  if (h < 20) return { 
    label: 'Evening',    
    emoji: '🌇', 
    color: '#f97316',
    gradient: 'linear-gradient(135deg, rgba(249, 115, 22, 0.18), rgba(139, 92, 246, 0.08))',
    glow: 'rgba(249, 115, 22, 0.15)'
  };
  return { 
    label: 'Night',      
    emoji: '🌙', 
    color: '#818cf8',
    gradient: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(79, 70, 229, 0.05))',
    glow: 'rgba(99, 102, 241, 0.15)'
  };
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

  const isDone = (t) => t.completed || t.status === 'done' || t.done;
  const dueDate = (t) => t.due_date || t.dueDate || '';
  const completedAt = (t) => t.completed_at || t.completedAt || '';
  const priority = (t) => (t.priority || '').toLowerCase();
  const todayTasks  = tasks.filter(t => !isDone(t) && dueDate(t).startsWith(today));
  const doneTasks   = tasks.filter(t => isDone(t) && completedAt(t).startsWith(today));
  const activeGoals = goals.filter(g => g.status === 'active').length;

  const habitsToday = habits.filter(h => {
    const logs = habitLogsByHabit[h.id] || [];
    return logs.some(l => l.date === today && l.completed !== false);
  });
  const habitPct = habits.length > 0 ? Math.round((habitsToday.length / habits.length) * 100) : 0;

  const lastSleep = sleepLogs?.length > 0 ? sleepLogs[sleepLogs.length - 1] : null;

  const urgentTasks = todayTasks.filter(t => ['high', 'urgent', 'p1'].includes(priority(t)));

  return (
    <div style={{
      borderRadius: '20px', padding: '2rem', marginBottom: '1.5rem',
      background: tod.gradient,
      border: `1px solid ${tod.color}33`,
      boxShadow: `0 8px 32px 0 ${tod.glow}`,
      position: 'relative', overflow: 'hidden',
      transition: 'all 0.3s ease-in-out'
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
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {[
            { icon: <CheckSquare size={16} color="#10b981" />, val: `${doneTasks.length}/${todayTasks.length + doneTasks.length}`, label: 'Tasks', color: '#10b981', action: () => setActiveTab('tasks') },
            { icon: <Flame size={16} color="#f97316" />,       val: `${habitPct}%`,         label: 'Habits',  color: '#f97316', action: () => setActiveTab('habits') },
            { icon: <Target size={16} color="#0ea5e9" />,      val: activeGoals,             label: 'Goals',   color: '#0ea5e9', action: () => setActiveTab('goals') },
            lastSleep ? { icon: <Moon size={16} color="#818cf8" />, val: `${lastSleep.duration}h`, label: 'Sleep', color: '#818cf8', action: null } : null,
          ].filter(Boolean).map(m => (
            <button 
              key={m.label} 
              onClick={m.action} 
              style={{ 
                padding: '0.8rem 0.95rem', 
                background: 'rgba(255,255,255,0.03)', 
                borderRadius: '16px', 
                border: '1px solid rgba(255,255,255,0.06)', 
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)',
                cursor: m.action ? 'pointer' : 'default', 
                textAlign: 'left', 
                minWidth: '112px', 
                transition: 'all 0.25s var(--ease)', 
                color: 'var(--text-1)' 
              }}
              onMouseEnter={e => {
                if (m.action) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
                  e.currentTarget.style.border = `1px solid ${m.color}88`;
                  e.currentTarget.style.boxShadow = `0 4px 20px ${m.color}22, inset 0 1px 1px rgba(255,255,255,0.1)`;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={e => {
                if (m.action) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.border = '1px solid rgba(255,255,255,0.06)';
                  e.currentTarget.style.boxShadow = 'inset 0 1px 1px rgba(255,255,255,0.05)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>{m.icon}</div>
              <p style={{ fontSize: '1.1rem', fontWeight: 900, color: m.color, lineHeight: 1 }}>{m.val}</p>
              <p style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginTop: '2px', fontWeight: 700 }}>{m.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Urgent tasks strip */}
      {urgentTasks.length > 0 && (
        <div style={{ marginTop: '1.25rem', padding: '0.65rem 1rem', background: 'rgba(239,68,68,0.1)', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 1 }}>
          <Zap size={14} color="#ef4444" />
          <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f87171' }}>
            {urgentTasks.length} priority task{urgentTasks.length > 1 ? 's' : ''} due today:
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
    const hasExercise = (metric_logs || []).some(l => l.type === 'strength' || l.type === 'workout' || l.exercise);
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
      const dayLogs = (metric_logs || []).filter(l => (l.date || '').startsWith(key));
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

  const quickLinks = [
    { label: 'Tasks', tab: 'tasks', note: 'Action items', icon: <CheckSquare size={14} color="var(--accent)" /> },
    { label: 'Humanoid', tab: 'humanoid', note: 'Body engine', icon: <Activity size={14} color="var(--accent)" /> },
    { label: 'Portfolio', tab: 'portfolio', note: 'Investments', icon: <TrendingUp size={14} color="var(--accent)" /> },
    { label: 'Profile', tab: 'settings', note: 'About me', icon: <User size={14} color="var(--accent)" /> },
  ];

  return (
    <div style={{ padding: '0.5rem 0' }}>
      <div className="glass-card" style={{ marginBottom: '1rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ maxWidth: '40rem' }}>
            <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.35rem' }}>Today</p>
            <h2 className="text-display" style={{ fontSize: '1.8rem', marginBottom: '0.3rem' }}>Your daily command center</h2>
            <p style={{ color: 'var(--text-3)', fontSize: '0.88rem', lineHeight: 1.55 }}>
              Minimal, fast, and focused on what matters now.
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
            {quickLinks.map((item) => (
              <button 
                key={item.tab} 
                onClick={() => setActiveTab(item.tab)} 
                style={{ 
                  border: '1px solid var(--border)', 
                  background: 'var(--bg-glass)', 
                  backdropFilter: 'blur(10px)',
                  color: 'var(--text-1)', 
                  borderRadius: '999px', 
                  padding: '0.65rem 1.1rem', 
                  cursor: 'pointer', 
                  minWidth: '110px', 
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  transition: 'all 0.2s var(--ease)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.boxShadow = '0 4px 15px var(--accent-glow)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {item.icon}
                <div>
                  <div style={{ fontSize: '0.76rem', fontWeight: 800 }}>{item.label}</div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginTop: '2px' }}>{item.note}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Day at a Glance hero */}
      <DayAtAGlance tasks={tasks} habits={habits} goals={goals} sleepLogs={sleep_logs} habitLogsByHabit={habitLogsByHabit} setActiveTab={setActiveTab} />

      {/* Top row: Health Score + Environmental */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1.25rem', textAlign: 'center' }}>
          <HealthScoreRing score={healthScore} />
          <div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Digital Twin Score</p>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '2px' }}>Based on habits, sleep, activity & goals</p>
          </div>
        </div>

        {/* Weather */}
        <div 
          className="glass-card" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1.25rem', 
            padding: '1.25rem',
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          {weather && (
            <div style={{ 
              position: 'absolute', 
              top: '-30px', 
              left: '-30px', 
              width: '120px', 
              height: '120px', 
              borderRadius: '50%', 
              background: weather.temperature_2m > 25 ? 'rgba(245, 158, 11, 0.08)' : 'rgba(14, 165, 233, 0.08)', 
              filter: 'blur(30px)', 
              pointerEvents: 'none' 
            }} />
          )}
          
          {weatherLoading ? (
            <div style={{ color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', width: '100%', justifyContent: 'center' }}>
              <RefreshCw size={14} className="spin" style={{ animation: 'spin 1s linear infinite' }} /> Loading weather…
            </div>
          ) : weather ? (
            <>
              <div style={{ fontSize: '3rem', lineHeight: 1, zIndex: 1, filter: 'drop-shadow(0 2px 8px rgba(255,255,255,0.1))' }}>{wIcon}</div>
              <div style={{ zIndex: 1 }}>
                <p className="font-monospace" style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--text-1)', lineHeight: 1, letterSpacing: '-0.05em' }}>{Math.round(weather.temperature_2m)}°C</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                  <span className="label-caps" style={{ fontSize: '0.62rem', color: 'var(--accent)', background: 'var(--accent-dim)', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                    {weather.temperature_2m > 25 ? 'WARM' : 'COOL'}
                  </span>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-2)', fontWeight: 600 }}>Humidity {weather.relativehumidity_2m}%</p>
                </div>
                <p style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Local Telemetry</p>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', width: '100%' }}>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', margin: '0 0 6px 0' }}>Enable location for weather</p>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Coordinates unavailable</span>
            </div>
          )}
        </div>

        {/* Activity trend */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
            <Activity size={11} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />30-Day Activity
          </p>
          <p style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent)', marginBottom: '0.5rem' }}>
            {(metric_logs || []).length} metric entries
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
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.04)', borderRadius: '99px', overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)' }}>
                <div style={{
                  height: '100%', borderRadius: '99px', transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                  width: `${m.pct}%`,
                  background: m.pct >= 80 ? m.color : `linear-gradient(90deg, ${m.color}aa, ${m.color})`,
                  boxShadow: m.pct > 0 ? `0 0 12px ${m.color}` : 'none',
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hydration + Quote row */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {/* Hydration tracker */}
        <div 
          className="glass-card" 
          style={{ 
            textAlign: 'center', 
            padding: '1.5rem 1.25rem', 
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid rgba(14, 165, 233, 0.25)',
            boxShadow: '0 4px 20px rgba(14, 165, 233, 0.08)'
          }}
        >
          <div style={{ 
            position: 'absolute', 
            top: '-20px', 
            right: '-20px', 
            width: '100px', 
            height: '100px', 
            borderRadius: '50%', 
            background: 'rgba(14, 165, 233, 0.05)', 
            filter: 'blur(20px)', 
            pointerEvents: 'none' 
          }} />
          
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
            <Droplets size={18} color="#0ea5e9" className="pulse" style={{ animation: 'breathing 3s ease-in-out infinite' }} />
            <span className="label-caps" style={{ fontSize: '0.62rem', color: '#0ea5e9', fontWeight: 800, letterSpacing: '0.1em' }}>Hydration</span>
          </div>
          
          <p className="font-monospace" style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0ea5e9', lineHeight: 1, letterSpacing: '-0.02em', margin: '4px 0' }}>{hydration}ml</p>
          
          <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '4px', marginBottom: '1rem', fontWeight: 600 }}>
            Goal: 2500ml · <span style={{ color: '#0ea5e9', fontWeight: 800 }}>{Math.round((hydration / 2500) * 100)}%</span>
          </p>
          
          <div style={{ height: '8px', background: 'rgba(255,255,255,0.04)', borderRadius: '99px', marginBottom: '1.25rem', overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)' }}>
            <div style={{ height: '100%', width: `${Math.min(100, (hydration / 2500) * 100)}%`, background: 'linear-gradient(90deg, #0284c7, #0ea5e9)', borderRadius: '99px', transition: 'width 0.6s cubic-bezier(0.1, 0.8, 0.3, 1)', boxShadow: '0 0 10px #0ea5e9' }} />
          </div>
          
          <button 
            onClick={logHydration} 
            className="btn-glass"
            style={{ 
              padding: '8px 14px', 
              borderRadius: '10px', 
              background: 'rgba(14,165,233,0.1)', 
              border: '1px solid rgba(14,165,233,0.3)', 
              color: '#0ea5e9', 
              cursor: 'pointer', 
              fontSize: '0.78rem', 
              fontWeight: 800, 
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s var(--ease)'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(14,165,233,0.2)';
              e.currentTarget.style.borderColor = '#0ea5e9';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(14,165,233,0.3)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(14,165,233,0.1)';
              e.currentTarget.style.borderColor = 'rgba(14,165,233,0.3)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            + 250ml
          </button>
        </div>

        {/* Quote */}
        <div 
          className="glass-card" 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            padding: '1.5rem 2rem',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.015), rgba(255,255,255,0.005))',
            position: 'relative'
          }}
        >
          <div style={{ position: 'absolute', top: '12px', left: '12px', width: '6px', height: '6px', borderTop: '2px solid var(--accent)', borderLeft: '2px solid var(--accent)' }} />
          <div style={{ position: 'absolute', bottom: '12px', right: '12px', width: '6px', height: '6px', borderBottom: '2px solid var(--accent)', borderRight: '2px solid var(--accent)' }} />
          
          <p className="label-caps" style={{ fontSize: '0.62rem', color: 'var(--accent)', fontWeight: 800, letterSpacing: '0.12em', marginBottom: '0.75rem' }}>
            Telemetry Inspiration
          </p>
          <p style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.6, marginBottom: '0.75rem', fontStyle: 'italic', letterSpacing: '0.01em' }}>
            "{quote.text}"
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ height: '1px', width: '16px', background: 'var(--accent)', opacity: 0.5 }} />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-2)', fontWeight: 700, margin: 0 }}>{quote.author}</p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <p className="label-caps" style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-3)', letterSpacing: '0.08em', marginBottom: '1rem' }}>
          Quick Action Matrix
        </p>
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          {[
            { label: '📝 Add Task',     tab: 'tasks'    },
            { label: '🎯 Check Goals',  tab: 'goals'    },
            { label: '💪 Log Workout',  tab: 'training' },
            { label: '💰 View Finance', tab: 'finance'  },
            { label: '📊 Analytics',    tab: 'analytics'},
            { label: '🤖 Ask AI',       tab: 'ai'       },
          ].map(a => (
            <button 
              key={a.label} 
              onClick={() => setActiveTab && setActiveTab(a.tab)} 
              style={{
                padding: '8px 18px', 
                borderRadius: '99px', 
                fontSize: '0.78rem', 
                fontWeight: 700,
                background: 'rgba(255,255,255,0.03)', 
                border: '1px solid rgba(255,255,255,0.06)',
                color: 'var(--text-2)', 
                cursor: 'pointer', 
                transition: 'all 0.2s var(--ease)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.color = 'var(--text-1)';
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.boxShadow = '0 2px 10px var(--accent-glow)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                e.currentTarget.style.color = 'var(--text-2)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
