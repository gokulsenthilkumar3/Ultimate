// Neutral garment bands in the viewer's 1.92-unit stature coordinates. Both
// clothing and the skin's exposure history use these definitions.
export const WARDROBE_COVERAGE = Object.freeze({
  GYM: { torso: [1, 1.65], lower: [.62, .96] },
  CASUAL: { torso: [.90, 1.72], lower: [.14, 1.01] },
  FORMAL: { torso: [.98, 1.70], lower: [.12, 1.04] },
  SWIMWEAR: { lower: [.68, .96] },
  UNDERWEAR: { lower: [.72, .97] },
});

export function garmentCoverage(preset, variant) {
  const base = Object.hasOwn(WARDROBE_COVERAGE, preset) ? WARDROBE_COVERAGE[preset] : null;
  if (!base) return { lower: [-1, -1], torso: [-1, -1], tank: false, sleeves: 0 };
  const lower = preset === 'UNDERWEAR'
    ? ({ briefs: [.83, .97], trunks: [.76, .97], boxerBriefs: [.70, .97] }[variant] || base.lower)
    : preset === 'GYM' ? variant === 'compression' ? [.57, .99] : [.62, .99]
      : preset === 'SWIMWEAR' && variant === 'short' ? [.76, .96] : base.lower;
  const tank = preset === 'GYM' && (!variant || variant === 'tank');
  const sleeves = preset === 'CASUAL' ? variant === 'tee' ? 1 : 2
    : preset === 'FORMAL' ? 2 : preset === 'GYM' && !tank ? 1 : 0;
  return { lower: [...lower], torso: [...(base.torso || [-1, -1])], tank, sleeves };
}
