import React from 'react';
import { useKinetic } from '../motion/KineticContext';

/**
 * A centred figure-and-label tile. Kinetic sizes the figure as a secondary metric (40-56px, tabular, ink) and keeps the
 * data colour as an accent bar, so colour is never the only signal and pale hues no longer carry the number.
 * Playful keeps each page's original inline scale.
 */
export default function StatTile({ value, label, color, size = '1.75rem', labelSize = '.7rem', padding = '1rem', labelGap = '4px' }) {
  const { enabled } = useKinetic();
  return <div className="glass-card stat-tile" style={{ textAlign: 'center', padding, '--stat-tile-color': color }}>
    <p className="stat-tile__value" style={enabled ? undefined : { fontSize: size, fontWeight: 900, color, lineHeight: 1 }}>{value}</p>
    <p className="stat-tile__label" style={enabled ? undefined : { fontSize: labelSize, color: 'var(--text-3)', marginTop: labelGap }}>{label}</p>
  </div>;
}
