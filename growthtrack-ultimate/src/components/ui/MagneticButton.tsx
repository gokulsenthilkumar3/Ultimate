import { useEffect, useRef, useState, type ComponentProps } from 'react';
import Button from './Button';
import { useKinetic, useMotionSlot } from '../motion/KineticContext';

/** Public hero only. The wrapper owns pointer drift; the button owns CSS hover/press. */
export default function MagneticButton(props: ComponentProps<typeof Button>) {
  const ref = useRef<HTMLSpanElement>(null), setters = useRef<any>(null);
  const [hovered, setHovered] = useState(false);
  const { enabled, canAnimate, tier } = useKinetic();
  const allowed = useMotionSlot(enabled && canAnimate && tier > 0 && hovered, 2, 7);
  useEffect(() => {
    if (!allowed || !matchMedia('(pointer: fine)').matches) return;
    let disposed = false;
    import('gsap').then(({ gsap }) => {
      if (disposed || !ref.current) return;
      setters.current = { x: gsap.quickTo(ref.current, 'x', { duration: .18, ease: 'power3.out' }), y: gsap.quickTo(ref.current, 'y', { duration: .18, ease: 'power3.out' }), reset: () => { if (ref.current) gsap.set(ref.current, { clearProps: 'transform' }); } };
    }).catch(() => {});
    return () => { disposed = true; setters.current?.x.tween.kill(); setters.current?.y.tween.kill(); setters.current?.reset(); setters.current = null; };
  }, [allowed]);
  return <span ref={ref} className="kinetic-magnetic" onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)} onPointerMove={event => { if (!allowed || !setters.current) return; const bounds = event.currentTarget.getBoundingClientRect(); setters.current.x(Math.max(-4, Math.min(4, (event.clientX - bounds.left - bounds.width / 2) * .04))); setters.current.y(Math.max(-4, Math.min(4, (event.clientY - bounds.top - bounds.height / 2) * .04))); }}><Button {...props} /></span>;
}
