import React, { useId } from 'react';

/** Keyboard-native tabs for small, mutually exclusive views. */
export default function Tabs({ label, tabs, value, onChange, className = '', idPrefix, onKeyDown }) {
  const id = useId();
  return <div className={`gt-tabs ${className}`.trim()} role="tablist" aria-label={label} onKeyDown={onKeyDown}>
    {tabs.map((tab) => <button
      key={tab.value}
      id={`${idPrefix || id}-${tab.value}`}
      type="button"
      role="tab"
      aria-selected={value === tab.value}
      aria-controls={tab.panelId}
      disabled={tab.disabled}
      tabIndex={value === tab.value ? 0 : -1}
      onClick={() => onChange(tab.value)}
    >{tab.description ? <><strong>{tab.label}</strong><small>{tab.description}</small></> : tab.label}</button>)}
  </div>;
}
