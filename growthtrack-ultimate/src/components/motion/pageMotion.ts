import { useId, useLayoutEffect, useRef, type RefObject } from 'react';
import { useKinetic } from './KineticContext';
import { MOTION_EASE } from './motionLanguage';
import type { MotionBudget } from './motionBudget';

export type PageMotionContract = {
  targets: string; roleOf: (target: Element) => string; lines?: string; viewOrder?: string[];
  viewAttribute?: string; routeViewAttribute?: string; keyAttribute?: string; stillAttribute?: string;
  stillEvent?: string; resumeEvent?: string;
  avoidNested?: boolean;
};
const MAX_TARGETS = 40, MAX_BURST = 8;
type Track = { target: Element; animations: Animation[] };
export type PageMotionOptions = { budget: MotionBudget; id: string; tier: number; seen: WeakSet<Element>; contract: PageMotionContract };

function inView(target: Element) {
  let rect = target.getBoundingClientRect();
  if (!rect.width || !rect.height) rect = target.closest('svg')?.getBoundingClientRect() || rect;
  return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth && !target.closest('[hidden], [inert]');
}

/** Handles nested lazy pages and query arrivals, not just the outer route's loading placeholder. */
export function mountPageMotion(root: HTMLElement, { budget, id, tier, seen, contract }: PageMotionOptions) {
  const { targets: TARGETS, roleOf, lines: LINES = '.recharts-line-curve, .recharts-area-curve', viewAttribute = 'data-page-view', routeViewAttribute = 'data-route-view', keyAttribute = 'data-motion-key', stillAttribute = 'data-page-still', viewOrder: VIEW_ORDER = [], stillEvent = 'page:still', resumeEvent = 'page:resume' } = contract;
  const active = new Map<string, Track>();
  const observed = new Set<Element>();
  let positions = new Map<Element, DOMRect>();
  let serial = 0, frame = 0, disposed = false, capturing = false;
  let lastView = '', direction = 1;
  const frozen = () => capturing || Boolean(root.querySelector(`[${stillAttribute}="true"]`));
  const finish = (token: string) => { if (active.delete(token)) budget.release(token); };
  const cancel = (token: string) => {
    const track = active.get(token);
    if (!track) return;
    active.delete(token); track.animations.forEach(animation => animation.cancel()); budget.release(token);
  };
  const stop = () => [...active.keys()].forEach(cancel);
  const focused = (target: Element) => target.contains(document.activeElement);
  const run = (target: Element, frames: Keyframe[], duration: number, delay = 0, cost = 1) => {
    if (disposed || frozen() || focused(target) || !inView(target) || typeof target.animate !== 'function') return;
    const token = `${id}-${serial++}`;
    budget.request(token, cost, 7);
    if (!budget.has(token)) { budget.release(token); return; }
    try {
      const animation = target.animate(frames, { duration, delay, easing: MOTION_EASE, fill: 'backwards' });
      active.set(token, { target, animations: [animation] });
      void animation.finished.then(() => finish(token), () => finish(token));
    } catch { budget.release(token); }
  };
  const stroke = (path: Element, delay = 0) => {
    if (seen.has(path) || !inView(path)) return;
    seen.add(path);
    const dash = path.getAttribute('stroke-dasharray') || getComputedStyle(path).strokeDasharray;
    // Projected/model paths keep their dashed identity throughout. Values, axes and labels never move.
    if (dash && dash !== 'none' && !/^0(?:px)?(?:[, ]+0(?:px)?)*$/.test(dash)) {
      run(path, [{ opacity: .4 }, { opacity: 1 }], 460, delay); return;
    }
    try {
      const length = (path as SVGPathElement).getTotalLength();
      if (!Number.isFinite(length) || length <= 0 || length > 12000) return;
      run(path, [{ strokeDasharray: `${length} ${length}`, strokeDashoffset: length, opacity: .65 }, { strokeDasharray: `${length} ${length}`, strokeDashoffset: 0, opacity: 1 }], 620, delay);
    } catch { /* An unavailable SVG geometry API leaves the already-visible chart intact. */ }
  };
  const enter = (target: Element, index = 0) => {
    if (seen.has(target) || !inView(target)) return;
    seen.add(target);
    if (contract.avoidNested && roleOf(target) !== 'signal' && [...active.values()].some(track => track.target !== target && track.target.contains(target))) return;
    const role = roleOf(target), delay = Math.min(index, 4) * 38;
    if (role === 'signal') {
      [...target.querySelectorAll('[data-signal-part]')].slice(0, tier === 2 ? 5 : 3).forEach((part, partIndex) => {
        if (part.getAttribute('data-signal-part') === 'line') stroke(part, partIndex * 55);
        else run(part, [{ opacity: .45, transform: `translateY(${partIndex % 2 ? -6 : 8}px) scale(.86)` }, { opacity: 1, transform: 'none' }], 520, partIndex * 55);
      });
      return;
    }
    if (role === 'fill') { run(target, [{ transform: 'scaleX(.72)' }, { transform: 'scaleX(1)' }], 560, delay); return; }
    if (role === 'launcher') {
      run(target, [{ opacity: .75, transform: 'translateY(10px) scale(.94)' }, { opacity: 1, transform: 'translateY(-2px) scale(1.008)', offset: .72 }, { transform: 'none' }], 430, delay); return;
    }
    if (role === 'ledger') {
      run(target, [{ opacity: .8, transform: `translateX(${index % 2 ? 10 : -10}px)`, clipPath: 'inset(0 7% 0 0 round 12px)' }, { opacity: 1, transform: 'none', clipPath: 'inset(-5px round 12px)' }], 410, delay); return;
    }
    if (role === 'postcard') {
      run(target, [{ opacity: .75, transform: `translate(${index % 2 ? 7 : -7}px, 13px) rotate(${index % 2 ? 1.4 : -1.4}deg)` }, { opacity: 1, transform: `translateY(-2px) rotate(${index % 2 ? -.2 : .2}deg)`, offset: .76 }, { transform: 'none' }], 560, delay); return;
    }
    if (role === 'reel') {
      run(target, [{ opacity: .8, transform: 'translateX(12px)', clipPath: 'inset(0 0 12% 0 round 18px)' }, { opacity: 1, transform: 'none', clipPath: 'inset(-5px round 18px)' }], 460, delay); return;
    }
    if (role === 'pin') {
      run(target, [{ opacity: .7, transform: 'translateY(-10px) scale(.98)', transformOrigin: '50% 100%' }, { opacity: 1, transform: 'translateY(2px) scale(1.005)', offset: .7 }, { transform: 'none' }], 480, delay); return;
    }
    if (role === 'queue') {
      run(target, [{ opacity: .7, transform: 'translateX(-14px)', clipPath: 'inset(0 0 18% 0 round 18px)' }, { opacity: 1, transform: 'none', clipPath: 'inset(-5px round 18px)' }], 400, delay); return;
    }
    if (role === 'model' || role === 'tile') {
      run(target, [{ opacity: .65, transform: `translateY(12px) rotate(${index % 2 ? 1 : -1}deg) scale(.97)` }, { opacity: 1, transform: 'translateY(-1px) scale(1.003)', offset: .78 }, { opacity: 1, transform: 'none' }], 440, delay); return;
    }
    if (role === 'metric') { run(target, [{ opacity: .7, transform: 'translateY(8px) scale(.97, 1)' }, { opacity: 1, transform: 'none' }], 360, delay); return; }
    if (role === 'story' || role === 'trail') { run(target, [{ opacity: .6, transform: 'translateX(-10px)' }, { opacity: 1, transform: 'none' }], 360, delay); return; }
    if (role === 'plot') { run(target, [{ opacity: .8, transform: `translateX(${direction * 8}px)` }, { opacity: 1, transform: 'none' }], 320, delay); return; }
    // A focus card opens on its edge. The large number remains painted for the entire entrance.
    run(target, [{ transform: 'translateY(8px) scale(.985)', opacity: .8 }, { transform: 'none', opacity: 1 }], 420, delay);
  };
  const intersection = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
    let index = 0;
    entries.filter(entry => entry.isIntersecting).forEach(entry => {
      intersection?.unobserve(entry.target); observed.delete(entry.target);
      if (frozen()) return;
      if (index < MAX_BURST) enter(entry.target, index++);
      else seen.add(entry.target);
    });
    drawPlots();
  }, { threshold: .12, rootMargin: '0px 0px -16px 0px' }) : null;
  const drawPlots = () => {
    if (frozen()) return;
    [...root.querySelectorAll(LINES)].filter(path => !seen.has(path) && inView(path)).slice(0, tier === 2 ? 6 : 2).forEach((path, index) => stroke(path, index * 65));
  };
  const reflowQueue = () => {
    const rows = [...root.querySelectorAll(`[${keyAttribute}]`)].slice(0, 12);
    const changed = positions.size && (rows.length !== positions.size || rows.some(row => !positions.has(row)));
    if (changed) active.forEach((track, token) => { if (track.target.matches(`[${keyAttribute}]`)) cancel(token); });
    const next = new Map<Element, DOMRect>();
    rows.forEach(row => {
      const rect = row.getBoundingClientRect(), previous = positions.get(row);
      if (changed && previous && Math.abs(previous.top - rect.top) > 1 && Math.abs(previous.top - rect.top) < 600) {
        run(row, [{ transform: `translateY(${previous.top - rect.top}px)` }, { transform: 'none' }], 360);
      }
      next.set(row, rect);
    });
    positions = next;
  };
  const scan = () => {
    frame = 0;
    if (disposed) return;
    if (frozen()) { stop(); return; }
    const view = root.querySelector(`[${viewAttribute}]`)?.getAttribute(viewAttribute) || root.getAttribute(routeViewAttribute) || '';
    if (view !== lastView) {
      direction = VIEW_ORDER.indexOf(view) < VIEW_ORDER.indexOf(lastView) ? -1 : 1;
      if (lastView) {
        stop();
        [...root.querySelectorAll(TARGETS)].filter(target => roleOf(target) === 'plot').forEach(target => seen.delete(target));
      }
      lastView = view;
    }
    reflowQueue();
    let burst = 0;
    [...root.querySelectorAll(TARGETS)].slice(0, MAX_TARGETS).forEach(target => {
      if (seen.has(target) || observed.has(target)) return;
      if (inView(target)) { if (burst < MAX_BURST) enter(target, burst++); else seen.add(target); }
      else if (intersection) { observed.add(target); intersection.observe(target); }
    });
    observed.forEach(target => { if (!root.contains(target)) { intersection?.unobserve(target); observed.delete(target); } });
    active.forEach((track, token) => { if (!root.contains(track.target)) cancel(token); });
    drawPlots();
  };
  const schedule = () => { if (!disposed && !frame) frame = requestAnimationFrame(scan); };
  // Numeric interpolation replaces text nodes each frame. Only element arrivals/removals and explicit view flags matter.
  const mutations = new MutationObserver(records => {
    if (records.some(record => {
      if (record.target instanceof Element && record.target.closest('.recharts-tooltip-wrapper, .recharts-active-dot, .recharts-active-shape')) return false;
      return record.type === 'attributes' || [...record.addedNodes, ...record.removedNodes].some(node => node.nodeType === 1);
    })) schedule();
  });
  mutations.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: [viewAttribute, stillAttribute] });
  const unsubscribe = budget.subscribe(() => active.forEach((_, token) => { if (!budget.has(token)) cancel(token); }));
  const interact = (event: Event) => active.forEach((track, token) => { if (event.target instanceof Node && track.target.contains(event.target)) cancel(token); });
  const scroll = () => { stop(); positions.clear(); };
  const capture = () => { capturing = true; cancelAnimationFrame(frame); frame = 0; stop(); };
  const resume = () => { capturing = false; schedule(); };
  root.addEventListener('focusin', interact); root.addEventListener('pointerdown', interact, true);
  root.addEventListener(stillEvent, capture); root.addEventListener(resumeEvent, resume);
  document.addEventListener('scroll', scroll, { passive: true, capture: true });
  window.addEventListener('resize', scroll);
  // StrictMode disposes its rehearsal mount before this frame; only the surviving mount marks content as seen.
  schedule();
  return () => {
    disposed = true; cancelAnimationFrame(frame); mutations.disconnect(); intersection?.disconnect(); unsubscribe(); stop();
    root.removeEventListener('focusin', interact); root.removeEventListener('pointerdown', interact, true);
    root.removeEventListener(stillEvent, capture); root.removeEventListener(resumeEvent, resume);
    document.removeEventListener('scroll', scroll, true); window.removeEventListener('resize', scroll);
  };
}

export function usePageMotion(ref: RefObject<HTMLElement | null>, page: string, view: string, contract: PageMotionContract) {
  const { enabled, canAnimate, tier, budget, activeDialog } = useKinetic();
  const seen = useRef(new WeakSet<Element>()), id = useId();
  useLayoutEffect(() => {
    if (!enabled || !canAnimate || tier === 0 || !budget || !ref.current || (activeDialog && !activeDialog.contains(ref.current))) return;
    return mountPageMotion(ref.current, { budget, tier, id, seen: seen.current, contract });
  }, [enabled, canAnimate, tier, budget, activeDialog, ref, id, page, view, contract]);
}
