import { useEffect, useRef, useState } from 'react';
import { useKinetic, useMotionSlot } from '../motion/KineticContext';
import useSceneMotion from '../../hooks/useSceneMotion';

// The brief's 600ms snap curve, without the animation engine: framer's `animate` here is a static import in the eager bundle
// (PageHeader -> HeroMetric -> this file) and added about 21 KB gzip to first load, against the lazy-motion strategy.
const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);
function tween(from: number, to: number, ms: number, onUpdate: (next: number) => void, onDone: () => void) {
  let frame = 0;
  const start = performance.now();
  const tick = (now: number) => {
    const t = Math.min(1, Math.max(0, (now - start) / ms));
    onUpdate(from + (to - from) * easeOut(t));
    if (t < 1) frame = requestAnimationFrame(tick); else onDone();
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}

const plain = (next: number, target: number) => { if (next === target) return String(target); const precision = Math.min(8, String(target).split('.')[1]?.length || 0); return String(Number(next.toFixed(precision))); };

export default function AnimatedNumber({ value, format, className = '' }: { value: number; format?: (value: number) => string; className?: string }) {
  const formatValue = (next: number) => format ? format(next) : plain(next, value);
  // Callers pass inline formatters. Frames read the newest one so a parent re-render never restarts the count-up.
  const latestFormat = useRef(format);
  useEffect(() => { latestFormat.current = format; });
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
    const frame = (next: number) => latestFormat.current ? latestFormat.current(next) : plain(next, value);
    const stop = tween(Number.isFinite(previous.current) ? previous.current : 0, value, 600, next => { if (ref.current) ref.current.textContent = frame(next); }, () => { if (ref.current) ref.current.textContent = text; });
    previous.current = value;
    return stop;
  }, [allowed, value, text, enabled, canAnimate, tier]);
  return <span className={`kinetic-number ${className}`} style={{ fontVariantNumeric: 'tabular-nums' }}><span ref={ref} aria-hidden="true">{text}</span><span className="gt-foundation-sr-only">{text}</span></span>;
}
