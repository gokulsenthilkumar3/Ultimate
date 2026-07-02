import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';
import { Layout, TrendingUp, Zap, Activity, Heart, Brain } from 'lucide-react';
import useStore from '../store/useStore';

const TOOLTIP_STYLE = { 
  background: 'var(--bg-glass)', 
  border: '1px solid var(--border)', 
  borderRadius: '12px', 
  color: 'var(--text-1)', 
  backdropFilter: 'blur(12px)',
  fontSize: '0.8rem'
};

export default function Dashboards() {
  const user = useStore(state => state.user);
  const logs = useStore(state => state.metric_logs) || [];

  const radarData = [
    { subject: 'Strength', A: 85, fullMark: 100 },
    { subject: 'Cognitive', A: 72, fullMark: 100 },
    { subject: 'Vascular', A: 60, fullMark: 100 },
    { subject: 'Endurance', A: 45, fullMark: 100 },
    { subject: 'Recovery', A: 90, fullMark: 100 },
    { subject: 'Mobility', A: 55, fullMark: 100 },
  ];

  const correlationData = logs.slice(0, 10).map(l => ({
    date: l.date,
    sleep: l.sleep,
    stress: l.stress || 5,
    weight: l.weight
  })).reverse();

  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>Unified Analytics</p>
          <h2 className="text-display" style={{ fontSize: '2.5rem' }}>Strategic Dashboards</h2>
          <p className="text-secondary">Cross-correlated telemetry and physiological modeling.</p>
        </div>
        <button className="btn-primary">
           <Layout size={18} /> CUSTOMIZE VIEW
        </button>
      </div>

      <div className="stagger-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Bio-Balance Radar */}
        <div className="glass-card" style={{ height: '450px', display: 'flex', flexDirection: 'column' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
              <Brain size={20} color="var(--accent)" />
              <h3 className="text-display" style={{ fontSize: '1.2rem', margin: 0 }}>Physiological Balance</h3>
           </div>
           <div style={{ flex: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="var(--border-strong)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-3)', fontSize: 11, fontWeight: 700 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="Current State"
                    dataKey="A"
                    stroke="var(--accent)"
                    fill="var(--accent)"
                    fillOpacity={0.4}
                  />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </RadarChart>
              </ResponsiveContainer>
           </div>
           <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', textAlign: 'center', marginTop: '1rem' }}>
              Systemic balance across core biological domains.
           </p>
        </div>

        {/* Sleep vs Stress Correlation */}
        <div className="glass-card" style={{ height: '450px', display: 'flex', flexDirection: 'column' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
              <Activity size={20} color="var(--accent)" />
              <h3 className="text-display" style={{ fontSize: '1.2rem', margin: 0 }}>Recovery Correlation</h3>
           </div>
           <div style={{ flex: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={correlationData}>
                  <defs>
                    <linearGradient id="colorSleep" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--text-3)" fontSize={10} tickFormatter={(v) => v.slice(5)} />
                  <YAxis stroke="var(--text-3)" fontSize={10} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="sleep" stroke="var(--accent)" fillOpacity={1} fill="url(#colorSleep)" strokeWidth={3} name="Sleep (Hrs)" />
                  <Line type="monotone" dataKey="stress" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} name="Stress Index" />
                </AreaChart>
              </ResponsiveContainer>
           </div>
           <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', textAlign: 'center', marginTop: '1rem' }}>
              Tracking the inverse relationship between sleep quality and cortisol markers.
           </p>
        </div>
      </div>

      <div className="stagger-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
         <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <Zap size={24} color="var(--accent)" />
            </div>
            <div>
               <p className="label-caps" style={{ fontSize: '0.6rem' }}>Core Efficiency</p>
               <p className="text-display" style={{ fontSize: '1.5rem' }}>92.4%</p>
            </div>
         </div>
         <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(52, 211, 153, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <TrendingUp size={24} color="var(--success)" />
            </div>
            <div>
               <p className="label-caps" style={{ fontSize: '0.6rem' }}>Growth Velocity</p>
               <p className="text-display" style={{ fontSize: '1.5rem' }}>+1.2% / Wk</p>
            </div>
         </div>
         <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(244, 63, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <Heart size={24} color="#f43f5e" />
            </div>
            <div>
               <p className="label-caps" style={{ fontSize: '0.6rem' }}>Cardiac Reserve</p>
               <p className="text-display" style={{ fontSize: '1.5rem' }}>Optimal</p>
            </div>
         </div>
      </div>
    </div>
  );
}
