import { useEffect, useRef, useState } from 'react';
import useSceneMotion from '../../hooks/useSceneMotion';
import { useKinetic } from './KineticContext';
import './procedural-stage.css';

const load = { atlas: () => import('./scenes/livingAtlas'), kite: () => import('./scenes/kiteAgent') };
export default function ProceduralStage({ kind, state = 'idle', compact = false, enabled = true, controller = null, onSceneEvent, onStatusChange, onActiveChange, className = '', children }) {
  const ref = useRef(null), runtime = useRef(null), failed = useRef(false), latest = useRef({ active: false, state });
  const [status, setStatus] = useState('poster');
  const [forcedColors, setForcedColors] = useState(() => window.matchMedia?.('(forced-colors: active)').matches || false);
  const { tier } = useKinetic();
  const active = useSceneMotion(ref, { enabled: enabled && tier > 0 && !forcedColors, cost: kind === 'atlas' ? 3 : 1, priority: compact ? 0 : 2 });
  latest.current = { active, state, controller, onSceneEvent };
  useEffect(() => { onStatusChange?.(status); }, [status, onStatusChange]);
  useEffect(() => {
    const media = window.matchMedia?.('(forced-colors: active)');
    const change = event => setForcedColors(event.matches);
    media?.addEventListener('change', change); return () => media?.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    if (!active || runtime.current || failed.current) return undefined;
    let cancelled = false, idle;
    const start = () => {
      if (cancelled) return;
      setStatus('loading');
      load[kind]().then(module => {
        if (cancelled || !ref.current) return;
        const scene = module.createScene(ref.current, { compact, controller: latest.current.controller, onEvent: event => latest.current.onSceneEvent?.(event), onFailure: () => { runtime.current = null; failed.current = true; setStatus('fallback'); } });
        runtime.current = scene; scene.setState(latest.current.state); scene.setActive(latest.current.active); setStatus('ready');
      }).catch(() => { if (!cancelled) { failed.current = true; setStatus('fallback'); } });
    };
    // Keep first paint independent of the 3D bundle and shader compilation.
    if ('requestIdleCallback' in window) idle = window.requestIdleCallback(start, { timeout: compact ? 1800 : 1000 });
    else idle = window.setTimeout(start, compact ? 600 : 120);
    return () => { cancelled = true; if ('cancelIdleCallback' in window) window.cancelIdleCallback(idle); else clearTimeout(idle); };
  }, [active, kind, compact]);
  useEffect(() => { runtime.current?.setActive(active); onActiveChange?.(active); }, [active, status, onActiveChange]);
  useEffect(() => { runtime.current?.setState(state); }, [state]);
  useEffect(() => () => { runtime.current?.dispose(); runtime.current = null; }, []);
  return <span ref={ref} className={`procedural-stage ${className}`} data-scene={kind} data-renderer={status} data-state={state} data-animate={String(active)} aria-hidden="true">{children}</span>;
}
