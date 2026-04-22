import React, { useState } from 'react';
import { USER } from '../data/userData';
import { 
  XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area, LineChart, Line
} from 'recharts';
import { TrendingUp, Plus, Calendar, Database, Heart, Zap } from 'lucide-react';
import MetricLogger from './MetricLogger';
import TransformationPredictor from './TransformationPredictor';
import useLocalStorage from '../hooks/useLocalStorage';

// Generates a 24-week progressive timeline based on starting point and goals
const generate24WeekData = () => {
  const data = [];
  const startLength = USER.currentLength;
  const startGirth = USER.currentGirth;
  const targetLength = USER.targetLength;
  const targetGirth = USER.targetGirth;
  
  for (let i = 0; i <= 24; i++) {
    const isProjected = i > 4;
    const currentLength = i <= 4 
      ? startLength + (i * 0.025) 
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
  const [isLogging, setIsLogging] = useState(false);
  const [logs, setLogs] = useLocalStorage('gt-user-logs', [
    { 
      id: 2, date: '2026-04-15', weight: 63.2, chest: 34.1, shoulders: 42.3, waist: 32.3, arms: 11.8, 
      neck: 14.5, biceps: 11.8, hips: 34.6, thighs: 20.9, calves: 13.8, d_size: 5.9,
      sleep: 6, water: 2, caffeine: 3, stress: 7, hr: 74
    },
    { 
      id: 1, date: '2026-04-01', weight: 63, chest: 34.0, shoulders: 42.1, waist: 32.5, arms: 11.7, 
      neck: 14.2, biceps: 11.5, hips: 34.8, thighs: 20.8, calves: 13.5, d_size: 5.85,
      sleep: 5.5, water: 1.5, caffeine: 4, stress: 8, hr: 78
    }
  ]);

  const handleSaveLog = (newLog) => {
    setLogs([{ ...newLog, id: Date.now() }, ...logs].sort((a,b) => new Date(b.date) - new Date(a.date)));
  };

  const latestLog = logs[0] || {};

  return (
    <div className="fade-in stagger-container">
      {isLogging && <MetricLogger onClose={() => setIsLogging(false)} onSave={handleSaveLog} />}
      
      <div className="section-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="text-display" style={{ fontSize: '2.4rem' }}>Progress Intelligence</h2>
          <p className="text-secondary" style={{ fontSize: '1.1rem' }}>Tracking the evolution of your digital twin across body, lifestyle, and holistic sensory data.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="glass-card" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '10px', height: 'fit-content' }}>
            <Calendar size={16} color="var(--accent)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>CYCLE STAGE: WK 4</span>
          </div>
          <button className="btn-ghost" onClick={() => setIsLogging(true)} style={{ 
            background: 'var(--accent)', color: 'var(--bg-base)', 
            borderColor: 'var(--accent)', padding: '12px 24px',
            boxShadow: '0 8px 30px var(--accent-glow)' 
          }}>
            <Plus size={18} style={{ marginRight: '8px' }} /> NEW LOG ENTRY
          </button>
        </div>
      </div>

      {/* Snapshot Vitals Grid */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
         <div className="glass-card stagger-item pulse-glow" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <p className="label-caps">Current Weight</p>
            <h3 className="text-display" style={{ fontSize: '2rem', margin: '0.5rem 0' }}>{latestLog.weight} <span style={{ fontSize: '1rem' }}>KG</span></h3>
            <div style={{ color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 700 }}>+0.2 FROM LAST</div>
         </div>
         <div className="glass-card stagger-item" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <p className="label-caps">D Size Metric</p>
            <h3 className="text-display" style={{ fontSize: '2rem', margin: '0.5rem 0', color: 'var(--accent)' }}>{latestLog.d_size || '5.9'} <span style={{ fontSize: '1rem' }}>IN</span></h3>
            <div style={{ color: 'var(--text-3)', fontSize: '0.8rem', fontWeight: 700 }}>GOAL: 8.0 IN</div>
         </div>
         <div className="glass-card stagger-item" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <p className="label-caps">Avg Sleep</p>
            <h3 className="text-display" style={{ fontSize: '2rem', margin: '0.5rem 0' }}>{latestLog.sleep} <span style={{ fontSize: '1rem' }}>HRS</span></h3>
            <div style={{ color: latestLog.sleep < 7 ? '#f43f5e' : 'var(--accent)', fontSize: '0.8rem', fontWeight: 700 }}>
              {latestLog.sleep < 7 ? 'DEPRIVATION FLAG' : 'OPTIMAL'}
            </div>
         </div>
         <div className="glass-card stagger-item" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <p className="label-caps">Hydration</p>
            <h3 className="text-display" style={{ fontSize: '2rem', margin: '0.5rem 0' }}>{latestLog.water} <span style={{ fontSize: '1rem' }}>L</span></h3>
            <div style={{ color: '#0ea5e9', fontSize: '0.8rem', fontWeight: 700 }}>TARGET: 3.0L</div>
         </div>
      </div>

      {/* NEW: TRANSFORMATION PREDICTIONS */}
      <div style={{ marginTop: '2rem' }}>
        <TransformationPredictor logs={logs} />
      </div>

      <div className="dashboard-grid">
         {/* Growth Velocity Chart */}
         <div className="glass-card stagger-item" style={{ gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <p className="label-caps">Velocity Matrix</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>Predictive growth vs historical actuals</p>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 700 }}>
                  <div style={{ width: '12px', height: '12px', background: 'var(--accent)', borderRadius: '3px' }} /> LENGTH
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 700 }}>
                  <div style={{ width: '12px', height: '12px', background: 'var(--accent-secondary)', borderRadius: '3px' }} /> GIRTH
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
                    <XAxis dataKey="week" stroke="var(--text-3)" tick={{ fontSize: 10, fontWeight: 700 }} interval={3} />
                    <YAxis stroke="var(--text-3)" tick={{ fontSize: 10, fontWeight: 700 }} domain={[3, 8.5]} />
                    <Tooltip 
                      contentStyle={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: '20px', backdropFilter: 'blur(16px)', fontSize: '13px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} 
                      itemStyle={{ fontWeight: 800, padding: '4px 0' }}
                    />
                    <Area type="monotone" dataKey="length" stroke="var(--accent)" strokeWidth={4} fillOpacity={1} fill="url(#colorLength)" name="Length (in)" strokeLinecap="round" />
                    <Area type="monotone" dataKey="girth" stroke="var(--accent-secondary)" strokeWidth={4} fillOpacity={1} fill="url(#colorGirth)" name="Girth (in)" strokeLinecap="round" />
                    <ReferenceLine x="Wk 4" stroke="var(--accent)" label={{ value: 'CURRENT PHASE', position: 'top', fill: 'var(--accent)', fontSize: 10, fontWeight: 900, letterSpacing: '0.1em' }} strokeDasharray="5 5" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Volume Multiplier */}
         <div className="glass-card stagger-item" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '2rem', left: '0', right: '0' }}>
               <p className="label-caps">Total Transformation</p>
            </div>
            <div style={{ marginTop: '2rem' }}>
               <p className="text-display" style={{ fontSize: '4.5rem', color: 'var(--accent)', lineHeight: 1 }}>+{((latestLog.weight - 63) * 100 / 63).toFixed(1)}%</p>
               <p style={{ fontSize: '1rem', color: 'var(--text-2)', marginTop: '1rem', fontWeight: 600 }}>BODY MASS VELOCITY</p>
            </div>
            <div style={{ margin: '1.5rem auto 0', padding: '8px 16px', background: 'var(--accent-glow)', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--accent)' }}>
               <TrendingUp size={18} strokeWidth={3} />
               <span style={{ fontWeight: 900, fontSize: '0.9rem' }}>OPTIMIZING</span>
            </div>
         </div>
      </div>

       {/* HOLISTIC EVOLUTION MATRIX */}
       <div style={{ marginTop: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
             <Zap color="var(--accent)" size={20} />
             <p className="label-caps" style={{ fontSize: '1rem', letterSpacing: '0.15em' }}>Holistic Evolution Matrix</p>
          </div>
          <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              {[
                { label: 'Cognitive Drive', key: 'memoryPower', val: latestLog.memoryPower || 65, unit: '%', icon: '🧠', color: '#8b5cf6' },
                { label: 'Eye Power', key: 'eyePower', val: latestLog.eyePower || -2.5, unit: 'dp', icon: '👁️', color: '#06b6d4' },
                { label: 'Cardio Stamina', key: 'stamina', val: latestLog.stamina || 40, unit: 'min', icon: '🫀', color: '#f43f5e' },
                { label: 'Flexibility', key: 'flexibility', val: latestLog.flexibility || 15, unit: '%', icon: '🧘', color: '#f59e0b' },
                { label: 'Sense Index', key: 'sight', val: ((latestLog.sight || 60) + (latestLog.hearing || 85) + (latestLog.smell || 80)) / 3, unit: '%', icon: '👂', color: '#10b981' },
                { label: 'Skin Glow', key: 'skinGlow', val: latestLog.skinGlow || 40, unit: '%', icon: '✨', color: '#fbcfe8' }
              ].map((m, i) => {
                const sparkData = logs.slice().reverse().map(l => ({ val: l[m.key] || m.val }));
                const firstVal = sparkData[0]?.val || m.val;
                const trend = m.val - firstVal;
                
                return (
                  <div key={i} className="glass-card stagger-item" style={{ padding: '1.2rem', borderLeft: `3px solid ${m.color}`, display: 'flex', flexDirection: 'column', minHeight: '160px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '1.2rem' }}>{m.icon}</span>
                        <span style={{ fontSize: '0.6rem', fontWeight: 900, color: trend >= 0 ? 'var(--accent)' : '#f43f5e' }}>
                           {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}{m.unit}
                        </span>
                    </div>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '2px' }}>{m.label}</p>
                    <h4 className="text-display" style={{ fontSize: '1.4rem' }}>
                       {m.val.toFixed(1)}<span style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginLeft: '4px' }}>{m.unit}</span>
                    </h4>
                    
                    <div style={{ flex: 1, marginTop: '10px', height: '40px', width: '100%', opacity: 0.8 }}>
                       <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={sparkData}>
                             <defs>
                                <linearGradient id={`grad-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                                   <stop offset="5%" stopColor={m.color} stopOpacity={0.4}/>
                                   <stop offset="95%" stopColor={m.color} stopOpacity={0}/>
                                </linearGradient>
                             </defs>
                             <Area type="monotone" dataKey="val" stroke={m.color} strokeWidth={2} fill={`url(#grad-${m.key})`} dot={false} />
                          </AreaChart>
                       </ResponsiveContainer>
                    </div>
                  </div>
                );
              })}
          </div>
       </div>

      {/* COMPREHENSIVE DATA HISTORY */}
      <div className="dashboard-grid">
         <div className="glass-card stagger-item" style={{ gridColumn: '1 / -1', padding: '0' }}>
            <div style={{ padding: '2rem 2rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                     <Database color="var(--accent)" size={20} />
                  </div>
                  <p className="label-caps" style={{ fontSize: '0.9rem' }}>Comprehensive Log History</p>
               </div>
               <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontWeight: 600 }}>{logs.length} RECORDS TRACKED</p>
            </div>
            
            <div style={{ overflowX: 'auto', padding: '0 1rem 1rem' }}>
               <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', fontSize: '0.85rem' }}>
                  <thead>
                     <tr style={{ textAlign: 'left', color: 'var(--text-3)' }}>
                        <th style={{ padding: '12px 20px', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.1em' }}>Date</th>
                        <th style={{ padding: '12px', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.1em' }}>Weight</th>
                        <th style={{ padding: '12px', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.1em' }}>D Size</th>
                        <th style={{ padding: '12px', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.1em' }}>Wait/Hip</th>
                        <th style={{ padding: '12px', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.1em' }}>Vitals (S/W/C)</th>
                        <th style={{ padding: '12px', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.1em' }}>Holistic</th>
                        <th style={{ padding: '12px', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.1em' }}>Pulse</th>
                     </tr>
                  </thead>
                  <tbody>
                     {logs.map((log, i) => (
                        <tr key={log.id} style={{ 
                          background: 'rgba(255,255,255,0.02)', 
                          transition: 'var(--transition)',
                          borderRadius: '12px'
                        }} className="stagger-item">
                           <td style={{ padding: '18px 20px', color: 'var(--text-1)', fontWeight: 700, borderRadius: '12px 0 0 12px', borderLeft: i === 0 ? '4px solid var(--accent)' : '4px solid transparent' }}>{log.date}</td>
                           <td style={{ padding: '18px 12px', color: 'var(--accent)', fontWeight: 800 }}>{log.weight}kg</td>
                           <td style={{ padding: '18px 12px', fontWeight: 800 }}>{log.d_size}"</td>
                           <td style={{ padding: '18px 12px' }}>
                              <span style={{ color: 'var(--text-2)' }}>{log.waist}"</span> 
                              <span style={{ color: 'var(--text-3)', margin: '0 6px' }}>/</span> 
                              <span style={{ color: 'var(--text-2)' }}>{log.hips}"</span>
                           </td>
                           <td style={{ padding: '18px 12px' }}>
                              <span style={{ background: log.sleep < 6 ? 'rgba(244,63,92,0.1)' : 'rgba(255,255,255,0.05)', color: log.sleep < 6 ? '#f43f5e' : 'var(--text-2)', padding: '4px 8px', borderRadius: '6px', marginRight: '6px', fontWeight: 700 }}>{log.sleep}h</span>
                              <span style={{ background: 'rgba(14,165,233,0.1)', color: '#0ea5e9', padding: '4px 8px', borderRadius: '6px', marginRight: '6px', fontWeight: 700 }}>{log.water}L</span>
                              <span style={{ background: log.caffeine > 3 ? 'rgba(249,115,22,0.1)' : 'rgba(255,255,255,0.05)', color: log.caffeine > 3 ? '#f97316' : 'var(--text-2)', padding: '4px 8px', borderRadius: '6px', fontWeight: 700 }}>{log.caffeine}c</span>
                           </td>
                           <td style={{ padding: '18px 12px' }}>
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                 <span style={{ fontSize: '0.65rem', background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', padding: '2px 6px', borderRadius: '4px' }}>🧠 {log.memoryPower || 65}%</span>
                                 <span style={{ fontSize: '0.65rem', background: 'rgba(6,182,212,0.1)', color: '#06b6d4', padding: '2px 6px', borderRadius: '4px' }}>👁️ {log.eyePower || -2.5}</span>
                                 <span style={{ fontSize: '0.65rem', background: 'rgba(244,63,92,0.1)', color: '#f43f5e', padding: '2px 6px', borderRadius: '4px' }}>🏃 {log.stamina || 40}m</span>
                              </div>
                           </td>
                           <td style={{ padding: '18px 20px', borderRadius: '0 12px 12px 0' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                 <Heart size={14} color="#f43f5e" fill="#f43f5e" opacity={0.5} />
                                 <span style={{ fontWeight: 800 }}>{log.hr} BPM</span>
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
      </div>
    </div>
  );
}
