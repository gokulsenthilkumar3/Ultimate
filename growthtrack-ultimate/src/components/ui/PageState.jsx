import React from 'react';
import { CloudOff, RefreshCw, WifiOff } from 'lucide-react';
import Button from './Button';

/** Consistent recovery surface for offline, error, and slow-loading views. */
export default function PageState({ state = 'error', title, description, onRetry }) {
  const offline = state === 'offline';
  const Icon = offline ? WifiOff : CloudOff;
  const defaults = {
    error: ['Let’s try that again', 'Nothing was changed. Check your connection, then try again.'],
    offline: ['You’re offline', 'Your changes stay on this device until the connection returns.'],
    empty: ['Nothing here yet', 'When there is something to show, you will find it here.'],
  };
  const [defaultTitle, defaultDescription] = defaults[state] || defaults.error;
  return <section className="gt-page-state glass-card" role={state === 'error' ? 'alert' : 'status'}>
    <span className="gt-page-state__icon"><Icon size={22} /></span>
    <div><h2>{title || defaultTitle}</h2><p>{description || defaultDescription}</p></div>
    {onRetry && <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={onRetry}>Try again</Button>}
  </section>;
}
