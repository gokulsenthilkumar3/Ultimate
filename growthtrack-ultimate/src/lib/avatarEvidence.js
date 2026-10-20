import { getMetricCompleteness } from './bodyMetricFallbacks';

/** @param {{metrics?: object, diagnostics?: any, qualityGate?: import('./rendererQualityGate').QualityGateResult | null}} [options] */
export function buildAvatarEvidence({ metrics = {}, diagnostics = null, qualityGate = null } = {}) {
  const measurements = getMetricCompleteness(metrics);
  const checks = qualityGate?.checks || [];
  const passed = checks.filter(c => c.status === 'pass').length;
  const pending = checks.filter(c => c.status === 'pending').length;
  const assetLabel = !diagnostics ? 'Loading model' : diagnostics.activeRenderer === 'procedural-production'
    ? 'Procedural preview' : diagnostics.health !== 'healthy' ? 'Model needs attention'
      : diagnostics.modelAsset?.version === 'v2' ? 'v2 asset loaded' : diagnostics.modelAsset?.source === 'profile' ? 'Custom asset loaded' : 'Authored asset loaded';
  return {
    measurements, assetLabel,
    // Geometry presence and data completeness cannot measure perceptual likeness.
    humanLikenessPercent: null,
    humanLikenessLabel: 'Not assessed',
    checks: { passed, total: checks.length, pending, percent: checks.length ? Math.round(passed / checks.length * 100) : null },
    missingParts: Array.isArray(diagnostics?.v2?.missingParts) ? diagnostics.v2.missingParts : [],
  };
}
