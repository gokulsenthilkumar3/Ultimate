import { useId, useLayoutEffect, type RefObject } from 'react';
import { useKinetic } from './KineticContext';

const EASE = 'cubic-bezier(.22, 1, .36, 1)';
const SKIP = 'script, style, template, [hidden], [aria-hidden="true"], .sr-only, .gt-foundation-sr-only';
const RISE = [{ opacity: 0, transform: 'translateY(14px) scale(.992)' }, { opacity: 1, transform: 'none' }];
// A session's first paint is never delayed by a reveal, so LCP is untouched. Later navigations are.
let booted = false;

/**
 * Staggered rise of a page's top-level sections (spec section 6: 40ms stagger, 320ms), with a masked
 * cinematic entry on the first section at Tier 2. Compositor properties only; the mask is a one-shot on one element.
 * Bounded to eight sections, admitted by the shared motion budget, and skipped for Lite, reduced motion, a hidden tab
 * and the first paint. It animates children, never the region Framer and the page entrance already own.
 */
export default function useSectionReveal(ref: RefObject<HTMLElement | null>) {
  const { enabled, canAnimate, tier, budget } = useKinetic();
  const id = useId();
  useLayoutEffect(() => {
    const first = !booted;
    booted = true;
    const root = ref.current;
    if (first || !enabled || !canAnimate || tier === 0 || !root || !budget || typeof root.animate !== 'function') return;
    const page = root.children.length === 1 ? root.firstElementChild as HTMLElement : root;
    const items = [...page.children].filter(el => !el.matches(SKIP)).slice(0, 8) as HTMLElement[];
    if (!items.length) return;
    budget.request(id, 1, 6);
    if (!budget.has(id)) { budget.release(id); return; }
    const animations = items.map((el, index) => el.animate(
      index === 0 && tier === 2
        ? [{ ...RISE[0], clipPath: 'inset(0 0 100% 0 round 24px)' }, { ...RISE[1], clipPath: 'inset(-12px -12px -12px -12px round 24px)' }]
        : RISE,
      { duration: index === 0 && tier === 2 ? 420 : 320, delay: index * 40, easing: EASE, fill: 'backwards' },
    ));
    void Promise.allSettled(animations.map(animation => animation.finished)).then(() => budget.release(id));
    return () => { animations.forEach(animation => animation.cancel()); budget.release(id); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- one reveal per mounted route; flags are read at mount
}
