// Stable saved IDs; sky appearance is independent of camera, floor and body data.
export const SPACE_SKY_PRESETS = Object.freeze([
  { id: 'orbit', label: 'Orbit', description: 'Stars above a blue planetary horizon.' },
  { id: 'nebula', label: 'Nebula', description: 'Violet and blue clouds among the stars.' },
  { id: 'deep-field', label: 'Deep field', description: 'A dark sky with distant stars and galaxies.' },
  { id: 'aurora', label: 'Aurora', description: 'Still green and violet curtains over a dark horizon.' },
  { id: 'void-studio', label: 'Void studio', description: 'A calm dark gradient with a faint star haze.' },
]);

export function sanitizeSpaceSky(value) {
  return SPACE_SKY_PRESETS.some(preset => preset.id === value) ? value : 'void-studio';
}

// Bake only when the preset or tier changes. All tiers use a static cube map:
// no ongoing noise-shader cost or motion, including under reduced motion.
export function spaceSkyResolution(tier) {
  return tier === 'HIGH' ? 512 : tier === 'LOW' ? 128 : 256;
}
