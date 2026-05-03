import React, { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * ConfirmDialog — Branded modal replacement for window.confirm()
 *
 * Usage:
 *   <ConfirmDialog
 *     open={showConfirm}
 *     title="Delete task?"
 *     description="This action cannot be undone."
 *     confirmLabel="Delete"
 *     onConfirm={() => { deleteTask(id); setShowConfirm(false); }}
 *     onCancel={() => setShowConfirm(false)}
 *     danger  // optional: makes confirm button red
 *   />
 */
export default function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel, danger = true }) {
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    if (open) {
      // Small delay so the animation completes before focusing
      const t = setTimeout(() => confirmBtnRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onCancel?.();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(8px)',
        animation: 'fadeInUp 0.2s ease both',
      }}
      onClick={(e) => e.target === e.currentTarget && onCancel?.()}
    >
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: '20px',
          padding: '2rem',
          maxWidth: '420px',
          width: '92%',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          animation: 'fadeInUp 0.25s var(--ease) both',
        }}
      >
        {/* Icon + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
          <div style={{
            background: danger ? 'rgba(248,113,113,0.12)' : 'var(--accent-soft)',
            padding: '10px',
            borderRadius: '12px',
          }}>
            <AlertTriangle size={20} color={danger ? 'var(--danger)' : 'var(--accent)'} />
          </div>
          <h3 id="confirm-title" style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: '1.1rem',
            color: 'var(--text-1)',
            margin: 0,
          }}>
            {title}
          </h3>
          <button
            onClick={onCancel}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: '4px' }}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Description */}
        {description && (
          <p style={{ fontSize: '0.88rem', color: 'var(--text-2)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
            {description}
          </p>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '0.6rem 1.4rem',
              borderRadius: '10px',
              border: '1px solid var(--border-strong)',
              background: 'transparent',
              color: 'var(--text-2)',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            onClick={onConfirm}
            style={{
              padding: '0.6rem 1.4rem',
              borderRadius: '10px',
              border: 'none',
              background: danger ? 'var(--danger)' : 'var(--accent)',
              color: '#fff',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              boxShadow: danger ? '0 4px 14px rgba(248,113,113,0.35)' : '0 4px 14px var(--accent-soft)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.filter = 'brightness(1.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.filter = 'brightness(1)'; }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
