import React, { useId, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Ellipsis, X } from 'lucide-react';
import { tabMeta } from '../config/navigation';
import useDialogFocus from '../hooks/useDialogFocus';
import SearchField from './ui/SearchField';
import useNavigationFoundation, { useNavigationMode } from './ui/useNavigationFoundation';
import useNavigationOverlay from './ui/useNavigationOverlay';

/** Four saved-order destinations plus searchable access to all six areas. */
export default function FloatingPillDock({ activeTab }) {
  const { areas, activeGroup, highlightedTab } = useNavigationFoundation(activeTab);
  const mode = useNavigationMode();
  const [menuOpen, setMenuOpen] = useNavigationOverlay(mode);
  const [query, setQuery] = useState('');
  const id = useId();
  const open = mode === 'mobile' && menuOpen;
  const dialogRef = useDialogFocus(open, () => setMenuOpen(false));
  if (mode !== 'mobile') return null;
  const quickAreas = areas.slice(0, 4);
  const term = query.trim().toLocaleLowerCase();
  const matches = areas.map(area => ({ ...area, tabs: area.tabs.filter(tab => {
    const meta = tabMeta(tab);
    return `${area.label} ${meta.label} ${meta.description || ''} ${(meta.keywords || []).join(' ')}`.toLocaleLowerCase().includes(term);
  }) })).filter(area => area.tabs.length);
  const resultCount = matches.reduce((total, area) => total + area.tabs.length, 0);
  return <div className="gt-mobile-navigation" data-responsive-foundation>
    <nav className="gt-mobile-dock" aria-label="Quick navigation" data-testid="bottom-nav">
      {quickAreas.map(area => { const Icon = area.icon; return <Link key={area.id} to={area.path}
        className={`gt-mobile-destination${activeGroup === area.id ? ' is-active' : ''}`} aria-label={area.label}
        aria-current={activeGroup === area.id ? 'location' : null}>
        <Icon size={21} aria-hidden="true" /><span>{area.label}</span>
      </Link>; })}
      <button type="button" className={!quickAreas.some(area => area.id === activeGroup) ? 'is-active' : ''}
        onClick={() => { setQuery(''); setMenuOpen(true); }} aria-label="More" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? `${id}-menu` : undefined}>
        <Ellipsis size={21} aria-hidden="true" /><span>More</span>
      </button>
    </nav>
    {open && <div className="gt-mobile-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setMenuOpen(false); }}>
      <section id={`${id}-menu`} className="gt-mobile-menu" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} tabIndex={-1}>
        <header><div><h2 id={`${id}-title`}>All modules</h2><p>Your complete workspace</p></div><button type="button" aria-label="Close all modules" onClick={() => setMenuOpen(false)}><X size={20} aria-hidden="true" /></button></header>
        <SearchField data-dialog-autofocus label="Find a module" value={query} onChange={setQuery} resultCount={resultCount} />
        <nav aria-label="All modules">
          {matches.map(area => <section key={area.id}><h3>{area.label}</h3><div className="gt-mobile-menu-items">
            {area.tabs.map(tab => { const meta = tabMeta(tab); const Icon = meta.icon; return <NavLink key={tab} to={meta.canonicalPath} end
              aria-current={highlightedTab === tab ? 'page' : null} onClick={() => setMenuOpen(false)}><Icon size={18} aria-hidden="true" /><span>{meta.label}</span></NavLink>; })}
          </div></section>)}
          {!matches.length && <p role="status">No modules match “{query}”. Try another name.</p>}
        </nav>
      </section>
    </div>}
  </div>;
}
