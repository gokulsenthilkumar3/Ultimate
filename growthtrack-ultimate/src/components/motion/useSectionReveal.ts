import { useId, useLayoutEffect, useRef, type RefObject } from 'react';
import { useKinetic } from './KineticContext';
import { MOTION_EASE } from './motionLanguage';

const SKIP = 'script, style, template, [hidden], [aria-hidden="true"], .sr-only, .gt-foundation-sr-only';
const METRICS = '.native-metrics, .finance-kpi-grid, .editorial-overview__facts, .kinetic-overview-focus';
const METRIC = '.stat-card, .stat-tile, .native-metric, .kinetic-hero-metric';
const RISE = [{ opacity: 0, transform: 'translateY(14px) scale(.992)' }, { opacity: 1, transform: 'none' }];
// A session's first paint is never delayed by a reveal, so LCP is untouched. Later navigations are.
let booted = false;

/**
 * Headers open, metric cards settle in sequence, then content arrives. Never animate a whole page over its children.
 * Eight targets maximum, first paint untouched, no hidden resting styles, and cancellation on every preference change.
 */
export default function useSectionReveal(ref: RefObject<HTMLElement | null>, pageKey = 'mounted') {
  const { enabled, canAnimate, tier, budget } = useKinetic();
  const id = useId();
  const lastPage = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (lastPage.current === pageKey) return;
    lastPage.current = pageKey;
    const first = !booted;
    booted = true;
    const root = ref.current;
    if (first || !enabled || !canAnimate || tier === 0 || !root || !budget || typeof root.animate !== 'function') return;
    // Insights owns its late-loaded content and query arrivals; avoid a second entrance on the same cards.
    if (root.querySelector('[data-insights-page], [data-page-motion-owner]')) return;
    const page = root.children.length === 1 ? root.firstElementChild as HTMLElement : root;
    const items = [...page.children].filter(el => !el.matches(SKIP)).flatMap(el =>
      tier === 2 && el.matches(METRICS) ? [...el.children].filter(child => !child.matches(SKIP)).slice(0, 4) : [el],
    ).slice(0, 8) as HTMLElement[];
    if (!items.length) return;
    budget.request(id, 1, 6);
    if (!budget.has(id)) { budget.release(id); return; }
    const animations: Animation[] = [];
    let unsubscribe = () => {};
    let finished = false;
    const release = () => { if (!finished) { finished = true; unsubscribe(); budget.release(id); } };
    const cancel = () => { animations.forEach(animation => animation.cancel()); release(); };
    try {
      items.forEach((el, index) => {
        let frames: Keyframe[] = RISE;
        if (tier === 2) {
          if (index === 0) frames = [
            { opacity: .65, transform: 'translateY(10px)', clipPath: 'inset(0 0 35% 0 round 20px)' },
            { opacity: 1, transform: 'none', clipPath: 'inset(-12px -12px -12px -12px round 20px)' },
          ];
          else if (el.matches(METRIC) || el.parentElement?.matches(METRICS)) frames = [
            { opacity: .35, transform: `translateY(18px) rotate(${index % 2 ? -.7 : .7}deg) scale(.97)`, offset: 0 },
            { opacity: 1, transform: 'translateY(-1px) scale(1.004)', offset: .76 },
            { opacity: 1, transform: 'none', offset: 1 },
          ];
          else frames = [{ opacity: .45, transform: `translate(${index % 2 ? 8 : -8}px, 12px)` }, { opacity: 1, transform: 'none' }];
        }
        animations.push(el.animate(frames, { duration: index === 0 && tier === 2 ? 420 : 320, delay: index * 40, easing: MOTION_EASE, fill: 'backwards' }));
      });
      unsubscribe = budget.subscribe(() => { if (!budget.has(id)) cancel(); });
      void Promise.allSettled(animations.map(animation => animation.finished)).then(release);
    } catch { cancel(); }
    return cancel;
  }, [enabled, canAnimate, tier, budget, id, pageKey, ref]);
}
