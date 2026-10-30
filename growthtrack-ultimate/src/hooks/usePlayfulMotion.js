import { useSyncExternalStore } from 'react';
import useStore from '../store/useStore';

// Deliberately session-only: the public playground never saves account preferences.
let paused = false;
const listeners = new Set();
const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
export function setPlayfulMotionPaused(value) {
  paused = Boolean(value);
  listeners.forEach(listener => listener());
}
const getPaused = () => paused;
const getReduced = () => Boolean(globalThis.window?.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
const getHidden = () => globalThis.document?.visibilityState === 'hidden';
const getServerSnapshot = () => false;
function subscribeReduced(listener) {
  const media = globalThis.window?.matchMedia?.('(prefers-reduced-motion: reduce)');
  media?.addEventListener?.('change', listener);
  return () => media?.removeEventListener?.('change', listener);
}
function subscribeVisibility(listener) {
  document.addEventListener('visibilitychange', listener);
  return () => document.removeEventListener('visibilitychange', listener);
}

export default function usePlayfulMotion() {
  const isPaused = useSyncExternalStore(subscribe, getPaused, getServerSnapshot);
  const systemReduced = useSyncExternalStore(subscribeReduced, getReduced, getServerSnapshot);
  const hidden = useSyncExternalStore(subscribeVisibility, getHidden, getServerSnapshot);
  const preferenceReduced = useStore(state => state.reducedMotion);
  const reduced = Boolean(systemReduced || preferenceReduced);
  return {
    paused: isPaused, reduced,
    canAnimate: !isPaused && !reduced && !hidden,
    togglePaused: () => setPlayfulMotionPaused(!paused),
  };
}
