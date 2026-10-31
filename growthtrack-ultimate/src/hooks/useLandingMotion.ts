import { useEffect, useRef, useState, type RefObject } from 'react';
import { useKinetic, useMotionSlot } from '../components/motion/KineticContext';
import useViewportReveal from './useViewportReveal';

/** Text, illustration and ink have separate beats. GSAP never owns a character sprite's idle transform. */
export default function useLandingMotion(ref: RefObject<HTMLElement | null>, { parallax = false } = {}) {
  const { enabled, canAnimate, tier } = useKinetic();
  const [visible, setVisible] = useState(() => typeof window.IntersectionObserver !== 'function');
  const entered = useRef(false);
  const [entering, setEntering] = useState(true);
  const allowed = useMotionSlot(enabled && canAnimate && tier > 0 && visible && entering, 2, 3);
  const drift = useMotionSlot(enabled && canAnimate && tier === 2 && visible && parallax, 2, 1);
  useViewportReveal(ref);
  useEffect(() => {
    const target = ref.current?.querySelector('.playful-hero, .gt-public-login');
    if (!target || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '40px' });
    observer.observe(target); return () => observer.disconnect();
  }, [ref]);
  useEffect(() => {
    if (!allowed || !ref.current) return;
    if (entered.current) { setEntering(false); return; }
    let disposed = false, cleanup = () => {};
    import('gsap').then(({ gsap }) => {
      const root = ref.current;
      if (disposed || !root) return;
      entered.current = true;
      if (root.contains(document.activeElement) && document.activeElement?.matches('input, textarea, select')) { setEntering(false); return; }
      const context = gsap.context(() => {
        const timeline = gsap.timeline({ defaults: { ease: 'power4.out', clearProps: 'transform,opacity,transformOrigin' }, onComplete: () => { if (!disposed) setEntering(false); } });
        const title = root.querySelector('h1');
        // The headline remains painted throughout: no opacity-zero LCP or word-by-word accessibility changes.
        if (title) timeline.from(title, { y: 14, rotation: .8, transformOrigin: '0% 100%', duration: .72 }, 0);
        const copy = root.querySelectorAll('.playful-hero__lead, .playful-hero__actions, .playful-hero__note, .gt-public-login__story > p, .gt-public-login__values');
        if (copy.length) timeline.from(copy, { y: 12, opacity: .55, duration: .56, stagger: .055 }, .08);
        const hero = root.querySelector('.playful-hero') || root;
        const personalStage = hero.querySelector('.welcome-companion__entrance');
        if (personalStage) timeline.from(personalStage, { y: 18, rotation: -2, scale: .97, duration: .8 }, .04);
        const actors = hero.querySelectorAll('.character-scene--crew .character-scene__actor');
        if (actors.length) timeline.from(actors, { y: 22, scale: .86, rotation: index => [-10, 7, -5, 8][index % 4], duration: .72, stagger: .055, ease: 'back.out(1.25)' }, .04);
        const paper = hero.querySelector('.character-scene__paper');
        if (paper) timeline.from(paper, { y: 12, rotation: -12, scale: .94, duration: .7, ease: 'back.out(1.1)' }, .02);
        const panel = root.querySelector('.gt-public-login__panel');
        if (panel) timeline.from(panel, { x: 18, y: 6, opacity: .6, duration: .7 }, .05);
        root.querySelectorAll<SVGPathElement>('.playful-hero__you path').forEach((path, index) => {
          const length = typeof path.getTotalLength === 'function' ? path.getTotalLength() : 240;
          timeline.fromTo(path, { strokeDasharray: length, strokeDashoffset: length }, { strokeDashoffset: 0, duration: .58, ease: 'power2.inOut', clearProps: 'strokeDasharray,strokeDashoffset' }, .18 + index * .08);
        });
      }, root);
      const interrupt = () => { context.revert(); setEntering(false); };
      root.addEventListener('pointerdown', interrupt, { once: true, capture: true });
      root.addEventListener('focusin', interrupt, { once: true });
      cleanup = () => { context.revert(); root.removeEventListener('pointerdown', interrupt, true); root.removeEventListener('focusin', interrupt); };
    }).catch(() => { if (!disposed) setEntering(false); });
    return () => { disposed = true; cleanup(); };
  }, [allowed, ref]);

  useEffect(() => {
    const root = ref.current;
    if (!drift || !root) return;
    const hero = root.querySelector('.playful-hero');
    const layers = [...root.querySelectorAll<HTMLElement>('[data-parallax]')];
    let frame = 0;
    const update = () => {
      frame = 0;
      const distance = Math.min(600, Math.max(0, -(hero?.getBoundingClientRect().top || 0)));
      layers.forEach((layer, index) => layer.style.setProperty('--parallax-y', `${distance * (index % 2 ? -.025 : .03)}px`));
    };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener('scroll', scroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', scroll); cancelAnimationFrame(frame);
      layers.forEach(layer => layer.style.removeProperty('--parallax-y'));
    };
  }, [drift, ref]);
}
