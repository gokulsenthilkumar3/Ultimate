import { getMetricCompleteness } from './bodyMetricFallbacks';
import { HUMAN_SURFACE } from './humanSurface';

/** @param {{metrics?: object, diagnostics?: any, qualityGate?: import('./rendererQualityGate').QualityGateResult | null}} [options] */
export function buildAvatarEvidence({ metrics = {}, diagnostics = null, qualityGate = null } = {}) {
  const measurements = getMetricCompleteness(metrics);
  const checks = qualityGate?.checks || [];
  const passed = checks.filter(c => c.status === 'pass').length;
  const pending = checks.filter(c => c.status === 'pending').length;
  const filename = String(diagnostics?.modelAsset?.path || '').split(/[\\/]/).pop().split('?')[0];
  const bundledMetadata = diagnostics?.modelAsset?.isBundled ? HUMAN_SURFACE.assetMetadata[filename] : null;
  const procedural = diagnostics?.activeRenderer === 'procedural-production';
  const healthy = Boolean(diagnostics?.health === 'healthy' && !procedural);
  const digitGroups = healthy && Array.isArray(diagnostics?.capabilities?.digitGroups) ? diagnostics.capabilities.digitGroups : [];
  const surfaceParts = healthy && Array.isArray(diagnostics?.capabilities?.surfaceParts) ? diagnostics.capabilities.surfaceParts : [];
  const capabilities = {
    handsAndToes: ['leftHand','rightHand','leftFoot','rightFoot'].every(group => digitGroups.includes(group)),
    eyeLayers: ['cornea','tearline'].every(part => surfaceParts.includes(part)),
    nails: surfaceParts.includes('nails'),
  };
  const assetLabel = !diagnostics ? 'Loading model' : diagnostics.activeRenderer === 'procedural-production'
    ? 'Procedural preview' : diagnostics.health !== 'healthy' ? 'Model needs attention'
      : diagnostics.modelAsset?.nativeFamily ? 'Human realism preview'
      : bundledMetadata ? `${bundledMetadata.label} · ${bundledMetadata.textureLabel}`
        : diagnostics.modelAsset?.source === 'profile' ? 'Custom model preview' : 'Authored model preview';
  return {
    measurements, assetLabel, capabilities,
    // Geometry presence and data completeness cannot measure perceptual likeness.
    humanLikenessPercent: null,
    humanLikenessLabel: 'Not assessed',
    checks: { passed, total: checks.length, pending, percent: checks.length ? Math.round(passed / checks.length * 100) : null },
    missingParts: Array.isArray(diagnostics?.v2?.missingParts) ? diagnostics.v2.missingParts : [],
  };
}
