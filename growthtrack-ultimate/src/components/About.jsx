import React, { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import { Info, Server, Globe, Clock, GitBranch, Zap, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const CHANGELOG = [
  { version: '2.0.0', date: '2025-07', type: 'major',   emoji: '🚀', title: 'v2.0 — Digital Twin Engine',
    items: [
      'Complete ground-up rewrite of all 23 modules',
      'Progressive overload tracking with linear progression protocol',
      '365-day GitHub-style habit heatmap with global overview',
      'Goals with milestone subtasks + confetti on completion',
      'SIP Calculator with inflation-adjusted projections & XIRR',
      'Skills RPG tree with XP curves and level-up effects',
      'Cross-domain Analytics with sleep × productivity correlation',
      'Muscle fatigue heatmap in Strength Metrics',
      'App Hub dock with magnification hover effect',
      'Timesheet stopwatch with billable hours tracking',
    ] },
  { version: '1.9.0', date: '2025-04', type: 'minor',   emoji: '✨', title: 'AI + Medical upgrade',
    items: [
      'GrowthTrack AI powered by Gemini with context injection',
      'Medical module: VitalsTimeline + EventTimeline',
      'Physique BF Gauge with gender-specific categorisation',
      'Nutrition: animated SVG macro rings & BMR breakdown',
    ] },
  { version: '1.8.0', date: '2025-01', type: 'minor',   emoji: '📊', title: 'Analytics overhaul',
    items: [
      'Finance: multi-tab Wealth Engine (Overview/Trends/Analytics)',
      'Training: live session logger with rest timer',
      'Notes: tag system and full-text search',
      'Portfolio: sparklines and ROI calculator',
    ] },
  { version: '1.7.0', date: '2024-09', type: 'minor',   emoji: '🔧', title: 'Data & sync layer',
    items: [
      'Postgres backend with apiSync helper',
      'Real-time sync across tabs via BroadcastChannel',
      'CSV import/export for all major data types',
      'Audit log with sentiment analysis',
    ] },
  { version: '1.6.0', date: '2024-06', type: 'minor',   emoji: '🎨', title: 'Design system v2',
    items: [
      'Glass-morphism card system',
      'Dark / Light / AMOLED theme trio',
      'CSS custom property design tokens',
      'Responsive two-column grid layout',
    ] },
  { version: '1.5.0', date: '2024-02', type: 'minor',   emoji: '📱', title: 'Mobile & PWA',
    items: ['PWA manifest + service worker', 'Touch-optimised habit matrix', 'Swipe navigation'] },
  { version: '1.0.0', date: '2023-09', type: 'initial', emoji: '🌱', title: 'Initial release',
    items: ['Core modules: Health, Finance, Tasks', 'Local-first architecture with Zustand', 'Recharts integration'] },
];

const TYPE_COLORS = {
  major:   { bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.4)', text: '#818cf8', badge: 'rgba(99,102,241,0.2)' },
  minor:   { bg: 'rgba(16,185,129,0.06)',  border: 'rgba(16,185,129,0.3)',  text: '#34d399', badge: 'rgba(16,185,129,0.12)' },
  patch:   { bg: 'rgba(245,158,11,0.06)',  border: 'rgba(245,158,11,0.25)', text: '#fbbf24', badge: 'rgba(245,158,11,0.12)' },
  initial: { bg: 'rgba(168,85,247,0.06)',  border: 'rgba(168,85,247,0.3)',  text: '#c084fc', badge: 'rgba(168,85,247,0.12)' },
};

function StatusBadge({ ok, loading, label }) {
  if (loading) return <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--text-3)' }}><Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />{label}</span>;
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: 700, color: ok ? '#10b981' : '#f87171' }}>
      {ok ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
      {label}: {ok ? 'Online' : 'Offline'}
    </span>
  );
}

export default function About() {
  const user = useStore(s => s.user);

  const [serverOk,  setServerOk]  = useState(null);
  const [serverMs,  setServerMs]  = useState(null);
  const [ipInfo,    setIpInfo]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [expanded,  setExpanded]  = useState({ '2.0.0': true });
  const [showAll,   setShowAll]   = useState(false);

  useEffect(() => {
    let cancelled = false;
    const start = Date.now();
    Promise.all([
      fetch('/api/user_profile').then(r => r.ok).catch(() => false),
      fetch('https://ipapi.co/json/').then(r => r.json()).catch(() => null),
    ]).then(([ok, ip]) => {
      if (cancelled) return;
      setServerOk(ok);
      setServerMs(Date.now() - start);
      setIpInfo(ip);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const visibleChangelog = showAll ? CHANGELOG : CHANGELOG.slice(0, 4);

  return (
    <div style={{ padding: '0.5rem 0', maxWidth: '900px' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.35rem' }}>About</p>
        <h2 className="text-display" style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>GrowthTrack Digital Twin</h2>
        <p style={{ color: 'var(--text-3)', fontSize: '0.88rem', lineHeight: 1.65 }}>
          A personal dashboard engine for optimising every dimension of your life — health, productivity, finance, and growth.
          Built with React 19 + Vite, Zustand, Recharts, and a Postgres + Node backend.
        </p>
      </div>

      {/* Status row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Server size={20} color="var(--accent)" />
          <div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>API Server</p>
            <StatusBadge ok={serverOk} loading={loading} label="Backend" />
            {serverMs && <p style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginTop: '2px' }}>{serverMs}ms ping</p>}
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Globe size={20} color="#0ea5e9" />
          <div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Network</p>
            {loading ? <p style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Detecting…</p> : (
              ipInfo ? (
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0ea5e9' }}>{ipInfo.city}, {ipInfo.country_name}</p>
              ) : <p style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Unavailable</p>
            )}
            {ipInfo?.ip && <p style={{ fontSize: '0.6rem', color: 'var(--text-3)', fontFamily: 'monospace', marginTop: '2px' }}>{ipInfo.ip}</p>}
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Zap size={20} color="#f59e0b" />
          <div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stack</p>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b' }}>React 19 + Vite 8</p>
            <p style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginTop: '2px' }}>Zustand · Recharts · Three.js</p>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <GitBranch size={20} color="#8b5cf6" />
          <div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Version</p>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b5cf6' }}>v2.0.0 — Digital Twin Engine</p>
            <p style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginTop: '2px' }}>23 modules · 2025-07</p>
          </div>
        </div>
      </div>

      {/* Tech stack */}
      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <span className="card-title">Tech Stack</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
          {[
            { label: 'React 19',       color: '#61dafb' },
            { label: 'Vite 8',         color: '#646cff' },
            { label: 'Zustand',        color: '#a78bfa' },
            { label: 'Recharts',       color: '#22d3ee' },
            { label: 'Three.js',       color: '#10b981' },
            { label: 'Node.js',        color: '#86efac' },
            { label: 'PostgreSQL',     color: '#4299e1' },
            { label: 'canvas-confetti',color: '#f59e0b' },
            { label: 'Lucide Icons',   color: '#f97316' },
            { label: 'Open-Meteo API', color: '#38bdf8' },
            { label: 'Gemini API',     color: '#34d399' },
            { label: 'Firebase',       color: '#fbbf24' },
          ].map(t => (
            <span key={t.label} style={{ padding: '4px 10px', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 700, background: `${t.color}18`, color: t.color, border: `1px solid ${t.color}44` }}>{t.label}</span>
          ))}
        </div>
      </div>

      {/* Changelog timeline */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <p className="label-caps" style={{ color: 'var(--accent)' }}>Changelog</p>
          <button onClick={() => setShowAll(v => !v)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'underline' }}>
            {showAll ? 'Show less' : 'Show all versions'}
          </button>
        </div>

        <div style={{ position: 'relative' }}>
          {/* Timeline spine */}
          <div style={{ position: 'absolute', left: '19px', top: 0, bottom: 0, width: '2px', background: 'linear-gradient(to bottom, var(--accent), transparent)', borderRadius: '99px' }} />

          {visibleChangelog.map((entry, idx) => {
            const tc = TYPE_COLORS[entry.type] || TYPE_COLORS.minor;
            const isOpen = expanded[entry.version];
            return (
              <div key={entry.version} style={{
                marginBottom: '1rem', paddingLeft: '52px', position: 'relative',
                animation: `fadeIn 0.4s ease ${idx * 0.08}s both`,
              }}>
                {/* Timeline dot */}
                <div style={{
                  position: 'absolute', left: '8px', top: '16px',
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: tc.bg, border: `2px solid ${tc.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.8rem', zIndex: 1,
                }}>{entry.emoji}</div>

                {/* Card */}
                <div style={{ background: tc.bg, border: `1px solid ${tc.border}`, borderRadius: '14px', overflow: 'hidden' }}>
                  <button onClick={() => setExpanded(e => ({ ...e, [entry.version]: !isOpen }))}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 900, color: tc.text, fontFamily: 'monospace' }}>v{entry.version}</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: tc.badge, color: tc.text, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{entry.type}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Clock size={10} /> {entry.date}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-1)', marginTop: '2px' }}>{entry.title}</p>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{isOpen ? '▲' : '▼'}</span>
                  </button>

                  {isOpen && (
                    <ul style={{ paddingLeft: '1.2rem', paddingRight: '1rem', paddingBottom: '0.85rem', margin: 0, listStyle: 'disc' }}>
                      {entry.items.map((item, i) => (
                        <li key={i} style={{ fontSize: '0.78rem', color: 'var(--text-2)', marginBottom: '4px', lineHeight: 1.55, animation: `fadeIn 0.25s ease ${i * 0.04}s both` }}>
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Credits */}
      <div className="glass-card" style={{ marginTop: '1.5rem', textAlign: 'center', padding: '1.5rem' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', lineHeight: 1.7 }}>
          Built with ❤️ as a personal productivity powerhouse.<br />
          Open source · React + Vite · Not a commercial product
        </p>
        {user?.name && <p style={{ fontSize: '0.72rem', color: 'var(--accent)', marginTop: '0.5rem', fontWeight: 700 }}>Welcome back, {user.name}.</p>}
      </div>
    </div>
  );
}
