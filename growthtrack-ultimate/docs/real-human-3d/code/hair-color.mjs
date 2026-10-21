// Hair colour from pigment, the way real hair gets its colour: eumelanin (brown to black) and pheomelanin (red to
// yellow), with grey as a fraction of fibres that have lost pigment. Same Beer-Lambert idea as skin-layers.mjs.
//
//   albedo_c = R0_c * exp(-2 * (sE * kE_c * eumelanin + sP * kP_c * pheomelanin))
//
// One fibre is a thin pigmented cylinder, so the density term plays the role of the thickness times concentration. The
// constants are starting values fitted by random search to typical colours for the named presets (mean colour error about
// 7 CIELAB units, checked in hair-color.check.mjs); step S3 of 08-roadmap.md refines them with reference photographs
// under a neutral light.

export const R0 = Object.freeze([0.884, 0.972, 0.865]);
export const K_EU = Object.freeze([1, (550 / 610) ** -3.33, (465 / 610) ** -3.33]);
export const K_PHEO = Object.freeze([0.122, 0.911, 1.522]);
export const S_EU = 2.316; export const S_PHEO = 0.919;

export const GREY_ALBEDO = Object.freeze([0.72, 0.7, 0.66]);

/** Named natural shades as pigment amounts (0 to 1). */
export const HAIR_PRESETS = Object.freeze({
  black:       { eumelanin: 1.00, pheomelanin: 0.10 },
  darkBrown:   { eumelanin: 0.70, pheomelanin: 0.20 },
  brown:       { eumelanin: 0.48, pheomelanin: 0.25 },
  lightBrown:  { eumelanin: 0.30, pheomelanin: 0.28 },
  auburn:      { eumelanin: 0.32, pheomelanin: 0.70 },
  red:         { eumelanin: 0.14, pheomelanin: 0.95 },
  blonde:      { eumelanin: 0.12, pheomelanin: 0.30 },
  platinum:    { eumelanin: 0.04, pheomelanin: 0.08 },
});

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const toSrgb = (c) => { const x = clamp01(c); return x <= 0.0031308 ? x * 12.92 : 1.055 * x ** (1 / 2.4) - 0.055; };
export const luminance = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** Albedo (linear RGB) of one pigmented fibre. */
export function fibreAlbedo({ eumelanin, pheomelanin }) {
  return [0, 1, 2].map((i) => R0[i] * Math.exp(-2 * (S_EU * K_EU[i] * eumelanin + S_PHEO * K_PHEO[i] * pheomelanin)));
}

/**
 * Hair colour. `grey` is the fraction of fibres that are unpigmented (0 to 1). Returns the mean colour of the head of hair
 * plus the colour of a grey fibre, so the strand shader can pick per fibre with probability `grey` instead of blending
 * (real grey hair is a mix of coloured and white fibres, not a mid-tone).
 */
export function hairColor({ preset = 'brown', eumelanin, pheomelanin, grey = 0, dye = null } = {}) {
  const base = HAIR_PRESETS[preset];
  if (!base && (eumelanin === undefined || pheomelanin === undefined)) throw new RangeError(`unknown hair preset ${preset}`);
  const pigment = { eumelanin: eumelanin ?? base.eumelanin, pheomelanin: pheomelanin ?? base.pheomelanin };
  const fibre = dye ?? fibreAlbedo(pigment);
  const mean = fibre.map((v, i) => v * (1 - clamp01(grey)) + GREY_ALBEDO[i] * clamp01(grey));
  return { fibre, greyFibre: [...GREY_ALBEDO], greyFraction: clamp01(grey), mean, srgb: mean.map(toSrgb), fibreSrgb: fibre.map(toSrgb) };
}

export const toHex = (srgb) => `#${srgb.map((c) => Math.round(clamp01(c) * 255).toString(16).padStart(2, '0')).join('')}`;
