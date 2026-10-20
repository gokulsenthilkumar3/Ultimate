const base = import.meta.env.BASE_URL;

const DEFAULT_ASSETS = Object.freeze({
  production: `${base}assets/models/humanoid-adult-v2.glb`,
  lite: `${base}assets/models/humanoid-adult-v2-lite.glb`,
});
const LEGACY_ASSETS = Object.freeze({
  production: `${base}assets/models/humanoid-base.glb`,
  lite: `${base}assets/models/humanoid-base-lite.glb`,
});

// External anatomy carried by the assessed full/lite pairs. They contain the
// male procedural surface (see docs/ANATOMY_ASSET_PLAN.md). Other assets declare
// `anatomySex` in its PrivateAnatomy node extras or it stays covered.
const DEFAULT_ANATOMY_SEX = 'male';

// Alternate authored assets remain opt-in. The bundled adult-v2 pair is an
// attachment-binding upgrade of the assessed base, not an authored sculpt.
const V2_ASSETS = Object.freeze({
  male: import.meta.env.VITE_HUMANOID_V2_MALE_MODEL || '',
  female: import.meta.env.VITE_HUMANOID_V2_FEMALE_MODEL || '',
  neutral: import.meta.env.VITE_HUMANOID_V2_NEUTRAL_MODEL || '',
  mobile: import.meta.env.VITE_HUMANOID_V2_MOBILE_MODEL || '',
});

const configuredAssets = Object.freeze({
  male: import.meta.env.VITE_HUMANOID_MALE_MODEL || DEFAULT_ASSETS.production,
  // No assessed female anatomy sculpt exists. Preserve the covered fallback;
  // a male attachment upgrade must not masquerade as a female body variant.
  female: import.meta.env.VITE_HUMANOID_FEMALE_MODEL || LEGACY_ASSETS.production,
  neutral: import.meta.env.VITE_HUMANOID_NEUTRAL_MODEL || LEGACY_ASSETS.production,
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
export function resolveModelAsset(preference = {}, gpuTier = 'MED') {
  const preset = normalizePreset(
    preference.modelPreset === 'auto'
      ? preference.biologicalSex
      : preference.modelPreset || preference.biologicalSex,
  );
  const customAsset = safeAvatarAsset(preference.avatarAsset);
  const defaultAsset = configuredAssets[preset] || configuredAssets.neutral;
  const configuredAsset = preference.modelVersion === 'legacy' && defaultAsset === DEFAULT_ASSETS.production ? LEGACY_ASSETS.production : defaultAsset;
  const configuredV2 = safeAvatarAsset(V2_ASSETS[preset]);
  const configuredV2Mobile = safeAvatarAsset(V2_ASSETS.mobile);
  const preferV2 = preference.modelVersion === 'v2' || preference.preferV2 === true;
  const selectedV2 = preferV2 && (gpuTier === 'HIGH' ? configuredV2 : configuredV2Mobile || configuredV2);
  const isDefault=[DEFAULT_ASSETS.production,LEGACY_ASSETS.production].includes(configuredAsset);
  const liteAsset=configuredAsset===DEFAULT_ASSETS.production?DEFAULT_ASSETS.lite:LEGACY_ASSETS.lite;
  const useLiteDefault = gpuTier !== 'HIGH' && !customAsset && isDefault;
  const path = customAsset || selectedV2 || (useLiteDefault ? liteAsset : configuredAsset);
  const upgradedDefault=!customAsset && !selectedV2 && [DEFAULT_ASSETS.production,DEFAULT_ASSETS.lite].includes(path);
  return {
    path,
    anatomySex: [...Object.values(DEFAULT_ASSETS),...Object.values(LEGACY_ASSETS)].includes(path) ? DEFAULT_ANATOMY_SEX : null,
    preset,
    version: customAsset ? 'profile' : selectedV2 || upgradedDefault ? 'v2' : 'legacy',
    source: customAsset ? 'profile' : selectedV2 ? 'environment-v2' : !isDefault ? 'environment' : 'default',
    isVariantReady: Boolean(customAsset || selectedV2 || upgradedDefault || !isDefault),
    v2Ready: Boolean(selectedV2 || upgradedDefault),
  };
}

export { DEFAULT_ASSETS, LEGACY_ASSETS, V2_ASSETS };
