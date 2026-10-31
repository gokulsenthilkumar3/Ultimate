import { useSyncExternalStore } from 'react';

export const KINETIC_PREFERENCE_KEY = 'growthtrack.presentation.v5';
type Preferences = { style: 'kinetic' | 'playful'; lite: boolean; companion: boolean };
const defaults: Preferences = { style: 'kinetic', lite: false, companion: true };
let cached: Preferences | undefined;
const listeners = new Set<() => void>();
function read(): Preferences {
  if (cached) return cached;
  try {
    const saved = JSON.parse(localStorage.getItem(KINETIC_PREFERENCE_KEY) || '{}');
    cached = { style: saved?.style === 'playful' ? 'playful' : 'kinetic', lite: saved?.lite === true, companion: saved?.companion !== false };
  } catch { cached = defaults; }
  return cached!;
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  const changed = (event: StorageEvent) => { if (event.key === KINETIC_PREFERENCE_KEY || event.key === null) { cached = undefined; listeners.forEach(fn => fn()); } };
  window.addEventListener('storage', changed);
  return () => { listeners.delete(listener); window.removeEventListener('storage', changed); };
}
export function setKineticPreferences(patch: Partial<Preferences>) {
  cached = { ...read(), ...patch };
  try { localStorage.setItem(KINETIC_PREFERENCE_KEY, JSON.stringify(cached)); } catch { /* Session preference remains usable when storage is unavailable. */ }
  listeners.forEach(listener => listener());
}
export default function useKineticPreferences() {
  return useSyncExternalStore(subscribe, read, () => defaults);
}
