import React, { useId } from 'react';

/** Keyboard-native tabs for small, mutually exclusive views. */
export default function Tabs({ label, tabs, value, onChange, className = '', idPrefix = undefined, onKeyDown = undefined, orientation = 'horizontal', dir = undefined, activation = 'automatic' }) {
  const id = useId();
  const enabled = tabs.filter(tab => !tab.disabled);
  const stop = enabled.some(tab => tab.value === value) ? value : enabled[0]?.value;
  const handleKey = event => {
    // Existing command pages own their keyboard handler. Never select twice.
    if (onKeyDown) { onKeyDown(event); return; }
    const buttons = [...event.currentTarget.querySelectorAll('[role="tab"]:not(:disabled)')];
    const current = buttons.indexOf(event.target);
    if (current < 0 || !buttons.length) return;
    const rtl = (dir || event.currentTarget.closest('[dir]')?.getAttribute('dir') || getComputedStyle(event.currentTarget).direction) === 'rtl';
    let next;
    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = buttons.length - 1;
    else if (orientation === 'vertical' && event.key === 'ArrowDown') next = current + 1;
    else if (orientation === 'vertical' && event.key === 'ArrowUp') next = current - 1;
    else if (orientation === 'horizontal' && event.key === 'ArrowRight') next = current + (rtl ? -1 : 1);
    else if (orientation === 'horizontal' && event.key === 'ArrowLeft') next = current + (rtl ? 1 : -1);
    else return;
    event.preventDefault();
    const index = (next + buttons.length) % buttons.length;
    buttons[index].focus();
    if (activation === 'automatic') onChange(enabled[index].value);
    else buttons.forEach((button, buttonIndex) => { button.tabIndex = buttonIndex === index ? 0 : -1; });
  };
  return <div className={`gt-tabs ${className}`.trim()} data-responsive-foundation role="tablist" aria-label={label} aria-orientation={orientation} dir={dir} onKeyDown={handleKey}>
    {tabs.map((tab) => <button
      key={tab.value}
      id={`${idPrefix || id}-${tab.value}`}
      type="button"
      role="tab"
      aria-selected={value === tab.value}
      aria-controls={tab.panelId}
      disabled={tab.disabled}
      tabIndex={!tab.disabled && stop === tab.value ? 0 : -1}
      onClick={() => onChange(tab.value)}
    >{tab.description ? <><strong>{tab.label}</strong><small>{tab.description}</small></> : tab.label}</button>)}
  </div>;
}
