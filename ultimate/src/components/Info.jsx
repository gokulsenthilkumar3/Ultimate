import React, { useState, useEffect } from 'react';

const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.0.0';
const BUILD_DATE = typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : new Date().toISOString();
const BRANCH = import.meta.env.VITE_BRANCH || 'restructure';
const ENV = import.meta.env.MODE || 'production';
const API_BASE = import.meta.env.VITE_API_BASE || null;
const REPO_URL = 'https://github.com/gokulsenthilkumar3/Ultimate';
const PAGES_URL = 'https://gokulsenthilkumar3.github.io/Ultimate/';

const BRANCHES = [
  { name: 'main', status: 'Stable', badge: '#22c55e', desc: 'Production baseline' },
  { name: 'restructure', status: 'Active', badge: '#3b82f6', desc: 'Current — dynamic data, Info page, folder consolidation' },
  { name: 'improvement7', status: 'Merged', badge: '#a855f7', desc: 'Entertainment, Finance, Shopping, Tasks tabs' },
  { name: 'improvement8', status: 'Merged', badge: '#a855f7', desc: 'BodyPartOverlay, EditableMetric, useStore' },
  { name: 'feature/photoreal-360', status: 'Planned', badge: '#f59e0b', desc: 'Photorealistic 360° Parametric Human Engine' },
];

const VERSIONS = [
  { version: 'v2.0.0', date: 'April 2026', highlights: ['Folder restructure: ultimate/', 'Dynamic userStore (Zustand)', 'Info/About page', 'dashboard-app merged in', 'deploy.yml updated'] },
  { version: 'v1.8.0', date: 'March 2026', highlights: ['BodyPartOverlay', 'EditableMetric', 'metricsWorker', 'useStore (dashboard-app)'] },
  { version: 'v1.7.0', date: 'February 2026', highlights: ['Entertainment tab', 'Finance tab', 'Shopping tab', 'Tasks tab', 'Health+ tab'] },
  { version: 'v1.6.0', date: 'January 2026', highlights: ['Analytics', 'Skills', 'GoalsDashboard', 'StrengthMetrics', 'HydrationTracker', 'MindWellness'] },
  { version: 'v1.5.0', date: 'December 2025', highlights: ['Sprite3DViewer 360°', 'Web Worker preload', 'Dual Model mode', '8K Magnifying Glass'] },
  { version: 'v1.0.0', date: 'November 2025', highlights: ['Initial launch', 'Overview', 'Assessment', 'Training', 'Nutrition', 'Sleep', 'Progress'] },
];

export default function Info() {
  const [apiStatus, setApiStatus] = useState('unchecked');
  const [apiLatency, setApiLatency] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!API_BASE) { setApiStatus('no-api'); return; }
    const t = performance.now();
    fetch(`${API_BASE}/health`)
      .then(r => {
        setApiLatency(Math.round(performance.now() - t));
        setApiStatus(r.ok ? 'online' : 'error');
      })
      .catch(() => setApiStatus('offline'));
  }, []);

  const apiColor = { online: '#22c55e', offline: '#ef4444', error: '#f59e0b', unchecked: '#6b7280', 'no-api': '#6b7280' };
  const apiLabel = { online: '✅ Online', offline: '❌ Offline', error: '⚠️ Error', unchecked: '⏳ Checking...', 'no-api': '— Not configured' };

  return (
    <div style={{ padding: '2rem', maxWidth: '860px', margin: '0 auto', color: 'var(--text-primary, #e5e7eb)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ fontSize: '2.5rem' }}>⚡</div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700 }}>Ultimate Dashboard</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted, #9ca3af)', fontSize: '0.9rem' }}>
            GrowthTrack Digital Twin Engine — About & Release Info
          </p>
        </div>
      </div>

      {/* Deploy Info Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Version', value: APP_VERSION, icon: '📦' },
          { label: 'Branch', value: BRANCH, icon: '🌿' },
          { label: 'Environment', value: ENV, icon: '🛠️' },
          { label: 'Built', value: new Date(BUILD_DATE).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }), icon: '📅' },
        ].map(({ label, value, icon }) => (
          <div key={label} style={{ background: 'var(--card-bg, #1f2937)', border: '1px solid var(--border, #374151)', borderRadius: '12px', padding: '1rem' }}>
            <div style={{ fontSize: '1.4rem', marginBottom: '0.4rem' }}>{icon}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #9ca3af)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
            <div style={{ fontWeight: 600, fontSize: '1rem', marginTop: '0.2rem' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Links */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <a href={REPO_URL} target="_blank" rel="noreferrer"
          style={{ padding: '0.5rem 1.2rem', borderRadius: '8px', background: '#1f2937', border: '1px solid #374151', color: '#e5e7eb', textDecoration: 'none', fontSize: '0.875rem' }}>
          🐈 GitHub Repo
        </a>
        <a href={PAGES_URL} target="_blank" rel="noreferrer"
          style={{ padding: '0.5rem 1.2rem', borderRadius: '8px', background: '#1f2937', border: '1px solid #374151', color: '#e5e7eb', textDecoration: 'none', fontSize: '0.875rem' }}>
          🚀 Live Pages
        </a>
        <a href={`${REPO_URL}/blob/restructure/RELEASE_NOTES.md`} target="_blank" rel="noreferrer"
          style={{ padding: '0.5rem 1.2rem', borderRadius: '8px', background: '#1f2937', border: '1px solid #374151', color: '#e5e7eb', textDecoration: 'none', fontSize: '0.875rem' }}>
          📝 Release Notes
        </a>
      </div>

      {/* API Health */}
      <div style={{ background: 'var(--card-bg, #1f2937)', border: '1px solid var(--border, #374151)', borderRadius: '12px', padding: '1.25rem', marginBottom: '2rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>📶 API Health</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: apiColor[apiStatus] }} />
          <span style={{ fontWeight: 600 }}>{apiLabel[apiStatus]}</span>
          {apiLatency && <span style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '0.85rem' }}>{apiLatency}ms</span>}
        </div>
        <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted, #9ca3af)' }}>
          {API_BASE ? `Endpoint: ${API_BASE}` : 'Set VITE_API_BASE env var to connect a backend'}
        </div>
      </div>

      {/* Branch Status Table */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>🌿 Branch Status</h3>
        <div style={{ border: '1px solid var(--border, #374151)', borderRadius: '12px', overflow: 'hidden' }}>
          {BRANCHES.map((b, i) => (
            <div key={b.name} style={{
              display: 'grid', gridTemplateColumns: '1fr 90px 2fr',
              padding: '0.75rem 1rem', gap: '1rem', alignItems: 'center',
              borderBottom: i < BRANCHES.length - 1 ? '1px solid var(--border, #374151)' : 'none',
              background: b.name === BRANCH ? 'rgba(59,130,246,0.07)' : 'transparent',
            }}>
              <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: b.name === BRANCH ? 700 : 400 }}>
                {b.name === BRANCH && <span style={{ color: '#3b82f6', marginRight: '0.4rem' }}>▶</span>}
                {b.name}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: b.badge }} />
                <span style={{ fontSize: '0.8rem' }}>{b.status}</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #9ca3af)' }}>{b.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Version History */}
      <div>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>📜 Version History</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {VERSIONS.map((v) => (
            <div key={v.version}
              style={{ border: '1px solid var(--border, #374151)', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer' }}
              onClick={() => setExpanded(expanded === v.version ? null : v.version)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--card-bg, #1f2937)' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f59e0b' }}>{v.version}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #9ca3af)' }}>{v.date}</span>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #9ca3af)' }}>{expanded === v.version ? '▲' : '▼'}</span>
              </div>
              {expanded === v.version && (
                <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border, #374151)', background: 'rgba(0,0,0,0.2)' }}>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-muted, #9ca3af)', fontSize: '0.875rem' }}>
                    {v.highlights.map((h, i) => <li key={i} style={{ marginBottom: '0.25rem' }}>{h}</li>)}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border, #374151)', fontSize: '0.8rem', color: 'var(--text-muted, #9ca3af)', textAlign: 'center' }}>
        Built with React + Vite + Zustand — © 2026 gokulsenthilkumar3
      </div>
    </div>
  );
}
