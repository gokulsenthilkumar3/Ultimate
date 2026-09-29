import React, { useId, useRef, useState, useSyncExternalStore } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Bot, LogOut, PanelLeftClose, PanelLeftOpen, Settings, X } from 'lucide-react';
import useStore from '../store/useStore';
import { tabMeta } from '../config/navigation';
import useDialogFocus from '../hooks/useDialogFocus';
import useNavigationFoundation, { useNavigationMode } from './ui/useNavigationFoundation';
import useNavigationOverlay from './ui/useNavigationOverlay';

/** Requires a Router. Links own navigation; legacy setActiveTab is accepted but not invoked. */
export default function PremiumSidebar({ activeTab, user, onOpenSettings, onLogout }) {
  const { areas, activeGroup, highlightedTab, group } = useNavigationFoundation(activeTab);
  const mode = useNavigationMode();
  const pinnedMode = mode === 'desktop';
  const collapsed = Boolean(useStore(state => state.sidebarCollapsed));
  const setCollapsed = useStore(state => state.setSidebarCollapsed);
  const [drawerOpen, setDrawerOpen] = useNavigationOverlay(pinnedMode ? 'pinned' : mode);
  const [preference, setPreference] = useState({ pending: false, error: '', retryValue: null });
  const preferenceBusy = useRef(false);
  const id = useId();
  const modalOpen = !pinnedMode && mode !== 'mobile' && drawerOpen;
  const panelOpen = pinnedMode ? !collapsed : modalOpen;
  const dialogRef = useDialogFocus(modalOpen, () => setDrawerOpen(false));
  if (mode === 'mobile') return null;
  const saveCollapsed = async value => {
    if (preferenceBusy.current) return;
    preferenceBusy.current = true;
    setPreference(previous => ({ ...previous, pending: true, retryValue: value }));
    try {
      if (typeof setCollapsed !== 'function') throw new Error('Navigation preference is unavailable');
      await setCollapsed(value);
      setPreference({ pending: false, error: '', retryValue: null });
    } catch {
      // The store owns rollback. Keep the failed intent available for an explicit retry.
      setPreference({ pending: false, error: 'Could not save navigation preference.', retryValue: value });
    } finally { preferenceBusy.current = false; }
  };
  const togglePanel = () => {
    if (pinnedMode) void saveCollapsed(!collapsed);
    else setDrawerOpen(!drawerOpen);
  };
  const closePanel = () => {
    if (pinnedMode) {
      void saveCollapsed(true);
      document.getElementById(`${id}-toggle`)?.focus();
    } else setDrawerOpen(false);
  };
  const ownerName = String(user?.name || user?.fullName || 'Owner');
  return <aside className="gt-app-navigation" data-responsive-foundation data-mode={mode} data-panel-mode={pinnedMode ? 'pinned' : 'overlay'} data-collapsed={collapsed} aria-label="Application navigation">
    <div className="gt-navigation-rail">
      <Link className="gt-navigation-brand" to={tabMeta('overview').canonicalPath} aria-label="GrowthTrack Home"><span aria-hidden="true">G</span></Link>
      <nav className="gt-navigation-areas" aria-label="Product areas">
        {areas.map(area => { const Icon = area.icon; return <Link key={area.id} to={area.path}
          className={`gt-navigation-area${activeGroup === area.id ? ' is-active' : ''}`}
          aria-label={area.label} aria-current={activeGroup === area.id ? 'location' : null}>
          <Icon size={20} aria-hidden="true" /><span>{area.label}</span>
        </Link>; })}
      </nav>
      <button id={`${id}-toggle`} type="button" className="gt-navigation-toggle" onClick={togglePanel}
        aria-label={panelOpen ? 'Close module navigation' : 'Open module navigation'} aria-expanded={panelOpen} aria-busy={pinnedMode && preference.pending || undefined} aria-controls={panelOpen ? `${id}-panel` : undefined}>
        {panelOpen ? <PanelLeftClose size={20} aria-hidden="true" /> : <PanelLeftOpen size={20} aria-hidden="true" />}<span>Modules</span>
      </button>
      {preference.error && <div className="gt-navigation-preference">
        <p role="alert">{preference.error}</p>
        <button type="button" disabled={preference.pending} onClick={() => { void saveCollapsed(preference.retryValue); }}>{preference.pending ? 'Retrying…' : 'Retry navigation save'}</button>
      </div>}
      <div className="gt-navigation-utilities">
        <Link to={tabMeta('ai').canonicalPath} aria-label="Open Agents"><Bot size={20} aria-hidden="true" /><span>Agents</span></Link>
        {onOpenSettings && <button type="button" onClick={onOpenSettings} aria-label="Open profile"><span className="gt-navigation-avatar" aria-hidden="true">{ownerName[0].toUpperCase()}</span><span>Profile</span></button>}
      </div>
    </div>
    {modalOpen && <div className="gt-navigation-shade" onClick={() => setDrawerOpen(false)} aria-hidden="true" />}
    {panelOpen && <section id={`${id}-panel`} className="gt-navigation-panel" ref={modalOpen ? dialogRef : undefined}
      role={modalOpen ? 'dialog' : undefined} aria-modal={modalOpen || undefined} aria-labelledby={`${id}-title`} tabIndex={modalOpen ? -1 : undefined}>
      <header><div><small>Workspace</small><h2 id={`${id}-title`}>{group.label}</h2></div>
        <button type="button" onClick={closePanel} aria-label="Close modules">{modalOpen ? <X size={20} aria-hidden="true" /> : <PanelLeftClose size={20} aria-hidden="true" />}</button>
      </header>
      <nav aria-label={`${group.label} modules`}>
        {group.tabs.map(tabId => { const meta = tabMeta(tabId); const Icon = meta.icon; return <NavLink key={tabId} to={meta.canonicalPath} end
          className={`gt-navigation-module${highlightedTab === tabId ? ' is-active' : ''}`} aria-current={highlightedTab === tabId ? 'page' : null}
          onClick={() => setDrawerOpen(false)}><Icon size={18} aria-hidden="true" /><span><strong>{meta.label}</strong><small>{meta.description}</small></span></NavLink>; })}
      </nav>
      {(onOpenSettings || onLogout) && <footer>
        {onOpenSettings && <button type="button" onClick={onOpenSettings}><Settings size={18} aria-hidden="true" /><span>Settings</span></button>}
        {onLogout && <button type="button" className="is-danger" onClick={onLogout}><LogOut size={18} aria-hidden="true" /><span>Sign out</span></button>}
      </footer>}
    </section>}
  </aside>;
}
