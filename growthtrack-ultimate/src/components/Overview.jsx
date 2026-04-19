import React from 'react';
import { USER, BODY_PARTS, HEALTH_SCORE, STATUS_DEFINITIONS } from '../data/userData';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, 
  ResponsiveContainer 
} from 'recharts';
import { Activity, Target, Shield, Heart } from 'lucide-react';

const avgScore = (sys) => {
  const parts = Object.values(BODY_PARTS).filter(p => p.sys === sys);
  if (!parts.length) return 0;
  const scores = parts.map(p => ({ critical: 20, poor: 40, fair: 65, good: 90 }[p.status] || 50));
  return Math.round(scores.reduce((a, b) => a + b, 0) / parts.length);
};

export default function Overview() {
  const radarData = [
    { subject: 'Muscles', score: avgScore('muscles') },
    { subject: 'Organs', score: avgScore('organs') },
    { subject: 'Joints', score: avgScore('joints') },
    { subject: 'Visual', score: avgScore('appearance') },
    { subject: 'Sexual', score: avgScore('sexual') },
  ];

  return (
    <div className="fade-in">
      <div className="section-head">
        <h2 className="text-display" style={{ fontSize: '2rem' }}>Health Overview</h2>
        <p className="text-secondary">Comprehensive digital twin status based on 11 assessment rounds.</p>
      </div>

      <div className="dashboard-grid">
        <div className="glass-card stagger-item" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <p className="label-caps" style={{ marginBottom: '1.5rem' }}>Overall Health Score</p>
                stroke="var(--accent)" 
                strokeWidth="8" 
                strokeDasharray={`${HEALTH_SCORE * 2.83} 283`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 1.5s ease-out', filter: 'drop-shadow(0 0 8px var(--accent))' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span className="text-display gradient-text" style={{ fontSize: '3rem' }}>{HEALTH_SCORE}</span>
              <span className="label-caps" style={{ fontSize: '0.6rem' }}>/ 100</span>
            </div>
          </div>
          <p style={{ marginTop: '1.5rem', color: 'var(--accent)', fontWeight: 600 }}>Needs Optimization</p>
        </div>

        <div className="glass-card stagger-item">
          <p className="label-caps" style={{ marginBottom: '1rem' }}>System Bio-Metrics</p>
          <div style={{ width: '100%', height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-2)', fontSize: 10, fontWeight: 600 }} />
                <Radar
                   name="Score"
                   dataKey="score"
                   stroke="var(--accent)"
                   fill="var(--accent)"
                   fillOpacity={0.4}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card stagger-item" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p className="label-caps">Priority Alerts</p>
          {[
            { label: 'Sleep Deprivation', value: 'CRITICAL', color: 'var(--accent-rose)', icon: <Activity size={16} /> },
            { label: 'Hormonal Baseline', value: 'LOW-T SIGNS', color: 'var(--accent-rose)', icon: <Target size={16} /> },
            { label: 'Metabolism', value: 'SLOW', color: 'var(--accent-primary)', icon: <Shield size={16} /> },
            { label: 'Cardio Status', value: 'POOR', color: 'var(--accent-rose)', icon: <Heart size={16} /> },
          ].map((item, idx) => (
            <div key={idx} className="pulse-glow" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ color: item.color }}>{item.icon}</div>
                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{item.label}</span>
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: item.color }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-grid">
         <div className="glass-card" style={{ gridColumn: 'span 2' }}>
            <p className="label-caps" style={{ marginBottom: '1rem' }}>Transformation Road-Map</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'center' }}>
               <div style={{ padding: '1rem', background: 'rgba(244, 63, 94, 0.05)', borderRadius: '16px', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                  <h4 style={{ color: 'var(--accent-rose)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>CURRENT: SKINNY-FAT</h4>
                  <ul style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', listStyle: 'none' }}>
                    <li>• Low energy & brain fog</li>
                    <li>• Minimal muscle mass (63kg)</li>
                    <li>• Posture: Tech-neck forward tilt</li>
                  </ul>
               </div>
               <div className="gradient-text text-display" style={{ fontSize: '1.5rem' }}>→</div>
               <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <h4 style={{ color: 'var(--accent-green)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>GOAL: GREEK GOD BUILD</h4>
                  <ul style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', listStyle: 'none' }}>
                    <li>• High performance energy</li>
                    <li>• Athletic bulk (73kg)</li>
                    <li>• Posture: Upright spinal stack</li>
                  </ul>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
