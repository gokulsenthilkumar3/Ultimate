import React, { useId } from 'react';
import { X } from 'lucide-react';
import useDialogFocus from '../../hooks/useDialogFocus';
import { m } from 'framer-motion';
import { useKinetic } from '../motion/KineticContext';

export default function Modal({ open, title, children, onClose, actions, className = '', descriptionId, closeDisabled = false }) {
  const { enabled, canAnimate, tier } = useKinetic();
  const Surface = enabled ? m.section : 'section';
  const dismiss = () => { if (!closeDisabled) onClose?.(); };
  const ref = useDialogFocus(open, dismiss);
  const titleId = useId();
  if (!open) return null;
  return <div className="gt-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) dismiss(); }}>
    <Surface {...(enabled ? { initial: canAnimate && tier > 0 ? { opacity: 0, scale: .96 } : false, animate: { opacity: 1, scale: 1 }, transition: { duration: canAnimate && tier > 0 ? .24 : 0, ease: [.22, 1, .36, 1] } } : {})} ref={ref} className={`gt-modal ${className}`.trim()} data-responsive-foundation role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} aria-busy={closeDisabled || undefined} tabIndex={-1}>
      <header className="gt-modal__header"><h2 id={titleId}>{title}</h2><button type="button" className="gt-modal__close" onClick={dismiss} disabled={closeDisabled} aria-label="Close dialog"><X size={18} aria-hidden="true" /></button></header>
      <div className="gt-modal__body">{children}</div>
      {actions && <footer className="gt-modal__actions">{actions}</footer>}
    </Surface>
  </div>;
}
