import React from 'react';
import { AlertTriangle, CircleHelp, Database, RefreshCw } from 'lucide-react';
import Button from './Button';

const COPY = {
  empty: ['No data yet', 'Add your first record to unlock this view.', Database],
  insufficient: ['More data needed', 'Keep tracking to produce a reliable result.', CircleHelp],
  stale: ['Data may be stale', 'Refresh before relying on this result.', RefreshCw],
  unavailable: ['Data unavailable', 'The source could not be reached.', AlertTriangle],
  error: ['Calculation unavailable', 'The result could not be calculated safely.', AlertTriangle],
};

export default function DataReadiness({ state = 'empty', title, description, actionLabel, onAction, available, required }) {
  const [defaultTitle, defaultDescription, Icon] = COPY[state] || COPY.error;
  return <section className={`gt-data-readiness is-${state}`} role={['unavailable', 'error'].includes(state) ? 'alert' : 'status'}>
    <Icon size={22} aria-hidden="true" />
    <div><h3>{title || defaultTitle}</h3><p>{description || defaultDescription}</p>{required != null && <small>{available || 0} of {required} required data points</small>}</div>
    {onAction && <Button variant="secondary" onClick={onAction}>{actionLabel || 'Add data'}</Button>}
  </section>;
}
