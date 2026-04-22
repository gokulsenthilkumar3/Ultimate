import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { Target, CheckCircle, Clock, TrendingUp, Flame, Award } from 'lucide-react';
import { USER } from '../data/userData';

// Build goal timeline from userData config (no hardcoding)
const buildGoalTimeline = (userData) => {
  const current = { weight: userData?.weight || 63, bodyFat: userData?.bodyFat || 22, muscleMass: userData?.muscleMass || 49 };
  const goal    = { weight: userData?.goal?.weight || 82, bodyFat: userData?.goal?.bodyFat || 10, muscleMass: userData?.goal?.muscleMass || 70 };
  const months  = userData?.goal?.timelineMonths || 18;

  return Array.from({ length: months + 1 }, (_, i) => {
    const t = i / months;
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // ease in-out
    return {
      month:     i === 0 ? 'Now' : `M${i}`,
      weight:    +(current.weight + (goal.weight - current.weight) * ease).toFixed(1),
      bodyFat:   +(current.bodyFat + (goal.bodyFat - current.bodyFat) * ease).toFixed(1),
      muscleMass:+(current.muscleMass + (goal.muscleMass - current.muscleMass) * ease).toFixed(1),
    };
  });
};

const buildGoalCards = (userData) => [
  {
    id: 'weight',
    label: 'Body Weight',
    current: userData?.weight || 63,
    target: userData?.goal?.weight || 82,
    unit: 'kg',
    color: '#22d3ee',
    icon: TrendingUp,
    deadline: userData?.goal?.deadline || 'Dec 2026',
  },
  {
    id: 'bodyfat',
    label: 'Body Fat %',
    current: userData?.bodyFat || 22,
    target: userData?.goal?.bodyFat || 10,
    unit: '%',
    color: '#f59e0b',
    icon: Flame,
    deadline: userData?.goal?.deadline || 'Dec 2026',
  },
  {
    id: 'muscle',
    label: 'Lean Mass',
    current: userData?.muscleMass || 49,
    target: userData?.goal?.muscleMass || 70,
    unit: 'kg',
    color: '#22c55e',
    icon: Award,
    deadline: userData?.goal?.deadline || 'Dec 2026',
  },
  {
    id: 'bench',
    label: 'Bench Press',
    current: userData?.strength?.bench || 60,
    target: userData?.goal?.bench || 120,
    unit: 'kg',
    color: '#a78bfa',
    icon: Target,
    deadline: userData?.goal?.deadline || 'Dec 2026',
  },
];

function GoalProgressBar({ current, target, color, unit }) {
  const pct = Math.min(100, Math.round(Math.abs((current - (target > current ? current : target)) / Math.abs(target - (target > current ? current : current))) * 100));
  const progress = target > current
    ? Math.round(((current - (current)) / (target - current + 0.001)) * 100)
    : Math.round(((current - target) / (current - target + 0.001)) * 100);

  // Simple percentage toward goal
  const startVal = target > current ? current * 0.85 : current * 1.15;
  const pctDone  = Math.round(Math.min(100, Math.max(0,
    Math.abs(current - startVal) / Math.abs(target - startVal) * 100
  )));

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{current}{unit} → {target}{unit}</span>
        <span style={{ fontSize: '0.75rem', color }}>{pctDone}%</span>
      </div>
      <div style={{ height: 6, background: 'var(--bg-base)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pctDone}%`, background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

export default function GoalsDashboard() {
  const timeline  = buildGoalTimeline(USER);
  const goalCards = buildGoalCards(USER);
  const [metric, setMetric] = useState('weight');

  const metricConfig = {
    weight:     { label: 'Body Weight (kg)', color: '#22d3ee' },
    bodyFat:    { label: 'Body Fat %',       color: '#f59e0b' },
    muscleMass: { label: 'Lean Mass (kg)',   color: '#22c55e' },
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="page-title"><Target size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />Goals & Transformation</h2>
          <p className="page-subtitle">Projected timeline to {USER?.goal?.deadline || 'Dec 2026'} physique target</p>
        </div>
      </div>

      {/* Goal Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {goalCards.map(({ id, label, current, target, unit, color, icon: Icon, deadline }) => (
          <div key={id} className="metric-card" style={{ borderLeft: `3px solid ${color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span className="metric-label">{label}</span>
              <Icon size={16} color={color} />
            </div>
            <div className="metric-value" style={{ color }}>{current}<span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{unit}</span></div>
            <GoalProgressBar current={current} target={target} color={color} unit={unit} />
            <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              <Clock size={10} style={{ verticalAlign: 'middle', marginRight: 3 }} />Target: {target}{unit} by {deadline}
            </div>
          </div>
        ))}
      </div>

      {/* Timeline Chart */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="card-title" style={{ margin: 0 }}>Transformation Trajectory</h3>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {Object.entries(metricConfig).map(([key, { label }]) => (
              <button key={key} onClick={() => setMetric(key)}
                className={`btn-sm ${metric === key ? 'active' : ''}`}>
                {label.split(' ')[0].toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timeline} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" stroke="var(--text-muted)" tick={{ fontSize: 10 }} interval={1} />
            <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}
              formatter={(v) => [v, metricConfig[metric].label]}
            />
            <ReferenceLine
              y={timeline[timeline.length - 1][metric]}
              stroke={metricConfig[metric].color}
              strokeDasharray="4 4"
              label={{ value: 'Goal', fill: metricConfig[metric].color, fontSize: 11 }}
            />
            <Line
              type="monotone"
              dataKey={metric}
              stroke={metricConfig[metric].color}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Daily Habits */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <h3 className="card-title">Daily Habits Checklist</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.6rem', marginTop: '0.75rem' }}>
          {(USER?.habits || [
            'Hit protein target',
            'Workout completed',
            'Sleep 7h+ achieved',
            'Caloric surplus maintained',
            'Morning sunlight exposure',
            'Creatine 5g taken',
            'No alcohol',
            'Steps > 8000',
          ]).map((habit, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.75rem', background: 'var(--bg-base)', borderRadius: 6, border: '1px solid var(--border)' }}>
              <CheckCircle size={15} color="#22c55e" />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{habit}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
