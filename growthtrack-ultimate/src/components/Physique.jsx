import React, { useState } from 'react';
import { 
  Zap, Target, Layers, Activity, 
  ChevronRight, ArrowUpRight, Shield, Flame 
} from 'lucide-react';
import useStore from '../store/useStore';

export default function Physique({ user }) {
  const [activeZone, setActiveZone] = useState('Core');

  const zones = [
    { name: 'Core Anterior', status: 'Cutting', progress: 68, color: 'var(--accent)', icon: '⚡' },
    { name: 'Posterior Chain', status: 'Maintenance', progress: 85, color: '#3b82f6', icon: '⛓️' },
    { name: 'Upper Extremity', status: 'Hypertrophy', progress: 42, color: '#8b5cf6', icon: '💪' },
    { name: 'Anatomical Base', status: 'Power', progress: 91, color: '#10b981', icon: '🦵' },
  ];

  const targets = [
    { label: 'Chest Width', current: '104cm', target: '112cm', progress: 45, type: 'Hypertrophy' },
    { label: 'Waist Diameter', current: '78cm', target: '72cm', progress: 82, type: 'Reduction' },
    { label: 'Quad Volume', current: '62cm', target: '68cm', progress: 30, type: 'Hypertrophy' },
    { label: 'Bicep Peak', current: '41cm', target: '44cm', progress: 55, type: 'Peak' },
  ];

  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>Architectural Blueprint</p>
          <h2 className="text-display" style={{ fontSize: '2rem' }}>Physique Matrix</h2>
          <p className="text-secondary">Precision morphing targets and regional dominance tracking.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-primary">
            <Layers size={18} /> EDIT BLUEPRINT
          </button>
        </div>
      </div>

      <div className="stagger-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {zones.map((zone, idx) => (
          <div key={idx} className="glass-card" style={{ 
            padding: '1.5rem', borderLeft: `4px solid ${zone.color}`,
            cursor: 'pointer', transition: 'all 0.3s ease',
            background: activeZone === zone.name ? 'var(--bg-elevated)' : 'var(--bg-card)'
          }} onClick={() => setActiveTab(zone.name)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>{zone.icon}</span>
              <span className="badge" style={{ background: `${zone.color}22`, color: zone.color }}>{zone.status}</span>
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem' }}>{zone.name}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1, height: '6px', background: 'var(--bg-dark)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${zone.progress}%`, height: '100%', background: zone.color }} />
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--text-2)' }}>{zone.progress}%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dual-grid">
        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
             <Target size={24} color="var(--accent)" />
             <h3 className="text-display" style={{ fontSize: '1.5rem', margin: 0 }}>Metric Targets</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {targets.map((t, i) => (
              <div key={i} style={{ padding: '1.25rem', background: 'var(--bg-dark)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <p style={{ fontWeight: 800, fontSize: '0.95rem' }}>{t.label}</p>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '4px' }}>{t.type}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{t.current} / <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{t.target}</span></div>
                  <div style={{ width: '150px', height: '6px', background: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${t.progress}%`, height: '100%', background: 'var(--accent)' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Shield size={24} color="var(--success)" />
              <h3 className="text-display" style={{ fontSize: '1.5rem', margin: 0 }}>Anatomic Strategy</h3>
           </div>
           <p className="text-secondary">Current focus is on creating a tapered silhouette by prioritizing shoulder width (medial deltoids) and reducing abdominal circumference.</p>
           
           <div style={{ marginTop: 'auto', padding: '1.5rem', background: 'var(--accent-soft)', borderRadius: '16px', border: '1px solid var(--border-glow)' }}>
              <h4 style={{ color: 'var(--accent)', fontWeight: 900, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} /> Strategic Leverage
              </h4>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>Increase training frequency for lagging muscle groups to 3x per week while maintaining a caloric deficit of 250kcal.</p>
           </div>
        </div>
      </div>
    </div>
  );
}
