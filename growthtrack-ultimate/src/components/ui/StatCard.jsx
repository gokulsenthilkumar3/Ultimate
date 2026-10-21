import React from 'react';

/**
 * StatCard — reusable metric card with icon, label, value, and optional color.
 *
 * @param {object} props
 * @param {React.ComponentType} props.icon - Lucide icon component
 * @param {string} props.label - Small caps label text
 * @param {string|number} props.value - Main displayed value
 * @param {string} [props.color] - CSS color for icon + value (defaults to --accent)
 * @param {React.CSSProperties} [props.style] - Extra styles on the wrapper
 */
export default function StatCard({ icon: Icon, label, value, color = 'var(--accent)', style, trend, hint }) {
  return (
    <div className="glass-card stat-card" style={{ ...style, '--stat-accent': color }}>
      <div className="stat-card__header">
        {Icon && <Icon size={16} />}
        <span className="label-caps">{label}</span>
      </div>
      <p className="stat-card__value">
        {value}
      </p>
      {(trend || hint) && <div className="stat-card__meta">{trend && <span>{trend}</span>}{hint && <small>{hint}</small>}</div>}
    </div>
  );
}
