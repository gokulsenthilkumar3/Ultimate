import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import useDialogFocus from '../../hooks/useDialogFocus';

export default function Modal({ open, title, children, onClose, actions }) {
  const ref = useDialogFocus(open, onClose);
  useEffect(() => { if (open) document.body.classList.add('modal-open'); return () => document.body.classList.remove('modal-open'); }, [open]);
  if (!open) return null;
  return <div className="gt-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={ref} className="gt-modal" role="dialog" aria-modal="true" aria-labelledby="gt-modal-title" tabIndex={-1}>
      <header className="gt-modal__header"><h2 id="gt-modal-title">{title}</h2><button className="gt-modal__close" onClick={onClose} aria-label="Close dialog"><X size={18} /></button></header>
      <div className="gt-modal__body">{children}</div>
      {actions && <footer className="gt-modal__actions">{actions}</footer>}
    </section>
  </div>;
}
