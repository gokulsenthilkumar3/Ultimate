const ROOT = Object.freeze({
  schemaVersion: 2,
  current: {
    penis: { resting: {}, erect: {}, stretchedRecord: null },
    scrotum: { envelope: {}, leftTestis: {}, rightTestis: {}, presentation: 'relaxed' },
    buttocks: {},
    skinRegions: {},
  },
  goal: {
    penis: { resting: {}, erect: {}, stretchedRecord: null },
    scrotum: { envelope: {}, leftTestis: {}, rightTestis: {}, presentation: 'relaxed' },
    buttocks: {},
    skinRegions: {},
  },
  preferences: { displayUnit: 'cm' },
});

export function createAnatomyCustomization(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return structuredClone(ROOT);
  const copy = structuredClone(ROOT);
  const merge = (target, source) => {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return target;
    for (const [key, item] of Object.entries(source)) {
      if (['__proto__','constructor','prototype'].includes(key)) continue;
      target[key] = item && typeof item === 'object' && !Array.isArray(item)
        ? merge(target[key] && typeof target[key] === 'object' && !Array.isArray(target[key]) ? target[key] : {}, item)
        : item;
    }
    return target;
  };
  return merge(copy, value);
}

export function updateAnatomyPath(value, path, next) {
  const result = createAnatomyCustomization(value);
  let node = result;
  for (const key of path.slice(0, -1)) node = node[key] ||= {};
  node[path[path.length - 1]] = next;
  return result;
}

export const ANATOMY_REGIONS = Object.freeze([
  ['groin', 'Groin'], ['shaft', 'Shaft'], ['glans', 'Glans'], ['scrotum', 'Scrotum'],
  ['perineum', 'Perineum'], ['leftButtock', 'Left buttock'], ['rightButtock', 'Right buttock'],
]);

export const ANATOMY_FIELDS = Object.freeze({
  resting: [
    ['lengthCm', 'Length', 'cm'], ['baseCircumferenceCm', 'Base circumference', 'cm'],
    ['midCircumferenceCm', 'Mid-shaft circumference', 'cm'], ['distalCircumferenceCm', 'Distal circumference', 'cm'],
    ['widthCm', 'Width', 'cm'], ['depthCm', 'Depth', 'cm'],
  ],
  erect: [
    ['lengthCm', 'Length', 'cm'], ['baseCircumferenceCm', 'Base circumference', 'cm'],
    ['midCircumferenceCm', 'Mid-shaft circumference', 'cm'], ['distalCircumferenceCm', 'Distal circumference', 'cm'],
    ['widthCm', 'Width', 'cm'], ['depthCm', 'Depth', 'cm'],
  ],
  scrotum: [
    ['heightCm', 'Sac height', 'cm'], ['widthCm', 'Sac width', 'cm'], ['depthCm', 'Sac depth', 'cm'],
    ['hangCm', 'Hang from root', 'cm'], ['neckWidthCm', 'Neck width', 'cm'],
  ],
  testis: [
    ['lengthCm', 'Length', 'cm'], ['widthCm', 'Width', 'cm'], ['depthCm', 'Depth', 'cm'], ['volumeMl', 'Volume', 'mL'],
  ],
  buttocks: [
    ['hipCircumferenceCm', 'Hip circumference', 'cm'], ['widthCm', 'Buttock width', 'cm'],
    ['heightCm', 'Buttock height', 'cm'], ['projectionCm', 'Rear projection', 'cm'],
    ['volumeMl', 'Model volume', 'mL'],
  ],
});

export function sanitizeAnatomyNumber(value) {
  if (value === '' || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

// Engineering preview guidance, not population or medical limits. Entries
// outside these bands remain editable and are saved exactly as entered.
export const ANATOMY_PREVIEW_RANGES = Object.freeze({
  lengthCm:[3,16], baseCircumferenceCm:[5,14], midCircumferenceCm:[5,14], distalCircumferenceCm:[5,14],
  widthCm:[1,12], depthCm:[1,12], heightCm:[2,15], hangCm:[1,18], neckWidthCm:[1,9], volumeMl:[1,100],
  hipCircumferenceCm:[60,160], pelvicBreadthCm:[20,55], projectionCm:[2,35],
});
export function anatomyPreviewWarning(key,value,section = 'penis') {
  if (value == null || value === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return 'Enter a finite, non-negative number.';
  if(key.endsWith('Cm') && numeric>1000) return 'Value retained. The drawing uses at most 1,000 cm to keep the scene usable.';
  const range = section === 'buttocks' && ['widthCm','heightCm','volumeMl'].includes(key)
    ? ({ widthCm:[20,65],heightCm:[10,45],volumeMl:[100,15000] })[key] : ANATOMY_PREVIEW_RANGES[key];
  if (numeric === 0) return 'Zero is saved; the preview uses a small non-zero dimension to keep the surface visible.';
  return range && (numeric < range[0] || numeric > range[1])
    ? `Outside suggested preview range ${range[0]}–${range[1]} ${key === 'volumeMl' ? 'mL' : 'cm'}. Your value is kept; check units and inspect the shape.` : null;
}
