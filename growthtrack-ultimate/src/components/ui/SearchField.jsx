import React, { useId, useRef } from 'react';
import { Search, X } from 'lucide-react';

export default function SearchField({ label = 'Search', value, onChange, onClear = undefined, placeholder = 'Search…', resultCount = undefined, className = '', ...props }) {
  const generatedId = useId();
  const inputRef = useRef(null);
  const clearSearch = () => {
    (onClear || onChange)('');
    inputRef.current?.focus();
  };
  const id = props.id || generatedId;
  const countId = resultCount == null ? undefined : `${id}-count`;
  const describedBy = [props['aria-describedby'], countId].filter(Boolean).join(' ') || undefined;
  return <div className={`gt-search-field ${className}`.trim()} data-responsive-foundation>
    <label className="sr-only gt-foundation-sr-only" htmlFor={id}>{label}</label>
    <Search size={16} aria-hidden="true" />
    <input {...props} ref={inputRef} id={id} type="search" value={value} onChange={event => onChange(event.target.value, event)} onKeyDown={event => {
      props.onKeyDown?.(event);
      if (event.key === 'Escape' && value && !props.disabled && !props.readOnly && !event.defaultPrevented && !event.nativeEvent.isComposing) {
        event.preventDefault();
        event.stopPropagation();
        clearSearch();
      }
    }} placeholder={placeholder} aria-describedby={describedBy} />
    {value && !props.disabled && !props.readOnly && <button type="button" onClick={clearSearch} aria-label={`Clear ${label.toLowerCase()}`}><X size={16} aria-hidden="true" /></button>}
    {countId && <span id={countId} className="sr-only gt-foundation-sr-only" role="status">{resultCount} result{resultCount === 1 ? '' : 's'}</span>}
  </div>;
}
