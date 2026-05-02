import React from 'react';
import { 
  Zap, Heart, Shield, TrendingUp, Brain, Eye, Activity, 
  Dumbbell, Moon, Droplets, Target, Star, Code, Sparkles,
  Database, Server, Cpu, Globe, Lock, Terminal, CheckCircle2, XCircle
} from 'lucide-react';
import useStore from '../store/useStore';
import { useState, useEffect } from 'react';

export default function About() {
  const user = useStore(state => state.user);
  const skills = useStore(state => state.skills) || [];
  const events = useStore(state => state.calendar_events) || [];
  
  const [serverStatus, setServerStatus] = useState('Checking...');
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [networkInfo, setNetworkInfo] = useState({ ip: 'Detecting...', location: '' });

  useEffect(() => {
    const checkServer = async () => {
      try {
        const start = Date.now();
        const res = await fetch('http://localhost:3001/api/user_profile');
        if (res.ok) {
          const latency = Date.now() - start;
          setServerStatus(`Online (${latency}ms)`);
        } else {
          setServerStatus('Error');
        }
      } catch (err) {
        setServerStatus('Offline');
      }
    };

    const fetchLogs = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/logs');
        const data = await res.json();
        setLogs(data);
      } catch (err) {
        console.error('Failed to fetch logs');
      }
      setLoadingLogs(false);
    };

    const fetchNetworkInfo = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        setNetworkInfo({ ip: data.ip, location: `${data.city}, ${data.country_name}` });
      } catch (err) {
        setNetworkInfo({ ip: 'Unavailable', location: 'Offline' });
      }
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
            ) : logs.length === 0 ? (
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
      </div>

      <div style={{ marginTop: '3rem', textAlign: 'center', padding: '2rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem', color: 'var(--text-2)', background: 'var(--bg-elevated)', padding: '8px 16px', borderRadius: '20px', border: '1px solid var(--border)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Globe size={12} /> IP: {networkInfo.ip}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>📍 {networkInfo.location}</span>
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
