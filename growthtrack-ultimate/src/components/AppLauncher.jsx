import React, { useMemo, useState } from 'react';
import { ArrowUpRight, Grid, List, Pin, Search, Star, X } from 'lucide-react';
import safeLocalStorage from '../utils/safeLocalStorage';
import useStore, { selectPinnedTabs, selectTogglePinnedTab } from '../store/useStore';
import { GROUPS, NAVIGABLE_MODULES, TABS, tabMeta } from '../config/navigation';
import '../styles/app-hub.css';

const DOCK_APP_IDS = ['overview', 'physique', 'tasks', 'finance', 'insights', 'habits', 'workspace'];
const CLICK_KEY = 'gtd_app_click_counts';
const VIEW_KEY = 'gtd_app_hub_view';
const EMPTY_CONFIG = {};
const EMPTY_LIST = Object.freeze([]);
const APP_DESCRIPTIONS = {
  overview: 'Your day, priorities, and progress at a glance.', current: 'Check in with what is happening now.',
  physique: 'Explore measurements and your 3D body view.', assessment: 'Understand your starting point.',
  training: 'Plan workouts and record your sessions.', strength: 'Follow your lifts and personal records.',
  nutrition: 'Track meals and daily nutrition.', hydration: 'Keep up with your daily water intake.',
  sleep: 'Review your sleep and recovery.', lifestyle: 'Make space for healthier everyday choices.',
  mind: 'Take a moment for your mental wellbeing.', medical: 'Keep your health records together.',
  health: 'Track the health details that matter to you.', habits: 'Build consistency, one day at a time.',
  insights: 'Find patterns in your progress.', progress: 'Look back at your measurements and milestones.',
  goals: 'Choose a target and track your next step.', workspace: 'Plan your schedule, organize files, and take notes.',
  tasks: 'Choose what to do next and get it done.', projects: 'Bring tasks together around a bigger goal.',
  timesheet: 'See where your working hours go.', skills: 'Make learning part of your routine.',
  finance: 'Review spending, budgets, and subscriptions.', shopping: 'Organize purchases before you buy.',
  sip: 'Explore an investment contribution scenario.', portfolio: 'Keep an overview of your investments.',
  social: 'Organize your social accounts and activity.', entertainment: 'Keep your next watch within reach.',
  maps: 'Explore places and find your way.', ai: 'Ask your configured assistant for help.',
  databases: 'Browse and manage your saved data.', profile: 'Make your profile and preferences your own.',
  help: 'Find answers and get support.', logs: 'Review activity and troubleshoot issues.',
  apps: 'Find every tool in your personal workspace.', about: 'Learn about GrowthTrack and your version.',
  notifications: 'Catch up on alerts and reminders.', pricing: 'Review available plans and features.',
};
const DEFAULT_APPS = Object.entries(TABS).map(([id, meta]) => ({
  id, label: meta.label, icon: meta.emoji, group: GROUPS[meta.group]?.label || 'More',
  description: APP_DESCRIPTIONS[id] || meta.keywords.join(' · '), color: '#879cf2',
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
        description: typeof app.description === 'string' && app.description.trim() ? app.description : APP_DESCRIPTIONS[id] || meta.keywords.join(' · '),
        keywords: meta.keywords.join(' '),
        group: typeof app.group === 'string' && app.group.trim() ? app.group : GROUPS[meta.group]?.label || 'More',
        icon: typeof app.icon === 'string' ? app.icon : meta.emoji,
        color: typeof app.color === 'string' && /^#[\da-f]{6}$/i.test(app.color) ? app.color : '#879cf2',
      };
    });
  }, [appConfig.appCatalog]);
  const groupOrder = useMemo(() => [...new Set(allApps.map(app => app.group))], [allApps]);
  const pinnedTabs = useStore(selectPinnedTabs) || EMPTY_LIST;
  const togglePinnedTab = useStore(selectTogglePinnedTab);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState(() => safeLocalStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid');
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [groupFilter, setGroupFilter] = useState('all');
  const [clickCounts, setClickCounts] = useState(getClickCounts);
  const frequentApps = useMemo(() => [...allApps].sort((a, b) => (clickCounts[b.id] || 0) - (clickCounts[a.id] || 0)).filter(app => clickCounts[app.id] > 0).slice(0, 6), [allApps, clickCounts]);
  const pinnedApps = useMemo(() => allApps.filter(app => pinnedTabs.includes(app.id)), [allApps, pinnedTabs]);
  const dockApps = useMemo(() => {
    const ids = pinnedApps.length ? pinnedTabs : DOCK_APP_IDS;
    return ids.map(id => allApps.find(app => app.id === id)).filter(Boolean);
  }, [allApps, pinnedApps, pinnedTabs]);
  const filtered = useMemo(() => allApps.filter(app =>
    (groupFilter === 'all' || app.group === groupFilter)
    && (!pinnedOnly || pinnedTabs.includes(app.id))
    && search.trim().toLowerCase().split(/\s+/).every(word => `${app.label} ${app.description} ${app.group} ${app.keywords}`.toLowerCase().includes(word)),
  ), [allApps, search, groupFilter, pinnedOnly, pinnedTabs]);
  const resetFilters = () => { setSearch(''); setGroupFilter('all'); setPinnedOnly(false); };
  const changeView = mode => { setViewMode(mode); safeLocalStorage.setItem(VIEW_KEY, mode); };
  const appIcon = app => React.createElement(tabMeta(app.id).icon, { size: 23, strokeWidth: 1.7 });
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
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '.35rem' }}>YOUR PERSONAL TOOLKIT</p>
          <h1 className="text-display">App Hub<span className="app-hub-title-dot">.</span></h1>
          <p className="app-hub-copy" style={{ marginTop: '.4rem' }}>Explore {allApps.length} tools for your day. Pin your favorites to make them easier to find.</p>
        </div>
        <div className="app-hub-hero__meta"><span><strong>{allApps.length}</strong> tools</span><span><strong>{groupOrder.length}</strong> areas</span><span><strong>{pinnedApps.length}</strong> pinned</span></div>
      </div>
      <section className="app-hub-panel" aria-label="Quick launch">
        <h2 className="app-hub-label"><Pin size={15} />{pinnedApps.length ? 'Pinned for you' : 'Start here'}</h2>
        <div className="app-launch-dock">{dockApps.map(app => <button key={app.id} onClick={() => onNavigate(app.id)} className="app-launch-dock__item" style={{ '--app-color': app.color }} aria-label={`Open ${app.label}`}>
          <span className="app-launch-dock__icon" aria-hidden="true">{appIcon(app)}</span><span>{app.label}</span>
        </button>)}</div>
        <p className="app-hub-note">{pinnedApps.length ? 'Your pinned tools, always one click away. Manage pins in the library below.' : 'A few everyday essentials. Pin any tool below to create your own shortcuts.'}</p>
      </section>
      {portfolioUrl && <div className="app-hub-panel app-hub-panel--split">
        <div><p className="app-hub-label">Personal website</p><p className="app-hub-copy">Visit your linked portfolio.</p></div>
        <a href={portfolioUrl} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">Open website <ArrowUpRight size={15} /></a>
      </div>}
      {frequentApps.length > 0 && <section className="app-hub-frequent" aria-label="Frequently used modules">
        <h2 className="app-hub-label"><Star size={13} /> Frequently used</h2>
        <div className="chip-row">{frequentApps.map(app => <button className="app-hub-kpi" key={app.id} onClick={() => onNavigate(app.id)}>{app.icon} {app.label}</button>)}</div>
      </section>}
      <div className="app-hub-library-heading"><h2>Explore your tools</h2><p>Find a familiar favorite or something new.</p></div>
      <div className="app-hub-toolbar">
        <label className="app-hub-search"><Search size={19} /><input type="search" value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') setSearch(''); }} placeholder="Search tools, interests, or actions…" aria-label="Search apps" />{search && <button onClick={() => setSearch('')} aria-label="Clear app search"><X size={16} /></button>}</label>
        <button className="app-hub-pinned-filter" aria-label={`Pinned ${pinnedApps.length}`} aria-pressed={pinnedOnly} onClick={() => setPinnedOnly(value => !value)}><Pin size={16} />Pinned<span>{pinnedApps.length}</span></button>
        <div className="app-hub-view-switch" role="group" aria-label="App display">
          {[['grid', Grid], ['list', List]].map(([mode, Icon]) => <button key={mode} onClick={() => changeView(mode)} aria-label={`${mode === 'grid' ? 'Grid' : 'List'} view`} aria-pressed={viewMode === mode}>{React.createElement(Icon, { size: 18 })}</button>)}
        </div>
        <div className="app-hub-filters" role="group" aria-label="Filter apps by group">{['all', ...groupOrder].map(group => <button key={group} onClick={() => setGroupFilter(group)} aria-pressed={groupFilter === group}>{group === 'all' ? 'All modules' : group}</button>)}</div>
      </div>
      <div className="app-hub-results"><p className="app-hub-result-count" role="status">{filtered.length} tool{filtered.length === 1 ? '' : 's'}{groupFilter !== 'all' ? ` in ${groupFilter}` : ''}{pinnedOnly ? ' · Pinned only' : ''}{search.trim() ? ` matching “${search.trim()}”` : ''}</p>{(search || groupFilter !== 'all' || pinnedOnly) && <button onClick={resetFilters}>Clear filters<X size={14} /></button>}</div>
      {filtered.length === 0 && <div className="app-hub-empty">{pinnedOnly && !pinnedApps.length ? <Pin size={28} /> : <Search size={28} />}<h2>{pinnedOnly && !pinnedApps.length ? 'Make this space yours' : 'No tools found'}</h2><p>{pinnedOnly && !pinnedApps.length ? 'Pin tools from the library to keep your favorites together.' : 'Try a broader search or clear your filters to see every tool.'}</p><button className="btn-secondary" onClick={resetFilters}>Show all tools</button></div>}
      {groupOrder.map(group => {
        const apps = filtered.filter(app => app.group === group);
        if (!apps.length) return null;
        return <section key={group} className="app-hub-group">
          <h2 className="app-hub-label">{group}<span>{apps.length}</span></h2>
          <div className={`app-hub-cards app-hub-cards--${viewMode}`}>{apps.map(app => {
            const isPinned = pinnedTabs.includes(app.id);
            return <article key={app.id} className="glass-card app-hub-card" style={{ '--app-color': app.color }}>
              <button className="app-hub-card__launch" onClick={() => onNavigate(app.id)} aria-label={`Open ${app.label}`}>
                <span className="app-hub-card__icon" aria-hidden="true">{appIcon(app)}</span>
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

