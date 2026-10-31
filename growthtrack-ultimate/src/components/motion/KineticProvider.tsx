import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { LazyMotion, MotionConfig } from 'framer-motion';
import useKineticPreferences from '../../hooks/useKineticPreferences';
import usePlayfulMotion from '../../hooks/usePlayfulMotion';
import useQualityTier, { MOTION_LIMITS, tierAfterSample, type QualityTier } from '../../hooks/useQualityTier';
import { KineticContext } from './KineticContext';
import { MotionBudget } from './motionBudget';
import { GlowSprites } from './GlowCrew';
import ConfettiHost from './ConfettiHost';
import SurfaceLight from './SurfaceLight';
import { getActiveDialog, subscribeDialogs } from '../../hooks/useDialogFocus';

const features = () => import('./motionFeatures').then(module => module.default);
export const kineticTelemetry = { fps: null as number | null, longTasks: 0, maxLongTaskMs: 0, downgrades: 0 };

export default function KineticProvider({ children }: { children: ReactNode }) {
  const preference = useKineticPreferences();
  const activeDialog = useSyncExternalStore(subscribeDialogs, getActiveDialog, () => null);
  const { canAnimate, reduced } = usePlayfulMotion();
  const { tier, ceiling, setMeasured } = useQualityTier(preference.lite, reduced);
  const [budget] = useState(() => new MotionBudget(MOTION_LIMITS[tier]));
  const enabled = preference.style === 'kinetic';
  // LazyMotion reads its async loader once. Keep that promise stable so enabling
  // motion later loads features without remounting the user's current form.
  const [featureGate] = useState(() => {
    type Bundle = Awaited<ReturnType<typeof features>>;
    let resolve: (bundle: Bundle) => void = () => {};
    let started = false;
    const promise = new Promise<Bundle>(complete => { resolve = complete; });
    return { load: () => promise, start: () => { if (!started) { started = true; void features().then(resolve).catch(() => resolve({} as Bundle)); } } };
  });
  useEffect(() => { if (enabled && canAnimate && tier > 0) featureGate.start(); }, [enabled, canAnimate, tier, featureGate]);
  useEffect(() => { if (!enabled) void import('../../styles/playful-legacy.css').catch(() => {}); }, [enabled]);
  const value = useMemo(() => ({ enabled, canAnimate, tier, budget, activeDialog }), [enabled, canAnimate, tier, budget, activeDialog]);
  useEffect(() => {
    budget.setLimit(enabled && canAnimate ? MOTION_LIMITS[tier] : 0);
    const root = document.documentElement;
    root.dataset.motionTier = String(tier); root.dataset.playfulMotion = String(canAnimate); root.dataset.kineticMotion = String(enabled && canAnimate);
    const update = () => { root.dataset.animationCount = String(budget.active); root.dataset.animationLimit = String(budget.limit); };
    update(); return budget.subscribe(update);
  }, [budget, tier, canAnimate, enabled]);
  useEffect(() => {
    if (!enabled || !canAnimate) return;
    let frame = 0, timer: ReturnType<typeof setTimeout>, disposed = false, stableSince = 0;
    // Two-second samples with an eight-second rest. Never sample a hidden document or idle page.
    const sample = () => {
      if (disposed) return;
      if (!budget.active || document.hidden) { timer = setTimeout(sample, 8000); return; }
      let start = 0, frames = 0;
      const tick = (now: number) => {
        if (disposed || document.hidden) return;
        if (!start) start = now;
        frames++;
        if (now - start < 2000) { frame = requestAnimationFrame(tick); return; }
        const fps = (frames - 1) * 1000 / (now - start);
        kineticTelemetry.fps = Math.round(fps);
        document.documentElement.dataset.motionFps = String(kineticTelemetry.fps);
        const next = tierAfterSample(tier, fps);
        if (next < tier) { kineticTelemetry.downgrades++; stableSince = 0; setMeasured(next); }
        else if (fps >= 57) {
          stableSince ||= now;
          if (now - stableSince >= 60000 && tier < ceiling) { setMeasured(Math.min(ceiling, tier + 1) as QualityTier); stableSince = 0; }
        } else stableSince = 0;
        timer = setTimeout(sample, 8000);
      };
      frame = requestAnimationFrame(tick);
    };
    timer = setTimeout(sample, 1200);
    return () => { disposed = true; cancelAnimationFrame(frame); clearTimeout(timer); };
  }, [enabled, canAnimate, tier, ceiling, budget, setMeasured]);
  useEffect(() => {
    if (typeof PerformanceObserver !== 'function' || !PerformanceObserver.supportedEntryTypes?.includes('longtask')) return;
    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) if (entry.duration > 50) { kineticTelemetry.longTasks++; kineticTelemetry.maxLongTaskMs = Math.max(kineticTelemetry.maxLongTaskMs, entry.duration); }
    });
    observer.observe({ type: 'longtask', buffered: true });
    return () => observer.disconnect();
  }, []);
  return <KineticContext.Provider value={value}><MotionConfig reducedMotion={reduced || !canAnimate || tier === 0 ? 'always' : 'never'} transition={{ type: 'spring', stiffness: 500, damping: 34, mass: .8 }}><LazyMotion features={featureGate.load} strict>{enabled && <GlowSprites />}{children}<SurfaceLight /><ConfettiHost /></LazyMotion></MotionConfig></KineticContext.Provider>;
}
