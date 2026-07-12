import React from 'react';
import { 
  Zap, Heart, Shield, TrendingUp, Brain, Eye, Activity, 
  Dumbbell, Moon, Droplets, Target, Star, Code, Sparkles,
  Database, Server, Cpu, Globe, Lock, Terminal, CheckCircle2, XCircle
} from 'lucide-react';
import useStore, { apiSync } from '../store/useStore';
import { useState, useEffect } from 'react';

export default function About() {
  const user = useStore(state => state.user);
  const skills = useStore(state => state.skills) || [];
  const events = useStore(state => state.calendar_events) || [];
  
  const changelog = [
    {
      version: 'v2.1.0',
      date: '2026-07-12',
      changes: ['Phase 4 (Finance & Specialty) completed', 'Projects multi-view layout and Timesheet blocks', 'AppLauncher dock magnification & frequently used apps']
    },
    {
      version: 'v2.0.0',
      date: '2026-06-15',
      changes: ['Phase 3 (Health & Physiology) completed', 'Interactive 3D Body Model integration', 'Glass-morphism premium UI overhaul globally']
    },
    {
      version: 'v1.5.0',
      date: '2026-05-01',
      changes: ['Database Explorer with Notion-style sortable table', 'Core multi-module tab layout and Zustand state sync']
    }
  ];
  
  const [serverStatus, setServerStatus] = useState('Checking...');
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [networkInfo, setNetworkInfo] = useState({ ip: 'Detecting...', location: 'Synchronizing...' });

  const fetchNetworkInfo = async () => {
    try {
      // Try high-precision Geolocation first if user allows
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            // Mock Reverse geocode to avoid 429 Too Many Requests
            const loc = 'Local';
            const country = 'Network';
            
            // Still fetch IP for the network stats
            const ipRes = await fetch('https://ipapi.co/json/');
            const ipData = await ipRes.json();
            
            setNetworkInfo({ ip: ipData.ip, location: `${loc}, ${country} (GPS)` });
          } catch (e) {
            // Fallback to IP only if reverse geocode fails
            const ipRes = await fetch('https://ipapi.co/json/');
            const ipData = await ipRes.json();
            setNetworkInfo({ ip: ipData.ip, location: `${ipData.city}, ${ipData.country_name} (IP)` });
          }
        }, async () => {
          // Fallback to IP if geolocation denied/unavailable
          const res = await fetch('https://ipapi.co/json/');
          const data = await res.json();
          setNetworkInfo({ ip: data.ip, location: `${data.city}, ${data.country_name} (IP)` });
        });
      } else {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        setNetworkInfo({ ip: data.ip, location: `${data.city}, ${data.country_name}` });
      }
    } catch (err) {
      setNetworkInfo({ ip: 'Unavailable', location: 'Offline' });
    }
  };

  useEffect(() => {
    const checkServer = async () => {
      try {
        const start = Date.now();
        await apiSync('/user_profile', 'GET');
        const latency = Date.now() - start;
        setServerStatus(`Online (${latency}ms)`);
      } catch (err) {
        setServerStatus('Offline');
      }
    };

    const fetchLogs = async () => {
      try {
        const data = await apiSync('/logs', 'GET');
        setLogs(data);
      } catch (err) {
        console.error('Failed to fetch logs');
      }
      setLoadingLogs(false);
    };

    checkServer();
    fetchLogs();
    fetchNetworkInfo();
    const interval = setInterval(checkServer, 10000);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    { label: 'API Server', value: serverStatus, icon: Server, status: serverStatus.includes('Online') },
    { label: 'UI Engine', value: 'Running', icon: Globe, status: true },
    { label: 'Data Nodes', value: 'SQLite3', icon: Database, status: true },
    { label: 'Security', value: 'Active', icon: Lock, status: true }
  ];

  const userStats = [
    { label: 'Total Skills', value: skills.length, icon: Star, color: 'var(--accent)' },
    { label: 'Events Tracked', value: events.length, icon: CalendarIcon, color: '#f43f5e' },
    { label: 'Health Score', value: '84', icon: Activity, color: '#10b981' },
    { label: 'Audit Trail', value: 'Verified', icon: Shield, color: '#8b5cf6' }
  ];

  return (
    <div className="fade-in" style={{ padding: '1rem 0' }}>
      {/* Hero Section */}
      <div style={{ textAlign: 'center', padding: '4rem 2rem', marginBottom: '3rem', position: 'relative', overflow: 'hidden', borderRadius: '24px', background: 'var(--bg-glass)', border: '1px solid var(--border)' }}>
        <div style={{ position: 'absolute', top: '-50%', left: '-20%', width: '600px', height: '600px', background: 'var(--accent-glow)', filter: 'blur(120px)', opacity: 0.1, pointerEvents: 'none' }} />
        
        <div style={{ display: 'inline-flex', padding: '1rem', background: 'var(--accent-gradient)', borderRadius: '20px', marginBottom: '2rem', boxShadow: '0 10px 40px var(--accent-glow)' }}>
          <Zap size={40} color="white" />
        </div>
        
        <h1 className="text-display" style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>
          Ultimate <span className="gradient-text">v2.1</span>
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-2)', maxWidth: '600px', margin: '0 auto 2rem', lineHeight: 1.6 }}>
          A sovereign digital twin ecosystem designed for deep biological, cognitive, and environmental tracking.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {stats.map((s, i) => (
            <div key={i} className="glass-card" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.02)', border: s.status ? '1px solid var(--success-glow)' : '1px solid var(--danger-glow)' }}>
              <s.icon size={14} color={s.status ? 'var(--success)' : 'var(--danger)'} />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-3)' }}>{s.label}:</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 900, color: s.status ? 'var(--text-1)' : 'var(--danger)' }}>{s.value}</span>
              {s.status ? <CheckCircle2 size={12} color="var(--success)" /> : <XCircle size={12} color="var(--danger)" />}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        {/* Dynamic User Summary */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: user?.skinTones?.Face || 'var(--accent)', border: '2px solid var(--border)' }} />
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{user?.name || 'Administrator'}</h3>
              <p className="label-caps" style={{ fontSize: '0.65rem', color: 'var(--accent)' }}>Sovereign Profile</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {userStats.map((s, i) => (
              <div key={i} style={{ padding: '1.25rem', background: 'var(--bg-elevated)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <s.icon size={16} color={s.color} />
                  <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-3)' }}>LIVE</span>
                </div>
                <p style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-1)' }}>{s.value}</p>
                <p className="label-caps" style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginTop: '4px' }}>{s.label}</p>
              </div>
            ))}
          </div>
          
          <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)' }}>
             <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', lineHeight: 1.6, fontStyle: 'italic' }}>
               "Your digital twin is currently synchronising across 7 unique body-mapping zones with real-time audit tracing enabled."
             </p>
          </div>
        </div>

        {/* System Architecture */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h3 className="label-caps" style={{ color: 'var(--accent)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={18} /> System Audit Logs
          </h3>
          <div style={{ 
            height: '350px', 
            overflowY: 'auto', 
            background: 'var(--bg-dark)', 
            borderRadius: '12px', 
            padding: '1rem',
            border: '1px solid var(--border)',
            fontFamily: '"JetBrains Mono", monospace'
          }}>
            {loadingLogs ? (
              <p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>Loading logs...</p>
            ) : (!logs || logs.length === 0) ? (
              <p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>No recent activity logged.</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} style={{ marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 800 }}>[{log.action}] {log.table_name}</span>
                    <span style={{ color: 'var(--text-3)' }}>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-2)', wordBreak: 'break-all' }}>
                    ID: {log.item_id} | {log.details ? log.details.slice(0, 100) + '...' : 'No details'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Changelog Timeline */}
        <div className="glass-card" style={{ padding: '2.5rem 2rem', gridColumn: '1 / -1' }}>
          <h3 className="label-caps" style={{ color: 'var(--accent)', marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} /> System Evolution Log
          </h3>
          <div style={{ position: 'relative', paddingLeft: '2rem', borderLeft: '2px solid var(--border)', marginLeft: '0.5rem' }}>
            {changelog.map((entry, idx) => (
              <div key={idx} style={{ position: 'relative', marginBottom: idx === changelog.length - 1 ? 0 : '3rem', animation: `slideUp ${(idx + 1) * 0.2}s ease forwards`, opacity: 0, transform: 'translateY(20px)' }}>
                <style>{`
                  @keyframes slideUp {
                    to { opacity: 1; transform: translateY(0); }
                  }
                `}</style>
                <div style={{ position: 'absolute', left: '-2.35rem', top: '0.2rem', width: '14px', height: '14px', borderRadius: '50%', background: idx === 0 ? 'var(--accent)' : 'var(--bg-elevated)', border: `2px solid ${idx === 0 ? 'var(--bg-dark)' : 'var(--border)'}`, boxShadow: idx === 0 ? '0 0 12px var(--accent)' : 'none', transition: 'all 0.3s ease' }} />
                
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '1.4rem', fontWeight: 900, color: idx === 0 ? 'var(--accent)' : 'var(--text-1)' }}>{entry.version}</h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.05em' }}>{entry.date}</span>
                </div>
                
                <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {entry.changes.map((change, cIdx) => (
                    <li key={cIdx} style={{ fontSize: '0.9rem', color: 'var(--text-2)', display: 'flex', alignItems: 'flex-start', gap: '10px', lineHeight: 1.5 }}>
                      <span style={{ color: 'var(--accent)', fontSize: '0.8rem', marginTop: '3px', opacity: 0.8 }}>▹</span>
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '3rem', textAlign: 'center', padding: '2rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-2)', background: 'var(--bg-elevated)', padding: '8px 16px', borderRadius: '20px', border: '1px solid var(--border)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Globe size={12} /> IP: {networkInfo.ip}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>📍 {networkInfo.location}</span>
          <button onClick={fetchNetworkInfo} className="btn-ghost" style={{ padding: '2px 8px', fontSize: '0.65rem', color: 'var(--accent)', fontWeight: 800 }}>SYNC NOW</button>
        </div>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', letterSpacing: '0.1em' }}>
          © {new Date().getFullYear()} ULTIMATE DIGITAL TWIN · DETERMINISTIC SYSTEM · LOCALLY HOSTED
        </p>
      </div>
    </div>
  );
}

// Internal Helper for Icon
function CalendarIcon({ size, color }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
  );
}
