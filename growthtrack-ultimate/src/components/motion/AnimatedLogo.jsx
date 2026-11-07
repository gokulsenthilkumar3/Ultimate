import { useRef } from 'react';
import useSceneMotion from '../../hooks/useSceneMotion';
import './playful-motion.css';

/** The growing orbit: one original mark shared with the favicon and installer. */
export default function AnimatedLogo({ className = '' }) {
  const ref = useRef(null);
  const active = useSceneMotion(ref);
  return <svg ref={ref} className={`animated-logo ${className}`} data-animate={String(active)} viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">
    <image href={`${import.meta.env.BASE_URL}favicon.svg`} width="64" height="64" />
  </svg>;
}
