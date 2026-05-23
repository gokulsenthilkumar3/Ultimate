import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Zap, Target, Flame, Droplets, Moon,
  TrendingUp, Activity, ArrowUpRight, Shield, Clock,
  Calendar as CalendarIcon, CloudRain, Wind, Sunrise, Sunset,
  Quote, Plus, Minus, ArrowDownRight, Compass, Gauge,
  Thermometer, Droplet, Wind as WindIcon, Sun, Cloud, Eye
} from 'lucide-react';
import useStore from '../store/useStore';
import AnimatedNumber from './ui/AnimatedNumber';

/** Map US-AQI value → human-readable label + colour */
function aqiMeta(val) {
  if (val <= 0)  return { label: '--',          color: 'var(--text-3)' };
  if (val <= 50) return { label: 'Good',         color: '#10b981' };
  if (val <= 100) return { label: 'Moderate',    color: '#f59e0b' };
  if (val <= 150) return { label: 'USG',         color: '#f97316' };
  if (val <= 200) return { label: 'Unhealthy',   color: '#ef4444' };
  if (val <= 300) return { label: 'Very Unhealthy', color: '#a855f7' };
  return               { label: 'Hazardous',    color: '#7f1d1d' };
}

/** Derive a weather condition string from Open-Meteo current data */
function deriveCondition(current) {
  if (!current) return '--';
  const { precipitation, temperature_2m: t, relative_humidity_2m: rh } = current;
  if (precipitation > 1)  return 'Rainy';
  if (precipitation > 0)  return 'Drizzle';
  if (t > 35)             return 'Hot & Sunny';
  if (t > 28)             return 'Sunny';
  if (rh > 85)            return 'Humid & Cloudy';
  if (t < 15)             return 'Cold & Clear';
  return 'Clear';
}

export default function Overview({ user }) {
  const metric_logs  = useStore(s => s.metric_logs);
  const tasks        = useStore(s => s.tasks) || [];
  const habits       = useStore(s => s.habits) || [];
  const goals        = useStore(s => s.goals) || [];
  const sleep_logs   = useStore(s => s.sleep_logs) || [];
  const updateUserSlice = useStore(s => s.updateUserSlice);

  // ── Health Score (dynamic) ──────────────────────────────────────────────────
  const healthScore = useMemo(() => {
    let score = 60;
    if (user?.weight && user?.height) {
      const bmiVal = user.weight / Math.pow(user.height / 100, 2);
      if (bmiVal >= 18.5 && bmiVal <= 24.9) score += 10;
    }
    if (metric_logs && metric_logs.length > 0) score += 5;
    if (sleep_logs.length > 0) {
      const avgSleep = sleep_logs.slice(-7).reduce((a, l) => a + (l.hours || 0), 0) / Math.min(7, sleep_logs.length);
      if (avgSleep >= 7) score += 10;
    } else if (user?.sleep?.logs?.length > 0) {
      const avgSleep = user.sleep.logs.slice(-7).reduce((a, l) => a + l.hours, 0) / Math.min(7, user.sleep.logs.length);
      if (avgSleep >= 7) score += 10;
    }
    if (user?.checkIns?.length > 0) score += 5;
    if (user?.goals?.primary || goals.length > 0) score += 5;
    if ((user?.hydration?.glasses || 0) >= 8) score += 5;
    return Math.min(100, score);
  }, [user, metric_logs, sleep_logs, goals]);

  const [time, setTime] = useState(new Date());
  const [waterGlasses, setWaterGlassesLocal] = useState(user?.hydration?.glasses || 0);
  const setWaterGlasses = useCallback((val) => {
    setWaterGlassesLocal(val);
    updateUserSlice('hydration', { glasses: val });
  }, [updateUserSlice]);

  // ── Latest metric log ───────────────────────────────────────────────────────
  const latestLog = useMemo(() => {
    if (!metric_logs || metric_logs.length === 0) return null;
    return [...metric_logs].sort((a, b) => b.date.localeCompare(a.date))[0];
  }, [metric_logs]);

  const height        = user?.height || 175;
  const currentWeight = latestLog?.weight || user?.weight || 63;
  const bmi           = (currentWeight / Math.pow(height / 100, 2)).toFixed(1);

  // ── Weather / AQI state ─────────────────────────────────────────────────────
  const [weather, setWeather] = useState({
    temp: '--°C', condition: '--', humidity: '--%',
    aqi: '--', aqiLabel: '--', aqiColor: 'var(--text-3)',
    windSpeed: '-- km/h', windDir: '--', uv: '--',
    precip: '--', pressure: '-- hPa', visibility: '-- km',
    locationName: 'Detecting…',
  });
  const [geoError, setGeoError] = useState(null);

  const weatherFetched = useRef(false);
  useEffect(() => {
    if (weatherFetched.current) return;
    weatherFetched.current = true;

    const fetchWeather = async (latitude, longitude, locationName = null) => {
      try {
        const [res, aqiRes] = await Promise.all([
          fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
            `&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,surface_pressure,visibility` +
            `&hourly=uv_index&timezone=auto`
          ),
          fetch(
            `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=us_aqi`
          ).catch(() => null),
        ]);

        const data    = await res.json();
        const aqiData = aqiRes ? await aqiRes.json().catch(() => null) : null;

        if (data?.current) {
          const wDir = (deg) => {
            const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
            return dirs[Math.round(deg / 22.5) % 16];
          };
          const uvHour = new Date().getHours();
          const uv     = Math.round(data.hourly?.uv_index?.[uvHour] ?? 4);
          const aqiVal = Math.round(aqiData?.current?.us_aqi ?? 0);
          const { label: aqiLabel, color: aqiColor } = aqiMeta(aqiVal);

          setGeoError(null);
          setWeather({
            temp:         `${Math.round(data.current.temperature_2m)}°C`,
            condition:    deriveCondition(data.current),
            humidity:     `${Math.round(data.current.relative_humidity_2m)}%`,
            aqi:          aqiVal > 0 ? String(aqiVal) : '--',
            aqiLabel,
            aqiColor,
            windSpeed:    `${Math.round(data.current.wind_speed_10m)} km/h`,
            windDir:      wDir(data.current.wind_direction_10m),
            uv:           `${uv} (${uv > 7 ? 'High' : uv > 3 ? 'Moderate' : 'Low'})`,
            precip:       `${data.current.precipitation} mm`,
            pressure:     `${Math.round(data.current.surface_pressure)} hPa`,
            visibility:   `${(data.current.visibility / 1000).toFixed(1)} km`,
            locationName: locationName || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
          });
        }
      } catch (err) {
        console.warn('Weather fetch failed', err);
        setGeoError('Weather data unavailable');
      }
    };

    const fallbackFetch = () =>
      fetchWeather(
        user?.location?.lat ?? 11.1271,
        user?.location?.lon ?? 78.6569,
        user?.location_name || 'Tamil Nadu, IN',
      );

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          // Reverse-geocode display name via Open-Meteo (no API key)
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
            .then(r => r.json())
            .then(geo => {
              const name = geo?.address?.town || geo?.address?.city || geo?.address?.county || null;
              fetchWeather(latitude, longitude, name);
            })
            .catch(() => fetchWeather(latitude, longitude, null));
        },
        (err) => {
          setGeoError(`Location access denied — using ${user?.location_name || 'Tamil Nadu'} fallback`);
          fallbackFetch();
        },
        { timeout: 6000, maximumAge: 300_000 }
      );
    } else {
      fallbackFetch();
    }

    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── KPI vitals ──────────────────────────────────────────────────────────────
  const vitals = [
    { label: 'Health Score', value: healthScore, unit: '/100', icon: Zap,      color: 'var(--accent)', trend: '+3',  state: 'optimal' },
    { label: 'Weight',       value: currentWeight, unit: 'kg', icon: Activity, color: '#3b82f6',       trend: latestLog ? 'LIVE' : '+0.5', state: 'stable' },
    { label: 'BMI',          value: bmi,           unit: '',   icon: Gauge,    color: '#10b981',       trend: 'STABLE', state: 'normal' },
    { label: 'Body Fat',     value: `${user?.bodyFat || 22}`, unit: '%', icon: Flame, color: '#f43f5e', trend: '-1.2', state: 'cutting' },
  ];

  const hour     = time.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

  // ── Strategic Priorities from real store data ───────────────────────────────
  const completedTasks  = tasks.filter(t => t.completed).length;
  const taskProgress    = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const taskTarget      = tasks.length ? `${completedTasks}/${tasks.length} completed` : 'No tasks yet';

  const allSleepLogs  = sleep_logs.length > 0 ? sleep_logs : (user?.sleep?.logs || []);
  const avgSleep      = allSleepLogs.length
    ? (allSleepLogs.slice(-7).reduce((a, b) => a + (b.hours || 0), 0) / Math.min(7, allSleepLogs.length))
    : 0;
  const sleepProgress = Math.min(100, Math.round((avgSleep / 7.5) * 100));
  const sleepTarget   = allSleepLogs.length ? `${avgSleep.toFixed(1)}h avg (7d)` : 'No logs yet';

  const hydrationProgress = Math.min(100, Math.round(((user?.hydration?.glasses || 0) / 8) * 100));
  const hydrationTarget   = `${user?.hydration?.glasses || 0}/8 glasses`;

  const today         = new Date().toISOString().slice(0, 10);
  const habitsToday   = habits.filter(h => h.logs?.some(l => l.date === today && l.completed));
  const habitProgress = habits.length ? Math.round((habitsToday.length / habits.length) * 100) : 0;
  const habitTarget   = habits.length ? `${habitsToday.length}/${habits.length} today` : 'No habits set';

  const activeGoals    = goals.filter(g => !g.completed && !g.archived);
  const completedGoals = goals.filter(g => g.completed);
  const goalProgress   = goals.length ? Math.round((completedGoals.length / goals.length) * 100) : 0;
  const goalTarget     = goals.length ? `${completedGoals.length}/${goals.length} achieved` : 'Set your first goal';

  const priorities = [
    { label: 'Task Execution',   target: taskTarget,        progress: taskProgress,      color: 'var(--accent)' },
    { label: 'Sleep Recovery',   target: sleepTarget,       progress: sleepProgress,     color: '#8b5cf6' },
    { label: 'Daily Hydration',  target: hydrationTarget,   progress: hydrationProgress, color: '#0ea5e9' },
    { label: 'Habit Completion', target: habitTarget,       progress: habitProgress,     color: '#f59e0b' },
    { label: 'Goal Progress',    target: goalTarget,        progress: goalProgress,      color: '#10b981' },
  ];

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
            {geoError
              ? <span style={{ color: '#f59e0b', fontSize: '0.8rem' }}>⚠ {geoError}</span>
              : 'Environment and physiology are within target operating ranges.'}
          </p>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', border: '1px solid var(--accent-soft)' }}>
          <p className="label-caps" style={{ color: 'var(--text-3)', fontSize: '0.65rem' }}>{time.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--text-1)' }}>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          {weather.locationName && weather.locationName !== 'Detecting…' && (
            <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '4px' }}>📍 {weather.locationName}</p>
          )}
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
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: v.trend.includes('-') ? '#f43f5e' : '#10b981', background: v.trend.includes('-') ? 'rgba(244,63,94,0.1)' : 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '6px' }}>{v.trend}</span>
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

      {/* Main Grid: Environment + Strategic Priorities */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Environmental Sensors */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h3 className="card-title" style={{ margin: 0 }}><Compass size={20} /> Environmental Sensors</h3>
            <span className="badge" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>NOMINAL</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem' }}>
            {[
              { label: 'Outside Temp', value: weather.temp,       icon: Thermometer, color: '#f59e0b' },
              { label: 'Humidity',     value: weather.humidity,   icon: Droplet,     color: '#0ea5e9' },
              { label: 'Wind Speed',   value: weather.windSpeed,  icon: WindIcon,    color: '#94a3b8' },
              {
                label: 'Air Quality',
                value: weather.aqi !== '--' ? `${weather.aqi} · ${weather.aqiLabel}` : weather.aqi,
                icon: Wind,
                color: weather.aqiColor,
              },
              { label: 'UV Index',     value: weather.uv,         icon: Sun,         color: '#f59e0b' },
              { label: 'Wind Dir',     value: weather.windDir,    icon: Compass,     color: '#8b5cf6' },
              { label: 'Pressure',     value: weather.pressure,   icon: Gauge,       color: '#6366f1' },
              { label: 'Visibility',   value: weather.visibility, icon: Eye,         color: '#ec4899' },
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
              {weather.condition !== '--' && <span>Conditions: <span style={{ color: 'var(--text-2)', fontWeight: 700 }}>{weather.condition}</span>. </span>}
              BMI stable at <span style={{ color: 'var(--accent)', fontWeight: 800 }}>{bmi}</span>.{' '}
              Last weigh-in: <span style={{ color: 'var(--text-2)', fontWeight: 700 }}>{latestLog ? latestLog.date : 'Initial Profile'}</span>.
            </p>
          </div>
        </div>

        {/* Strategic Priorities — real store data */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card" style={{ flex: 1, padding: '1.75rem' }}>
            <h3 className="card-title"><Target size={18} /> Strategic Priorities</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', marginTop: '1rem' }}>
              {priorities.map((g, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-1)' }}>{g.label}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{g.target}</span>
                  </div>
                  <div style={{ width: '100%', height: '5px', background: 'var(--bg-dark)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${g.progress}%`, height: '100%', background: g.color, transition: 'width 0.6s ease', borderRadius: '3px' }} />
                  </div>
                  <div style={{ textAlign: 'right', marginTop: '2px' }}>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-3)' }}>{g.progress}%</span>
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
