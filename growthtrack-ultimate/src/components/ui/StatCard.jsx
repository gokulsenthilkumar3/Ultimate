import React from 'react';
import AnimatedNumber from './AnimatedNumber';
import { formatNumber } from '../../utils/userFormatters';

/**
 * StatCard — reusable metric card with icon, label, value, and optional color.
 *
 * @param {object} props
 * @param {React.ComponentType} props.icon - Lucide icon component
 * @param {string} props.label - Small caps label text
 * @param {string|number} props.value - Main displayed value
 * @param {string} [props.color] - CSS color for icon + value (defaults to --accent)
 * @param {React.CSSProperties} [props.style] - Extra styles on the wrapper
 * @param {boolean} [props.lead] - The strip's headline figure; Kinetic renders it at hero scale
 */
export default function StatCard({ icon: Icon, label, value, color = 'var(--accent)', style, trend, hint, lead = false }) {
  return (
    <div className={`glass-card stat-card${lead ? ' stat-card--lead' : ''}`} style={{ ...style, '--stat-accent': color, '--stat-chars': String(value ?? '').length || 1 }}>
      <div className="stat-card__header">
        {Icon && <Icon size={16} />}
        <span className="label-caps">{label}</span>
      </div>
      <p className="stat-card__value">
        {typeof value === 'number' ? <AnimatedNumber value={value} format={Number.isInteger(value) ? next => formatNumber(Math.round(next), undefined, { maximumFractionDigits: 0 }) : undefined} /> : value}
      </p>
      {(trend || hint) && <div className="stat-card__meta">{trend && <span>{trend}</span>}{hint && <small>{hint}</small>}</div>}
    </div>
  );
}
