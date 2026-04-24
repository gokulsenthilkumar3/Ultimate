import React, { useState } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Scatter, ZAxis,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { BarChart3, TrendingUp, Activity, Cpu } from 'lucide-react';

const buildAnalyticsData = (userData) => {
  const weeks = 12;
  const baseWeight = userData?.weight || 63;
  const baseCaloric = userData?.nutrition?.tdee || 2400;
  const baseVolume = userData?.training?.weeklyVolume || 12;
  return Array.from({ length: weeks }, (_, i) => {
    const rate = (i / (weeks - 1));
    const jitter = Math.sin(i * 1.7) * 0.3;
    return {
      week: `W${i + 1}`,
      weight: +(baseWeight + rate * 4 + jitter).toFixed(1),
      caloricIntake: Math.round(baseCaloric + rate * 200 + Math.sin(i) * 80),
      trainingLoad: Math.round(baseVolume + rate * 6 + Math.cos(i * 0.8) * 2),
      recovery: Math.round(60 + rate * 20 + Math.sin(i * 2) * 8),
      hrv: Math.round(45 + Math.sin(i * 0.9) * 12),
    };
  });
};

const buildRadarData = (userData) => [
  { metric: 'Strength', value: userData?.scores?.strength || 42 },
  { metric: 'Endurance', value: userData?.scores?.endurance || 38 },
  { metric: 'Recovery', value: userData?.scores?.recovery || 55 },
  { metric: 'Nutrition', value: userData?.scores?.nutrition || 60 },
  { metric: 'Sleep', value: userData?.scores?.sleep || 35 },
  { metric: 'Mobility', value: userData?.scores?.mobility || 48 },
];

const TABS = [
  { id: 'overview', label: 'Weekly Overview' },
  { id: 'radar', label: 'Performance Radar' },
  { id: 'scatter', label: 'Load vs Recovery' },
];

export default function Analytics({ user }) {
  const data = buildAnalyticsData(user);
  const radarData = buildRadarData(user);
  const [tab, setTab] = useState('overview');

  const avgHRV = Math.round(data.reduce((s, d) => s + d.hrv, 0) / data.length);
  const avgRecovery = Math.round(data.reduce((s, d) => s + d.recovery, 0) / data.length);
  const totalLoad = data.reduce((s, d) => s + d.trainingLoad, 0);
  const weightGain = (data[data.length - 1].weight - data[0].weight).toFixed(1);

  const tooltipStyle = { background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backdropFilter: 'blur(12px)' };

  return (
    <div className="fade-in" style={{ padding: '0.5rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <p className="label-caps" style={{ marginBottom: '0.35rem', color: 'var(--accent)' }}>Analytics</p>
          <h2 className="text-display" style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>
            <BarChart3 size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3rem' }} />
            Analytics Engine
          </h2>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Multi-metric training, nutrition & recovery correlation</p>
        </div>
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`btn-sm${tab === t.id ? ' active' : ''}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Avg HRV', value: `${avgHRV}ms`, color: '#22d3ee', icon: Activity },
          { label: 'Avg Recovery', value: `${avgRecovery}%`, color: '#22c55e', icon: TrendingUp },
          { label: '12-Wk Load', value: totalLoad, color: '#f59e0b', icon: Cpu },
          { label: 'Weight Gain', value: `+${weightGain}kg`, color: '#a78bfa', icon: BarChart3 },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="glass-card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="label-caps">{label}</span>
              <Icon size={15} color={color} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', color, marginTop: '0.3rem' }}>{value}</div>
          </div>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="glass-card">
          <span className="card-title">Weight + Training Load + Caloric Intake (12 Weeks)</span>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="week" stroke="var(--text-3)" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="weight" orientation="left" domain={['auto', 'auto']} stroke="#22d3ee" tick={{ fontSize: 11 }} unit="kg" />
              <YAxis yAxisId="cal" orientation="right" domain={['auto', 'auto']} stroke="#f59e0b" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar yAxisId="cal" dataKey="caloricIntake" fill="#f59e0b" opacity={0.4} radius={[3, 3, 0, 0]} name="Calories" />
              <Bar yAxisId="cal" dataKey="trainingLoad" fill="#a78bfa" opacity={0.5} radius={[3, 3, 0, 0]} name="Train Load" />
              <Line yAxisId="weight" type="monotone" dataKey="weight" stroke="#22d3ee" strokeWidth={2.5} dot={{ r: 3 }} name="Weight" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {tab === 'radar' && (
        <div className="glass-card">
          <span className="card-title">Physical Performance Radar</span>
          <ResponsiveContainer width="100%" height={340}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={120}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text-3)', fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-3)', fontSize: 10 }} />
              <Radar name="Current" dataKey="value" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.25} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
          <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '0.78rem', marginTop: '0.5rem' }}>
            Scores computed from training, sleep, nutrition, and biometric data
          </p>
        </div>
      )}

      {tab === 'scatter' && (
        <div className="glass-card">
          <span className="card-title">Training Load vs Recovery Score Correlation</span>
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="trainingLoad" name="Load" stroke="var(--text-3)" tick={{ fontSize: 11 }} />
              <YAxis dataKey="recovery" name="Recovery" domain={[40, 100]} stroke="var(--text-3)" tick={{ fontSize: 11 }} />
              <ZAxis range={[40, 120]} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter dataKey="recovery" fill="#22c55e" opacity={0.8} name="Recovery" />
              <Line type="monotone" dataKey="hrv" stroke="#f43f5e" strokeWidth={1.5} dot={false} name="HRV" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
