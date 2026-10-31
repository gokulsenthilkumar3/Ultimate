import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { m } from 'framer-motion';
import { useKinetic } from '../motion/KineticContext';
import { SELECTION_SPRING } from '../motion/motionLanguage';
import OverflowRail from './OverflowRail';

const Indicator = m.span;

/** Keyboard-native tabs for small, mutually exclusive views. */
export default function Tabs({ label, tabs, value, onChange, className = '', idPrefix = undefined, onKeyDown = undefined, orientation = 'horizontal', dir = undefined, activation = 'automatic', variant = 'segments' }) {
  const id = useId();
  const { enabled: kineticEnabled, canAnimate, tier } = useKinetic();
  const ref = useRef(null);
  const [rtl, setRtl] = useState(dir === 'rtl');
  const tabKeys = tabs.map(tab => tab.value).join('\0');
  const [indicator, setIndicator] = useState(null);
  useLayoutEffect(() => {
    const root = ref.current;
    const selected = root?.querySelector('[role="tab"][aria-selected="true"]');
    const measure = () => {
      const next = selected?.offsetWidth ? { x: selected.offsetLeft, y: selected.offsetTop, width: selected.offsetWidth, height: selected.offsetHeight } : null;
      setIndicator(current => JSON.stringify(current) === JSON.stringify(next) ? current : next);
    };
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    if (root) {
      observer?.observe(root);
      root.querySelectorAll('[role="tab"]').forEach(tab => observer?.observe(tab));
    }
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [value, tabKeys, orientation, dir, rtl]);
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
  const tones = ['mint', 'lilac', 'coral', 'yellow'];
  return <OverflowRail scrollRef={ref} label={label} className={`gt-tabs ${className}`.trim()} frameClassName="gt-tabs-scroll" horizontal={orientation === 'horizontal'} onDirectionChange={setRtl} data-responsive-foundation data-variant={variant} data-has-indicator={Boolean(indicator)} role="tablist" aria-label={label} aria-orientation={orientation} dir={dir} onKeyDown={handleKey}>
    {indicator && (kineticEnabled ? <Indicator initial={false} className="gt-tabs__indicator" aria-hidden="true" animate={{ x: indicator.x, y: indicator.y, width: indicator.width, height: indicator.height }} transition={canAnimate && tier > 0 ? SELECTION_SPRING : { duration: 0 }} /> : <span className="gt-tabs__indicator" aria-hidden="true" style={{ width: indicator.width, height: indicator.height, transform: `translate(${indicator.x}px, ${indicator.y}px)` }} />)}
    {tabs.map((tab, index) => <button
      key={tab.value}
      id={`${idPrefix || id}-${tab.value}`}
      type="button"
      role="tab"
      aria-selected={value === tab.value}
      aria-controls={tab.panelId}
      disabled={tab.disabled}
      data-tone={tones[index % tones.length]}
      tabIndex={!tab.disabled && stop === tab.value ? 0 : -1}
      onClick={() => onChange(tab.value)}
    ><span className="gt-tab__index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><span className="gt-tab__copy">{tab.description ? <><strong>{tab.label}</strong><small>{tab.description}</small></> : tab.label}</span></button>)}
  </OverflowRail>;
}
