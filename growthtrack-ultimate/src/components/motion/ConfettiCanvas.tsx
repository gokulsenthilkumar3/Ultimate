import { useEffect, useRef } from 'react';
import { useKinetic, useMotionSlot } from './KineticContext';

export type Burst = { id: number; x: number; y: number };
export function celebrateAt(x = innerWidth / 2, y = innerHeight / 2) {
  window.dispatchEvent(new CustomEvent('growthtrack:celebrate', { detail: { id: performance.now(), x, y } }));
}
export default function ConfettiCanvas({ burst }: { burst: Burst }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { enabled, canAnimate, tier } = useKinetic();
  const allowed = useMotionSlot(enabled && canAnimate && tier > 0, 1, 9);
  useEffect(() => {
    const canvas = ref.current, context = canvas?.getContext('2d');
    if (!allowed || !canvas || !context) return;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(innerWidth * ratio); canvas.height = Math.round(innerHeight * ratio); context.scale(ratio, ratio);
    const colors = ['#FF5A3C', '#2EE6A8', '#FFD23F', '#A78BFA'];
    const pieces = Array.from({ length: tier === 2 ? 12 : 6 }, (_, i) => ({ angle: Math.PI * 2 * i / (tier === 2 ? 12 : 6), speed: 70 + i % 3 * 25, color: colors[i % colors.length] }));
    let frame = 0, start = 0;
    const draw = (now: number) => {
      start ||= now; const time = (now - start) / 700;
      context.clearRect(0, 0, innerWidth, innerHeight);
      if (time >= 1 || document.hidden) return;
      context.globalAlpha = 1 - time;
      for (const piece of pieces) {
        context.save(); context.translate(burst.x + Math.cos(piece.angle) * piece.speed * time, burst.y + Math.sin(piece.angle) * piece.speed * time + 95 * time * time - 40 * time); context.rotate(piece.angle + time * 4); context.fillStyle = piece.color; context.fillRect(-3, -5, 6, 10); context.restore();
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); context.clearRect(0, 0, innerWidth, innerHeight); };
  }, [allowed, burst, tier]);
  return <canvas ref={ref} className="kinetic-confetti" aria-hidden="true" />;
}
