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
export default function StatCard({ icon: Icon, label, value, color = 'var(--accent)', style }) {
  return (
    <div className="glass-card stat-card" style={style}>
      <div className="stat-card__header">
        {Icon && <Icon size={16} color={color} />}
        <span className="label-caps">{label}</span>
      </div>
      <p className="stat-card__value" style={{ color }}>
        {value}
      </p>
    </div>
  );
}
