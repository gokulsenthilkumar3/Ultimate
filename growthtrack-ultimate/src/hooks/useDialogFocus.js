import { useEffect, useLayoutEffect, useRef } from 'react';

const openDialogs = [];
const dialogListeners = new Set();
export const getActiveDialog = () => openDialogs.at(-1)?.element || null;
export const subscribeDialogs = listener => { dialogListeners.add(listener); return () => dialogListeners.delete(listener); };
const notifyDialogs = () => dialogListeners.forEach(listener => listener());
let originalOverflow = '';

function availableForFocus(element) {
  if (!element || element.matches(':disabled, input[type="hidden"]') || element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
  const style = getComputedStyle(element);
  if (style.visibility === 'hidden' || style.visibility === 'collapse') return false;
  // A descendant's computed display can be visible inside a hidden container.
  for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
    if (getComputedStyle(ancestor).display === 'none') return false;
  }
  return true;
}

/** Keep keyboard focus inside an open overlay and restore its trigger on close. */
export default function useDialogFocus(isOpen, onClose) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const trigger = document.activeElement;
    if (!openDialogs.length) originalOverflow = document.body.style.overflow;
    const token = { element: dialogRef.current };
    openDialogs.push(token);
    notifyDialogs();
    document.body.style.overflow = 'hidden';
    const focusable = () => [...(dialogRef.current?.querySelectorAll(
      'button, a[href], input, select, textarea, [tabindex]',
    ) || [])].filter(element => element.tabIndex >= 0 && availableForFocus(element))
      .sort((a, b) => (a.tabIndex || Infinity) - (b.tabIndex || Infinity));
    const autofocus = dialogRef.current?.querySelector('[data-dialog-autofocus]');
    const initial = autofocus && (autofocus.tabIndex >= 0 || autofocus.hasAttribute('tabindex')) && availableForFocus(autofocus) ? autofocus : focusable()[0];
    (initial || dialogRef.current)?.focus();
    const handleKey = event => {
      if (openDialogs.at(-1) !== token || event.defaultPrevented || event.isComposing) return;
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
      notifyDialogs();
      if (!openDialogs.length) document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKey);
      if (wasTop && trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [isOpen]);

  return dialogRef;
}
