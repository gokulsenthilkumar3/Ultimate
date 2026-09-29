import React from 'react';
import { Link } from 'react-router-dom';
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
      <Link className="breadcrumbs__home" to={tabMeta('overview').canonicalPath} aria-label="Go to Overview">
        <Home size={14} />
        <span>Ultimate</span>
      </Link>
      <ChevronRight className="breadcrumbs__separator" size={14} aria-hidden="true" />
      <Link className="breadcrumbs__group" to={tabMeta(group.tabs[0]).canonicalPath}>
        <GroupIcon size={14} />
        <span>{group.label}</span>
      </Link>
      <ChevronRight className="breadcrumbs__separator" size={14} aria-hidden="true" />
      <span className="breadcrumbs__current" aria-current="page">{meta.label}</span>
    </nav>
  );
}
