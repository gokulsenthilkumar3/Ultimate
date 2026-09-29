import { useEffect, useState } from 'react';
import useStore from '../store/useStore';

export function resolveAppearance(mode, darkSystem) {
  return ['light', 'dark', 'amoled'].includes(mode) ? mode : darkSystem ? 'dark' : 'light';
}

export default function useDesignPreferences() {
  const preference = useStore(state => state.theme);
  const palette = useStore(state => state.palette);
  const motionPreference = useStore(state => state.reducedMotion);
  const [system, setSystem] = useState(() => ({ dark: window.matchMedia?.('(prefers-color-scheme: dark)').matches || false, reduced: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false }));
  useEffect(() => {
    const dark = window.matchMedia?.('(prefers-color-scheme: dark)');
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const update = () => setSystem({ dark: dark?.matches || false, reduced: reduced?.matches || false });
    dark?.addEventListener('change', update); reduced?.addEventListener('change', update);
    return () => { dark?.removeEventListener('change', update); reduced?.removeEventListener('change', update); };
  }, []);
  const theme = resolveAppearance(preference, system.dark);
  const reducedMotion = motionPreference || system.reduced;
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme; root.dataset.palette = palette; root.dataset.reducedMotion = String(reducedMotion);
    root.style.colorScheme = theme === 'light' ? 'light' : 'dark';
    root.style.backgroundColor = '';
  }, [theme, palette, reducedMotion]);
  return { theme, reducedMotion };
}
