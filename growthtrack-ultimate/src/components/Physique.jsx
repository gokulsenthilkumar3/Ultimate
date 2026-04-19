import React from 'react';
import { GOLDEN_RATIO, USER } from '../data/userData';
import { Ruler, Award, TrendingUp, ChevronRight } from 'lucide-react';

export default function Physique() {
  return (
    <div className="fade-in stagger-container">
      <div className="section-head">
        <h2 className="text-display" style={{ fontSize: '2rem' }}>Aesthetic Digital Blueprint</h2>
        <p className="text-secondary">Comparing current geometry against the "Greek God" ideal proportions.</p>
      </div>

      <div className="dashboard-grid">
         {/* Main Ratio Comparison */}
         <div className="glass-card stagger-item" style={{ gridColumn: 'span 2', padding: 0 }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <p className="label-caps">Measurement Delta Breakdown</p>
               <div className="btn-ghost" style={{ fontSize: '0.7rem', padding: '4px 10px' }}>Imperial (Inches)</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
               <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', background: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '1rem 1.5rem', color: 'var(--text-3)' }}>ANATOMICAL ZONE</th>
                      <th style={{ padding: '1rem', color: 'var(--text-3)' }}>CURRENT</th>
                      <th style={{ padding: '1rem', color: 'var(--text-3)' }}>IDEAL (RATIO)</th>
                      <th style={{ padding: '1rem', color: 'var(--text-3)' }}>GAP</th>
                      <th style={{ padding: '1rem 1.5rem', color: 'var(--text-3)' }}>PRIORITY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {GOLDEN_RATIO.table.map((row, i) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '1rem 1.5rem', fontWeight: 800 }}>{row.part}</td>
                        <td style={{ padding: '1rem', color: 'var(--text-1)', fontWeight: 600 }}>{row.current_in}</td>
                        <td style={{ padding: '1rem', color: 'var(--accent)', fontWeight: 800 }}>{row.target_in}</td>
                        <td style={{ padding: '1rem' }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: 'var(--accent-rose)', fontWeight: 700 }}>{row.gap}</span>
                           </div>
                        </td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <span style={{ 
                            padding: '4px 12px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 900,
                            background: row.color + '20', color: row.color, border: `1px solid ${row.color}40`,
                            textTransform: 'uppercase'
                          }}>
                            {row.priority}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
         </div>

         {/* Phased Training Plan Timeline */}
         <div className="glass-card stagger-item">
            <p className="label-caps" style={{ marginBottom: '1.5rem' }}>Phased Execution Plan</p>
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
               <div style={{ position: 'absolute', top: '10px', bottom: '10px', left: '7px', width: '2px', background: 'var(--border)' }} />
               
               {[
                 { 
                   phase: "PHASE 1: THE ANABOLIC FOUNDATION", 
                   time: "Month 1–8", 
                   desc: "Focus on Progressive Overload (SBD). Weight target: 73kg.", 
                   current: true,
                   color: 'var(--accent)'
                 },
                 { 
                   phase: "PHASE 2: THE AESTHETIC SCULPT", 
                   time: "Month 9–12", 
                   desc: "Isolation focus to bring up lagging parts (Shoulders, Upper Chest).", 
                   current: false,
                   color: 'var(--text-3)'
                 },
                 { 
                   phase: "PHASE 3: CONDITIONING", 
                   time: "Continuous", 
                   desc: "Body fat maintenance at 10-12% while holding lean mass.", 
                   current: false,
                   color: 'var(--text-3)'
                 }
               ].map((p, idx) => (
                 <div key={idx} style={{ paddingLeft: '2rem', position: 'relative' }}>
                    <div style={{ 
                      position: 'absolute', left: 0, top: '4px', width: '16px', height: '16px', 
                      background: p.current ? p.color : 'var(--bg-base)', border: `2px solid ${p.color}`, 
                      borderRadius: '50%', boxShadow: p.current ? `0 0 10px ${p.color}` : 'none'
                    }} />
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: p.current ? 'var(--text-1)' : 'var(--text-3)' }}>{p.phase}</h4>
                    <p style={{ fontSize: '0.65rem', color: p.color, fontWeight: 700, marginBottom: '4px' }}>{p.time}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-2)', lineHeight: 1.4 }}>{p.desc}</p>
                 </div>
               ))}
            </div>
         </div>

         {/* Aesthetic Insights */}
         <div className="glass-card stagger-item" style={{ background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(245, 158, 11, 0.05) 100%)' }}>
            <p className="label-caps" style={{ marginBottom: '1.25rem' }}>Strategic Leverage Points</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', height: 'fit-content' }}>
                    <Award color="var(--accent)" size={20} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.85rem', fontWeight: 800 }}>The "V-Taper" Unlock</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>Widening your shoulders by 6 inches is the #1 priority. This creates the most dramatic visual change.</p>
                  </div>
               </div>
               <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', height: 'fit-content' }}>
                    <TrendingUp color="var(--accent-secondary)" size={20} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.85rem', fontWeight: 800 }}>Caloric Displacement</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>You need to gain 10kg of lean mass. Target 0.5kg/week increase to avoid fat spillover.</p>
                  </div>
               </div>
               <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', height: 'fit-content' }}>
                    <Ruler color="var(--accent-rose)" size={20} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.85rem', fontWeight: 800 }}>Waist Tapering</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>Shrink 2 inches from the waist. AVOID heavy oblique work to maintain a slim, aesthetic midsection.</p>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
