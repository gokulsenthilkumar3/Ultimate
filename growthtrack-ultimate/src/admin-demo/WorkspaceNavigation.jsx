import React from 'react';
import { Icon } from './components';
import { PAGES, demoHref } from './catalog';

const areas = [
  { id: 'customers', title: 'Customers', home: 'customers' },
  { id: 'finance', title: 'Finance', home: 'finance' },
  { id: 'wellness', title: 'GrowthTrack', home: 'wellness' },
  { id: 'workspace', title: 'Work', home: 'workspace' },
  { id: 'life', title: 'Life', home: 'life' },
  { id: 'insights', title: 'Insights', home: 'analytics' },
  { id: 'hub', title: 'Platform', home: 'hub' },
];
export default function WorkspaceNavigation({ page, onNavigate }) {
  return <nav className="workspace-navigation" aria-label="Workspace areas"><a className={`nav-link${page.id === 'overview' ? ' nav-active' : ''}`} href={demoHref('overview')} onClick={onNavigate} aria-current={page.id === 'overview' ? 'page' : undefined}><Icon name="overview" />Overview</a>
    {areas.map(area => {
      const selected = page.area === area.id && page.id !== 'overview';
      const children = PAGES.filter(item => item.area === area.id && item.id !== 'overview');
      return <div className="navigation-area" key={area.id}><a className={`nav-link${selected ? ' nav-active' : ''}`} href={demoHref(area.home)} onClick={onNavigate} aria-current={selected ? 'location' : undefined}><Icon name={area.home} />{area.title}</a>{selected && <div className="area-children" aria-label={`${area.title} pages`}>{children.map(child => <a key={child.id} href={demoHref(child.id)} onClick={onNavigate} className={child.id === page.id ? 'child-active' : ''} aria-current={child.id === page.id ? 'page' : undefined}>{child.id === 'finsync' ? 'FinSync' : child.id === 'oxfin' ? 'OxFin' : child.title}</a>)}</div>}</div>;
    })}
  </nav>;
}
