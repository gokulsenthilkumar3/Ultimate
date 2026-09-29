import React from 'react';
import Button from './Button';
import FormError from './FormError';

export interface DraftIndicatorProps {
  status: 'clean' | 'dirty' | 'saving' | 'saved' | 'error' | 'offline';
  savedAt?: string; error?: string; onRetry?: () => void;
}
const LABELS = { clean: 'No unsaved changes', dirty: 'Unsaved changes', saving: 'Saving…', saved: 'Changes saved', error: 'Changes could not be saved', offline: 'Offline · changes pending' };
/** Render persistence evidence supplied by the caller. No optimistic success or auto-save timer. */
export default function DraftIndicator({ status, savedAt, error, onRetry }: DraftIndicatorProps) {
  return <div className="gt-draft-indicator" data-responsive-foundation data-status={status} aria-busy={status === 'saving'}>
    <span role="status" aria-live="polite" aria-atomic="true">{LABELS[status]}{status === 'saved' && savedAt ? ` · ${savedAt}` : ''}</span>
    {status === 'error' && <FormError>{error || 'Your draft is still here. Retry saving when ready.'}</FormError>}
    {status === 'error' && onRetry && <Button variant="secondary" onClick={onRetry}>Retry save</Button>}
  </div>;
}
