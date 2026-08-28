import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function MarketingCursor() {
  const cursorRef = useRef(null);

  useEffect(() => {
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!finePointer || reducedMotion || !cursorRef.current) return undefined;

    const cursor = cursorRef.current;
    document.body.classList.add('marketing-cursor-enabled');
    gsap.set(cursor, { xPercent: -50, yPercent: -50 });
    const moveX = gsap.quickTo(cursor, 'x', { duration: 0.18, ease: 'power3.out' });
    const moveY = gsap.quickTo(cursor, 'y', { duration: 0.18, ease: 'power3.out' });

    const onMove = event => {
      moveX(event.clientX); moveY(event.clientY);
      const magnetic = event.target.closest?.('[data-magnetic]');
      cursor.dataset.active = magnetic ? 'true' : 'false';
      if (magnetic) {
        const box = magnetic.getBoundingClientRect();
        gsap.to(magnetic, { x: (event.clientX - box.left - box.width / 2) * 0.14, y: (event.clientY - box.top - box.height / 2) * 0.14, duration: 0.28, ease: 'power3.out', overwrite: 'auto' });
      }
    };
    const onOut = event => {
      const magnetic = event.target.closest?.('[data-magnetic]');
      if (magnetic && !magnetic.contains(event.relatedTarget)) gsap.to(magnetic, { x: 0, y: 0, duration: 0.38, ease: 'power3.out' });
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerout', onOut);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerout', onOut);
      document.body.classList.remove('marketing-cursor-enabled');
      gsap.set('[data-magnetic]', { clearProps: 'transform' });
    };
  }, []);

  return <div ref={cursorRef} className="marketing-cursor" aria-hidden="true" />;
}
