import React, { useRef } from 'react';
import { Pause, Play } from 'lucide-react';
import usePlayfulMotion from '../../hooks/usePlayfulMotion';
import useSceneMotion from '../../hooks/useSceneMotion';
import CharacterArt from './CharacterArt';
import { useKinetic } from './KineticContext';
import { useCrewState } from './GlowCrew';
import './playful-motion.css';

export function MotionToggle({ compact = false }) {
  const { paused, reduced, togglePaused } = usePlayfulMotion();
  const label = reduced ? 'Reduced motion is on' : paused ? 'Play motion' : 'Pause motion';
  const Icon = paused || reduced ? Play : Pause;
  return <button type="button" className={`playful-motion-toggle${compact ? ' playful-motion-toggle--compact' : ''}`} onClick={togglePaused} disabled={reduced} aria-label={label} title={label}>
    <Icon size={15} aria-hidden="true" />{!compact && <span>{label}</span>}
  </button>;
}

/** The observer stops even CSS idle loops when a scene leaves the viewport. */
export default function CharacterScene({ kind = 'crew', happy = false, eyesClosed = false, className = '', state: requestedState = undefined }) {
  const ref = useRef(null);
  const { enabled, tier } = useKinetic();
  const state = useCrewState(requestedState || (eyesClosed ? 'listen' : happy ? 'celebrate' : 'idle'));
  const count = kind === 'crew' ? 4 : 1;
  const feedback = ['snip', 'celebrate', 'oops'].includes(state);
  const blink = !feedback && (kind !== 'crew' || tier === 2);
  const tracks = tier === 0 ? kind === 'crew' ? 0 : 1 : kind === 'crew' && tier === 1 ? 4 : count * (1 + Number(blink) + Number(state === 'greet'));
  const active = useSceneMotion(ref, { cost: tracks, priority: feedback ? 6 : 0 });
  const props = { happy, eyesClosed, state, blink };
  return <div ref={ref} className={`character-scene character-scene--${kind} ${className}`} data-animate={String(active)} data-tier={tier} data-state={state} data-happy={String(happy)} aria-hidden="true">
    {kind === 'crew' ? <>
      <svg className="character-scene__doodles" viewBox="0 0 600 530" fill="none" focusable="false">
        <circle cx="319" cy="256" r="201" stroke="currentColor" strokeDasharray="4 11" />
        <path d="M52 217c-24-28-14-50 9-38 18 9-24 50-31 53m469 175c54-21 59-61 26-67-28-6-12 55 31 43" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="m477 66 7 17 18 3-14 12 2 19-16-10-18 8 5-18-12-14 19-1Z" fill="#f9ce5b" stroke="#233d36" strokeWidth="2" />
        <path d="m80 392 3-14m-10 7h14m396-164 3-14m-10 7h14" stroke="#233d36" strokeWidth="3" strokeLinecap="round" />
        <path d="M81 101c13-33 51-44 82-35m-5-7 8 8-11 5" stroke="#233d36" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="character-scene__caption">YOUR NEXT CHAPTER STARTS SMALL</span>
      <div className="character-scene__paper"><span>Today’s plan</span><strong>Make space<br />for the good.</strong><span className="character-scene__paper-line" /><span className="character-scene__paper-line" /></div>
      <div className="character-scene__actor character-scene__actor--siren" data-character><CharacterArt kind="siren" {...props} /></div>
      <div className="character-scene__actor character-scene__actor--snip" data-character><CharacterArt kind="snip" {...props} /></div>
      <div className="character-scene__actor character-scene__actor--sunny" data-character><CharacterArt kind="sunny" {...props} /></div>
      {enabled && <div className="character-scene__actor character-scene__actor--nova" data-character><CharacterArt kind="nova" {...props} /></div>}
      <span className="character-scene__sticker">less noise,<br /><b>more you.</b></span>
      <span className="character-scene__footnote">a little nudge. a fresh start.</span>
    </> : <div className="character-scene__solo" data-character><CharacterArt kind={kind} {...props} /></div>}
  </div>;
}

/** Kinetic keeps one visible motion control, in the header; an in-page copy overlaps the art. Playful keeps it. */
export function OverviewCompanion({ kind = 'siren', toggle }) {
  const { enabled } = useKinetic();
  return <div className={`overview-companion overview-companion--${kind}`}>
    <CharacterScene kind={kind} />
    {(toggle ?? !enabled) && <MotionToggle compact />}
  </div>;
}
