import React, { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { GROUPS, MOBILE_QUICK_GROUPS, TAB_GROUP_MAP, ROUTE_ALIASES, navigationGroups, normalizeGroupOrder, normalizeTabOrder, tabMeta } from '../config/navigation';
import useStore from '../store/useStore';
import useDialogFocus from '../hooks/useDialogFocus';

const QUICK_GROUPS = MOBILE_QUICK_GROUPS.map(id => ({ id, ...GROUPS[id], firstTab: GROUPS[id].tabs[0] }));

export default function FloatingPillDock({ activeTab, onTabChange }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const configuredGroups = useStore(state => state.appConfig?.navigation?.groups);
  const savedOrder = useStore(state => state.navigationOrder);
  const tabOrder = useStore(state => state.navigationTabOrder);
  const groups = useMemo(() => navigationGroups(configuredGroups), [configuredGroups]);
  const order = useMemo(() => normalizeGroupOrder(savedOrder), [savedOrder]);
  const highlightedTab = ROUTE_ALIASES[activeTab] || activeTab;
  const mappedGroup = TAB_GROUP_MAP[highlightedTab] || 'system';
  const activeGroup = MOBILE_QUICK_GROUPS.includes(mappedGroup) ? mappedGroup : 'system';
  const dialogRef = useDialogFocus(menuOpen, () => setMenuOpen(false));

  useEffect(() => {
    if (!menuOpen) return undefined;
    const viewport = window.matchMedia('(min-width: 769px)');
    const closeOnDesktop = event => { if (event.matches) setMenuOpen(false); };
    viewport.addEventListener('change', closeOnDesktop);
    return () => viewport.removeEventListener('change', closeOnDesktop);
  }, [menuOpen]);

  const navigate = tab => {
    setMenuOpen(false);
    onTabChange(tab);
  };
  const matches = order.map(id => ({ id, ...groups[id], tabs: normalizeTabOrder(tabOrder?.[id], groups[id].tabs).filter(tab => {
    const meta = tabMeta(tab);
    return `${meta.label} ${meta.keywords.join(' ')} ${groups[id].label}`.toLowerCase().includes(query.trim().toLowerCase());
  }) })).filter(group => group.tabs.length);

  return (
    <>
      <div className="floating-pill-dock-container">
        <nav className="floating-pill-dock" aria-label="Quick navigation" data-testid="bottom-nav">
          {QUICK_GROUPS.map(group => {
            const isMore = group.id === 'system';
            const isActive = activeGroup === group.id;
            const Icon = group.icon;
            return (
              <button key={group.id}
                className={`pill-dock-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  if (isMore) { setQuery(''); setMenuOpen(true); }
                  else navigate(group.firstTab);
                }}
                aria-label={group.label}
                aria-current={isActive ? 'page' : undefined}
                aria-haspopup={isMore ? 'dialog' : undefined}
                aria-expanded={isMore ? menuOpen : undefined}
                aria-controls={isMore ? 'mobile-module-menu' : undefined}
              >
                <Icon className="pill-dock-icon" size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span className="pill-dock-label nav-label">{group.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
      {menuOpen && (
        <div className="mobile-module-backdrop" onClick={() => setMenuOpen(false)}>
          <section id="mobile-module-menu" className="mobile-module-menu" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="mobile-module-title" tabIndex={-1} onClick={event => event.stopPropagation()}>
            <div className="mobile-module-menu__header">
              <div><h2 id="mobile-module-title">All modules</h2><p>Your complete workspace</p></div>
              <button className="header-control" aria-label="Close all modules" onClick={() => setMenuOpen(false)}><X size={20} /></button>
            </div>
            <label className="mobile-module-menu__search"><Search size={18} /><input data-dialog-autofocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a module…" aria-label="Find a module" /></label>
            <nav className="mobile-module-menu__groups" aria-label="All modules">
              {matches.map(group => <section key={group.id}>
                <h3>{group.label}</h3>
                <div className="mobile-module-menu__items">{group.tabs.map(tab => {
                  const meta = tabMeta(tab);
                  const Icon = meta.icon;
                  return <button key={tab} onClick={() => navigate(tab)} aria-current={highlightedTab === tab ? 'page' : undefined}><Icon size={18} /><span>{meta.label}</span></button>;
                })}</div>
              </section>)}
              {!matches.length && <p className="mobile-module-menu__empty" role="status">No modules match “{query}”. Try another name.</p>}
            </nav>
          </section>
        </div>
      )}
    </>
  );
}
