import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { Target, CheckCircle, Clock, TrendingUp, Flame, Award, Plus, Trash2, RotateCcw } from 'lucide-react';

const buildGoalTimeline = (userData) => {
  const current = { weight: userData?.weight || 63, bodyFat: userData?.bodyFat || 22, muscleMass: userData?.muscleMass || 49 };
  const goal = { weight: userData?.goal?.weight || 82, bodyFat: userData?.goal?.bodyFat || 10, muscleMass: userData?.goal?.muscleMass || 70 };
  const months = userData?.goal?.timelineMonths || 18;
  return Array.from({ length: months + 1 }, (_, i) => {
    const t = i / months;
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    return {
      month: i === 0 ? 'Now' : `M${i}`,
      weight: +(current.weight + (goal.weight - current.weight) * ease).toFixed(1),
      bodyFat: +(current.bodyFat + (goal.bodyFat - current.bodyFat) * ease).toFixed(1),
      muscleMass: +(current.muscleMass + (goal.muscleMass - current.muscleMass) * ease).toFixed(1),
    };
  });
};

const buildGoalCards = (userData) => [
  { id: 'weight', label: 'Body Weight', current: userData?.weight || 63, target: userData?.goal?.weight || 82, unit: 'kg', color: '#22d3ee', icon: TrendingUp, deadline: userData?.goal?.deadline || 'Dec 2026' },
  { id: 'bodyfat', label: 'Body Fat %', current: userData?.bodyFat || 22, target: userData?.goal?.bodyFat || 10, unit: '%', color: '#f59e0b', icon: Flame, deadline: userData?.goal?.deadline || 'Dec 2026' },
  { id: 'muscle', label: 'Lean Mass', current: userData?.muscleMass || 49, target: userData?.goal?.muscleMass || 70, unit: 'kg', color: '#22c55e', icon: Award, deadline: userData?.goal?.deadline || 'Dec 2026' },
  { id: 'bench', label: 'Bench Press', current: userData?.strength?.bench || 60, target: userData?.goal?.bench || 120, unit: 'kg', color: '#a78bfa', icon: Target, deadline: userData?.goal?.deadline || 'Dec 2026' },
];

function GoalProgressBar({ current, target, color, unit }) {
  const startVal = target > current ? current * 0.85 : current * 1.15;
  const pctDone = Math.round(Math.min(100, Math.max(0, Math.abs(current - startVal) / Math.abs(target - startVal) * 100)));
  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{current}{unit} → {target}{unit}</span>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color }}>{pctDone}%</span>
      </div>
      <div style={{ height: 5, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pctDone}%`, background: color, borderRadius: 3, transition: 'width 0.8s var(--ease)' }} />
      </div>
    </div>
  );
}

export default function GoalsDashboard({ user, setUser }) {
  const timeline = buildGoalTimeline(user);
  const goalCards = buildGoalCards(user);
  const [metric, setMetric] = useState('weight');
  const habits = user?.habits || ['Hit protein target (170g)', 'Resistance training completed', 'Sleep 7h+ achieved', 'Caloric surplus maintained', 'Morning sunlight (10 min)', 'Creatine 5g taken', 'No alcohol or smoking', 'Steps > 8000', 'Hydration: 3L+ water', 'No late-night eating after 10 PM'];
  const checkedHabits = user?.checkedHabits || {};
  const today = new Date().toISOString().slice(0, 10);
  const todayChecked = checkedHabits[today] || [];

  const toggleHabit = (idx) => {
    const updated = todayChecked.includes(idx) ? todayChecked.filter(i => i !== idx) : [...todayChecked, idx];
    setUser({ ...user, checkedHabits: { ...checkedHabits, [today]: updated } });
  };

  const habitPct = Math.round((todayChecked.length / habits.length) * 100);

  const metricConfig = {
    weight: { label: 'Body Weight (kg)', color: '#22d3ee' },
    bodyFat: { label: 'Body Fat %', color: '#f59e0b' },
    muscleMass: { label: 'Lean Mass (kg)', color: '#22c55e' },
  };

  return (
    <div className="fade-in" style={{ padding: '0.5rem 0' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <p className="label-caps" style={{ marginBottom: '0.35rem', color: 'var(--accent)' }}>Goals</p>
        <h2 className="text-display" style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>
          <Target size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3rem' }} />
          Goals & Transformation
        </h2>
        <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Projected timeline to {user?.goal?.deadline || 'Dec 2026'} physique target</p>
      </div>

      {/* Goal Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {goalCards.map(({ id, label, current, target, unit, color, icon: Icon, deadline }) => (
          <div key={id} className="glass-card" style={{ padding: '1.15rem', borderLeft: `3px solid ${color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span className="label-caps">{label}</span>
              <Icon size={16} color={color} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', color }}>
              {current}<span style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontWeight: 500 }}>{unit}</span>
            </div>
            <GoalProgressBar current={current} target={target} color={color} unit={unit} />
            <div style={{ marginTop: '0.4rem', fontSize: '0.68rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Clock size={10} /> Target: {target}{unit} by {deadline}
            </div>
          </div>
        ))}
      </div>

      {/* Transformation Trajectory */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span className="card-title" style={{ margin: 0 }}>Transformation Trajectory</span>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {Object.entries(metricConfig).map(([key, { label }]) => (
              <button key={key} onClick={() => setMetric(key)}
                className={`btn-sm${metric === key ? ' active' : ''}`}>
                {label.split(' ')[0].toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={timeline} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" stroke="var(--text-3)" tick={{ fontSize: 10 }} interval={1} />
            <YAxis stroke="var(--text-3)" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backdropFilter: 'blur(12px)' }}
              formatter={(v) => [v, metricConfig[metric].label]}
            />
            <ReferenceLine y={timeline[timeline.length - 1][metric]} stroke={metricConfig[metric].color} strokeDasharray="4 4"
              label={{ value: 'Goal', fill: metricConfig[metric].color, fontSize: 11 }} />
            <Line type="monotone" dataKey={metric} stroke={metricConfig[metric].color} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Daily Habits Checklist — Interactive */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span className="card-title" style={{ margin: 0 }}>Daily Habits Checklist</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: habitPct >= 80 ? 'var(--success)' : habitPct >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
              {todayChecked.length}/{habits.length} done
            </span>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: `conic-gradient(${habitPct >= 80 ? 'var(--success)' : habitPct >= 50 ? 'var(--warning)' : 'var(--danger)'} ${habitPct * 3.6}deg, var(--bg-elevated) 0deg)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-card)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.55rem', fontWeight: 800, color: 'var(--text-2)',
              }}>{habitPct}%</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.5rem' }}>
          {habits.map((habit, i) => {
            const checked = todayChecked.includes(i);
            return (
              <button key={i} onClick={() => toggleHabit(i)} style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                padding: '0.65rem 0.85rem', background: checked ? 'rgba(34,197,94,0.08)' : 'var(--bg-elevated)',
                borderRadius: 'var(--radius-sm)',
                border: checked ? '1px solid rgba(34,197,94,0.25)' : '1px solid var(--border)',
                cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.25s ease',
              }}>
                <CheckCircle size={16} color={checked ? '#22c55e' : 'var(--text-3)'} fill={checked ? '#22c55e' : 'none'} />
                <span style={{
                  fontSize: '0.82rem', color: checked ? 'var(--success)' : 'var(--text-2)',
                  textDecoration: checked ? 'line-through' : 'none',
                }}>{habit}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
