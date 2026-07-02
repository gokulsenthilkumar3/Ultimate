import React, { useState, useMemo } from 'react';
import useStore, { selectUser } from '../store/useStore';
import { 
  XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area, LineChart, Line
} from 'recharts';
import { TrendingUp, Plus, Calendar, Database, Heart, Zap } from 'lucide-react';
import MetricLogger from './MetricLogger';
import TransformationPredictor from './TransformationPredictor';

export default function Progress() {
  const user = useStore(selectUser);
  const logs = useStore(state => state.metric_logs) || [];
  const saveMetricLog = useStore(state => state.saveMetricLog);
  const [isLogging, setIsLogging] = useState(false);

  const data = useMemo(() => {
    if (!user) return [];
    const timeline = [];
    const startLength = user.height / 30 || 5.8;
    const startGirth = user.weight / 15 || 4.2;
    const targetLength = (user.height / 30 || 5.8) * 1.2;
    const targetGirth = (user.weight / 15 || 4.2) * 1.1;
    
    for (let i = 0; i <= 24; i++) {
      const isProjected = i > 4;
      const currentLength = i <= 4 
        ? startLength + (i * 0.025) 
        : startLength + (4 * 0.025) + ((i - 4) * (targetLength - (startLength + 0.1)) / 20);
        
      const currentGirth = i <= 4
        ? startGirth + (i * 0.02)
        : startGirth + (4 * 0.02) + ((i - 4) * (targetGirth - (startGirth + 0.08)) / 20);

      timeline.push({
        week: `Wk ${i}`,
        length: parseFloat(currentLength.toFixed(2)),
        girth: parseFloat(currentGirth.toFixed(2)),
        isProjected
      });
    }
    return timeline;
  }, [user]);

  const handleSaveLog = async (newLog) => {
    await saveMetricLog(newLog);
  };

  const latestLog = logs[0] || { weight: user?.weight || 0, d_size: 5.9, sleep: 7, water: 2.5, memoryPower: 65, eyePower: -2.5, stamina: 40, hr: 72 };

  return (
    <div className="fade-in stagger-container">
      {isLogging && <MetricLogger onClose={() => setIsLogging(false)} onSave={handleSaveLog} />}
      
      <div className="section-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="text-display" style={{ fontSize: '2rem' }}>Progress Intelligence</h2>
          <p className="text-secondary" style={{ fontSize: '0.9rem' }}>Tracking the evolution of your digital twin across body, lifestyle, and holistic sensory data.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-primary" onClick={() => setIsLogging(true)}>
            <Plus size={18} /> NEW LOG ENTRY
          </button>
        </div>
      </div>

      {/* Snapshot Vitals Grid */}
      <div className="stagger-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
         <div className="glass-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <p className="label-caps">Current Weight</p>
            <h3 className="text-display" style={{ fontSize: '2rem', margin: '0.5rem 0' }}>{latestLog.weight} <span style={{ fontSize: '1rem' }}>KG</span></h3>
            <div style={{ color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 700 }}>LIVE DATA</div>
         </div>
         <div className="glass-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <p className="label-caps">D Size Metric</p>
            <h3 className="text-display" style={{ fontSize: '2rem', margin: '0.5rem 0', color: 'var(--accent)' }}>{latestLog.d_size} <span style={{ fontSize: '1rem' }}>IN</span></h3>
            <div style={{ color: 'var(--text-3)', fontSize: '0.8rem', fontWeight: 700 }}>TARGET: 8.0 IN</div>
         </div>
         <div className="glass-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <p className="label-caps">Avg Sleep</p>
            <h3 className="text-display" style={{ fontSize: '2rem', margin: '0.5rem 0' }}>{latestLog.sleep} <span style={{ fontSize: '1rem' }}>HRS</span></h3>
            <div style={{ color: latestLog.sleep < 7 ? 'var(--danger)' : 'var(--success)', fontSize: '0.8rem', fontWeight: 700 }}>
              {latestLog.sleep < 7 ? 'RECOVERY NEEDED' : 'OPTIMAL'}
            </div>
         </div>
         <div className="glass-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <p className="label-caps">Hydration</p>
            <h3 className="text-display" style={{ fontSize: '2rem', margin: '0.5rem 0' }}>{latestLog.water} <span style={{ fontSize: '1rem' }}>L</span></h3>
            <div style={{ color: '#0ea5e9', fontSize: '0.8rem', fontWeight: 700 }}>DAILY TARGET</div>
         </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <TransformationPredictor logs={logs} />
      </div>

      <div className="dual-grid" style={{ marginBottom: '2rem' }}>
         <div className="glass-card" style={{ gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
              <p className="label-caps">Velocity Matrix (Wks 0-24)</p>
            </div>
            <div style={{ width: '100%', height: '300px' }}>
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="week" stroke="var(--text-3)" fontSize={10} interval={3} />
                    <YAxis stroke="var(--text-3)" fontSize={10} domain={[3, 8.5]} />
                    <Tooltip contentStyle={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: '12px' }} />
                    <Area type="monotone" dataKey="length" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.1} strokeWidth={3} />
                    <Area type="monotone" dataKey="girth" stroke="var(--accent-secondary)" fill="var(--accent-secondary)" fillOpacity={0.1} strokeWidth={3} />
                    <ReferenceLine x="Wk 4" stroke="var(--accent)" strokeDasharray="3 3" label={{ value: 'NOW', position: 'top', fill: 'var(--accent)', fontSize: 10 }} />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>
      </div>

       {/* Holistic Evolution Matrix */}
       <div className="stagger-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Cognitive', val: latestLog.memoryPower, unit: '%', icon: '🧠', color: '#8b5cf6' },
            { label: 'Eye Power', val: latestLog.eyePower, unit: 'dp', icon: '👁️', color: '#06b6d4' },
            { label: 'Stamina', val: latestLog.stamina, unit: 'm', icon: '🏃', color: '#f43f5e' },
            { label: 'Heart Rate', val: latestLog.hr, unit: 'bpm', icon: '❤️', color: '#10b981' }
          ].map((m, i) => (
            <div key={i} className="glass-card" style={{ padding: '1rem', borderLeft: `3px solid ${m.color}` }}>
              <p style={{ fontSize: '0.6rem', color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 800 }}>{m.label}</p>
              <h4 className="text-display" style={{ fontSize: '1.2rem', marginTop: '4px' }}>
                 {m.val}{m.unit}
              </h4>
            </div>
          ))}
       </div>

      {/* Log History */}
      <div className="glass-card" style={{ padding: 0 }}>
         <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
            <h3 className="card-title" style={{ margin: 0 }}>Metric Audit Log</h3>
            <span className="badge">{logs.length} Entries</span>
         </div>
         <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
               <thead>
                  <tr style={{ fontSize: '0.7rem', color: 'var(--text-3)', textTransform: 'uppercase' }}>
                     <th style={{ padding: '1rem' }}>Date</th>
                     <th style={{ padding: '1rem' }}>Weight</th>
                     <th style={{ padding: '1rem' }}>D Size</th>
                     <th style={{ padding: '1rem' }}>Vitals</th>
                     <th style={{ padding: '1rem' }}>HR</th>
                  </tr>
               </thead>
               <tbody>
                  {logs.map(log => (
                     <tr key={log.id} style={{ borderTop: '1px solid var(--border)', fontSize: '0.85rem' }}>
                        <td style={{ padding: '1rem', fontWeight: 700 }}>{log.date}</td>
                        <td style={{ padding: '1rem' }}>{log.weight}kg</td>
                        <td style={{ padding: '1rem' }}>{log.d_size}"</td>
                        <td style={{ padding: '1rem' }}>{log.sleep}h / {log.water}L</td>
                        <td style={{ padding: '1rem', color: 'var(--accent)', fontWeight: 800 }}>{log.hr}</td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}
