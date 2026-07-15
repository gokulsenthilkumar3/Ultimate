import React, { useState, useMemo, useRef, useEffect } from 'react';
import useStore, { selectPinnedTabs, selectTogglePinnedTab } from '../store/useStore';
import { Pin, PinOff, Search, Grid, Star } from 'lucide-react';

// ── App Registry ───────────────────────────────────────────────────────────
const ALL_APPS = [
  // Core
  { id: 'overview',    label: 'Overview',       icon: '🏠', group: 'Core',         color: '#6366f1', description: 'Dashboard summary' },
  { id: 'current',     label: 'Current',        icon: '⚡', group: 'Core',         color: '#0ea5e9', description: 'Live feed & weather' },
  { id: 'analytics',   label: 'Analytics',      icon: '📊', group: 'Core',         color: '#8b5cf6', description: 'Cross-domain insights' },
  // Health & Fitness
  { id: 'training',    label: 'Training',        icon: '💪', group: 'Health',       color: '#f43f5e', description: 'Workout tracker' },
  { id: 'nutrition',   label: 'Nutrition',       icon: '🥗', group: 'Health',       color: '#10b981', description: 'Macro & calorie tracking' },
  { id: 'physique',    label: 'Physique',        icon: '🏋️', group: 'Health',       color: '#3b82f6', description: 'Body composition' },
  { id: 'medical',     label: 'Medical',         icon: '🩺', group: 'Health',       color: '#ec4899', description: 'Vitals & medications' },
  { id: 'habits',      label: 'Habits',          icon: '🔥', group: 'Health',       color: '#f97316', description: 'Habit matrix' },
  { id: 'strength',    label: 'Strength',        icon: '🏆', group: 'Health',       color: '#fbbf24', description: 'Strength metrics & PRs' },
  // Productivity
  { id: 'goals',       label: 'Goals',           icon: '🎯', group: 'Productivity', color: '#06b6d4', description: 'Goal tracking' },
  { id: 'tasks',       label: 'Tasks',           icon: '✅', group: 'Productivity', color: '#34d399', description: 'Task management' },
  { id: 'projects',    label: 'Projects',        icon: '🚀', group: 'Productivity', color: '#a78bfa', description: 'Projects & GitHub' },
  { id: 'calendar',    label: 'Calendar',        icon: '📅', group: 'Productivity', color: '#f87171', description: 'Events & schedule' },
  { id: 'timesheet',   label: 'Timesheet',       icon: '⏱️', group: 'Productivity', color: '#fb923c', description: 'Time tracking & billing' },
  { id: 'notes',       label: 'Notes',           icon: '📝', group: 'Productivity', color: '#a3e635', description: 'Markdown notes' },
  { id: 'skills',      label: 'Skills',          icon: '⚡', group: 'Productivity', color: '#818cf8', description: 'Skill trees & XP' },
  // Finance
  { id: 'finance',     label: 'Finance',         icon: '💰', group: 'Finance',      color: '#22c55e', description: 'Wealth engine' },
  { id: 'sip',         label: 'SIP Calc',        icon: '📈', group: 'Finance',      color: '#4ade80', description: 'SIP projections' },
  { id: 'portfolio',   label: 'Portfolio',       icon: '💹', group: 'Finance',      color: '#86efac', description: 'Investment portfolio' },
  { id: 'shopping',    label: 'Shopping',        icon: '🛒', group: 'Finance',      color: '#fdba74', description: 'Shopping list' },
  // Misc
  { id: 'ai',          label: 'AI Assistant',    icon: '🤖', group: 'Tools',        color: '#38bdf8', description: 'GrowthTrack AI' },
  { id: 'logs',        label: 'Logs',            icon: '📋', group: 'Tools',        color: '#94a3b8', description: 'Audit trail' },
  { id: 'databases',   label: 'Databases',       icon: '🗄️', group: 'Tools',        color: '#7dd3fc', description: 'Data explorer' },
  { id: 'about',       label: 'About',           icon: 'ℹ️', group: 'Tools',        color: '#c4b5fd', description: 'App info & changelog' },
];

const GROUP_ORDER = ['Core', 'Health', 'Productivity', 'Finance', 'Tools'];
const DOCK_APP_IDS = ['overview', 'training', 'tasks', 'finance', 'ai', 'habits', 'notes'];
const CLICK_KEY = 'gtd_app_click_counts';

function getClickCounts() {
  try { return JSON.parse(localStorage.getItem(CLICK_KEY) || '{}'); } catch { return {}; }
}
function incrementClick(id) {
  try {
    const counts = getClickCounts();
    counts[id] = (counts[id] || 0) + 1;
    localStorage.setItem(CLICK_KEY, JSON.stringify(counts));
  } catch { /* ignore */ }
}

// ── Dock (magnifying hover effect) ────────────────────────────────────────
function Dock({ dockApps, onNavigate, pinnedTabs }) {
  const [hoverIdx, setHoverIdx] = useState(null);

  const getScale = (idx) => {
    if (hoverIdx === null) return 1;
    const dist = Math.abs(idx - hoverIdx);
    if (dist === 0) return 1.55;
    if (dist === 1) return 1.22;
    if (dist === 2) return 1.08;
    return 1;
  };

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '8px', padding: '16px 24px', background: 'rgba(255,255,255,0.04)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)' }}>
      {dockApps.map((app, idx) => {
        const scale  = getScale(idx);
        const isPinned = pinnedTabs?.includes(app.id);
        return (
          <div key={app.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'transform 0.15s cubic-bezier(.34,1.56,.64,1)' }}
            onMouseEnter={() => setHoverIdx(idx)}
            onMouseLeave={() => setHoverIdx(null)}
            onClick={() => { onNavigate(app.id); incrementClick(app.id); }}>
            <div style={{ width: `${40 + (scale - 1) * 18}px`, height: `${40 + (scale - 1) * 18}px`, borderRadius: '12px',
                          background: `${app.color}22`, border: `1.5px solid ${app.color}55`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: `${18 + (scale - 1) * 8}px`,
                          transition: 'all 0.15s cubic-bezier(.34,1.56,.64,1)',
                          boxShadow: scale > 1.4 ? `0 8px 24px ${app.color}44` : 'none',
                          transform: `translateY(${-(scale - 1) * 12}px)`,
                        }}>
              {app.icon}
            </div>
            {scale > 1.2 && (
              <span style={{ fontSize: '0.58rem', color: 'var(--text-2)', fontWeight: 700, whiteSpace: 'nowrap', transform: `translateY(${-(scale-1)*10}px)`, transition: 'all 0.15s' }}>
                {app.label}
              </span>
            )}
            {isPinned && (
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: app.color, marginTop: '-4px' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AppLauncher({ setActiveTab }) {
  const pinnedTabs     = useStore(selectPinnedTabs)     || [];
  const togglePinnedTab = useStore(selectTogglePinnedTab);

  const [search,  setSearch]  = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [groupFilter, setGroupFilter] = useState('all');
  const searchRef = useRef(null);

  useEffect(() => { searchRef.current?.focus(); }, []);

  const clickCounts = useMemo(() => getClickCounts(), []);

  const frequentApps = useMemo(() => {
    return [...ALL_APPS].sort((a, b) => (clickCounts[b.id] || 0) - (clickCounts[a.id] || 0)).slice(0, 8).filter(a => (clickCounts[a.id] || 0) > 0);
  }, []);

  const pinnedApps = useMemo(() => ALL_APPS.filter(a => pinnedTabs.includes(a.id)), [pinnedTabs]);
  const dockApps   = useMemo(() => {
    const dockSet = new Set(DOCK_APP_IDS);
    pinnedApps.forEach(a => dockSet.add(a.id));
    return ALL_APPS.filter(a => dockSet.has(a.id));
  }, [pinnedApps]);

  const filtered = useMemo(() => {
    let apps = ALL_APPS;
    if (groupFilter !== 'all') apps = apps.filter(a => a.group === groupFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      apps = apps.filter(a => a.label.toLowerCase().includes(q) || a.description.toLowerCase().includes(q) || a.group.toLowerCase().includes(q));
    }
    return apps;
  }, [search, groupFilter]);

  const grouped = useMemo(() => {
    const g = {};
    GROUP_ORDER.forEach(gr => { g[gr] = []; });
    filtered.forEach(a => { if (!g[a.group]) g[a.group] = []; g[a.group].push(a); });
    return g;
  }, [filtered]);

  const onNavigate = (id) => {
    if (setActiveTab) setActiveTab(id);
    incrementClick(id);
  };

  return (
    <div style={{ padding: '0.5rem 0' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.35rem' }}>Navigation</p>
        <h2 className="text-display" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>App Hub</h2>
        <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>{ALL_APPS.length} modules · Click to launch</p>
      </div>

      {/* Dock */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Quick Dock</p>
        <Dock dockApps={dockApps} onNavigate={onNavigate} pinnedTabs={pinnedTabs} />
      </div>

      {/* Frequent apps */}
      {frequentApps.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Star size={11} color="#fbbf24" /> Frequently Used
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {frequentApps.map(app => (
              <button key={app.id} onClick={() => onNavigate(app.id)} style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                borderRadius: '99px', background: `${app.color}18`, border: `1px solid ${app.color}44`,
                cursor: 'pointer', color: 'var(--text-1)', fontSize: '0.78rem', fontWeight: 600,
                transition: 'background 0.15s',
              }}>
                <span>{app.icon}</span> {app.label}
                <span style={{ fontSize: '0.62rem', color: 'var(--text-3)', marginLeft: '2px' }}>{clickCounts[app.id]}×</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pinned */}
      {pinnedApps.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Pin size={11} color="var(--accent)" /> Pinned
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {pinnedApps.map(app => (
              <button key={app.id} onClick={() => onNavigate(app.id)} style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                borderRadius: '99px', background: `${app.color}22`, border: `1px solid ${app.color}55`,
                cursor: 'pointer', color: 'var(--text-1)', fontSize: '0.78rem', fontWeight: 700,
              }}>
                <span>{app.icon}</span> {app.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
          <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search apps…"
            className="form-input" style={{ paddingLeft: '32px', width: '100%' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          {['all', ...GROUP_ORDER].map(g => (
            <button key={g} onClick={() => setGroupFilter(g)} style={{
              padding: '4px 10px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
              background: groupFilter === g ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
              color: groupFilter === g ? '#000' : 'var(--text-3)',
              border: groupFilter === g ? 'none' : '1px solid rgba(255,255,255,0.1)',
            }}>{g}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          {[{ v: 'grid', i: <Grid size={13} /> }, { v: 'list', i: '≡' }].map(({ v, i }) => (
            <button key={v} onClick={() => setViewMode(v)} style={{
              width: '30px', height: '30px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: viewMode === v ? 'var(--accent)' : 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer',
              color: viewMode === v ? '#000' : 'var(--text-3)', fontSize: '0.8rem',
            }}>{i}</button>
          ))}
        </div>
      </div>

      {/* All apps */}
      {GROUP_ORDER.map(group => {
        const apps = grouped[group];
        if (!apps?.length) return null;
        return (
          <div key={group} style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ flex: 1 }}>{group}</span>
              <span style={{ opacity: 0.6 }}>{apps.length} apps</span>
            </p>
            {viewMode === 'grid' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.65rem' }}>
                {apps.map(app => {
                  const isPinned = pinnedTabs.includes(app.id);
                  return (
                    <div key={app.id} style={{ borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${app.color}33`, overflow: 'hidden', transition: 'transform 0.12s, box-shadow 0.12s', cursor: 'pointer' }}
                      className="hover-lift"
                      onClick={() => onNavigate(app.id)}>
                      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${app.color}18`, border: `1.5px solid ${app.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>{app.icon}</div>
                          <button onClick={e => { e.stopPropagation(); togglePinnedTab(app.id); }}
                            title={isPinned ? 'Unpin' : 'Pin to dock'}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: isPinned ? app.color : 'rgba(255,255,255,0.15)', padding: '2px', transition: 'color 0.2s' }}>
                            {isPinned ? <Pin size={13} /> : <PinOff size={13} />}
                          </button>
                        </div>
                        <div>
                          <p style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-1)' }}>{app.label}</p>
                          <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '2px' }}>{app.description}</p>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.6rem', fontWeight: 700, color: app.color, background: `${app.color}18`, padding: '2px 6px', borderRadius: '99px' }}>{app.group}</span>
                          {clickCounts[app.id] > 0 && <span style={{ fontSize: '0.58rem', color: 'var(--text-3)' }}>{clickCounts[app.id]} uses</span>}
                        </div>
                      </div>
                      <div style={{ height: '2px', background: app.color, opacity: 0.4 }} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {apps.map(app => {
                  const isPinned = pinnedTabs.includes(app.id);
                  return (
                    <div key={app.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 1rem', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${app.color}22`, cursor: 'pointer', transition: 'background 0.1s' }}
                      onClick={() => onNavigate(app.id)}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${app.color}18`, border: `1.5px solid ${app.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>{app.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-1)' }}>{app.label}</p>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>{app.description}</p>
                      </div>
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, color: app.color, background: `${app.color}18`, padding: '2px 6px', borderRadius: '99px', flexShrink: 0 }}>{app.group}</span>
                      <button onClick={e => { e.stopPropagation(); togglePinnedTab(app.id); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: isPinned ? app.color : 'rgba(255,255,255,0.15)', padding: '4px' }}>
                        {isPinned ? <Pin size={12} /> : <PinOff size={12} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
