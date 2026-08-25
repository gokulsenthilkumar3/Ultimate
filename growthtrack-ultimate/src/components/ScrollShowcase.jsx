import React, { Suspense, lazy, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const HumanoidViewer = lazy(() => import('./HumanoidViewer'));
gsap.registerPlugin(ScrollTrigger);

export default function ScrollShowcase() {
  const root = useRef(null);
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const stage = root.current.querySelector('.scroll-showcase__stage');
      const copy = root.current.querySelectorAll('.scroll-showcase__copy');
      gsap.to(stage, { rotate: 4, scale: 1.04, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom bottom', scrub: 1 } });
      copy.forEach((node, index) => gsap.fromTo(node, { opacity: .25, y: 30 }, { opacity: 1, y: 0, ease: 'none', scrollTrigger: { trigger: node, start: 'top 75%', end: 'top 42%', scrub: true, onEnter: () => node.dataset.active = 'true', onLeaveBack: () => node.dataset.active = 'false' } }));
    }, root);
    return () => ctx.revert();
  }, []);
  return <section ref={root} className="scroll-showcase" aria-label="Physique product showcase">
    <div className="scroll-showcase__stage"><Suspense fallback={<div className="hub-loading"><div className="spin-ring" /> Loading mirror…</div>}><HumanoidViewer /></Suspense></div>
    <div className="scroll-showcase__story"><div className="scroll-showcase__copy" data-active="true"><span className="eyebrow">01 · Observe</span><h3>See the system, not a number.</h3><p>Your 3D Mirror anchors metrics in a body you can understand.</p></div><div className="scroll-showcase__copy"><span className="eyebrow">02 · Shape</span><h3>Move through the blueprint.</h3><p>Targets and morphology become a visual plan instead of a spreadsheet.</p></div><div className="scroll-showcase__copy"><span className="eyebrow">03 · Evolve</span><h3>Let the timeline tell the truth.</h3><p>History makes progress visible and gives Growthcast real data to learn from.</p></div></div>
  </section>;
}
