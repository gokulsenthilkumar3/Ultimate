import React from 'react';
import { MEDICAL_DATA } from '../data/userData';
import { AlertCircle, Activity, Droplets } from 'lucide-react';

export default function Medical() {
  return (
    <div className="fade-in">
      <div className="section-head">
        <h2 className="text-display" style={{ fontSize: '2rem' }}>Medical & Bio-Vitals</h2>
        <p className="text-secondary">Clinical baseline data and required diagnostic testing.</p>
      </div>

      <div className="dashboard-grid">
        <div className="glass-card pulse-glow" style={{ gridColumn: 'span 2', borderColor: 'var(--accent-rose)', background: 'rgba(244, 63, 94, 0.05)' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <AlertCircle color="var(--accent-rose)" size={24} />
            <div>
              <h3 style={{ color: 'var(--accent-rose)', fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Medical Warning</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                At age 23 with symptomatic fatigue and low libido, clinical bloodwork is the #1 non-negotiable step. 
                Do not attempt advanced supplementation without a baseline.
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card stagger-item">
          <p className="label-caps" style={{ marginBottom: '1.5rem', color: 'var(--accent-primary)' }}>Required Blood Panels</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {MEDICAL_DATA.testsRequired.map((test, i) => (
              <div key={i} style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', borderLeft: `4px solid ${test.priority === 'URGENT' ? 'var(--accent-rose)' : 'var(--accent-primary)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                   <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{test.name}</span>
                   <span style={{ fontSize: '0.65rem', fontWeight: 800, color: test.priority === 'URGENT' ? 'var(--accent-rose)' : 'var(--accent-primary)' }}>{test.priority}</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{test.reason}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card stagger-item">
          <p className="label-caps" style={{ marginBottom: '1.5rem' }}>Vitals Log</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px' }}>
                <Activity color="var(--accent-rose)" size={20} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>BLOOD PRESSURE</p>
                  <p style={{ fontSize: '0.9rem', fontWeight: 700 }}>{MEDICAL_DATA.bloodPressure.status}</p>
                </div>
                <button className="btn-ghost" style={{ padding: '6px 12px', fontSize: '0.7rem' }}>LOG</button>
             </div>

             <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px' }}>
                <Droplets color="var(--accent-secondary)" size={20} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>HYDRATION</p>
                  <p style={{ fontSize: '0.9rem', fontWeight: 700 }}>1-2L (POOR)</p>
                </div>
                <button className="btn-ghost" style={{ padding: '6px 12px', fontSize: '0.7rem' }}>LOG</button>
             </div>
          </div>

          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
             <p style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}>Pro-Tip:</p>
             <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Purchase a home BP cuff (~₹1000) for morning/evening tracking.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
