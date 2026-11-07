import React, { useRef } from 'react';
import useSceneMotion from '../../hooks/useSceneMotion';
import { useKinetic } from './KineticContext';
import './personal-companion-art.css';

const poses = new Set(['idle', 'greet', 'listen', 'celebrate']);
/** Four poses derived from the owner's three references; originals stay outside the app. */
export default function PersonalCompanionArt({ state = 'idle', className = '', compact = false, motion = true }) {
  const ref = useRef(null);
  const { tier } = useKinetic();
  const active = useSceneMotion(ref, { cost: 1, priority: state === 'greet' || state === 'celebrate' ? 6 : 0, enabled: motion && tier > 0 });
  const source = `${import.meta.env.BASE_URL}assets/illustrations/personal-companion${compact ? '-small' : ''}-v4.webp`;
  return <span ref={ref} className={`personal-companion ${className}`.trim()} data-pose={poses.has(state) ? state : 'idle'} data-animate={motion && active} aria-hidden="true">
    <span className="personal-companion__frame"><img className="personal-companion__sprite" src={source} width={compact ? 512 : 1254} height={compact ? 512 : 1254} alt="" decoding="async" draggable="false" /></span>
  </span>;
}
