import { useEffect, useState } from 'react';

export type QualityTier = 0 | 1 | 2;
export const MOTION_LIMITS = [3, 6, 12] as const;
export function detectQualityTier({ cores = 4, memory = 8, saveData = false }: { cores?: number; memory?: number; saveData?: boolean } = {}): QualityTier {
  if (saveData || cores <= 4 || memory <= 4) return 0;
  return cores >= 8 && memory >= 16 ? 2 : 1;
}
export function tierAfterSample(tier: QualityTier, fps: number): QualityTier {
  return Number.isFinite(fps) && fps > 0 && fps < 50 ? Math.max(0, tier - 1) as QualityTier : tier;
}
export default function useQualityTier(lite: boolean, reduced: boolean) {
  const hardware = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean }; getBattery?: () => Promise<EventTarget & { charging: boolean; level: number }> };
  const ceiling = detectQualityTier({ cores: hardware.hardwareConcurrency, memory: hardware.deviceMemory, saveData: hardware.connection?.saveData });
  const [measured, setMeasured] = useState<QualityTier>(ceiling);
  const [lowBattery, setLowBattery] = useState(false);
  useEffect(() => {
    let disposed = false, detach = () => {};
    hardware.getBattery?.().then(battery => {
      if (disposed) return;
      const update = () => setLowBattery(!battery.charging && battery.level <= .2);
      update(); battery.addEventListener('levelchange', update); battery.addEventListener('chargingchange', update);
      detach = () => { battery.removeEventListener('levelchange', update); battery.removeEventListener('chargingchange', update); };
    }).catch(() => {});
    return () => { disposed = true; detach(); };
  }, []);
  return { tier: lite || reduced || lowBattery ? 0 as QualityTier : Math.min(ceiling, measured) as QualityTier, ceiling, setMeasured };
}
