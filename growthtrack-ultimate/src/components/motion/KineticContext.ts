import { createContext, useContext, useEffect, useId, useSyncExternalStore } from 'react';
import type { QualityTier } from '../../hooks/useQualityTier';
import type { MotionBudget } from './motionBudget';

export const KineticContext = createContext<{ enabled: boolean; canAnimate: boolean; tier: QualityTier; budget: MotionBudget | null; activeDialog?: HTMLElement | null }>({ enabled: false, canAnimate: false, tier: 0, budget: null, activeDialog: null });
export const useKinetic = () => useContext(KineticContext);
const subscribe = () => () => {};
const snapshot = () => 0;
export function useMotionSlot(active: boolean, cost = 1, priority = 0) {
  const { budget, enabled } = useKinetic();
  const id = useId();
  useSyncExternalStore(budget?.subscribe || subscribe, budget?.snapshot || snapshot, snapshot);
  useEffect(() => {
    if (!active || !enabled || !budget) return;
    budget.request(id, cost, priority);
    return () => budget.release(id);
  }, [active, enabled, budget, id, cost, priority]);
  return active && (!enabled || !budget || budget.has(id, cost));
}
