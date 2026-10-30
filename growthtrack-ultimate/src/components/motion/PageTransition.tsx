import { AnimatePresence, m, useIsPresent } from 'framer-motion';
import { useState, type ReactNode } from 'react';
import { useKinetic, useMotionSlot } from './KineticContext';

function TransitionRegion({ children, animate, onStart, onComplete }: { children: ReactNode; animate: boolean; onStart: () => void; onComplete: () => void }) {
  const present = useIsPresent();
  return <m.div className="kinetic-page-transition" inert={!present || undefined} aria-hidden={!present || undefined} style={{ pointerEvents: present ? undefined : 'none' }} initial={animate ? { opacity: 0, y: 8, scale: .995 } : false} animate={{ opacity: 1, y: 0, scale: 1 }} exit={animate ? { opacity: 0, y: -4 } : undefined} transition={{ duration: animate ? .22 : 0, ease: [.22, 1, .36, 1] }} onAnimationStart={onStart} onAnimationComplete={onComplete}>{children}</m.div>;
}

/** Key only by module identity, exactly as before. View/filter changes never reset forms. */
export default function PageTransition({ pageKey, children }: { pageKey: string; children: ReactNode }) {
  const { enabled, canAnimate, tier } = useKinetic();
  const [moving, setMoving] = useState(false);
  const allowed = useMotionSlot(moving && canAnimate, 1, 10);
  if (!enabled) return <>{children}</>;
  const animate = canAnimate && tier > 0 && (!moving || allowed);
  return <AnimatePresence initial={false} mode="wait"><TransitionRegion key={pageKey} animate={animate} onStart={() => setMoving(true)} onComplete={() => setMoving(false)}>{children}</TransitionRegion></AnimatePresence>;
}
