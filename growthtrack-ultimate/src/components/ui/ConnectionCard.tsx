import React, { useId, type ReactNode } from 'react';
import Button from './Button';
import FormError from './FormError';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'unavailable';
export interface ConnectionCardProps {
  title: string; description?: string; icon?: ReactNode; status: ConnectionStatus; error?: string;
  lastSynced?: string; onConnect?: () => void; onDisconnect?: () => void; onRetry?: () => void; children?: ReactNode;
}
const LABELS = { disconnected: 'Not connected', connecting: 'Connecting…', connected: 'Connected', error: 'Connection failed', unavailable: 'Not available' };
/** Status is supplied by the provider adapter; clicking Connect never implies success. */
export default function ConnectionCard({ title, description, icon, status, error, lastSynced, onConnect, onDisconnect, onRetry, children }: ConnectionCardProps) {
  const id = useId();
  return <section className="gt-connection-card" data-responsive-foundation aria-labelledby={`${id}-title`} aria-busy={status === 'connecting'}>
    <header>{icon && <span aria-hidden="true">{icon}</span>}<h2 id={`${id}-title`}>{title}</h2></header>
    {description && <p>{description}</p>}<p role="status" className="gt-connection-card__status" data-status={status}>{LABELS[status]}</p>
    {status === 'error' && <FormError>{error || 'Could not connect. Check the provider and try again.'}</FormError>}
    {lastSynced && <p>Last synced: {lastSynced}</p>}{children}
    <footer>
      {status === 'disconnected' && onConnect && <Button onClick={onConnect}>Connect {title}</Button>}
      {status === 'connecting' && <Button loading loadingLabel={`Connecting ${title}…`}>Connect</Button>}
      {status === 'connected' && onDisconnect && <Button variant="secondary" onClick={onDisconnect}>Disconnect {title}</Button>}
      {status === 'error' && onRetry && <Button variant="secondary" onClick={onRetry}>Retry {title}</Button>}
    </footer>
  </section>;
}
