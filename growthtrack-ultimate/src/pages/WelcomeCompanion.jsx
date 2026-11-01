import { createElement, useEffect, useRef, useState } from 'react';
import { Ear, Hand, Smile, Sparkles } from 'lucide-react';
import PersonalCompanionArt from '../components/motion/PersonalCompanionArt';
import { useKinetic } from '../components/motion/KineticContext';
import useSceneMotion from '../hooks/useSceneMotion';
import './welcome-companion.css';

const companionPoses = [
  { id: 'idle', label: 'At ease', Icon: Smile, caption: 'A little backup. Entirely at your pace.' },
  { id: 'greet', label: 'Say hello', Icon: Hand, caption: 'Hello, you. There’s room for you here.' },
  { id: 'listen', label: 'Listen', Icon: Ear, caption: 'A thoughtful moment. No rush at all.' },
  { id: 'celebrate', label: 'Celebrate', Icon: Sparkles, caption: 'A small win? That absolutely counts.' },
];

export default function WelcomeCompanion() {
  const ref = useRef(null);
  const [selection, setSelection] = useState({ id: 'idle', previous: null, take: 0 });
  const { id: poseId, previous, take } = selection;
  const { tier } = useKinetic();
  // Reserve the peak: gesture, two fading poses, breathing, halo and glints.
  const animate = useSceneMotion(ref, { cost: tier === 2 ? 6 : 3, priority: 2, enabled: tier > 0 });
  useEffect(() => {
    if (previous === null) return undefined;
    // A bounded fallback also clears the old pose when CSS motion is interrupted.
    const timeout = setTimeout(() => setSelection(current => current.take === take ? { ...current, previous: null } : current), animate ? 320 : 0);
    return () => clearTimeout(timeout);
  }, [previous, take, animate]);
  const choosePose = id => setSelection(current => ({ id, previous: animate && current.id !== id ? current.id : null, take: current.take + 1 }));
  const pose = companionPoses.find(item => item.id === poseId);
  const note = { idle: ['Today?s plan', 'Make room', 'for you.'], greet: ['A fresh beginning', 'Good things', 'start here.'], listen: ['A moment of calm', 'One breath.', 'One step.'], celebrate: ['Your little victory', 'Look at you.', 'Growing.'] }[poseId];
  return <figure ref={ref} className="welcome-companion" data-state={poseId} data-tier={tier} data-animate={String(animate)} aria-labelledby="welcome-companion-caption">
    <div className="welcome-companion__stage" id="welcome-companion-stage" aria-hidden="true">
      <div className="welcome-companion__entrance"><div className="welcome-companion__diorama">
        <span className="welcome-companion__back-paper" />
        <span className="welcome-companion__arch" />
        <span className="welcome-companion__halo" />
        <svg className="welcome-companion__glints" viewBox="0 0 500 500" fill="none" focusable="false"><path d="M116 123v16m-8-8h16m262 25v12m-6-6h12M365 74v18m-9-9h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><circle cx="153" cy="64" r="2.5" fill="currentColor" /><circle cx="416" cy="215" r="2" fill="currentColor" /></svg>
        <svg className="welcome-companion__doodles" viewBox="0 0 500 500" fill="none" focusable="false"><path d="m406 68 5 15 16 2-12 11 3 16-14-8-14 8 3-16-12-11 16-2 5-15ZM58 176l9 2m-13 11 8-3m-5-25 8 7m320 236 10 4m-5-19 7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M76 79c17-22 43-22 64-11m-4-9 6 11-12 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><path d="M431 272c-30 17-9 52 9 29s-15-40-31-27" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 5" /></svg>
        <span className="welcome-companion__hello">a familiar face,<br /><b>a fresh little world.</b></span>
        <div className="welcome-companion__actor">
          <div key={take} className="welcome-companion__gesture" data-gesture={take > 0 ? poseId : 'rest'}>
            <div className="welcome-companion__pose" data-crossfade={String(animate && previous !== null)}><PersonalCompanionArt state={poseId} motion={false} refined className="welcome-companion__art" /></div>
            {animate && previous !== null && <div className="welcome-companion__outgoing"><PersonalCompanionArt state={previous} motion={false} refined className="welcome-companion__art" /></div>}
          </div>
        </div>
        <span className="welcome-companion__note"><span>Today’s plan</span><strong>Make room<br />for you.</strong><span className="welcome-companion__note-line" /><span className="welcome-companion__note-line" /></span>
        <svg className="welcome-companion__leaf" viewBox="0 0 90 140" fill="none" focusable="false"><path d="M43 132V39m0 27C12 64 8 40 13 26c29 0 35 25 30 40Zm0 32c31-1 40-26 34-42-29 2-37 25-34 42Z" fill="var(--playful-mint)" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M40 42C25 18 41 7 48 7c20 15 11 31-8 35Z" fill="var(--playful-yellow)" stroke="currentColor" strokeWidth="1.5" /></svg>
        <span className="welcome-companion__floor" />
        <span className="welcome-companion__seal"><Sparkles size={13} />small steps, big possibility</span>
      </div></div>
    </div>
    <figcaption className="welcome-companion__caption" id="welcome-companion-caption"><span>YOU, WITH A LITTLE MORE CHARACTER</span><p aria-live="polite" aria-atomic="true">{pose.caption}</p></figcaption>
    <div className="welcome-companion__controls" role="group" aria-label="Choose a companion pose">
      {companionPoses.map(({ id, label, Icon }) => <button key={id} type="button" aria-pressed={poseId === id} aria-controls="welcome-companion-stage" title={poseId === id ? `Replay ${label.toLowerCase()}` : label} onClick={() => choosePose(id)}>{createElement(Icon, { size: 16, 'aria-hidden': true })}<span>{label}</span></button>)}
    </div>
  </figure>;
}

