import { HEAD_FEATURES, HEAD_FEATURE_REGISTRY_VERSION } from '../../lib/headFeatureRegistry.js';

const EXPRESSIONS = ['blink', 'smile', 'jaw_open'];

/** A target name alone cannot enable a control: a placeholder may contain
 * only zeroes. This inspection runs once on clone-owned, prepared geometry.
 * Displacement support is an engineering capability, not likeness validation. */
export function inspectHeadCapabilities(body) {
  const geometry = body?.geometry, base = geometry?.attributes?.position;
  const hasDisplacement = name => {
    const index = body?.morphTargetDictionary?.[name];
    const target = geometry?.morphAttributes?.position?.[index];
    if (!base || !target || target.count !== base.count || target.itemSize !== 3) return false;
    let moved = false;
    for (let i = 0; i < target.count; i++) {
      for (let axis = 0; axis < 3; axis++) {
        const value = target.getComponent(i, axis);
        if (!Number.isFinite(value)) return false;
        const delta = value - (geometry.morphTargetsRelative ? 0 : base.getComponent(i, axis));
        if (!Number.isFinite(delta)) return false;
        if (Math.abs(delta) > 1e-9) moved = true;
      }
    }
    return moved;
  };
  return {
    registryVersion: HEAD_FEATURE_REGISTRY_VERSION,
    shapeTargets: HEAD_FEATURES.map(feature => feature.key).filter(hasDisplacement),
    expressionTargets: EXPRESSIONS.filter(hasDisplacement),
    oralAssembly: body?.userData?.faceCorrective ? 'differentiated-procedural' : null,
    calibration: 'artistic',
    verification: 'finite-nonzero-displacement',
  };
}
