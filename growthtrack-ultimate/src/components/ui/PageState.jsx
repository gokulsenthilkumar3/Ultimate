import React from 'react';
import { AlertCircle, CheckCircle2, CloudOff, Inbox, LoaderCircle, LockKeyhole, Plug, RefreshCw, WifiOff } from 'lucide-react';
import Button from './Button';

/** Consistent recovery surface for offline, error, and slow-loading views. */
export default function PageState({ state = 'error', title = undefined, description = undefined, onRetry = undefined }) {
  const icons = { setup: Plug, denied: LockKeyhole, error: AlertCircle, offline: WifiOff, empty: Inbox, loading: LoaderCircle, unauthorized: LockKeyhole, unavailable: CloudOff, 'database-failure': CloudOff, success: CheckCircle2 };
  const Icon = icons[state] || icons.error;
  const defaults = {
    setup: ['Connection required', 'Connect an authorised service to use this view.'],
    denied: ['Access restricted', 'Your account does not have permission to view these records.'],
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
  return <section className="gt-page-state" data-responsive-foundation data-state={state} role={['error', 'unauthorized', 'denied', 'unavailable', 'database-failure'].includes(state) ? 'alert' : 'status'}>
    <span className="gt-page-state__icon" aria-hidden="true"><Icon size={22} /></span>
    <div className="gt-page-state__copy"><h2>{title ?? defaultTitle}</h2><p>{description ?? defaultDescription}</p></div>
    {onRetry && state !== 'loading' && <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={onRetry}>Try again</Button>}
  </section>;
}
