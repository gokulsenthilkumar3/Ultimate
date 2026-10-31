import { useId, useLayoutEffect, useRef } from 'react';
import usePlayfulMotion from './usePlayfulMotion';
import { useKinetic } from '../components/motion/KineticContext';
import { MOTION_EASE, panelFrames } from '../components/motion/motionLanguage';

/** Animate the existing region; never remount a page or clear its forms to animate it. */
export default function usePageEntrance(ref, routeKey) {
  const { canAnimate } = usePlayfulMotion();
  const { enabled, tier, budget } = useKinetic();
  const previous = useRef(null);
  const id = useId();
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || (enabled && previous.current?.key === routeKey)) return undefined;
    const tabs = [...root.querySelectorAll('[role="tab"]')];
    const index = tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true');
    const before = previous.current;
    if (enabled || canAnimate) previous.current = { key: routeKey, index };
    if (root.closest('[data-insights-page]') || (enabled && root.closest('[data-page-motion-owner]'))) return undefined;
    if (!canAnimate || (enabled && (tier === 0 || !before))) return undefined;
    const target = enabled ? root.querySelector('[role="tabpanel"]') || root : root;
    if (!target.animate) return undefined;
    budget?.request(id, 1, 7);
    if (budget && !budget.has(id)) { budget.release(id); return undefined; }
    const rtl = getComputedStyle(root).direction === 'rtl' ? -1 : 1;
    const direction = (before && index < before.index ? -1 : 1) * rtl;
    const animation = target.animate(enabled ? panelFrames(direction) : [
      { opacity: 0.35, transform: 'translateY(10px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ], { duration: enabled ? 260 : 360, easing: MOTION_EASE });
    let unsubscribe = () => {};
    let released = false;
    const release = () => { if (!released) { released = true; unsubscribe(); budget?.release(id); } };
    const cancel = () => { animation.cancel(); release(); };
    unsubscribe = budget?.subscribe(() => { if (!budget.has(id)) cancel(); }) || unsubscribe;
    void Promise.resolve(animation.finished).then(release, release);
    return cancel;
  }, [canAnimate, enabled, tier, budget, id, ref, routeKey]);
}
