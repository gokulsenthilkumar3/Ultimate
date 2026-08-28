import React, { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import { Server, Globe, Clock, GitBranch, Zap, CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchIpInfo } from '../hooks/useGeolocation';



const TYPE_COLORS = {
  major:   { bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.3)', text: '#818cf8', badge: 'rgba(99,102,241,0.2)' },
  minor:   { bg: 'rgba(16,185,129,0.05)',  border: 'rgba(16,185,129,0.2)',  text: '#34d399', badge: 'rgba(16,185,129,0.15)' },
  patch:   { bg: 'rgba(245,158,11,0.05)',  border: 'rgba(245,158,11,0.2)', text: '#fbbf24', badge: 'rgba(245,158,11,0.15)' },
  initial: { bg: 'rgba(168,85,247,0.05)',  border: 'rgba(168,85,247,0.2)',  text: '#c084fc', badge: 'rgba(168,85,247,0.15)' },
};

function StatusBadge({ ok, loading, label }) {
  if (loading) return <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-3)' }}><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />{label}</span>;
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 800, color: ok ? '#10b981' : '#f87171' }}>
      {ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
      {label}: {ok ? 'Online' : 'Offline'}
    </span>
  );
}

export default function About() {
  const user = useStore(s => s.user);

  // We will fetch real commits from GitHub API instead of hardcoding
  const [changelog, setChangelog] = useState([]);
  const [gitError, setGitError] = useState(null);

  const [serverOk,  setServerOk]  = useState(null);
  const [serverMs,  setServerMs]  = useState(null);
  const [ipInfo,    setIpInfo]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [expanded,  setExpanded]  = useState({});
  const [showAll,   setShowAll]   = useState(false);

  useEffect(() => {
    let cancelled = false;
    const start = Date.now();
    
    // Fetch GitHub commits
    fetch('https://api.github.com/repos/gokulsenthilkumar3/Ultimate/commits')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch from GitHub');
        return res.json();
      })
      .then(data => {
        if (cancelled) return;
        if (Array.isArray(data)) {
          const parsedLog = data.map((commitData) => {
            const sha = commitData.sha.substring(0, 7);
            const msg = commitData.commit.message;
            const lines = msg.split('\n').map(l => l.trim()).filter(Boolean);
            const title = lines[0] || 'Updates';
            const items = lines.slice(1);
            
            // Generate pseudo version & type for visual flair
            const isFeat = title.toLowerCase().includes('feat');
            const isFix = title.toLowerCase().includes('fix');
            const type = isFeat ? 'major' : isFix ? 'patch' : 'minor';
            const emoji = isFeat ? '🚀' : isFix ? '🔧' : '✨';
            
            return {
              version: sha,
              date: new Date(commitData.commit.author.date).toISOString().slice(0, 10),
              type,
              emoji,
              title: title.length > 60 ? title.substring(0, 60) + '...' : title,
              items: items.length > 0 ? items : [commitData.commit.message], // fallback to full message if no detailed items
              url: commitData.html_url
            };
          });
          setChangelog(parsedLog);
          if (parsedLog.length > 0) {
            setExpanded({ [parsedLog[0].version]: true });
          }
        }
      })
      .catch(err => {
        if (!cancelled) setGitError(err.message);
      });

    Promise.all([
      fetch('http://localhost:3001/api/health').then(r => r.ok).catch(() => false),
      fetchIpInfo(),
    ]).then(([ok, ip]) => {
      if (cancelled) return;
      setServerOk(ok);
      setServerMs(Date.now() - start);
      setIpInfo(ip);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const visibleChangelog = showAll ? changelog : changelog.slice(0, 5);

  const cardStyle = {
    padding: '1.5rem',
    display: 'flex', alignItems: 'center', gap: '1rem',
    background: 'rgba(255,255,255,0.02)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '16px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'default',
    boxShadow: '0 10px 30px -10px rgba(0,0,0,0.2)',
  };

  return (
    <div style={{ padding: '0.5rem 0 4rem 0', maxWidth: '1000px', margin: '0 auto' }}>
      
      <style>
        {`
          @keyframes glowPulse {
            0% { opacity: 0.1; transform: scale(1); }
            50% { opacity: 0.25; transform: scale(1.1); }
            100% { opacity: 0.1; transform: scale(1); }
          }
          @keyframes slideUpFade {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .about-card:hover {
            transform: translateY(-5px) scale(1.02);
            background: rgba(255,255,255,0.04) !important;
            border-color: rgba(255,255,255,0.15) !important;
            box-shadow: 0 20px 40px -10px rgba(0,0,0,0.3) !important;
          }
          .timeline-spine {
            position: absolute;
            left: 19px;
            top: 0;
            bottom: 0;
            width: 2px;
            background: linear-gradient(to bottom, var(--accent) 0%, #8b5cf6 50%, transparent 100%);
            border-radius: 99px;
            opacity: 0.5;
          }
        `}
      </style>

      {/* Hero Header */}
      <div style={{ 
        marginBottom: '3rem', 
        padding: '4rem 3rem', 
        background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.05)',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 30px 60px -12px rgba(0,0,0,0.4)',
        animation: 'slideUpFade 0.6s ease-out'
      }}>
        <div style={{ position: 'absolute', top: '-50%', left: '-20%', width: '400px', height: '400px', background: 'var(--accent)', filter: 'blur(120px)', animation: 'glowPulse 6s infinite alternate' }} />
        <div style={{ position: 'absolute', bottom: '-50%', right: '-20%', width: '400px', height: '400px', background: '#8b5cf6', filter: 'blur(120px)', animation: 'glowPulse 7s infinite alternate-reverse' }} />
        
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '1rem', letterSpacing: '0.25em', fontWeight: 800 }}>About Ultimate</p>
          <h2 className="text-display" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', marginBottom: '1.5rem', background: 'linear-gradient(135deg, #fff 0%, #a1a1aa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            GrowthTrack<br/>Digital Twin Engine
          </h2>
          <p style={{ color: 'var(--text-2)', fontSize: '1.1rem', lineHeight: 1.7, maxWidth: '650px', margin: '0 auto', fontWeight: 500 }}>
            A profoundly robust personal dashboard built for complete life mastery — tracking health, productivity, finance, and exponential growth.
          </p>
        </div>
      </div>

      {/* Status Matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '3rem', animation: 'slideUpFade 0.7s ease-out 0.1s both' }}>
        <div className="about-card" style={cardStyle}>
          <div style={{ background: 'rgba(99,102,241,0.1)', padding: '12px', borderRadius: '12px' }}><Server size={24} color="#818cf8" /></div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>API Server</p>
            <StatusBadge ok={serverOk} loading={loading} label="Backend" />
            {serverMs && <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '4px', fontWeight: 600 }}>{serverMs}ms ping response</p>}
          </div>
        </div>

        <div className="about-card" style={cardStyle}>
          <div style={{ background: 'rgba(14,165,233,0.1)', padding: '12px', borderRadius: '12px' }}><Globe size={24} color="#38bdf8" /></div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Network</p>
            {loading ? <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontWeight: 600 }}>Detecting location…</p> : (
              ipInfo ? (
                <p style={{ fontSize: '0.85rem', fontWeight: 800, color: '#38bdf8' }}>{ipInfo.city}, {ipInfo.country_name}</p>
              ) : <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontWeight: 600 }}>Unavailable</p>
            )}
            {ipInfo?.ip && <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontFamily: 'monospace', marginTop: '4px' }}>{ipInfo.ip}</p>}
          </div>
        </div>

        <div className="about-card" style={cardStyle}>
          <div style={{ background: 'rgba(245,158,11,0.1)', padding: '12px', borderRadius: '12px' }}><Zap size={24} color="#fbbf24" /></div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Stack Engine</p>
            <p style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fbbf24' }}>React 19 + Vite 8</p>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '4px', fontWeight: 600 }}>Zustand · Recharts · Three.js</p>
          </div>
        </div>

        <div className="about-card" style={cardStyle}>
          <div style={{ background: 'rgba(139,92,246,0.1)', padding: '12px', borderRadius: '12px' }}><GitBranch size={24} color="#a78bfa" /></div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Core Version</p>
            <p style={{ fontSize: '0.85rem', fontWeight: 800, color: '#a78bfa' }}>v2.0.0 — Stable</p>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '4px', fontWeight: 600 }}>23 Modules · 2025-07</p>
          </div>
        </div>
      </div>

      {/* Tech stack */}
      <div style={{ marginBottom: '4rem', animation: 'slideUpFade 0.8s ease-out 0.2s both' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Zap size={20} color="var(--accent)" /> Under the Hood
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          {[
            { label: 'React 19',       color: '#61dafb' },
            { label: 'Vite 8',         color: '#646cff' },
            { label: 'Zustand 5',      color: '#a78bfa' },
            { label: 'Recharts',       color: '#22d3ee' },
            { label: 'Three.js / Drei',color: '#10b981' },
            { label: 'Node.js',        color: '#86efac' },
            { label: 'PostgreSQL',     color: '#4299e1' },
            { label: 'Lucide Icons',   color: '#f97316' },
            { label: 'GSAP Animations',color: '#84cc16' },
            { label: 'Gemini API',     color: '#34d399' },
            { label: 'Firebase',       color: '#fbbf24' },
          ].map((t, idx) => (
            <span key={t.label} style={{ 
              padding: '8px 16px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 800, 
              background: `linear-gradient(135deg, ${t.color}15 0%, ${t.color}05 100%)`, 
              color: t.color, border: `1px solid ${t.color}30`,
              boxShadow: `0 4px 12px ${t.color}10`,
              animation: `slideUpFade 0.5s ease-out ${0.3 + (idx * 0.05)}s both`,
              transition: 'transform 0.2s ease, filter 0.2s ease',
              cursor: 'default',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.filter = `drop-shadow(0 0 8px ${t.color}50)`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.filter = 'none'; }}
            >
              {t.label}
            </span>
          ))}
        </div>
      </div>

      {/* Changelog timeline */}
      <div style={{ animation: 'slideUpFade 0.9s ease-out 0.4s both' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <GitBranch size={20} color="var(--accent)" /> Mission Log
          </h3>
          <button onClick={() => setShowAll(v => !v)} style={{ 
            background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-1)', 
            cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800, padding: '6px 12px', borderRadius: '8px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
          >
            {showAll ? 'Collapse History' : 'View Full History'}
          </button>
        </div>

        <div style={{ position: 'relative', paddingTop: '0.5rem' }}>
          <div className="timeline-spine" />
          
          {gitError && <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Error loading commits: {gitError}</p>}
          {changelog.length === 0 && !gitError && <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}><Loader2 size={12} style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginRight: '6px' }} /> Syncing with GitHub...</p>}

          {visibleChangelog.map((entry, idx) => {
            const tc = TYPE_COLORS[entry.type] || TYPE_COLORS.minor;
            const isOpen = expanded[entry.version];
            return (
              <div key={entry.version} style={{
                marginBottom: '1.5rem', paddingLeft: '52px', position: 'relative',
                animation: `slideUpFade 0.6s ease ${0.5 + (idx * 0.1)}s both`,
              }}>
                {/* Timeline dot */}
                <div style={{
                  position: 'absolute', left: '8px', top: '16px',
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: tc.bg, border: `2px solid ${tc.text}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.9rem', zIndex: 1,
                  boxShadow: `0 0 15px ${tc.text}40`
                }}>{entry.emoji}</div>

                {/* Card */}
                <div className="about-card" style={{ 
                  background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)',
                  border: `1px solid ${tc.border}`, borderRadius: '16px', overflow: 'hidden',
                  transition: 'all 0.3s ease'
                }}>
                  <button onClick={() => setExpanded(e => ({ ...e, [entry.version]: !isOpen }))}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.2rem', background: isOpen ? 'rgba(255,255,255,0.02)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.3s ease' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                        <a href={entry.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '1.1rem', fontWeight: 900, color: tc.text, fontFamily: 'monospace', letterSpacing: '-0.02em', textDecoration: 'none' }} onClick={e => e.stopPropagation()}>
                          #{entry.version}
                        </a>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '3px 10px', borderRadius: '99px', background: tc.badge, color: tc.text, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{entry.type}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                          <Clock size={12} /> {entry.date}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>{entry.title}</p>
                    </div>
                    <div style={{ 
                      width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-input)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)',
                      transition: 'transform 0.3s ease'
                    }}>
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </button>

                  <div style={{ 
                    maxHeight: isOpen ? '1000px' : '0', overflow: 'hidden', 
                    transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
                    opacity: isOpen ? 1 : 0
                  }}>
                    <ul style={{ padding: '0 1.5rem 1.5rem 2.5rem', margin: 0, listStyle: 'disc' }}>
                      {entry.items.map((item, i) => (
                        <li key={i} style={{ fontSize: '0.85rem', color: 'var(--text-2)', marginBottom: '8px', lineHeight: 1.6, fontWeight: 500, whiteSpace: 'pre-wrap' }}>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Credits Footer */}
      <div style={{ 
        marginTop: '5rem', textAlign: 'center', padding: '3rem', 
        background: 'linear-gradient(to top, rgba(255,255,255,0.02), transparent)',
        borderRadius: '24px', borderTop: '1px solid rgba(255,255,255,0.05)',
        animation: 'slideUpFade 1s ease-out 0.6s both'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px var(--accent)' }}>
            <Zap size={20} color="#fff" />
          </div>
        </div>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-2)', lineHeight: 1.8, fontWeight: 500 }}>
          Designed and engineered as a master control panel for life.<br />
          Built with precision. Forged in Code.
        </p>
        {user?.name || user?.firstName ? <p style={{ fontSize: '0.85rem', color: 'var(--accent)', marginTop: '1rem', fontWeight: 800, letterSpacing: '0.05em' }}>Welcome back, {user.name || user.firstName}.</p> : null}
      </div>
    </div>
  );
}
