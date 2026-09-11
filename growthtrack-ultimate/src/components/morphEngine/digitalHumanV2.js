/** Runtime contract for the authored Digital Human v2 asset. */
export const DIGITAL_HUMAN_V2_CONTRACT = Object.freeze({
  version: '2.0',
  requiredParts: Object.freeze(['body', 'eyes', 'cornea', 'tearline', 'teeth', 'gums', 'tongue', 'scalp']),
  minimumBones: 55,
  targetBones: 70,
  minimumMorphTargets: 80,
  lods: Object.freeze(['hero', 'medium', 'mobile']),
});

export function inspectDigitalHumanV2(diagnostics = {}) {
  const parts = new Set((diagnostics.meshNames || []).map((name) => String(name).toLowerCase()));
  const missingParts = DIGITAL_HUMAN_V2_CONTRACT.requiredParts.filter((part) => (
    ![...parts].some((name) => name.includes(part))
  ));
  const boneCount = Number(diagnostics.boneCount || diagnostics.skeleton?.bones?.length || 0);
  const morphTargetCount = Number(diagnostics.morphTargetCount || 0);
  const ready = diagnostics.modelAsset?.version === 'v2'
    && missingParts.length === 0
    && boneCount >= DIGITAL_HUMAN_V2_CONTRACT.minimumBones
    && morphTargetCount >= DIGITAL_HUMAN_V2_CONTRACT.minimumMorphTargets;
  return { ready, missingParts, boneCount, morphTargetCount, contract: DIGITAL_HUMAN_V2_CONTRACT.version };
}

export function measureCalibrationError(actual = {}, target = {}) {
  const errors = Object.entries(target).map(([key, expected]) => {
    const observed = Number(actual[key]);
    const goal = Number(expected);
    return { key, error: Number.isFinite(observed) && Number.isFinite(goal) ? observed - goal : null };
  });
  const finite = errors.filter(({ error }) => error !== null);
  return {
    errors,
    maxAbsError: finite.reduce((max, item) => Math.max(max, Math.abs(item.error)), 0),
    complete: finite.length === Object.keys(target).length,
  };
}
