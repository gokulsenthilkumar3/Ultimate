import React, { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

/**
 * SavedIndicator — an optimistic "saved" micro-interaction.
 *
 * Usage:
 *   const [saved, setSaved] = useState(false);
 *   // after a save action:
 *   setSaved(true);
 *
 *   <SavedIndicator visible={saved} onHide={() => setSaved(false)} />
 *
 * Props:
 *   visible   boolean  — when true, animates in then auto-hides after `duration`ms
 *   onHide    fn       — called after the indicator fades out (so parent can reset state)
 *   duration  number   — ms to display before hiding (default 1600)
 *   label     string   — text next to the checkmark (default "Saved")
 */
export default function SavedIndicator({ visible, onHide, duration = 1600, label = 'Saved' }) {
  const [phase, setPhase] = useState('hidden'); // 'hidden' | 'in' | 'out'

  useEffect(() => {
    if (!visible) return;

    // Fade in
    setPhase('in');

    const hideTimer = setTimeout(() => {
      setPhase('out');
    }, duration);

    const cleanTimer = setTimeout(() => {
      setPhase('hidden');
      onHide?.();
    }, duration + 300); // 300ms fade-out transition

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(cleanTimer);
    };
  }, [visible, duration, onHide]);

  if (phase === 'hidden') return null;

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        fontSize: '0.75rem',
        fontWeight: 700,
        color: 'var(--success)',
        fontFamily: 'var(--font-display)',
        opacity: phase === 'in' ? 1 : 0,
        transform: phase === 'in' ? 'scale(1) translateY(0)' : 'scale(0.85) translateY(4px)',
        transition: 'opacity 0.25s ease, transform 0.25s ease',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <CheckCircle2 size={14} aria-hidden="true" />
      {label}
    </span>
  );
}
