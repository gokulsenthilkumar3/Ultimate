import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X, AlertTriangle, Trash2, Pencil } from 'lucide-react';

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

const COLORS = {
  success: { bg: 'rgba(79,209,165,0.12)', border: 'rgba(79,209,165,0.3)', icon: '#4FD1A5' },
  error:   { bg: 'rgba(240,97,107,0.12)', border: 'rgba(240,97,107,0.34)', icon: '#F0616B' },
  warning: { bg: 'rgba(245,184,76,0.12)', border: 'rgba(245,184,76,0.3)', icon: '#F5B84C' },
  info:    { bg: 'rgba(90,169,230,0.12)', border: 'rgba(90,169,230,0.3)', icon: '#5AA9E6' },
};

let toastId = 0;

function ToastItem({ item, dismiss }) {
  const DefaultIcon = ICONS[item.type] || Info;
  const Icon = item.kind === 'crud' ? (ACTION_ICONS[item.actionType] || DefaultIcon) : DefaultIcon;
  const colors = COLORS[item.type] || COLORS.info;
  const accent = item.kind === 'crud' && item.domainAccent ? item.domainAccent : colors.icon;

  return (
    <div
      className="app-toast"
      data-kind={item.kind}
      role={item.type === 'error' ? 'alert' : 'status'}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.6rem',
        padding: item.kind === 'error' ? '0.9rem 1.1rem' : '0.75rem 1rem',
        background: colors.bg, border: `1px solid ${colors.border}`,
        borderLeft: `3px solid ${accent}`, borderRadius: '12px',
        backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
        maxWidth: 'min(380px, calc(100vw - 48px))',
        minWidth: 'min(260px, calc(100vw - 48px))',
        pointerEvents: 'auto', animation: 'toastIn 0.3s cubic-bezier(0.16,1,0.3,1) both',
      }}
    >
      <Icon size={16} color={accent} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-1)', fontFamily: 'var(--font-body)', lineHeight: 1.4 }}>
        {item.message}
      </span>
      {item.action && (
        <button type="button" onClick={() => { item.action.onClick(); dismiss(item.id); }} style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-1)',
          padding: '2px 8px', minHeight: '44px', minWidth: '44px', borderRadius: '6px',
          fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0,
        }}>
          {item.action.label}
        </button>
      )}
      <button type="button" onClick={() => dismiss(item.id)} style={{
        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)',
        padding: '2px', minWidth: '44px', minHeight: '44px', alignItems: 'center',
        justifyContent: 'center', display: 'flex', flexShrink: 0,
      }} aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((message, type = 'info', duration = 3500, options = {}) => {
    const id = ++toastId;
    const kind = options.kind || (type === 'error' ? 'error' : 'crud');
    const item = { id, message, type, kind, ...options };
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
  }, []);

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
