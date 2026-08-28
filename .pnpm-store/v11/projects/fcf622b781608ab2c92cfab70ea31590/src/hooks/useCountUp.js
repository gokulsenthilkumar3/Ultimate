/**
 * useCountUp — Smooth number animation hook
 * Animates from 0 (or previous value) to target using requestAnimationFrame.
 *
 * @param {number} target - The target value to animate to
 * @param {number} [duration=700] - Animation duration in ms
 * @param {number} [decimals=0] - Decimal places to display
 * @returns {string} - Formatted animated value
 */
import { useState, useEffect, useRef } from 'react';

export function useCountUp(target, duration = 700, decimals = 0) {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);
  const frameRef = useRef(null);

  useEffect(() => {
    const from = prevRef.current;
    const to = target;
    if (from === to) return;

    const startTime = performance.now();
    const diff = to - from;

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + diff * eased;
      setDisplay(parseFloat(current.toFixed(decimals)));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        prevRef.current = to;
        setDisplay(to);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration, decimals]);

  return display.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
