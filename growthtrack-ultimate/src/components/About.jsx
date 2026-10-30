import PageHeader from './ui/PageHeader';
import appPackage from '../../package.json';
import { FEATURES } from '../config/featureRegistry';
import React, { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import { apiRequest } from '../lib/apiClient';
import { Server, Globe, Clock, GitBranch, Zap, CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronUp, Rocket, Wrench, Sparkles } from 'lucide-react';
import { fetchIpInfo } from '../hooks/useGeolocation';
import './about.css';

const TYPE_ICON = { major: Rocket, patch: Wrench, minor: Sparkles, initial: Sparkles };
const TECH = [
  { label: 'React 19', color: '#61dafb' }, { label: 'Vite 8', color: '#646cff' }, { label: 'Zustand 5', color: '#a78bfa' },
  { label: 'Recharts', color: '#22d3ee' }, { label: 'Three.js / Drei', color: '#10b981' }, { label: 'Node.js', color: '#86efac' },
  { label: 'PostgreSQL', color: '#4299e1' }, { label: 'Lucide Icons', color: '#f97316' }, { label: 'GSAP Animations', color: '#84cc16' },
  { label: 'Gemini API', color: '#34d399' }, { label: 'Firebase', color: '#fbbf24' },
];

function StatusBadge({ ok, loading, label }) {
  if (loading) return <span className="about-status" data-state="loading"><Loader2 size={12} aria-hidden="true" style={{ animation: 'spin 1s linear infinite' }} />{label}</span>;
  return (
    <span className="about-status" data-state={ok ? 'online' : 'offline'}>
      {ok ? <CheckCircle size={14} aria-hidden="true" /> : <AlertCircle size={14} aria-hidden="true" />}
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
            
            return {
              version: sha,
              date: new Date(commitData.commit.author.date).toISOString().slice(0, 10),
              type,
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
      apiRequest('/api/health', { method: 'GET', timeoutMs: 4000 }).then(() => true).catch(() => false),
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

  return (
    <div className="about-page">
      <PageHeader accent="Hub" title="About GrowthTrack" subtitle="Your private workspace for wellness, work, money and life." status={<>Version {appPackage.version} · {FEATURES.length} tools</>} />

      <div className="about-matrix">
        <div className="about-card about-card--server">
          <div className="about-card__icon"><Server size={24} aria-hidden="true" /></div>
          <div>
            <p className="about-card__label">API Server</p>
            <StatusBadge ok={serverOk} loading={loading} label="Backend" />
            {serverMs && <p className="about-card__note">{serverMs}ms ping response</p>}
          </div>
        </div>

        <div className="about-card about-card--network">
          <div className="about-card__icon"><Globe size={24} aria-hidden="true" /></div>
          <div>
            <p className="about-card__label">Network</p>
            {loading ? <p className="about-card__note">Detecting location…</p> : (
              ipInfo ? <p className="about-card__value">{ipInfo.city}, {ipInfo.country_name}</p> : <p className="about-card__note">Unavailable</p>
            )}
            {ipInfo?.ip && <p className="about-card__note">{ipInfo.ip}</p>}
          </div>
        </div>

        <div className="about-card about-card--stack">
          <div className="about-card__icon"><Zap size={24} aria-hidden="true" /></div>
          <div>
            <p className="about-card__label">Stack Engine</p>
            <p className="about-card__value">React 19 + Vite 8</p>
            <p className="about-card__note">Zustand · Recharts · Three.js</p>
          </div>
        </div>

        <div className="about-card about-card--version">
          <div className="about-card__icon"><GitBranch size={24} aria-hidden="true" /></div>
          <div>
            <p className="about-card__label">Core Version</p>
            <p className="about-card__value">v{appPackage.version}</p>
            <p className="about-card__note">{FEATURES.length} modules · current installation</p>
          </div>
        </div>
      </div>

      <section aria-labelledby="about-stack-title">
        <h2 id="about-stack-title" className="about-heading"><Zap size={20} aria-hidden="true" /> Under the Hood</h2>
        <div className="about-stack">
          {TECH.map(t => <span key={t.label} className="about-chip" style={{ '--chip': t.color }}>{t.label}</span>)}
        </div>
      </section>

      <section aria-labelledby="about-history-title">
        <div className="about-heading-row">
          <h2 id="about-history-title" className="about-heading"><GitBranch size={20} aria-hidden="true" /> Release History</h2>
          <button type="button" className="btn-sm" onClick={() => setShowAll(v => !v)}>{showAll ? 'Collapse History' : 'View Full History'}</button>
        </div>

        <div className="about-timeline">
          {gitError && <p className="about-note">Error loading commits: {gitError}</p>}
          {changelog.length === 0 && !gitError && <p className="about-note"><Loader2 size={12} aria-hidden="true" style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginInlineEnd: '6px' }} /> Loading release history…</p>}

          {visibleChangelog.map(entry => {
            const Icon = TYPE_ICON[entry.type] || Sparkles;
            const isOpen = Boolean(expanded[entry.version]);
            const panelId = `about-entry-${entry.version}`;
            return (
              <div key={entry.version} className={`about-entry about-entry--${entry.type}`}>
                <span className="about-entry__dot" aria-hidden="true"><Icon size={12} /></span>
                <div className="about-entry__card">
                  <div className="about-entry__meta">
                    <a className="about-entry__hash" href={entry.url} target="_blank" rel="noopener noreferrer">#{entry.version}</a>
                    <span className="about-entry__badge">{entry.type}</span>
                    <span className="about-entry__date"><Clock size={12} aria-hidden="true" /> {entry.date}</span>
                  </div>
                  <button type="button" className="about-entry__toggle" aria-expanded={isOpen} aria-controls={panelId}
                    onClick={() => setExpanded(e => ({ ...e, [entry.version]: !isOpen }))}>
                    <span className="about-entry__title">{entry.title}</span>
                    <span className="about-entry__chevron" aria-hidden="true">{isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
                  </button>
                  {isOpen && <ul id={panelId} className="about-entry__items">{entry.items.map((item, i) => <li key={i}>{item}</li>)}</ul>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="about-credits">
        <span className="about-credits__mark"><Zap size={20} aria-hidden="true" /></span>
        <p>Designed and engineered as a master control panel for life.<br />Built with precision. Forged in Code.</p>
        {user?.name || user?.firstName ? <p className="about-credits__welcome">Welcome back, {user.name || user.firstName}.</p> : null}
      </div>
    </div>
  );
}
