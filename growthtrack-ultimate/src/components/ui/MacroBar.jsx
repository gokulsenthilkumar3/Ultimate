import React from 'react';

/**
 * MacroBar — single macro progress bar row (label + value + colored bar).
 *
 * @param {string} label - Macro name (Protein, Carbs, Fat)
 * @param {string} value - Display value ("170g")
 * @param {string} color - Bar color
 * @param {number} pct   - Fill percentage 0-100
 */
export default function MacroBar({ label, value, color, pct }) {
  return (
    <div className="macro-bar">
      <div className="macro-bar__header">
        <span className="macro-bar__label">{label}</span>
        <span className="macro-bar__value" style={{ color }}>{value}</span>
      </div>
      <div className="macro-bar__track">
        <div className="macro-bar__fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
