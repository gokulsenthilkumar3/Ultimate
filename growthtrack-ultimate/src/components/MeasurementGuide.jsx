import React from 'react';
import { Ruler, Info, Target, CheckCircle } from 'lucide-react';
import { USER } from '../data/userData';

export default function MeasurementGuide({ onClose }) {
  const measurements = USER.bodyMeasurements;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(5,8,16,0.95)', backdropFilter: 'blur(20px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000,
      padding: '2rem'
    }}>
      <div className="glass-card stagger-container" style={{ 
        width: '100%', maxWidth: '1000px', maxHeight: '90vh', 
        padding: '2.5rem', overflowY: 'auto', border: '1px solid var(--accent)' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ background: 'var(--accent)', padding: '10px', borderRadius: '12px' }}>
               <Ruler color="var(--bg-base)" size={24} strokeWidth={3} />
            </div>
            <div>
              <h2 className="text-display" style={{ fontSize: '2rem' }}>Measurement Protocol</h2>
              <p className="text-secondary">Official standards for accurate digital twin calibration.</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '10px 20px' }}>CLOSE GUIDE</button>
        </div>

        <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {Object.entries(measurements).map(([key, data], i) => (
            <div key={key} className="glass-card stagger-item" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 className="label-caps" style={{ color: 'var(--accent)', fontSize: '0.9rem' }}>{key.replace('_', ' ')}</h3>
                <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '20px' }}>
                  {data.priority.split('—')[0]}
                </span>
              </div>
              
              <div style={{ position: 'relative', height: '120px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', marginBottom: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                 {/* Simplified SVG Diagram Placeholder */}
                 <svg width="100%" height="100%" viewBox="0 0 100 40">
                   <rect x="10" y="18" width="80" height="4" rx="2" fill="var(--border)" />
                   <circle cx="10" cy="20" r="3" fill="var(--accent)" />
                   <circle cx="90" cy="20" r="3" fill="var(--accent)" />
                   <text x="50" y="32" textAnchor="middle" fill="var(--text-3)" fontSize="6" fontWeight="800">MEASURE POINT A TO B</text>
                 </svg>
                 <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                    <Info size={14} color="var(--text-3)" />
                 </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1rem' }}>
                 <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.6rem', color: 'var(--text-3)' }}>CURRENT</p>
                    <p style={{ fontSize: '1rem', fontWeight: 900 }}>{data.current_in || data.current + '"'}</p>
                 </div>
                 <div style={{ background: 'var(--accent-glow)', padding: '8px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--accent)' }}>
                    <p style={{ fontSize: '0.6rem', color: 'var(--accent)' }}>TARGET</p>
                    <p style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--accent)' }}>{data.target_in || data.target + '"'}</p>
                 </div>
              </div>

              <p style={{ fontSize: '0.75rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
                 <CheckCircle size={12} color="var(--accent)" style={{ marginRight: '6px', display: 'inline' }} />
                 {data.note}
              </p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '2.5rem', padding: '1.5rem', background: 'var(--accent-glow)', borderRadius: '16px', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', gap: '20px' }}>
           <Target size={32} color="var(--accent)" />
           <div>
              <h4 className="label-caps" style={{ color: 'var(--accent)' }}>Calibration Tip</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-1)' }}>For the most accurate Digital Twin, measure in the morning after waking up. Use a flexible tailor's tape and keep it parallel to the floor.</p>
           </div>
        </div>
      </div>
    </div>
  );
}
