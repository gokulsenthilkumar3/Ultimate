import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X, AlertTriangle, Trash2, Pencil } from 'lucide-react';
import { m } from 'framer-motion';
import { useKinetic } from '../components/motion/KineticContext';
import { emitCelebration } from '../components/motion/ConfettiHost';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const ACTION_ICONS = {
  create: CheckCircle,
  update: Pencil,
  delete: Trash2,
};

let toastId = 0;

function ToastItem({ item, dismiss }) {
  const { enabled, canAnimate, tier } = useKinetic();
  const Surface = enabled ? m.div : 'div';
  const DefaultIcon = ICONS[item.type] || Info;
  const Icon = item.kind === 'crud' ? (ACTION_ICONS[item.actionType] || DefaultIcon) : DefaultIcon;

  return (
    <Surface
      {...(enabled ? { initial: canAnimate && tier > 0 ? { opacity: 0, y: 12 } : false, animate: { opacity: 1, y: 0 }, transition: { duration: canAnimate && tier > 0 ? .32 : 0, ease: [.22, 1, .36, 1] } } : {})}
      className="app-toast"
      data-kind={item.kind}
      data-tone={item.type}
      role={item.type === 'error' ? 'alert' : 'status'}
      style={{ pointerEvents: 'auto', ...(item.kind === 'crud' && item.domainAccent ? { '--toast-domain-accent': item.domainAccent } : {}) }}
    >
      <span className="app-toast__icon"><Icon size={19} aria-hidden="true" /></span>
      <span className="app-toast__message">
        {item.message}
      </span>
      {item.action && (
        <button type="button" className="app-toast__action" onClick={() => { item.action.onClick(); dismiss(item.id); }}>
          {item.action.label}
        </button>
      )}
      <button type="button" className="app-toast__dismiss" onClick={() => dismiss(item.id)} aria-label="Dismiss">
        <X size={15} aria-hidden="true" />
      </button>
    </Surface>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});
  const activeToastKeys = useRef(new Map());
  const toastKeysById = useRef(new Map());

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    const key = toastKeysById.current.get(id);
    if (key) activeToastKeys.current.delete(key);
    toastKeysById.current.delete(id);
    setToasts((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((message, type = 'info', duration = 3500, options = {}) => {
    const kind = options.kind || (type === 'error' ? 'error' : 'crud');
    const key = `${kind}:${type}:${String(message).trim()}`;
    const existingId = activeToastKeys.current.get(key);
    if (existingId) return existingId;
    const id = ++toastId;
    const item = { id, message, type, kind, ...options };
    if (type === 'success') emitCelebration();
    activeToastKeys.current.set(key, id);
    toastKeysById.current.set(id, key);
    setToasts((previous) => [...previous.slice(-2), item]);
    const isPersistent = kind === 'error' || kind === 'notification';
    if (duration > 0 && !isPersistent && !options.action) {
      timers.current[id] = setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  useEffect(() => () => {
    Object.values(timers.current).forEach(clearTimeout);
    timers.current = {};
    activeToastKeys.current.clear();
    toastKeysById.current.clear();
  }, []);

  useEffect(() => {
    const visibleIds = new Set(toasts.map((item) => item.id));
    for (const [id, key] of toastKeysById.current.entries()) {
      if (!visibleIds.has(id)) {
        toastKeysById.current.delete(id);
        activeToastKeys.current.delete(key);
      }
    }
  }, [toasts]);

  toast.success = (message, duration, options) => toast(message, 'success', duration, options);
  toast.error = (message, duration, options) => toast(message, 'error', duration || 5000, options);
  toast.warning = (message, duration, options) => toast(message, 'warning', duration, options);
  toast.info = (message, duration, options) => toast(message, 'info', duration, options);
  toast.crud = (message, action = 'update', duration = 3000, options = {}) => toast(
    message,
    action === 'delete' ? 'info' : 'success',
    duration,
    { ...options, kind: 'crud', actionType: action },
  );
  toast.notify = (message, options = {}) => toast(message, 'info', 0, { ...options, kind: 'notification' });

  const errors = toasts.filter((item) => item.kind === 'error');
  const confirmations = toasts.filter((item) => item.kind === 'crud');
  const notifications = toasts.filter((item) => item.kind === 'notification');

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div aria-label="Errors" style={{ position: 'fixed', top: 'max(24px, env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)', zIndex: 'var(--z-toast, 120)', display: 'flex', flexDirection: 'column', gap: '0.6rem', pointerEvents: 'none', width: 'min(380px, calc(100vw - 48px))' }}>
        {errors.map((item) => <ToastItem key={item.id} item={item} dismiss={dismiss} />)}
      </div>
      <div aria-label="Activity confirmations" style={{ position: 'fixed', bottom: 'max(110px, calc(24px + env(safe-area-inset-bottom)))', right: '24px', zIndex: 'var(--z-toast, 120)', display: 'flex', flexDirection: 'column', gap: '0.6rem', pointerEvents: 'none' }}>
        {confirmations.map((item) => <ToastItem key={item.id} item={item} dismiss={dismiss} />)}
      </div>
      <div aria-label="Notifications" style={{ position: 'fixed', top: 'max(24px, env(safe-area-inset-top))', right: '24px', zIndex: 'var(--z-toast, 120)', display: 'flex', flexDirection: 'column', gap: '0.6rem', pointerEvents: 'none', width: 'min(380px, calc(100vw - 48px))' }}>
        {notifications.map((item) => <ToastItem key={item.id} item={item} dismiss={dismiss} />)}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * useToast — returns the shared feedback dispatcher. Use toast.crud for
 * short create/update/delete confirmations and toast.notify for persistent
 * system notifications.
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}
