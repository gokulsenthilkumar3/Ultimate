import React from 'react';
import { useKinetic } from '../motion/KineticContext';

/**
 * A centred figure-and-label tile. Kinetic sizes the figure as a secondary metric (40-56px, tabular, ink), fits it to the
 * tile by character count, and keeps the data colour as an accent bar, so colour is never the only signal and pale hues no
 * longer carry the number. `lead` marks the strip's headline figure, which Kinetic renders at hero scale.
 * `icon` and `sub` carry a decorative glyph and a small caption. Playful keeps each page's original inline scale, which
 * `size`, `labelSize`, `padding`, `labelGap`, `caps` and `fontFamily` reproduce.
 *
 * @param {{ value: React.ReactNode, label: React.ReactNode, color?: string, size?: string, labelSize?: string, padding?: string, labelGap?: string, lead?: boolean, wide?: boolean, icon?: React.ReactNode, sub?: React.ReactNode, caps?: boolean, fontFamily?: string }} props
 */
export default function StatTile({ value, label, color, size = '1.75rem', labelSize = '.7rem', padding = '1rem', labelGap = '4px', lead = false, wide = false, icon, sub, caps = false, fontFamily }) {
  const { enabled } = useKinetic();
  return <div className={`glass-card stat-tile${lead ? ' stat-tile--lead' : ''}${wide ? ' stat-tile--wide' : ''}`} style={{ textAlign: 'center', padding, '--stat-tile-color': color, '--stat-chars': String(value ?? '').length || 1 }}>
    {icon && <div className="stat-tile__icon" aria-hidden="true" style={enabled ? undefined : { marginBottom: '0.4rem' }}>{icon}</div>}
    <p className="stat-tile__value" style={enabled ? undefined : { fontSize: size, fontWeight: 900, color, lineHeight: 1, fontFamily }}>{value}</p>
    <p className={`stat-tile__label${caps && !enabled ? ' label-caps' : ''}`} style={enabled ? undefined : { fontSize: caps ? undefined : labelSize, color: caps ? undefined : 'var(--text-3)', marginTop: labelGap }}>{label}</p>
    {sub && <p className="stat-tile__sub" style={enabled ? undefined : { fontSize: '0.68rem', color: 'var(--text-3)', marginTop: '0.2rem' }}>{sub}</p>}
  </div>;
}
