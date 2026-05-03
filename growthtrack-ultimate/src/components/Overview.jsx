import React, { useState, useEffect, useMemo } from 'react';
import {
  Zap, Target, Flame, Droplets, Moon,
  TrendingUp, Activity, ArrowUpRight, Shield, Clock,
  Calendar as CalendarIcon, CloudRain, Wind, Sunrise, Sunset,
  Quote, Plus, Minus, ArrowDownRight, Compass, Gauge,
  Thermometer, Droplet, Wind as WindIcon, Sun, Cloud
} from 'lucide-react';
import useStore from '../store/useStore';
import AnimatedNumber from './ui/AnimatedNumber';

export default function Overview({ user }) {
  const metric_logs = useStore(s => s.metric_logs);
  const healthScore = 84;
  const sleepDebt = user?.sleep?.weeklyDebt || 4.5;

  const [time, setTime] = useState(new Date());
  const [waterGlasses, setWaterGlasses] = useState(user?.hydration?.glasses || 0);
  
  // BMI Logic: use latest log weight if available, else fallback to profile
  const latestLog = useMemo(() => {
    if (!metric_logs || metric_logs.length === 0) return null;
    return [...metric_logs].sort((a, b) => b.date.localeCompare(a.date))[0];
  }, [metric_logs]);

  const height = user?.height || 175;
  const currentWeight = latestLog?.weight || user?.weight || 63;
  const bmi = (currentWeight / Math.pow(height / 100, 2)).toFixed(1);

  // Weather Logic: Dynamic from Open-Meteo API (No API key required)
  const [weather, setWeather] = useState({
    temp: '--°C', condition: '--', humidity: '--%', aqi: '42 (Good)',
    windSpeed: '-- km/h', windDir: '--', uv: '--', precip: '--', pressure: '-- hPa', visibility: '-- km'
  });

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Defaulting to Bangalore, India. 
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=12.9716&longitude=77.5946&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,surface_pressure,visibility&hourly=uv_index&timezone=auto');
        const data = await res.json();
        if (data && data.current) {
          const wDir = (deg) => {
            const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
            return dirs[Math.round(deg / 22.5) % 16];
          };
          const uv = Math.round(data.hourly?.uv_index?.[new Date().getHours()] || 4);
          setWeather({
            temp: `${Math.round(data.current.temperature_2m)}°C`,
            condition: data.current.precipitation > 0 ? 'Rainy' : data.current.temperature_2m > 30 ? 'Sunny' : 'Clear',
            humidity: `${Math.round(data.current.relative_humidity_2m)}%`,
            aqi: '42 (Good)', // Open-Meteo Air Quality is a separate endpoint, keeping static for now
            windSpeed: `${Math.round(data.current.wind_speed_10m)} km/h`,
            windDir: wDir(data.current.wind_direction_10m),
            uv: `${uv} ${uv > 7 ? '(High)' : uv > 3 ? '(Mod)' : '(Low)'}`,
            precip: `${data.current.precipitation}mm`,
            pressure: `${Math.round(data.current.surface_pressure)} hPa`,
            visibility: `${(data.current.visibility / 1000).toFixed(1)} km`
          });
        }
      } catch (err) {
        console.warn('Weather fetch failed', err);
      }
    };
    fetchWeather();

    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const vitals = [
    { label: 'Health Score', value: healthScore, unit: '/100', icon: Zap, color: 'var(--accent)', trend: '+3', state: 'optimal' },
    { label: 'Weight', value: currentWeight, unit: 'kg', icon: Activity, color: '#3b82f6', trend: latestLog ? 'LIVE' : '+0.5', state: 'stable' },
    { label: 'BMI', value: bmi, unit: '', icon: Gauge, color: '#10b981', trend: 'STABLE', state: 'normal' },
    { label: 'Body Fat', value: `${user?.bodyFat || 22}`, unit: '%', icon: Flame, color: '#f43f5e', trend: '-1.2', state: 'cutting' },
  ];

  const hour = time.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="fade-in module-page" style={{ padding: '0.5rem 0' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>Systems Check: {time.toLocaleTimeString()}</p>
          <h2 className="text-display" style={{ fontSize: 'clamp(1.6rem, 5vw, 2.8rem)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {greeting}, <span style={{ color: 'var(--accent)' }}>{user?.name?.split(' ')[0] || 'Operator'}</span>
          </h2>
          <p className="text-secondary" style={{ marginTop: '0.5rem', fontSize: '1rem' }}>
            Environment and physiology are within target operating ranges.
          </p>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', border: '1px solid var(--accent-soft)' }}>
          <p className="label-caps" style={{ color: 'var(--text-3)', fontSize: '0.65rem' }}>{time.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--text-1)' }}>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>

      {/* KPI Vitals Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {vitals.map((v, i) => (
          <div key={i} className="glass-card" style={{ padding: '1.75rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ background: `${v.color}15`, padding: '10px', borderRadius: '12px' }}>
                <v.icon size={22} color={v.color} />
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: v.trend.includes('-') ? '#f43f5e' : '#10b981', background: v.trend.includes('-') ? 'rgba(244,63,94,0.1)' : 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '6px' }}>{v.trend}</span>
              </div>
            </div>
            <p className="label-caps" style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginBottom: '4px' }}>{v.label}</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span className="text-display" style={{ fontSize: '2.2rem' }}>
                {typeof v.value === 'number' ? <AnimatedNumber value={v.value} decimals={v.label === 'Health Score' ? 0 : 1} /> : v.value}
              </span>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-3)', fontWeight: 600 }}>{v.unit}</span>
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: v.state === 'optimal' || v.state === 'normal' ? '#10b981' : 'var(--accent)' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{v.state}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: Telemetry + Sensors */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Environment & Sensors */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h3 className="card-title" style={{ margin: 0 }}><Compass size={20} /> Environmental Sensors</h3>
            <span className="badge" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>NOMINAL</span>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem' }}>
             {[
               { label: 'Outside Temp', value: weather.temp, icon: Thermometer, color: '#f59e0b' },
               { label: 'Humidity', value: weather.humidity, icon: Droplet, color: '#0ea5e9' },
               { label: 'Wind Speed', value: weather.windSpeed, icon: WindIcon, color: '#94a3b8' },
               { label: 'Air Quality', value: weather.aqi, icon: Wind, color: '#10b981' },
               { label: 'UV Index', value: weather.uv, icon: Sun, color: '#f59e0b' },
               { label: 'Wind Dir', value: weather.windDir, icon: Compass, color: '#8b5cf6' },
               { label: 'Pressure', value: weather.pressure, icon: Gauge, color: '#6366f1' },
               { label: 'Visibility', value: weather.visibility, icon: Eye, color: '#ec4899' }
             ].map((s, i) => (
               <div key={i}>
                 <p className="label-caps" style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginBottom: '8px' }}>{s.label}</p>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                   <s.icon size={18} color={s.color} style={{ opacity: 0.8 }} />
                   <span style={{ fontWeight: 800, color: 'var(--text-1)', fontSize: '1.1rem' }}>{s.value}</span>
                 </div>
               </div>
             ))}
          </div>

          <div style={{ marginTop: '2.5rem', padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', border: '1px solid var(--border)' }}>
             <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', lineHeight: 1.6 }}>
               <Shield size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} color="var(--accent)" />
               All environmental sensors reporting within target thresholds. BMI stable at <span style={{ color: 'var(--accent)', fontWeight: 800 }}>{bmi}</span>. 
               Last weigh-in: <span style={{ color: 'var(--text-2)', fontWeight: 700 }}>{latestLog ? latestLog.date : 'Initial Profile'}</span>.
             </p>
          </div>
        </div>

        {/* Daily Progress / Targets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
           <div className="glass-card" style={{ flex: 1, padding: '1.75rem' }}>
              <h3 className="card-title"><Target size={18} /> Strategic Priorities</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                {[
                  { label: 'Hypertrophy Goal', target: 'Gain 0.5kg/wk', progress: 65, color: 'var(--accent)' },
                  { label: 'Sleep Recovery', target: 'Avg 7.5h', progress: 42, color: '#8b5cf6' },
                  { label: 'Lean Mass Retention', target: '2.2g Protein/kg', progress: 88, color: '#10b981' }
                ].map((g, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-1)' }}>{g.label}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{g.progress}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'var(--bg-dark)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${g.progress}%`, height: '100%', background: g.color }} />
                    </div>
                  </div>
                ))}
              </div>
           </div>

           <div className="glass-card" style={{ padding: '1.75rem', background: 'linear-gradient(135deg, var(--accent)22, transparent)', border: '1px solid var(--accent)33' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                 <div style={{ background: 'var(--accent)', color: '#000', padding: '8px', borderRadius: '10px' }}>
                    <Quote size={18} />
                 </div>
                 <h4 className="label-caps" style={{ color: 'var(--accent)', margin: 0 }}>Ambition Directive</h4>
              </div>
              <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.5, fontStyle: 'italic' }}>
                "The resistance you fight physically in the gym and the resistance you fight in life can only build a strong character."
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}

function Eye({ size, color, style }) { return <Compass size={size} color={color} style={style} />; }
