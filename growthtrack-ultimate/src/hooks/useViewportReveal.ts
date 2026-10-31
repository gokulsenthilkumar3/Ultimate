import { useEffect, useId, useRef, type RefObject } from 'react';
import { useKinetic } from '../components/motion/KineticContext';
import { MOTION_EASE } from '../components/motion/motionLanguage';

const TARGETS = '.playful-section-heading, .playful-crew-card, .playful-playground__body, .playful-how li, .playful-closer';

/** One encounter per section, with no hidden pre-scroll state or continuously running scroll observer. */
export default function useViewportReveal(ref: RefObject<HTMLElement | null>) {
  const { enabled, canAnimate, tier, budget, activeDialog } = useKinetic();
  const seen = useRef(new WeakSet<Element>());
  const id = useId();
  useEffect(() => {
    if (!enabled || !canAnimate || tier === 0 || activeDialog || !budget || !ref.current || typeof IntersectionObserver !== 'function') return;
    const active = new Map<Animation, string>();
    let serial = 0;
    const finish = (animation: Animation) => {
      const token = active.get(animation);
      if (token) { active.delete(animation); budget.release(token); }
    };
    const observer = new IntersectionObserver(entries => {
      entries.filter(entry => entry.isIntersecting).forEach((entry, index) => {
        const target = entry.target as HTMLElement;
        if (seen.current.has(target)) return;
        seen.current.add(target); observer.unobserve(target);
        if (entry.boundingClientRect.top < 24 || target.contains(document.activeElement) || typeof target.animate !== 'function') return;
        const token = `${id}-${serial++}`;
        budget.request(token, 1, 4);
        if (!budget.has(token)) { budget.release(token); return; }
        try {
          const card = target.matches('.playful-crew-card');
          const animation = target.animate([
            { opacity: .45, transform: card && tier === 2 ? `translateY(24px) rotate(${index % 2 ? 1.2 : -1.2}deg) scale(.97)` : 'translateY(16px)' },
            { opacity: 1, transform: 'none' },
          ], { duration: card ? 520 : 440, delay: Math.min(index, 3) * 55, easing: MOTION_EASE, fill: 'backwards' });
          active.set(animation, token);
          void animation.finished.then(() => finish(animation), () => finish(animation));
        } catch { budget.release(token); }
      });
    }, { threshold: .15, rootMargin: '0px 0px -24px 0px' });
    ref.current.querySelectorAll(TARGETS).forEach(target => observer.observe(target));
    const unsubscribe = budget.subscribe(() => {
      active.forEach((token, animation) => { if (!budget.has(token)) { animation.cancel(); finish(animation); } });
    });
    return () => { observer.disconnect(); unsubscribe(); active.forEach((_, animation) => { animation.cancel(); finish(animation); }); };
  }, [enabled, canAnimate, tier, budget, activeDialog, id, ref]);
}
