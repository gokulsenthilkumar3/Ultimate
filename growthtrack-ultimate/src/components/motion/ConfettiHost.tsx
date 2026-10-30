import { lazy, Suspense, useEffect, useState } from 'react';
import type { Burst } from './ConfettiCanvas';
import { useKinetic } from './KineticContext';
const Canvas = lazy(() => import('./ConfettiCanvas'));
export function emitCelebration(x = innerWidth / 2, y = innerHeight / 2) {
  window.dispatchEvent(new CustomEvent('growthtrack:celebrate', { detail: { id: performance.now(), x, y } }));
}
export default function ConfettiHost() {
  const [burst, setBurst] = useState<Burst | null>(null);
  const { enabled, canAnimate, tier } = useKinetic();
  useEffect(() => {
    if (!enabled || !canAnimate || tier === 0) { setBurst(null); return; }
    let timer: ReturnType<typeof setTimeout>;
    const onBurst = (event: Event) => { const data = (event as CustomEvent<Burst>).detail; setBurst(data); clearTimeout(timer); timer = setTimeout(() => setBurst(null), 900); };
    window.addEventListener('growthtrack:celebrate', onBurst);
    return () => { clearTimeout(timer); window.removeEventListener('growthtrack:celebrate', onBurst); };
  }, [enabled, canAnimate, tier]);
  return burst ? <Suspense fallback={null}><Canvas burst={burst} /></Suspense> : null;
}
