import config from '../config/appearanceDetail.json';

export const APPEARANCE_DETAIL = config;
export const numberInRange = (value, min, max, fallback) => {
  if (value == null || value === '' || typeof value === 'boolean' || typeof value === 'object') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
};
export const appearanceSeed = value => Math.round(numberInRange(value, config.seed.min, config.seed.max, config.seed.min));

export function resolveHairDetail(metrics = {}) {
  const defaults = config.hair.defaults;
  return {
    ...Object.fromEntries(config.hair.controls.map(control => [control.property,
      numberInRange(metrics[control.key], control.min, control.max, defaults[control.property])])),
    seed: appearanceSeed(metrics.hairSeed ?? defaults.seed),
  };
}

export function resolveFreckles(metrics = {}) {
  const result = {};
  for (const control of config.freckles.controls) {
    result[control.property] = numberInRange(metrics[control.key], control.min, control.max, config.freckles.defaults[control.property]);
  }
  return { ...result, seed: appearanceSeed(metrics.skinFreckleSeed ?? config.freckles.defaults.seed) };
}

/** Integer hashing is mirrored in GLSL. No time, device ID or random render state. */
export function appearanceHash(x, y, seed) {
  let hash = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041)) >>> 0;
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177) >>> 0;
  return (hash ^ (hash >>> 16)) >>> 0;
}

export function freckleCell(x, y, seed) {
  const hash = appearanceHash(x, y, appearanceSeed(seed));
  return { selected: (hash & 65535) / 65536, x: ((hash >>> 12) & 1023) / 1024, y: ((hash >>> 22) & 1023) / 1024 };
}

export const APPEARANCE_HASH_GLSL = `
  uint appearanceHash(ivec2 cell, uint seed) {
    uint h=uint(cell.x)*374761393u+uint(cell.y)*668265263u+seed*1442695041u;
    h=(h^(h>>13u))*1274126177u;
    return h^(h>>16u);
  }
`;
