import React, { useState, useEffect } from 'react';
import {
  Zap, Target, Flame, Droplets, Moon,
  TrendingUp, Activity, ArrowUpRight, Shield, Clock, 
  Calendar as CalendarIcon, CloudRain, Wind, Sunrise, Sunset,
  Quote, Plus, Minus, ArrowDownRight, Compass, Gauge
} from 'lucide-react';
import useStore from '../store/useStore';

export default function Overview({ user }) {
  const healthScore = 84;
  const sleepDebt = user?.sleep?.weeklyDebt || 4.5;

  const [time, setTime] = useState(new Date());
  const [waterGlasses, setWaterGlasses] = useState(user?.hydration?.glasses || 0);
  
  const height = user?.height || 175;
  const weight = user?.weight || 63;
  const bmi = (weight / Math.pow(height / 100, 2)).toFixed(1);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const vitals = [
    { label: 'Health Score', value: healthScore, unit: '/100', icon: Zap, color: 'var(--accent)', trend: '+3', state: 'optimal' },
    { label: 'Weight', value: weight, unit: 'kg', icon: Activity, color: '#3b82f6', trend: '+0.5', state: 'bulking' },
    { label: 'BMI', value: bmi, unit: '', icon: Gauge, color: '#10b981', trend: 'STABLE', state: 'normal' },
    { label: 'Body Fat', value: `${user?.bodyFat || 22}`, unit: '%', icon: Flame, color: '#f43f5e', trend: '-1.2', state: 'cutting' },
  ];

  const environmental = {
    temp: '24°C',
    condition: 'Scattered Clouds',
    humidity: '62%',
    aqi: '45 (Good)',
    windSpeed: '12 km/h',
    windDir: 'NW',
    uv: '3 (Low)',
    visibility: '10 km'
  };

  const priorities = [
    { label: 'Gain Lean Mass', desc: `${weight}kg → ${user?.goal?.weight || 82}kg Target`, progress: Math.round((weight / (user?.goal?.weight || 82)) * 100), color: 'var(--accent)' },
    { label: 'Circadian Rhythm', desc: `${user?.sleep?.avgHours || 5.5}h → 7.5h REM/Deep Target`, progress: Math.round(((user?.sleep?.avgHours || 5.5) / 7.5) * 100), color: '#8b5cf6' },
    { label: 'Fat Oxidation', desc: `${user?.bodyFat || 22}% → ${user?.goal?.bodyFat || 10}% Core Reveal`, progress: Math.round((1 - ((user?.bodyFat || 22) - (user?.goal?.bodyFat || 10)) / (user?.bodyFat || 22)) * 100), color: '#f43f5e' },
  ];

  const alerts = [
    { icon: '⚠️', text: `Sleep debt detected (${sleepDebt} hours behind this week). Prioritize recovery tonight.`, severity: 'critical' },
    { icon: '🧬', text: 'Quarterly blood work & hormone panel is due in 14 days.', severity: 'warning' },
  ];

  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0' }}>
      
      {/* Premium Hero Banner */}
      <div className="glass-card" style={{
        padding: '2.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '2rem',
        background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--accent-soft) 100%)',
        borderLeft: '4px solid var(--accent)', position: 'relative', overflow: 'hidden',
        boxShadow: '0 10px 40px -10px var(--accent-soft)'
      }}>
        <div style={{ position: 'absolute', top: '-50%', right: '-10%', width: '300px', height: '300px', background: 'var(--accent)', filter: 'blur(100px)', opacity: 0.15, pointerEvents: 'none' }} />
        
        <div style={{ zIndex: 1, position: 'relative' }}>
          <p className="label-caps" style={{ marginBottom: '0.6rem', color: 'var(--accent)', letterSpacing: '0.25em' }}>
            System Overview // Live Telemetry
          </p>
          <h2 className="text-display" style={{ fontSize: '3rem', margin: '0 0 0.75rem 0', letterSpacing: '-0.04em' }}>
            {user?.name || 'Commander'}
          </h2>
          <p className="text-secondary" style={{ maxWidth: '500px', lineHeight: 1.6, fontSize: '1rem' }}>
            Digital twin status: <span style={{ color: 'var(--success)', fontWeight: 700 }}>Optimal</span>. 
            All environmental sensors reporting within target thresholds. BMI stable at <span style={{ color: 'var(--accent)', fontWeight: 800 }}>{bmi}</span>.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', zIndex: 1, position: 'relative' }}>
          <div style={{ padding: '1rem 1.5rem', background: 'var(--bg-glass)', borderRadius: '20px', border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', gap: '14px', backdropFilter: 'blur(12px)', boxShadow: 'var(--shadow-card)' }}>
             <Clock size={28} color="var(--accent)" />
             <div>
               <p className="text-display" style={{ fontSize: '1.8rem', lineHeight: 1 }}>
                 {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
               </p>
               <p className="label-caps" style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginTop: '4px' }}>Local Node Time</p>
             </div>
          </div>
        </div>
      </div>

      {/* Environmental Grid */}
      <div className="stagger-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <CloudRain size={22} color="var(--accent)" />
          <div>
            <p style={{ fontSize: '1.2rem', fontWeight: 900 }}>{environmental.temp}</p>
            <p className="label-caps" style={{ fontSize: '0.55rem', color: 'var(--text-3)' }}>{environmental.condition}</p>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Droplets size={22} color="var(--accent)" />
          <div>
            <p style={{ fontSize: '1.2rem', fontWeight: 900 }}>{environmental.humidity}</p>
            <p className="label-caps" style={{ fontSize: '0.55rem', color: 'var(--text-3)' }}>Humidity</p>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Wind size={22} color="var(--accent)" />
          <div>
            <p style={{ fontSize: '1.2rem', fontWeight: 900 }}>{environmental.windSpeed}</p>
            <p className="label-caps" style={{ fontSize: '0.55rem', color: 'var(--text-3)' }}>Wind: {environmental.windDir}</p>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Shield size={22} color="var(--accent)" />
          <div>
            <p style={{ fontSize: '1.2rem', fontWeight: 900 }}>{environmental.aqi}</p>
            <p className="label-caps" style={{ fontSize: '0.55rem', color: 'var(--text-3)' }}>Air Quality</p>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Sunrise size={22} color="var(--accent)" />
          <div>
            <p style={{ fontSize: '1.1rem', fontWeight: 900 }}>05:42 AM</p>
            <p className="label-caps" style={{ fontSize: '0.55rem', color: 'var(--text-3)' }}>Sunrise</p>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Sunset size={22} color="var(--accent)" />
          <div>
            <p style={{ fontSize: '1.1rem', fontWeight: 900 }}>06:38 PM</p>
            <p className="label-caps" style={{ fontSize: '0.55rem', color: 'var(--text-3)' }}>Sunset</p>
          </div>
        </div>
      </div>

      {/* Vitals Grid */}
      <div className="stagger-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {vitals.map((v, i) => {
          const Icon = v.icon;
          const isPositive = v.trend.startsWith('+');
          const displayColor = v.label === 'Health Score' ? 'var(--accent)' : v.color;
          return (
            <div key={i} className="glass-card" style={{ 
              padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem',
              borderTop: v.label === 'Health Score' ? '2px solid var(--accent)' : 'none'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: `${displayColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={24} color={displayColor} />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 900, color: isPositive ? 'var(--success)' : (v.trend === 'STABLE' ? 'var(--text-3)' : 'var(--danger)'), background: isPositive ? 'rgba(52, 211, 153, 0.1)' : 'rgba(255,255,255,0.05)', padding: '5px 12px', borderRadius: '20px' }}>
                  {v.trend}
                </span>
              </div>
              <div>
                <p className="label-caps" style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginBottom: '6px' }}>{v.label}</p>
                <p className="text-display" style={{ fontSize: '2.2rem', color: 'var(--text-1)', lineHeight: 1 }}>
                  {v.value}<span style={{ fontSize: '1rem', color: 'var(--text-3)', fontWeight: 600, marginLeft: '6px' }}>{v.unit}</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="stagger-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '2.5rem' }}>
            <Target size={28} color="var(--accent)" />
            <h3 className="text-display" style={{ fontSize: '1.8rem', margin: 0 }}>Strategic Priorities</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {priorities.map((g, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-1)' }}>{g.label}</span>
                  <span style={{ fontSize: '1rem', fontWeight: 900, color: g.color }}>{g.progress}%</span>
                </div>
                <div style={{ height: '10px', borderRadius: '5px', background: 'var(--bg-dark)', overflow: 'hidden', padding: '1px' }}>
                  <div style={{ width: `${Math.min(g.progress, 100)}%`, height: '100%', borderRadius: '4px', background: g.color, boxShadow: `0 0 15px ${g.color}44` }} />
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginTop: '8px', fontWeight: 500 }}>{g.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
              <Shield size={24} color="var(--danger)" />
              <h3 className="text-display" style={{ fontSize: '1.4rem', margin: 0 }}>Anomalies & Alerts</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {alerts.map((a, i) => (
                <div key={i} style={{ 
                  padding: '1.25rem', borderRadius: '16px', 
                  background: a.severity === 'critical' ? 'rgba(248, 113, 113, 0.08)' : 'rgba(251, 191, 36, 0.08)', 
                  border: `1px solid ${a.severity === 'critical' ? 'rgba(248, 113, 113, 0.15)' : 'rgba(251, 191, 36, 0.15)'}`, 
                  display: 'flex', alignItems: 'flex-start', gap: '14px' 
                }}>
                  <span style={{ fontSize: '1.4rem' }}>{a.icon}</span>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-2)', lineHeight: 1.6, fontWeight: 500 }}>{a.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, var(--bg-card), var(--accent-soft))' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <Droplets size={22} color="var(--accent)" />
                <span className="text-display" style={{ fontSize: '1.2rem' }}>Hydration Logic</span>
              </div>
              <p className="label-caps" style={{ fontSize: '0.65rem' }}>Target: 8 Units (Current: {Math.round((waterGlasses/8)*100)}%)</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              <button onClick={() => setWaterGlasses(Math.max(0, waterGlasses - 1))} className="btn-icon" style={{ background: 'var(--bg-elevated)', width: '36px', height: '36px' }}><Minus size={18}/></button>
              <span className="text-display" style={{ fontSize: '2.4rem' }}>{waterGlasses}</span>
              <button onClick={() => setWaterGlasses(waterGlasses + 1)} className="btn-icon" style={{ background: 'var(--accent)', color: '#fff', width: '36px', height: '36px', boxShadow: '0 4px 12px var(--accent-soft)' }}><Plus size={18}/></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
