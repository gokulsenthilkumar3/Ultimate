import { useEffect, useRef, useState, type RefObject } from 'react';
import { useKinetic, useMotionSlot } from '../components/motion/KineticContext';

/** GSAP belongs only to public hero choreography. It never owns character sprite transforms. */
export default function useLandingMotion(ref: RefObject<HTMLElement | null>, { parallax = false } = {}) {
  const { enabled, canAnimate, tier } = useKinetic();
  const [visible, setVisible] = useState(() => typeof window.IntersectionObserver !== 'function');
  const entered = useRef(false);
  const [entering, setEntering] = useState(true);
  const cost = entering ? tier === 2 && parallax ? 4 : 2 : tier === 2 && parallax ? 2 : 0;
  const allowed = useMotionSlot(enabled && canAnimate && tier > 0 && visible, cost, 3);
  useEffect(() => {
    const target = ref.current?.querySelector('.playful-hero, .gt-public-login');
    if (!target || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '40px' });
    observer.observe(target); return () => observer.disconnect();
  }, [ref]);
  useEffect(() => {
    if (!allowed || !ref.current) return;
    let disposed = false, cleanup = () => {};
    Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (disposed || !ref.current) return;
      gsap.registerPlugin(ScrollTrigger);
      const media = gsap.matchMedia(ref.current);
      media.add('(prefers-reduced-motion: no-preference)', () => {
        if (!entered.current) {
          gsap.fromTo('[data-hero-enter]', { y: 16, opacity: .65 }, { y: 0, opacity: 1, duration: 1.1, stagger: .1, ease: 'power3.out', clearProps: 'transform,opacity', onComplete: () => setEntering(false) });
          entered.current = true;
        } else setEntering(false);
        const hero = ref.current?.querySelector('.playful-hero');
        if (tier === 2 && parallax && hero) ref.current?.querySelectorAll<HTMLElement>('[data-parallax]').forEach((layer, i) => {
          gsap.to(layer, { y: i % 2 ? -16 : 16, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: .3 } });
        });
      });
      const scrolling = () => { document.documentElement.dataset.kineticScrolling = 'true'; };
      const stopped = () => { delete document.documentElement.dataset.kineticScrolling; };
      ScrollTrigger.addEventListener('scrollStart', scrolling); ScrollTrigger.addEventListener('scrollEnd', stopped);
      cleanup = () => { media.revert(); ScrollTrigger.removeEventListener('scrollStart', scrolling); ScrollTrigger.removeEventListener('scrollEnd', stopped); stopped(); };
    }).catch(() => { if (!disposed) setEntering(false); });
    return () => { disposed = true; cleanup(); };
  }, [allowed, tier, ref, parallax]);
}
