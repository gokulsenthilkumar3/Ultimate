import React, { useMemo, useState } from 'react';
import { ArrowUpRight, Grid, List, Pin, Search, Star, X } from 'lucide-react';
import safeLocalStorage from '../utils/safeLocalStorage';
import useStore, { selectPinnedTabs, selectTogglePinnedTab } from '../store/useStore';
import { GROUPS, NAVIGABLE_MODULES, TABS, tabMeta } from '../config/navigation';

const DOCK_APP_IDS = ['overview', 'physique', 'tasks', 'finance', 'insights', 'habits', 'workspace'];
const CLICK_KEY = 'gtd_app_click_counts';
const EMPTY_CONFIG = {};
const DEFAULT_APPS = Object.entries(TABS).map(([id, meta]) => ({
  id, label: meta.label, icon: meta.emoji, group: GROUPS[meta.group]?.label || 'More',
  description: meta.keywords.join(' · '), color: '#879cf2',
}));

function getClickCounts() {
  try {
    const parsed = JSON.parse(safeLocalStorage.getItem(CLICK_KEY) || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, count]) => Number.isFinite(count) && count >= 0));
  } catch { return {}; }
}

export default function AppLauncher({ setActiveTab }) {
  const appConfig = useStore(state => state.appConfig) || EMPTY_CONFIG;
  const allApps = useMemo(() => {
    const catalog = Array.isArray(appConfig.appCatalog) ? appConfig.appCatalog : [];
    const configured = new Map(catalog.filter(app => app && Object.hasOwn(NAVIGABLE_MODULES, app.id)).map(app => [app.id, app]));
    const ids = [...new Set([...configured.keys(), ...DEFAULT_APPS.map(app => app.id)])];
    return ids.map(id => {
      const meta = tabMeta(id);
      const app = configured.get(id) || DEFAULT_APPS.find(item => item.id === id) || {};
      return {
        id,
        label: typeof app.label === 'string' && app.label.trim() ? app.label : meta.label,
        description: typeof app.description === 'string' ? app.description : meta.keywords.join(' · '),
        group: typeof app.group === 'string' && app.group.trim() ? app.group : GROUPS[meta.group]?.label || 'More',
        icon: typeof app.icon === 'string' ? app.icon : meta.emoji,
        color: typeof app.color === 'string' && /^#[\da-f]{6}$/i.test(app.color) ? app.color : '#879cf2',
      };
    });
  }, [appConfig.appCatalog]);
  const groupOrder = useMemo(() => [...new Set(allApps.map(app => app.group))], [allApps]);
  const pinnedTabs = useStore(selectPinnedTabs) || [];
  const togglePinnedTab = useStore(selectTogglePinnedTab);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [groupFilter, setGroupFilter] = useState('all');
  const [clickCounts, setClickCounts] = useState(getClickCounts);
  const frequentApps = useMemo(() => [...allApps].sort((a, b) => (clickCounts[b.id] || 0) - (clickCounts[a.id] || 0)).filter(app => clickCounts[app.id] > 0).slice(0, 6), [allApps, clickCounts]);
  const pinnedApps = useMemo(() => allApps.filter(app => pinnedTabs.includes(app.id)), [allApps, pinnedTabs]);
  const dockApps = useMemo(() => {
    const ids = [...new Set([...pinnedApps.map(app => app.id), ...DOCK_APP_IDS])].slice(0, 8);
    return ids.map(id => allApps.find(app => app.id === id)).filter(Boolean);
  }, [allApps, pinnedApps]);
  const filtered = useMemo(() => allApps.filter(app =>
    (groupFilter === 'all' || app.group === groupFilter)
    && `${app.label} ${app.description} ${app.group}`.toLowerCase().includes(search.trim().toLowerCase()),
  ), [allApps, search, groupFilter]);
  const portfolioUrl = useMemo(() => {
    try {
      const url = new URL(appConfig.portfolioUrl);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
    } catch { return null; }
  }, [appConfig.portfolioUrl]);

  const onNavigate = id => {
    const counts = { ...clickCounts, [id]: (clickCounts[id] || 0) + 1 };
    safeLocalStorage.setItem(CLICK_KEY, JSON.stringify(counts));
    setClickCounts(counts);
    setActiveTab?.(id);
  };

  return (
    <div className="app-hub-shell">
      <div className="app-hub-hero">
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '.35rem' }}>Your workspace</p>
          <h1 className="text-display" style={{ fontSize: '2rem', margin: 0 }}>App Hub</h1>
          <p className="app-hub-copy" style={{ marginTop: '.4rem' }}>{allApps.length} modules, organized for quick launch.</p>
        </div>
        <div className="app-hub-hero__meta"><span className="app-hub-kpi">{pinnedApps.length} pinned</span></div>
      </div>
      <section className="app-hub-panel" aria-label="Quick launch">
        <h2 className="app-hub-label">Quick launch</h2>
        <div className="app-launch-dock">{dockApps.map(app => <button key={app.id} onClick={() => onNavigate(app.id)} className="app-launch-dock__item" style={{ '--app-color': app.color }} aria-label={`Open ${app.label}`}>
          <span className="app-launch-dock__icon" aria-hidden="true">{app.icon}</span><span>{app.label}</span>
        </button>)}</div>
        <p className="app-hub-note">Pin a module below to keep it at the front of quick launch.</p>
      </section>
      {portfolioUrl && <div className="app-hub-panel app-hub-panel--split">
        <div><p className="app-hub-label">Personal website</p><p className="app-hub-copy">Visit your linked portfolio.</p></div>
        <a href={portfolioUrl} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">Open website <ArrowUpRight size={15} /></a>
      </div>}
      {frequentApps.length > 0 && <section className="app-hub-frequent" aria-label="Frequently used modules">
        <h2 className="app-hub-label"><Star size={13} /> Frequently used</h2>
        <div className="chip-row">{frequentApps.map(app => <button className="app-hub-kpi" key={app.id} onClick={() => onNavigate(app.id)}>{app.icon} {app.label}</button>)}</div>
      </section>}
      <div className="app-hub-toolbar">
        <label className="app-hub-search"><Search size={17} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search apps…" aria-label="Search apps" />{search && <button onClick={() => setSearch('')} aria-label="Clear app search"><X size={16} /></button>}</label>
        <div className="app-hub-view-switch" role="group" aria-label="App display">
          {[['grid', Grid], ['list', List]].map(([mode, Icon]) => <button key={mode} onClick={() => setViewMode(mode)} aria-label={`${mode === 'grid' ? 'Grid' : 'List'} view`} aria-pressed={viewMode === mode}><Icon size={18} /></button>)}
        </div>
        <div className="app-hub-filters" role="group" aria-label="Filter apps by group">{['all', ...groupOrder].map(group => <button key={group} onClick={() => setGroupFilter(group)} aria-pressed={groupFilter === group}>{group === 'all' ? 'All modules' : group}</button>)}</div>
      </div>
      <p className="app-hub-result-count" role="status">{filtered.length} module{filtered.length === 1 ? '' : 's'}{search.trim() ? ` matching “${search.trim()}”` : ''}</p>
      {filtered.length === 0 && <div className="app-hub-empty"><Search size={28} /><h2>No matching modules</h2><p>Try another name or reset your filters.</p><button className="btn-secondary" onClick={() => { setSearch(''); setGroupFilter('all'); }}>Reset filters</button></div>}
      {groupOrder.map(group => {
        const apps = filtered.filter(app => app.group === group);
        if (!apps.length) return null;
        return <section key={group} className="app-hub-group">
          <h2 className="app-hub-label">{group}<span>{apps.length}</span></h2>
          <div className={`app-hub-cards app-hub-cards--${viewMode}`}>{apps.map(app => {
            const isPinned = pinnedTabs.includes(app.id);
            return <article key={app.id} className="glass-card app-hub-card" style={{ '--app-color': app.color }}>
              <button className="app-hub-card__launch" onClick={() => onNavigate(app.id)} aria-label={`Open ${app.label}`}>
                <span className="app-hub-card__icon" aria-hidden="true">{app.icon}</span>
                <span className="app-hub-card__copy"><strong>{app.label}</strong><span>{app.description}</span></span>
                <ArrowUpRight className="app-hub-card__arrow" size={15} aria-hidden="true" />
              </button>
              <button className="app-hub-card__pin" onClick={() => togglePinnedTab(app.id)} aria-label={`${isPinned ? 'Unpin' : 'Pin'} ${app.label}`} aria-pressed={isPinned} title={isPinned ? 'Unpin module' : 'Pin to quick launch'}><Pin size={16} /></button>
            </article>;
          })}</div>
        </section>;
      })}
    </div>
  );
}
