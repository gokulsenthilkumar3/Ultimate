import React, { useEffect, useRef, useState } from 'react';
import { ROPE_STYLES, stepPendulum } from './companionPhysics';
import { useKinetic } from './KineticContext';
import useSceneMotion from '../../hooks/useSceneMotion';
import PersonalCompanionArt from './PersonalCompanionArt';

export default function SwingCompanion() {
  const root = useRef(null), actor = useRef(null), rope = useRef(null), physics = useRef({ angle: 0, velocity: 0 });
  const drag = useRef(null), [moving, setMoving] = useState(false), [style, setStyle] = useState('linen'), [charm, setCharm] = useState('you');
  const { canAnimate, tier } = useKinetic();
  const admitted = useSceneMotion(root, { cost: 1, priority: 5, enabled: moving && tier > 0 });
  const paint = angle => {
    const x = Math.sin(angle) * 70, y = (1 - Math.cos(angle)) * -70;
    if (actor.current) actor.current.style.transform = `translate(${x}px, ${y}px) rotate(${angle * 180 / Math.PI}deg)`;
    if (rope.current) rope.current.setAttribute('d', `M110 8 Q${110 + x / 2} 45 ${110 + x} ${78 + y}`);
  };
  useEffect(() => {
    if (!admitted || !moving) return undefined;
    let frame = 0, previous = performance.now();
    const advance = now => {
      if (document.hidden) return;
      if (!drag.current) {
        physics.current = stepPendulum(physics.current, (now - previous) / 1000, ROPE_STYLES[style]);
        paint(physics.current.angle);
        if (physics.current.sleeping) { setMoving(false); return; }
      }
      previous = now; frame = requestAnimationFrame(advance);
    };
    const visibility = () => { cancelAnimationFrame(frame); if (!document.hidden) { previous = performance.now(); frame = requestAnimationFrame(advance); } };
    frame = requestAnimationFrame(advance); document.addEventListener('visibilitychange', visibility);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', visibility); };
  }, [admitted, moving, style]);
  useEffect(() => { if (!canAnimate || tier === 0) { physics.current = { angle: 0, velocity: 0 }; paint(0); setMoving(false); } }, [canAnimate, tier]);
  const nudge = () => { if (!canAnimate || tier === 0) return; physics.current = { angle: .6, velocity: 1.1 }; paint(.6); setMoving(true); };
  return <section className="companion-play" ref={root} aria-label="Interactive companion charm" data-physics={moving && admitted ? 'active' : 'rest'}>
    <div className="companion-play__stage"><svg viewBox="0 0 220 200" aria-hidden="true"><path ref={rope} d="M110 8 Q110 45 110 78" fill="none" stroke="currentColor" strokeWidth={style === 'ribbon' ? 4 : 2} strokeDasharray={ROPE_STYLES[style].dash} /></svg>
      <button ref={actor} type="button" className="companion-play__charm" aria-label="Nudge companion charm; drag to swing" onClick={event => { if (event.detail === 0) nudge(); }}
        onPointerDown={event => { if (event.button !== 0) return; event.currentTarget.setPointerCapture(event.pointerId); drag.current = { x: event.clientX, angle: physics.current.angle, last: performance.now(), moved: false }; setMoving(false); }}
        onPointerMove={event => { const held = drag.current; if (!held) return; const now = performance.now(); const angle = Math.max(-1.15, Math.min(1.15, held.angle + (event.clientX - held.x) / 100)); const velocity = (angle - physics.current.angle) / Math.max(.016, (now - held.last) / 1000); physics.current = { angle, velocity: Math.max(-5, Math.min(5, velocity)) }; held.last = now; held.moved = true; paint(angle); }}
        onPointerUp={event => { const held = drag.current; drag.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); if (!held?.moved) nudge(); else if (canAnimate && tier > 0) setMoving(true); else { paint(0); physics.current = { angle: 0, velocity: 0 }; } }}
        onPointerCancel={() => { drag.current = null; physics.current = { angle: 0, velocity: 0 }; paint(0); setMoving(false); }}>
        {charm === 'you' ? <PersonalCompanionArt compact motion={false} state="greet" /> : <svg viewBox="0 0 100 100" aria-hidden="true">{charm === 'cat' ? <><path d="M22 42 20 15 42 29Q50 25 58 29L80 15 78 42Q91 60 78 79Q50 96 22 79Q9 60 22 42Z" fill="var(--gt-character-yellow)" stroke="currentColor" strokeWidth="2" /><path d="M34 56h1m30 0h1M45 68q5 5 10 0" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></> : <><path d="M24 78Q8 30 80 14Q93 78 24 78Z" fill="var(--gt-character-mint)" stroke="currentColor" strokeWidth="2" /><path d="M20 85 65 33M41 61 38 42M52 49 69 51" stroke="currentColor" strokeWidth="2" /></>}</svg>}
      </button>
    </div>
    <div className="companion-play__options"><label>Charm<select aria-label="Charm" value={charm} onChange={event => setCharm(event.target.value)}><option value="you">Your sidekick</option><option value="cat">Cat</option><option value="leaf">Leaf</option></select></label><label>Rope<select aria-label="Rope" value={style} onChange={event => setStyle(event.target.value)}>{Object.entries(ROPE_STYLES).map(([id, rope]) => <option key={id} value={id}>{rope.label}</option>)}</select></label><button type="button" className="btn-secondary" disabled={!canAnimate || tier === 0} onClick={nudge}>Nudge</button></div>
    <p>Drag and release, or use Nudge. Motion stops at rest and pauses when hidden. Reduced-motion mode keeps the charm still.</p>
  </section>;
}
