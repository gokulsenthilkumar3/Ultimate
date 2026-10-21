import { useEffect, useLayoutEffect, useRef } from 'react';

const openDialogs = [];
let originalOverflow = '';

/** Keep keyboard focus inside an open overlay and restore its trigger on close. */
export default function useDialogFocus(isOpen, onClose) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const trigger = document.activeElement;
    if (!openDialogs.length) originalOverflow = document.body.style.overflow;
    const token = {};
    openDialogs.push(token);
    document.body.style.overflow = 'hidden';
    const focusable = () => [...(dialogRef.current?.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
    ) || [])].filter(element => !element.closest('[hidden], [inert], [aria-hidden="true"]') && getComputedStyle(element).display !== 'none' && getComputedStyle(element).visibility !== 'hidden');
    (dialogRef.current?.querySelector('[data-dialog-autofocus]') || focusable()[0] || dialogRef.current)?.focus();
    const handleKey = event => {
      if (openDialogs.at(-1) !== token) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current?.();
      }
      if (event.key !== 'Tab') return;
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first) {
        event.preventDefault();
        dialogRef.current?.focus();
      } else if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      const wasTop = openDialogs.at(-1) === token;
      openDialogs.splice(openDialogs.indexOf(token), 1);
      if (!openDialogs.length) document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKey);
      if (wasTop && trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [isOpen]);

  return dialogRef;
}
