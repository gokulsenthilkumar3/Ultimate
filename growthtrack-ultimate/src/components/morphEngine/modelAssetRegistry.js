const base = import.meta.env.BASE_URL;

const DEFAULT_ASSETS = Object.freeze({
  production: `${base}assets/models/humanoid-base.glb`,
  lite: `${base}assets/models/humanoid-base-lite.glb`,
});

// v2 assets are opt-in until the authored topology and calibration gates pass.
// Keeping them in the same registry lets the viewer promote an asset without
// changing camera, morph, comparison, or persistence code.
const V2_ASSETS = Object.freeze({
  male: import.meta.env.VITE_HUMANOID_V2_MALE_MODEL || '',
  female: import.meta.env.VITE_HUMANOID_V2_FEMALE_MODEL || '',
  neutral: import.meta.env.VITE_HUMANOID_V2_NEUTRAL_MODEL || '',
  mobile: import.meta.env.VITE_HUMANOID_V2_MOBILE_MODEL || '',
});

const configuredAssets = Object.freeze({
  male: import.meta.env.VITE_HUMANOID_MALE_MODEL || DEFAULT_ASSETS.production,
  female: import.meta.env.VITE_HUMANOID_FEMALE_MODEL || DEFAULT_ASSETS.production,
  neutral: import.meta.env.VITE_HUMANOID_NEUTRAL_MODEL || DEFAULT_ASSETS.production,
});

const normalizePreset = (value) => {
  const preset = String(value || '').trim().toLowerCase();
  if (['male', 'man', 'm'].includes(preset)) return 'male';
  if (['female', 'woman', 'f'].includes(preset)) return 'female';
  return 'neutral';
};

function safeAvatarAsset(value) {
  if (!value || typeof value !== 'string') return null;
  const candidate = value.trim().replaceAll('\\', '/');
  if (!candidate || candidate.includes('..') || /^(?:https?:)?\/\//i.test(candidate)) return null;
  if (!/^[a-z0-9/_\-.]+\.glb$/i.test(candidate)) return null;
  if (candidate.startsWith(base)) return candidate;
  if (candidate.startsWith('/')) return candidate;
  if (candidate.startsWith('assets/models/')) return `${base}${candidate}`;
  if (!candidate.includes('/')) return `${base}assets/models/${candidate}`;
  return null;
}

/** Resolve a DB-backed avatar choice to a same-origin GLB. */
export function resolveModelAsset(preference = {}, gpuTier = 'HIGH') {
  const preset = normalizePreset(
    preference.modelPreset === 'auto'
      ? preference.biologicalSex
      : preference.modelPreset || preference.biologicalSex,
  );
  const customAsset = safeAvatarAsset(preference.avatarAsset);
  const configuredAsset = configuredAssets[preset] || configuredAssets.neutral;
  const configuredV2 = safeAvatarAsset(V2_ASSETS[preset]);
  const configuredV2Mobile = safeAvatarAsset(V2_ASSETS.mobile);
  const preferV2 = preference.modelVersion === 'v2' || preference.preferV2 === true;
  const selectedV2 = preferV2 && (gpuTier === 'LOW' ? configuredV2Mobile || configuredV2 : configuredV2);
  const useLiteDefault = gpuTier === 'LOW' && !customAsset && configuredAsset === DEFAULT_ASSETS.production;
  return {
    path: customAsset || selectedV2 || (useLiteDefault ? DEFAULT_ASSETS.lite : configuredAsset),
    preset,
    version: customAsset ? 'profile' : selectedV2 ? 'v2' : 'legacy',
    source: customAsset ? 'profile' : selectedV2 ? 'environment-v2' : configuredAsset !== DEFAULT_ASSETS.production ? 'environment' : 'default',
    isVariantReady: Boolean(customAsset || selectedV2 || configuredAsset !== DEFAULT_ASSETS.production),
    v2Ready: Boolean(selectedV2),
  };
}

export { DEFAULT_ASSETS, V2_ASSETS };
