import React, { useId } from 'react';
import { Search, X } from 'lucide-react';

export default function SearchField({ label = 'Search', value, onChange, onClear, placeholder = 'Search…', resultCount, className = '', ...props }) {
  const generatedId = useId();
  const id = props.id || generatedId;
  const countId = resultCount == null ? undefined : `${id}-count`;
  return <div className={`gt-search-field ${className}`.trim()}>
    <label className="sr-only" htmlFor={id}>{label}</label>
    <Search size={16} aria-hidden="true" />
    <input {...props} id={id} type="search" value={value} onChange={event => onChange(event.target.value, event)} placeholder={placeholder} aria-describedby={countId} />
    {value && <button type="button" onClick={() => (onClear || onChange)('')} aria-label={`Clear ${label.toLowerCase()}`}><X size={16} aria-hidden="true" /></button>}
    {countId && <span id={countId} className="sr-only" role="status">{resultCount} result{resultCount === 1 ? '' : 's'}</span>}
  </div>;
}
