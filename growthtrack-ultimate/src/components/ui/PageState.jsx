import React from 'react';
import { CloudOff, RefreshCw, WifiOff } from 'lucide-react';
import Button from './Button';

/** Consistent recovery surface for offline, error, and slow-loading views. */
export default function PageState({ state = 'error', title, description, onRetry }) {
  const offline = state === 'offline';
  const Icon = offline ? WifiOff : CloudOff;
  const defaults = {
    error: ['Let’s try that again', 'This view could not load. Check the result before retrying any change.'],
    offline: ['You’re offline', 'Reconnect to refresh this view.'],
    empty: ['Nothing here yet', 'When there is something to show, you will find it here.'],
    loading: ['Loading', 'Preparing this view…'],
    unauthorized: ['Sign in to continue', 'Your session may have expired. Sign in to access this view.'],
    unavailable: ['Service unavailable', 'The service is not responding. Try again after it becomes available.'],
    'database-failure': ['Stored records are unavailable', 'The service could not read its database. Check diagnostics and retry.'],
    success: ['Ready', 'The operation completed successfully.'],
  };
  const [defaultTitle, defaultDescription] = defaults[state] || defaults.error;
  return <section className="gt-page-state glass-card" aria-busy={state === 'loading'} role={['error', 'unauthorized', 'unavailable', 'database-failure'].includes(state) ? 'alert' : 'status'}>
    <span className="gt-page-state__icon"><Icon size={22} /></span>
    <div><h2>{title || defaultTitle}</h2><p>{description || defaultDescription}</p></div>
    {onRetry && <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={onRetry}>Try again</Button>}
  </section>;
}
