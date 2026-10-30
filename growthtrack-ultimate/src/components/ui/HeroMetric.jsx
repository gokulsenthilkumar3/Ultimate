import React, { useId } from 'react';
import AnimatedNumber from './AnimatedNumber';
import { useKinetic } from '../motion/KineticContext';
import { formatNumber } from '../../utils/userFormatters';

/**
 * A page's one headline figure (brief: 72-120px, weight 800, tabular, ink). Kinetic only: Playful keeps each page as it was.
 *
 * Pass a whole number to count up, grouped in the owner's number format, or a ready string for currency, durations and
 * decimals. The value must be a real figure the page already holds. Pages with none (setup, legal, unavailable data, forms)
 * do not render one, and a missing value renders nothing rather than a zero.
 *
 * @param {{ label: string, value?: number | string | null, unit?: string, note?: React.ReactNode, tone?: 'mint' | 'coral' | 'yellow' | 'lilac', action?: React.ReactNode, user?: object }} props
 */
export default function HeroMetric({ label, value, unit, note, tone = 'mint', action, user }) {
  const { enabled } = useKinetic();
  const id = useId();
  if (!enabled || value === undefined || value === null || value === '') return null;
  const whole = typeof value === 'number' && Number.isFinite(value);
  const text = whole ? formatNumber(value, user, { maximumFractionDigits: 0 }) : String(value);
  return <section className="hero-metric" data-tone={tone} role="group" aria-labelledby={id} style={{ '--hero-chars': text.length + (unit ? Math.ceil(unit.length / 2) : 0) }}>
    <p id={id} className="hero-metric__label">{label}</p>
    <p className="hero-metric__value">
      {whole ? <AnimatedNumber value={value} format={next => formatNumber(Math.round(next), user, { maximumFractionDigits: 0 })} /> : <span>{text}</span>}
      {unit && <span className="hero-metric__unit">{unit}</span>}
    </p>
    {note && <p className="hero-metric__note">{note}</p>}
    {action && <div className="hero-metric__action">{action}</div>}
  </section>;
}
