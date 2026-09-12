import React from 'react';

/** A compact, keyboard-native choice between a small set of view preferences. */
export default function SegmentedControl({ label, options, value, onChange, className = '' }) {
  return <div className={`gt-segmented ${className}`.trim()} role="group" aria-label={label}>
    {options.map(option => <button key={option.value} type="button" className={value === option.value ? 'is-selected' : ''} aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{option.label}</button>)}
  </div>;
}
