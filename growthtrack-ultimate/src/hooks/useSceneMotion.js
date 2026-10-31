import { useEffect, useState } from 'react';
import usePlayfulMotion from './usePlayfulMotion';
import { useKinetic, useMotionSlot } from '../components/motion/KineticContext';

/** Decorative scenes and brand marks share pause, visibility, and viewport rules. */
export default function useSceneMotion(ref, { cost = 1, priority = 0, enabled = true } = {}) {
  const [inView, setInView] = useState(() => typeof window.IntersectionObserver !== 'function');
  const { canAnimate } = usePlayfulMotion();
  const { activeDialog } = useKinetic();
  useEffect(() => {
    if (!enabled || !window.IntersectionObserver || !ref.current) return undefined;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: '40px' });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, enabled]);
  const unobscured = !activeDialog || Boolean(ref.current && activeDialog.contains(ref.current));
  return useMotionSlot(enabled && canAnimate && inView && unobscured, cost, priority);
}
