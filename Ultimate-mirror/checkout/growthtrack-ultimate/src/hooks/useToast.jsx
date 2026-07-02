import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

// ── Toast Context
const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS = {
  success: { bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.3)', icon: '#34d399' },
  error:   { bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)', icon: '#f87171' },
  warning: { bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)',  icon: '#fbbf24' },
  info:    { bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.3)',  icon: '#60a5fa' },
};

let toastId = 0;

// ── ToastProvider wraps the app and renders the toast stack
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message, type = 'info', duration = 3500) => {
    const id = ++toastId;
    setToasts((prev) => [...prev.slice(-4), { id, message, type }]); // max 5 stacked
    timers.current[id] = setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  // Convenience wrappers
  toast.success = (msg, dur) => toast(msg, 'success', dur);
  toast.error   = (msg, dur) => toast(msg, 'error',   dur || 5000);
  toast.warning = (msg, dur) => toast(msg, 'warning', dur);
  toast.info    = (msg, dur) => toast(msg, 'info',    dur);

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Toast Stack — fixed bottom-right, above nav */}
      <div
        aria-live="polite"
        style={{
          position: 'fixed',
          bottom: '110px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.type] || Info;
          const colors = COLORS[t.type] || COLORS.info;
          return (
            <div
              key={t.id}
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.75rem 1rem',
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: '12px',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
                maxWidth: '340px',
                minWidth: '220px',
                pointerEvents: 'auto',
                animation: 'toastIn 0.3s cubic-bezier(0.16,1,0.3,1) both',
              }}
            >
              <Icon size={16} color={colors.icon} style={{ flexShrink: 0 }} />
              <span style={{
                flex: 1,
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--text-1)',
                fontFamily: 'var(--font-body)',
                lineHeight: 1.4,
              }}>
                {t.message}
              </span>
              <button
                onClick={() => dismiss(t.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-3)',
                  padding: '2px',
                  display: 'flex',
                  flexShrink: 0,
                }}
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * useToast — returns a toast function with .success / .error / .warning / .info shortcuts.
 *
 * @example
 * const toast = useToast();
 * toast.success('Meal logged!');
 * toast.error('Amount must be greater than 0');
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
