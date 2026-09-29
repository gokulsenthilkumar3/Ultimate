import React, { useId, type ReactNode } from 'react';
import { X } from 'lucide-react';
import useDialogFocus from '../../hooks/useDialogFocus';

export interface DetailPanelProps { open: boolean; title: string; onClose: () => void; children: ReactNode; actions?: ReactNode; variant?: 'drawer' | 'inline'; }
export default function DetailPanel({ open, title, onClose, children, actions, variant = 'drawer' }: DetailPanelProps) {
  const id = useId();
  const ref = useDialogFocus(open && variant === 'drawer', onClose);
  if (!open) return null;
  const panel = <aside className={`gt-detail-panel gt-detail-panel--${variant}`} data-responsive-foundation ref={variant === 'drawer' ? ref : undefined}
    role={variant === 'drawer' ? 'dialog' : undefined} aria-modal={variant === 'drawer' || undefined} aria-labelledby={`${id}-title`} tabIndex={variant === 'drawer' ? -1 : undefined}>
    <header><h2 id={`${id}-title`}>{title}</h2><button type="button" aria-label={`Close ${title}`} onClick={onClose}><X size={20} aria-hidden="true" /></button></header>
    <div className="gt-detail-panel__body">{children}</div>{actions && <footer>{actions}</footer>}
  </aside>;
  return variant === 'inline' ? panel : <div className="gt-detail-backdrop" data-responsive-foundation onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>{panel}</div>;
}
