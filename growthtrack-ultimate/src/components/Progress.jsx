import React from 'react';
import { USER } from '../data/userData';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, ReferenceLine, AreaChart, Area
} from 'recharts';
import { TrendingUp, Plus, Calendar } from 'lucide-react';

// Generates a 24-week progressive timeline based on starting point and goals
const generate24WeekData = () => {
  const data = [];
  const startLength = USER.currentLength;
  const startGirth = USER.currentGirth;
  const targetLength = USER.targetLength;
  const targetGirth = USER.targetGirth;
  
  for (let i = 0; i <= 24; i++) {
    const isProjected = i > 4;
    // Linear interpolation for projection
    const progressFactor = i / 24;
    const currentLength = i <= 4 
      ? startLength + (i * 0.025) // Actual fractional gains so far
      : startLength + (4 * 0.025) + ((i - 4) * (targetLength - (startLength + 0.1)) / 20);
      
    const currentGirth = i <= 4
      ? startGirth + (i * 0.02)
      : startGirth + (4 * 0.02) + ((i - 4) * (targetGirth - (startGirth + 0.08)) / 20);

    data.push({
      week: `Wk ${i}`,
      length: parseFloat(currentLength.toFixed(2)),
      girth: parseFloat(currentGirth.toFixed(2)),
      isProjected
    });
  }
  return data;
};

const data = generate24WeekData();

export default function Progress() {
  return (
    <div className="fade-in stagger-container">
      <div className="section-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 className="text-display" style={{ fontSize: '2rem' }}>24-Week Growth Matrix</h2>
          <p className="text-secondary">Progressive tracking of fractional gains against 6-month objectives.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="glass-card" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', height: 'fit-content' }}>
            <Calendar size={14} color="var(--accent)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>WEEK 4 / 24</span>
          </div>
          <button className="btn-primary">
            <Plus size={16} /> Log Metric
          </button>
        </div>
      </div>

      <div className="dashboard-grid">
         {/* Growth Velocity Chart */}
         <div className="glass-card stagger-item" style={{ gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <p className="label-caps">Linear Projection vs Actuals</p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem' }}>
                  <div style={{ width: '8px', height: '8px', background: 'var(--accent)', borderRadius: '2px' }} /> ACTUAL
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', opacity: 0.5 }}>
                  <div style={{ width: '8px', height: '2px', background: 'var(--accent)', border: '1px dashed var(--accent)' }} /> PROJECTED
                </div>
              </div>
            </div>
            
            <div style={{ width: '100%', height: '350px' }}>
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id="colorLength" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorGirth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent-secondary)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--accent-secondary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis 
                      dataKey="week" 
                      stroke="var(--text-3)" 
                      tick={{ fontSize: 10, fontWeight: 600 }} 
                      interval={3}
                    />
                    <YAxis 
                      stroke="var(--text-3)" 
                      tick={{ fontSize: 10, fontWeight: 600 }} 
                      domain={[3, 8.5]} 
                    />
                    <Tooltip 
                      contentStyle={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: '16px', backdropFilter: 'blur(10px)', fontSize: '12px' }} 
                      itemStyle={{ fontWeight: 800 }}
                    />
                    <Area type="monotone" dataKey="length" stroke="var(--accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorLength)" name="Length (in)" />
                    <Area type="monotone" dataKey="girth" stroke="var(--accent-secondary)" strokeWidth={3} fillOpacity={1} fill="url(#colorGirth)" name="Girth (in)" />
                    
                    {/* Visual marker for today */}
                    <ReferenceLine x="Wk 4" stroke="var(--accent)" label={{ value: 'NOW', position: 'top', fill: 'var(--accent)', fontSize: 10, fontWeight: 800 }} strokeDasharray="3 3" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Summary Stats */}
         <div className="glass-card stagger-item" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
            <p className="label-caps">Cumulative Growth</p>
            <div style={{ margin: '1.5rem 0' }}>
               <p className="text-display" style={{ fontSize: '3rem', color: 'var(--accent)', lineHeight: 1 }}>+0.35"</p>
               <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', marginTop: '8px' }}>Global Volume Inc.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--accent)' }}>
               <TrendingUp size={20} />
               <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>+5.8%</span>
            </div>
         </div>

         {/* Timeline Roadmap */}
         <div className="glass-card stagger-item">
            <p className="label-caps" style={{ marginBottom: '1.5rem' }}>Phase Milestones</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               {[
                 { label: 'Conditioning Phase', week: 'Wk 1-6', status: 'ACTIVE', p: 66 },
                 { label: 'Growth Maximizer', week: 'Wk 7-18', status: 'LOCKED', p: 0 },
                 { label: 'De-loading & Solidify', week: 'Wk 19-24', status: 'LOCKED', p: 0 },
               ].map((m, i) => (
                 <div key={i} style={{ padding: '12px', background: 'rgba(0,0,0,0.15)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                       <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>{m.label}</span>
                       <span style={{ fontSize: '0.65rem', color: 'var(--accent)', fontWeight: 800 }}>{m.week}</span>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '999px', overflow: 'hidden' }}>
                       <div style={{ width: `${m.p}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--accent-secondary))' }} />
                    </div>
                 </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
}
