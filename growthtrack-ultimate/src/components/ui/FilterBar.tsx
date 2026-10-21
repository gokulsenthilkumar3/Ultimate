import React, { type ReactNode } from 'react';
import SearchField from './SearchField';
import Button from './Button';

export interface FilterBarProps {
  label?: string; searchLabel?: string; query?: string; onQueryChange?: (value: string) => void;
  resultCount?: number; children?: ReactNode; actions?: ReactNode; onReset?: () => void;
  activeFilters?: { id: string; label: string; onRemove: () => void }[];
}
export default function FilterBar({ label = 'Filters', searchLabel = 'Search records', query = '', onQueryChange, resultCount, children, actions, onReset, activeFilters = [] }: FilterBarProps) {
  return <section className="gt-filter-bar" data-responsive-foundation aria-label={label}>
    <div className="gt-filter-bar__controls">
      {onQueryChange && <SearchField label={searchLabel} value={query} onChange={onQueryChange} onClear={() => onQueryChange('')} />}
      {children}{actions}
      {onReset && <Button variant="secondary" onClick={onReset}>Reset filters</Button>}
    </div>
    {activeFilters.length > 0 && <ul className="gt-filter-bar__chips" aria-label="Active filters">{activeFilters.map(filter => <li key={filter.id}><button type="button" onClick={filter.onRemove} aria-label={`Remove ${filter.label} filter`}>{filter.label}<span aria-hidden="true"> ×</span></button></li>)}</ul>}
    {resultCount != null && <p className="gt-filter-bar__count" role="status">{resultCount} result{resultCount === 1 ? '' : 's'}</p>}
  </section>;
}
