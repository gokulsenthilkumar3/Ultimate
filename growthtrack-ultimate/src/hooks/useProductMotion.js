import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';

const DEFAULT_DURATION = 0.52;
const DEFAULT_STAGGER = 0.045;
const DEFAULT_EASE = 'power3.out';

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function useSystemReducedMotion() {
  const [reduced, setReduced] = useState(prefersReducedMotion);

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setReduced(media.matches);
    media.addEventListener?.('change', handleChange);
    return () => media.removeEventListener?.('change', handleChange);
  }, []);

  return reduced;
}

function getMotionItems(root, selector) {
  const explicitItems = Array.from(root.querySelectorAll(selector));
  if (explicitItems.length > 0) return explicitItems;

  const page = root.querySelector(
    '.module-page, .overview-page, .physique-page, .physique-lab, [data-motion-page]',
  );
  return page ? Array.from(page.children) : Array.from(root.children);
}

/**
 * A small, shared entrance system for product surfaces.
 *
 * Daily views use a restrained opacity/y lift. Cinematic surfaces can opt into
 * the same scope with data-motion-item without inventing a second transition
 * language. The hook always leaves the DOM in a usable state for reduced
 * motion users and cleans up when a lazy tab is replaced.
 */
export function useStaggeredEntrance({
  disabled = false,
  selector = '[data-motion-item]',
  duration = DEFAULT_DURATION,
  stagger = DEFAULT_STAGGER,
  ease = DEFAULT_EASE,
} = {}) {
  const scopeRef = useRef(null);
  const systemReducedMotion = useSystemReducedMotion();

  useLayoutEffect(() => {
    const root = scopeRef.current;
    if (!root) return undefined;

    const items = getMotionItems(root, selector);
    if (items.length === 0) return undefined;

    const reduced = disabled || systemReducedMotion;
    if (reduced) {
      gsap.set(items, { autoAlpha: 1, clearProps: 'transform,opacity,visibility' });
      return undefined;
    }

    const context = gsap.context(() => {
      gsap.fromTo(
        items,
        { autoAlpha: 0, y: 14 },
        {
          autoAlpha: 1,
          y: 0,
          clearProps: 'transform,opacity,visibility',
          duration,
          ease,
          stagger,
          overwrite: 'auto',
        },
      );
    }, root);

    return () => context.revert();
  }, [disabled, duration, ease, selector, stagger, systemReducedMotion]);

  return scopeRef;
}

export default useStaggeredEntrance;
