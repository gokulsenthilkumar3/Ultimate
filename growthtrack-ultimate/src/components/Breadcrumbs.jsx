import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { GROUPS, tabMeta } from '../config/navigation';

/**
 * Context only: breadcrumbs explain where the user is without duplicating the
 * sidebar's module navigation.
 */
export default function Breadcrumbs({ activeTab, onNavigate }) {
  const meta = tabMeta(activeTab);
  const group = GROUPS[meta.group];
  if (!group) return null;
  const GroupIcon = group.icon;

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <button type="button" className="breadcrumbs__home" onClick={() => onNavigate('overview')} aria-label="Go to Overview">
        <Home size={14} />
        <span>Ultimate</span>
      </button>
      <ChevronRight className="breadcrumbs__separator" size={14} aria-hidden="true" />
      <button type="button" className="breadcrumbs__group" onClick={() => onNavigate(group.tabs[0])}>
        <GroupIcon size={14} />
        <span>{group.label}</span>
      </button>
      <ChevronRight className="breadcrumbs__separator" size={14} aria-hidden="true" />
      <span className="breadcrumbs__current" aria-current="page">{group?.tabs?.[0] === activeTab ? `${group.label} Command` : meta.label}</span>
    </nav>
  );
}
