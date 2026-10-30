import React, { useEffect, useRef, useState } from 'react';
import CharacterScene from '../motion/CharacterScene';
import useSceneMotion from '../../hooks/useSceneMotion';

/** One announced loading state; decorative placeholders stay out of the accessibility tree. */
export default function LoadingSkeleton({ variant = 'workspace' }) {
  const ref = useRef(null);
  const active = useSceneMotion(ref, { priority: 2 });
  const [sleep, setSleep] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setSleep(true), 2000); return () => clearTimeout(timer); }, []);
  const isCommand = ['wellness', 'insights', 'workspace', 'life', 'hub'].includes(variant);
  const label = `Loading ${isCommand ? `${variant} command` : 'your workspace'}`;
  return <div ref={ref} className="fade-in module-page app-loading-skeleton" data-animate={String(active)} data-responsive-foundation role="status" aria-label={label}>
    <span className="gt-foundation-sr-only">{label}</span>
    <div className="app-loading-skeleton__visual" aria-hidden="true">
      <div className="app-loading-skeleton__heading">
        <div className="app-loading-skeleton__heading-lines">
          <span className="skeleton-pulse app-loading-skeleton__line app-loading-skeleton__line--eyebrow" />
          <span className="skeleton-pulse app-loading-skeleton__line app-loading-skeleton__line--title" />
          <span className="skeleton-pulse app-loading-skeleton__line app-loading-skeleton__line--subtitle" />
        </div>
        <div className="app-loading-skeleton__heading-aside app-loading-skeleton__companion"><CharacterScene kind="nova" state={sleep ? 'sleep' : 'idle'} /></div>
      </div>
      {isCommand && <div className="app-loading-skeleton__tabs">{[1, 2, 3, 4, 5].map(item => <span className="skeleton-pulse" key={item} />)}</div>}
      <div className="app-loading-skeleton__cards">
        {[1, 2, 3, 4].map(item => <div key={item} className="app-loading-skeleton__card">
          <span className="skeleton-pulse app-loading-skeleton__card-icon" />
          <span className="skeleton-pulse app-loading-skeleton__line app-loading-skeleton__line--card-label" />
          <span className="skeleton-pulse app-loading-skeleton__line app-loading-skeleton__line--card-value" />
        </div>)}
      </div>
      <div className="app-loading-skeleton__detail-grid">
        <div className="skeleton-pulse app-loading-skeleton__detail" />
        <div className="app-loading-skeleton__detail-stack">
          <div className="skeleton-pulse app-loading-skeleton__detail" />
          <div className="skeleton-pulse app-loading-skeleton__detail app-loading-skeleton__detail--short" />
        </div>
      </div>
    </div>
  </div>;
}
