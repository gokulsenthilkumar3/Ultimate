import React from 'react';

/**
 * ProgressRing — reusable conic-gradient ring with centered percentage label.
 *
 * @param {number} pct - Percentage 0-100
 * @param {string} [color] - Ring color (defaults to --accent)
 * @param {number} [size=56] - Outer ring size in px
 */
export default function ProgressRing({ pct, color = 'var(--accent)', size = 56 }) {
  const inner = size - 12;
  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: `conic-gradient(${color} ${pct * 3.6}deg, var(--bg-elevated) 0deg)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: `${inner}px`,
          height: `${inner}px`,
          borderRadius: '50%',
          background: 'var(--bg-card)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.62rem',
          fontWeight: 800,
          color,
        }}
      >
        {pct}%
      </div>
    </div>
  );
}
