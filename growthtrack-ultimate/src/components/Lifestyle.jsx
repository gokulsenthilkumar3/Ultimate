import React from 'react';
import { LIFESTYLE_TIPS } from '../data/userData';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

export default function Lifestyle() {
  return (
    <div className="fade-in">
      <div className="section-head">
        <h2 className="text-display" style={{ fontSize: '2rem' }}>Lifestyle Optimization</h2>
        <p className="text-secondary">Eliminating triggers that sabotage physical and hormonal progress.</p>
      </div>

      <div className="dashboard-grid">
         {LIFESTYLE_TIPS.map((tip, idx) => (
           <div key={idx} className="glass-card" style={{ 
             borderLeft: tip.urgency === 'CRITICAL' ? '4px solid var(--accent-rose)' : tip.urgency === 'URGENT' ? '4px solid var(--accent-primary)' : '1px solid var(--border-light)'
           }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                 <div style={{ fontSize: '1.5rem', background: 'rgba(255,255,255,0.03)', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {tip.icon}
                 </div>
                 <div>
                    <h3 style={{ fontWeight: 800, fontSize: '1rem' }}>{tip.title}</h3>
                    <p className="label-caps" style={{ color: tip.urgency === 'CRITICAL' ? 'var(--accent-rose)' : 'var(--accent-primary)' }}>{tip.urgency}</p>
                 </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                 {tip.points.map((point, i) => (
                   <div key={i} style={{ display: 'flex', gap: '10px' }}>
                     <CheckCircle2 size={16} color="var(--accent-green)" style={{ flexShrink: 0, marginTop: '2px' }} />
                     <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{point}</p>
                   </div>
                 ))}
              </div>
           </div>
         ))}

         {/* Hard NOs Section */}
         <div className="glass-card" style={{ gridColumn: 'span 2', background: 'rgba(244, 63, 94, 0.05)', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
               <AlertTriangle color="var(--accent-rose)" />
               <h3 style={{ fontWeight: 800, color: 'var(--accent-rose)' }}>Protocol Hard-Limits</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
               <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                 <p style={{ marginBottom: '0.5rem', fontWeight: 600 }}>🚫 Avoid:</p>
                 <ul style={{ listStyle: 'none', color: 'var(--text-secondary)' }}>
                   <li>• Alcohol 24h before training</li>
                   <li>• Caffeine after 12:00 PM</li>
                   <li>• Screens 1h before bed</li>
                   <li>• Skipping Warm-ups</li>
                 </ul>
               </div>
               <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                 <p style={{ marginBottom: '0.5rem', fontWeight: 600 }}>✅ Mandatory:</p>
                 <ul style={{ listStyle: 'none', color: 'var(--text-secondary)' }}>
                   <li>• 3L Water Daily</li>
                   <li>• 8h Sleep Cycle</li>
                   <li>• Post-Meal 10m Walk</li>
                   <li>• Daily Sun Exposure</li>
                 </ul>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
