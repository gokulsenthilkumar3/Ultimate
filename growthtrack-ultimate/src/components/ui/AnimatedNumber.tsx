import { useEffect, useMemo, useRef, useState } from 'react';
import { animate } from 'framer-motion';
import { useKinetic, useMotionSlot } from '../motion/KineticContext';
import useSceneMotion from '../../hooks/useSceneMotion';

export default function AnimatedNumber({ value, format, className = '' }: { value: number; format?: (value: number) => string; className?: string }) {
  const formatValue = useMemo(() => format || ((next: number) => { if (next === value) return String(value); const precision = Math.min(8, String(value).split('.')[1]?.length || 0); return String(Number(next.toFixed(precision))); }), [format, value]);
  const ref = useRef<HTMLSpanElement>(null), previous = useRef(0);
  const { enabled, canAnimate, tier } = useKinetic();
  const active = useSceneMotion(ref, { cost: 0 });
  const [running, setRunning] = useState(false);
  useEffect(() => { if (!enabled || !canAnimate || !active || tier === 0) { setRunning(false); return; } setRunning(true); const timer = setTimeout(() => setRunning(false), 650); return () => clearTimeout(timer); }, [enabled, canAnimate, active, tier, value]);
  const allowed = useMotionSlot(running && canAnimate, 1, 5);
  const text = Number.isFinite(value) ? formatValue(value) : '—';
  useEffect(() => {
    if (!ref.current) return;
    if (!allowed || !Number.isFinite(value)) { ref.current.textContent = text; if (!canAnimate || tier === 0 || !enabled) previous.current = value; return; }
    const controls = animate(Number.isFinite(previous.current) ? previous.current : 0, value, { duration: .6, ease: [.22, 1, .36, 1], onUpdate: next => { if (ref.current) ref.current.textContent = formatValue(next); }, onComplete: () => { if (ref.current) ref.current.textContent = text; } });
    previous.current = value;
    return () => controls.stop();
  }, [allowed, value, text, formatValue, enabled, canAnimate, tier]);
  return <span className={`kinetic-number ${className}`} style={{ fontVariantNumeric: 'tabular-nums' }}><span ref={ref} aria-hidden="true">{text}</span><span className="gt-foundation-sr-only">{text}</span></span>;
}
