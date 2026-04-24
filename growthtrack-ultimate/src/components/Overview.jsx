import React from 'react';
import {
  Zap, Target, Flame, Droplets, Moon,
  TrendingUp, Heart, Activity, ArrowUpRight, Shield
} from 'lucide-react';

export default function Overview({ user }) {
  const healthScore = 42;
  const weightGain = user?.goal ? (user.goal.weight - user.weight) : 19;
  const sleepDebt = user?.sleep?.weeklyDebt || 14;

  const vitals = [
    { label: 'Health Score', value: healthScore, unit: '/100', icon: Zap, color: '#e5a50a', trend: '+3' },
    { label: 'Weight', value: `${user?.weight || 63}`, unit: 'kg', icon: Activity, color: '#0ea5e9', trend: '+0.5' },
    { label: 'Sleep Avg', value: user?.sleep?.avgHours || 5.5, unit: 'hr', icon: Moon, color: '#8b5cf6', trend: '-0.3' },
    { label: 'Body Fat', value: `${user?.bodyFat || 22}`, unit: '%', icon: Flame, color: '#f43f5e', trend: '-1.2' },
  ];

  const priorities = [
    { label: 'Gain Weight', desc: `${user?.weight || 63}kg → ${user?.goal?.weight || 82}kg`, progress: Math.round(((user?.weight || 63) / (user?.goal?.weight || 82)) * 100), color: '#0ea5e9' },
    { label: 'Fix Sleep', desc: `${user?.sleep?.avgHours || 5.5}h → 7.5h target`, progress: Math.round(((user?.sleep?.avgHours || 5.5) / 7.5) * 100), color: '#8b5cf6' },
    { label: 'Reduce Body Fat', desc: `${user?.bodyFat || 22}% → ${user?.goal?.bodyFat || 10}%`, progress: Math.round((1 - ((user?.bodyFat || 22) - (user?.goal?.bodyFat || 10)) / (user?.bodyFat || 22)) * 100), color: '#f43f5e' },
    { label: 'Build Muscle', desc: `${user?.muscleMass || 49}kg → ${user?.goal?.muscleMass || 70}kg`, progress: Math.round(((user?.muscleMass || 49) / (user?.goal?.muscleMass || 70)) * 100), color: '#10b981' },
  ];

  const alerts = [
    { icon: '⚠️', text: 'Sleep debt is critical — 14 hours behind this week', severity: 'critical' },
    { icon: '💧', text: 'Hydration below target — averaging 1.5L/day', severity: 'warning' },
    { icon: '🩺', text: 'Blood work never done — schedule CBC + hormones', severity: 'critical' },
  ];

  return (
    <div className="fade-in" style={{ padding: '0.5rem 0' }}>
      {/* Welcome Section */}
      <div style={{ marginBottom: '2rem' }}>
        <p className="label-caps" style={{ marginBottom: '0.4rem', color: 'var(--accent)' }}>
          Dashboard Overview
        </p>
        <h2 className="text-display" style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>
          Welcome back, {user?.name || 'Athlete'}
        </h2>
        <p style={{ color: 'var(--text-3)', fontSize: '0.88rem' }}>
          Your digital twin status at a glance. Keep pushing.
        </p>
      </div>

      {/* Vital Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '1.75rem',
      }}>
        {vitals.map((v, i) => {
          const Icon = v.icon;
          const isPositive = v.trend.startsWith('+');
          return (
            <div key={i} className="glass-card" style={{
              padding: '1.25rem 1.35rem',
              display: 'flex', flexDirection: 'column', gap: '0.85rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: 'var(--radius-sm)',
                  background: `${v.color}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={20} color={v.color} />
                </div>
                <span style={{
                  fontSize: '0.68rem', fontWeight: 700,
                  color: isPositive ? 'var(--success)' : 'var(--danger)',
                  background: isPositive ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
                  padding: '3px 8px', borderRadius: 'var(--radius-sm)',
                  display: 'flex', alignItems: 'center', gap: '2px',
                }}>
                  <ArrowUpRight size={12} style={{ transform: isPositive ? 'none' : 'rotate(90deg)' }} />
                  {v.trend}
                </span>
              </div>
              <div>
                <p className="label-caps" style={{ marginBottom: '0.2rem' }}>{v.label}</p>
                <p style={{
                  fontSize: '1.65rem', fontWeight: 800,
                  fontFamily: 'var(--font-display)',
                  color: 'var(--text-1)', lineHeight: 1.1,
                }}>
                  {v.value}<span style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontWeight: 500, marginLeft: '4px' }}>{v.unit}</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '1.25rem',
        marginBottom: '1.75rem',
      }}>
        {/* Goals Progress */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Target size={18} color="var(--accent)" />
            <span className="card-title" style={{ margin: 0 }}>Active Goals</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {priorities.map((g, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-1)' }}>{g.label}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{g.progress}%</span>
                </div>
                <div style={{
                  height: '6px', borderRadius: '3px',
                  background: 'var(--bg-elevated)', overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${Math.min(g.progress, 100)}%`,
                    height: '100%', borderRadius: '3px',
                    background: `linear-gradient(90deg, ${g.color}, ${g.color}bb)`,
                    transition: 'width 1s var(--ease)',
                  }} />
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '0.2rem' }}>{g.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts & Action Items */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Shield size={18} color="var(--danger)" />
            <span className="card-title" style={{ margin: 0 }}>Priority Alerts</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {alerts.map((a, i) => (
              <div key={i} style={{
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-sm)',
                background: a.severity === 'critical' ? 'rgba(248,113,113,0.08)' : 'rgba(251,191,36,0.08)',
                border: `1px solid ${a.severity === 'critical' ? 'rgba(248,113,113,0.2)' : 'rgba(251,191,36,0.2)'}`,
                display: 'flex', alignItems: 'flex-start', gap: '0.65rem',
              }}>
                <span style={{ fontSize: '1.1rem', flexShrink: 0, lineHeight: 1.3 }}>{a.icon}</span>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', lineHeight: 1.5 }}>{a.text}</p>
              </div>
            ))}
          </div>

          {/* Quick Stats */}
          <div style={{
            marginTop: '1.25rem', padding: '1rem',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-elevated)',
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem',
          }}>
            <div>
              <p className="label-caps">Deadline</p>
              <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-1)', marginTop: '0.15rem' }}>
                {user?.goal?.deadline || 'Dec 2026'}
              </p>
            </div>
            <div>
              <p className="label-caps">Months Left</p>
              <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent)', marginTop: '0.15rem' }}>
                {user?.goal?.timelineMonths || 20}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Scores Radar Snapshot */}
      <div className="glass-card" style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Heart size={18} color="var(--accent)" />
          <span className="card-title" style={{ margin: 0 }}>Performance Scores</span>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1rem',
        }}>
          {user?.scores && Object.entries(user.scores).map(([key, val]) => (
            <div key={key} style={{
              padding: '0.85rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-elevated)',
              textAlign: 'center',
            }}>
              <p className="label-caps" style={{ marginBottom: '0.35rem' }}>{key}</p>
              <p style={{
                fontSize: '1.5rem', fontWeight: 800,
                fontFamily: 'var(--font-display)',
                color: val >= 60 ? 'var(--success)' : val >= 40 ? 'var(--warning)' : 'var(--danger)',
              }}>{val}</p>
              <div style={{
                height: '4px', borderRadius: '2px',
                background: 'var(--border)', marginTop: '0.5rem', overflow: 'hidden',
              }}>
                <div style={{
                  width: `${val}%`, height: '100%', borderRadius: '2px',
                  background: val >= 60 ? 'var(--success)' : val >= 40 ? 'var(--warning)' : 'var(--danger)',
                  transition: 'width 1.2s var(--ease)',
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
