import React, { useId, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { HelpCircle, Home, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Settings, X } from 'lucide-react';
import useStore from '../store/useStore';
import { tabMeta } from '../config/navigation';
import useDialogFocus from '../hooks/useDialogFocus';
import useNavigationFoundation, { useNavigationMode } from './ui/useNavigationFoundation';
import useNavigationOverlay from './ui/useNavigationOverlay';
import AnimatedLogo from './motion/AnimatedLogo';
import SelectionHighlight from './motion/SelectionHighlight';

/** Approved portal rail. URLs own navigation; records remain with their domains. */
export default function PremiumSidebar({ activeTab, user, onOpenSettings, onLogout }) {
  const { areas, activeGroup, highlightedTab } = useNavigationFoundation(activeTab);
  const mode = useNavigationMode();
  const desktop = mode === 'desktop';
  const collapsed = Boolean(useStore(state => state.sidebarCollapsed));
  const setCollapsed = useStore(state => state.setSidebarCollapsed);
  const [drawerOpen, setDrawerOpen] = useNavigationOverlay(mode);
  const [preference, setPreference] = useState({ pending: false, error: '', retryValue: null });
  const busy = useRef(false);
  const toggleRef = useRef(null);
  const id = useId();
  const modalOpen = !desktop && drawerOpen;
  const dialogRef = useDialogFocus(modalOpen, () => setDrawerOpen(false));
  const railVisible = desktop || modalOpen;
  const expanded = !desktop || !collapsed;
  const saveCollapsed = async value => {
    if (busy.current) return;
    const retryHadFocus = Boolean(document.activeElement?.closest('.gt-navigation-preference'));
    busy.current = true;
    setPreference(previous => ({ ...previous, pending: true, retryValue: value }));
    try {
      if (typeof setCollapsed !== 'function') throw new Error('Preference unavailable');
      await setCollapsed(value);
      setPreference({ pending: false, error: '', retryValue: null });
      if (retryHadFocus && document.activeElement?.closest('.gt-navigation-preference')) toggleRef.current?.focus();
    } catch {
      setPreference({ pending: false, error: 'Could not save navigation preference.', retryValue: value });
    } finally { busy.current = false; }
  };
  const ownerName = String(user?.name || user?.fullName || 'Account');
  return <aside className="gt-app-navigation" data-responsive-foundation data-mode={mode} data-panel-mode={desktop ? 'pinned' : 'overlay'} data-open={modalOpen} data-collapsed={desktop && collapsed} aria-label="Application navigation">
    {!desktop && <button type="button" className="gt-navigation-mobile-trigger" aria-label="Open module navigation" aria-expanded={modalOpen} aria-controls={modalOpen ? `${id}-rail` : undefined} onClick={() => setDrawerOpen(true)}><Menu size={21} aria-hidden="true" /></button>}
    {modalOpen && <div className="gt-navigation-shade" onClick={() => setDrawerOpen(false)} aria-hidden="true" />}
    {railVisible && <section id={`${id}-rail`} className="gt-navigation-rail" ref={modalOpen ? dialogRef : undefined} role={modalOpen ? 'dialog' : undefined} aria-modal={modalOpen || undefined} aria-label={modalOpen ? 'Workspace navigation' : undefined} tabIndex={modalOpen ? -1 : undefined}>
      <header className="gt-portal-brand">
        <Link className="gt-navigation-brand" to={tabMeta('overview').canonicalPath} aria-label={expanded ? undefined : 'GrowthTrack Home'}><AnimatedLogo />{expanded && <strong>GrowthTrack<small>A little more you.</small></strong>}</Link>
        <button ref={toggleRef} type="button" className="gt-navigation-toggle" onClick={() => desktop ? void saveCollapsed(!collapsed) : setDrawerOpen(false)} aria-label={!desktop ? 'Close navigation' : collapsed ? 'Open module navigation' : 'Close module navigation'} aria-expanded={desktop ? !collapsed : modalOpen} aria-busy={preference.pending || undefined}>
          {!desktop ? <X size={18} /> : collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </header>
      <div className="gt-navigation-scroll">
        <Link className={`gt-navigation-area gt-navigation-overview${highlightedTab === 'overview' ? ' is-active' : ''}`} to={tabMeta('overview').canonicalPath} aria-label="Workspace overview" aria-current={highlightedTab === 'overview' ? 'page' : undefined} title={!expanded ? 'Overview' : undefined}><Home size={19} aria-hidden="true" />{expanded && <span>Overview</span>}</Link>
        <nav className="gt-navigation-areas" aria-label="Product areas">
          {areas.map(area => { const Icon = area.icon; const active = activeGroup === area.id && highlightedTab !== 'overview'; return <div className="gt-navigation-group" key={area.id}>
            <Link className={`gt-navigation-area${active ? ' is-active' : ''}`} data-area={area.id} to={area.path} aria-label={area.label} aria-current={active ? 'location' : undefined} title={!expanded ? area.label : undefined}><SelectionHighlight id={`${id}-area`} active={active} /><Icon size={19} aria-hidden="true" />{expanded && <span>{area.label}</span>}</Link>
            {expanded && active && <nav className="gt-navigation-modules" aria-label={`${area.label} modules`}>
              {area.tabs.map(tab => { const meta = tabMeta(tab); return <NavLink key={tab} to={meta.canonicalPath} end className={`gt-navigation-module${highlightedTab === tab ? ' is-active' : ''}`} aria-current={highlightedTab === tab ? 'page' : undefined} onClick={() => setDrawerOpen(false)}><span>{meta.label}</span></NavLink>; })}
            </nav>}
          </div>; })}
        </nav>
      </div>
      {preference.error && <div className="gt-navigation-preference"><p role="alert">{preference.error}</p><button type="button" disabled={preference.pending} onClick={() => void saveCollapsed(preference.retryValue)}>{preference.pending ? 'Retrying…' : 'Retry navigation save'}</button></div>}
      <footer className="gt-navigation-utilities">
        <Link to={tabMeta('help').canonicalPath} aria-label="Help" title={!expanded ? 'Help' : undefined}><HelpCircle size={18} aria-hidden="true" />{expanded && <span>Help</span>}</Link>
        {onOpenSettings && <button type="button" onClick={onOpenSettings} aria-label="Settings" title={!expanded ? 'Settings' : undefined}><Settings size={18} aria-hidden="true" />{expanded && <span>Settings</span>}</button>}
        {onLogout && <button type="button" className="gt-navigation-signout" onClick={onLogout} aria-label="Sign out" title={!expanded ? 'Sign out' : undefined}><LogOut size={18} aria-hidden="true" />{expanded && <span>Sign out</span>}</button>}
        {expanded && <p className="gt-navigation-account"><span className="gt-navigation-avatar" aria-hidden="true">{ownerName[0].toUpperCase()}</span><span>{ownerName}</span></p>}
      </footer>
    </section>}
  </aside>;
}
