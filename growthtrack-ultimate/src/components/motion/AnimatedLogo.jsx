import { useRef } from 'react';
import useSceneMotion from '../../hooks/useSceneMotion';
import './playful-motion.css';

/** Original smiling sun/sprout mark, shared by public entry and the workspace. */
export default function AnimatedLogo({ className = '' }) {
  const ref = useRef(null);
  const active = useSceneMotion(ref);
  return <svg ref={ref} className={`animated-logo ${className}`} data-animate={String(active)} viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">
    <rect x="6" y="6" width="52" height="52" rx="18" fill="#85d9b8" />
    <g className="animated-logo__sun" stroke="#233d36" strokeWidth="2" strokeLinejoin="round">
      <path d="m32 7 7 7 10-1 1 10 7 8-7 8-1 10-10-1-7 8-7-8-10 1-1-10-7-8 7-8 1-10 10 1Z" fill="#f9ce5b" />
      <circle cx="32" cy="31" r="16" fill="#ff806b" />
      <g className="animated-logo__eyes" strokeWidth="2.5" strokeLinecap="round"><path d="M26 28v3m12-3v3" /></g>
      <path d="M27 37q5 5 10 0" strokeLinecap="round" />
    </g>
    <path d="M45 51c-1-8 4-13 11-12-1 8-5 12-11 12Z" fill="#85d9b8" stroke="#233d36" strokeWidth="2" />
  </svg>;
}
