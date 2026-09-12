import React, { useState } from 'react';
import Modal from './Modal';
import Button from './Button';

/** Focus starts on Cancel. Async failures leave the confirmation open for retry. */
export default function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel, danger = true }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const confirm = async () => {
    if (pending) return;
    setPending(true); setError('');
    try { await onConfirm(); }
    catch { setError('We could not complete this action. Check your connection and try again.'); }
    finally { setPending(false); }
  };
  const close = () => { if (!pending) { setError(''); onCancel?.(); } };
  return <Modal open={open} title={title} onClose={close} actions={<>
    <Button variant="secondary" data-dialog-autofocus disabled={pending} onClick={close}>{cancelLabel}</Button>
    <Button variant={danger ? 'danger' : 'primary'} loading={pending} loadingLabel="Applying…" onClick={confirm}>{confirmLabel}</Button>
  </>}>
    {description && <p>{description}</p>}
    {error && <p className="gt-field__error" role="alert">{error}</p>}
  </Modal>;
}
