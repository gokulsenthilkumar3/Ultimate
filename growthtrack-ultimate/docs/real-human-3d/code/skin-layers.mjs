// Layered skin colour: keeps skin tone (constitutive melanin), tan (facultative melanin), blood and carotene as separate
// inputs, then combines them the way the pigments combine in skin, by adding optical densities.
//
// Why separate layers
//   - Skin tone is genetic and is measured on skin the sun never reaches. Tan is UV-induced, reversible, patchy and
//     follows clothing. Both are the same pigment, melanin, so they are separate data (one is the person's, one is
//     their recent sun) but one physical quantity: total melanin = constitutive + facultative.
//   - Redness (haemoglobin) and yellowness (carotene) move colour in directions melanin does not, so they are their own
//     layers. A blush or flush must not change skin tone, and a tan must not change what "skin tone" says.
//
// The model: a two-layer Beer-Lambert reflectance. Light crosses the epidermis (melanin, carotene absorb), is scattered
// by the dermis (haemoglobin absorbs), and crosses the epidermis again.
//
//   albedo_c = R0_c * exp(-sHb * kHb_c * Hb) * exp(-2 * (sMel * kMel_c * (Mc + Mf) + sCar * kCar_c * Car))
//
// kMel follows the published power-law fit for melanin absorption (proportional to wavelength^-3.33). The other
// constants are starting values that put the melanin axis (0 to 1.2) across the ITA range (about +73 to -66 degrees); they are
// calibrated against reference photographs and colorimeter data in step S3 of 08-roadmap.md.
//
// ITA (Individual Typology Angle, Chardon et al. 1991) = atan((L* - 50) / b*) in degrees from CIELAB. Bands:
// above 55 very light, 41-55 light, 28-41 intermediate, 10-28 tan, -30 to 10 brown, below -30 dark.

export const K_MEL = Object.freeze([1, (550 / 610) ** -3.33, (465 / 610) ** -3.33]);
export const K_HB = Object.freeze([0.05, 1, 0.5]);
export const K_CAR = Object.freeze([0, 0.1, 1]);
export const R0 = Object.freeze([0.88, 0.76, 0.62]);
export const S_MEL = 1.3; export const S_HB = 0.9; export const S_CAR = 0.25;

/** Representative ITA for each Fitzpatrick type (the middle of the band most people of that type fall in). */
export const FITZPATRICK_ITA = Object.freeze({ I: 60, II: 48, III: 35, IV: 20, V: -5, VI: -45 });

/** How much tan the skin can make: type I burns and tans little, type VI is already dark. Relative, 0 to 1. */
export const TAN_CAPACITY = Object.freeze({ I: 0.2, II: 0.5, III: 0.85, IV: 1, V: 0.75, VI: 0.35 });

export const TAN_MAX_MELANIN = 0.22;     // melanin a full tan can add to fully exposed skin

/** Skin that is never in the sun and areas that differ from the genetic baseline; Hb scales redness, mel scales pigment. */
export const REGIONS = Object.freeze({
  face:        { exposure: 1.00, hb: 1.35, mel: 1.00 },
  ears:        { exposure: 1.00, hb: 1.60, mel: 1.00 },
  lips:        { exposure: 0.60, hb: 3.20, mel: 0.45 },
  neck:        { exposure: 0.90, hb: 1.10, mel: 1.00 },
  chest:       { exposure: 0.50, hb: 1.05, mel: 1.00 },
  back:        { exposure: 0.45, hb: 1.00, mel: 1.00 },
  abdomen:     { exposure: 0.20, hb: 0.95, mel: 0.97 },
  shoulder:    { exposure: 0.75, hb: 1.00, mel: 1.00 },
  upperArm:    { exposure: 0.70, hb: 1.00, mel: 1.00 },
  inner_arm:   { exposure: 0.15, hb: 1.10, mel: 0.92 },
  forearm:     { exposure: 0.90, hb: 1.00, mel: 1.00 },
  hand_dorsal: { exposure: 1.00, hb: 1.15, mel: 1.05 },
  palm:        { exposure: 0.04, hb: 1.50, mel: 0.45 },
  glutes:      { exposure: 0.10, hb: 1.00, mel: 0.98 },
  thigh:       { exposure: 0.45, hb: 1.00, mel: 1.00 },
  knee:        { exposure: 0.50, hb: 1.25, mel: 1.08 },
  shin:        { exposure: 0.45, hb: 0.95, mel: 1.00 },
  foot_dorsal: { exposure: 0.55, hb: 1.00, mel: 1.00 },
  sole:        { exposure: 0.04, hb: 1.20, mel: 0.50 },
});

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const toSrgb = (c) => { const x = clamp01(c); return x <= 0.0031308 ? x * 12.92 : 1.055 * x ** (1 / 2.4) - 0.055; };

export function linearToLab([r, g, b]) {
  const X = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
  const Y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const Z = 0.0193339 * r + 0.119192 * g + 0.9503041 * b;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  const fx = f(X / 0.95047); const fy = f(Y); const fz = f(Z / 1.08883);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export const ita = ([L, , b]) => (Math.atan2(L - 50, b) * 180) / Math.PI;

export function reflectance({ melanin, hemoglobin, carotene }) {
  return [0, 1, 2].map((i) => R0[i] * Math.exp(-S_HB * K_HB[i] * hemoglobin) * Math.exp(-2 * (S_MEL * K_MEL[i] * melanin + S_CAR * K_CAR[i] * carotene)));
}

export const DEFAULT_BASE = Object.freeze({ hemoglobin: 0.35, carotene: 0.1 });

/** ITA of unexposed skin with the default blood and carotene. Falls as melanin rises. */
export const itaOfMelanin = (melanin, base = DEFAULT_BASE) => ita(linearToLab(reflectance({ melanin, ...base })));

/** The constitutive melanin that gives a requested ITA (bisection; ITA falls monotonically with melanin). */
export function melaninForIta(targetIta, base = DEFAULT_BASE) {
  let lo = 0; let hi = 1.2;
  if (targetIta >= itaOfMelanin(lo, base)) return lo;
  if (targetIta <= itaOfMelanin(hi, base)) return hi;
  for (let i = 0; i < 48; i += 1) { const mid = (lo + hi) / 2; if (itaOfMelanin(mid, base) > targetIta) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}

/**
 * Tan lines. `coverage` is 0 where clothing always covers (swim briefs) and 1 where skin is always bare. A soft edge
 * comes from a blurred coverage mask in the texture, not from this function.
 */
export function exposureOf(region, coverage = 1) {
  const r = REGIONS[region]; if (!r) throw new RangeError(`unknown skin region ${region}`);
  return r.exposure * coverage;
}

/**
 * Colour of one skin region.
 *   tone      Fitzpatrick type 'I'..'VI' or an ITA in degrees: the person's constitutive skin tone
 *   undertone -1 cool/pink ... +1 warm/golden: moves yellow vs red without changing lightness much
 *   tan       0..1 amount of sun-induced pigment on fully exposed skin
 *   coverage  0..1 how bare the region is (tan lines: 0 under clothing)
 *   flush     0..1 extra blood (blush, exercise, heat); burn 0..1 sunburn redness (a transient layer)
 */
export function skinColor({ tone = 'III', undertone = 0, tan = 0, coverage = 1, flush = 0, burn = 0, region = 'forearm', carotene = DEFAULT_BASE.carotene } = {}) {
  const type = typeof tone === 'string' ? tone : (Object.entries(FITZPATRICK_ITA).sort((a, b) => Math.abs(a[1] - tone) - Math.abs(b[1] - tone))[0][0]);
  const toneIta = typeof tone === 'string' ? FITZPATRICK_ITA[tone] : tone;
  if (toneIta === undefined) throw new RangeError(`unknown skin tone ${tone}`);
  const r = REGIONS[region]; if (!r) throw new RangeError(`unknown skin region ${region}`);

  const constitutive = melaninForIta(toneIta) * r.mel;
  const facultative = TAN_MAX_MELANIN * clamp01(tan) * TAN_CAPACITY[type] * exposureOf(region, coverage);
  const hemoglobin = (DEFAULT_BASE.hemoglobin * r.hb + 0.5 * clamp01(flush) + 0.35 * clamp01(burn)) * (1 - 0.18 * undertone);
  const car = carotene * (1 + 0.8 * undertone);

  const linear = reflectance({ melanin: constitutive + facultative, hemoglobin, carotene: Math.max(0, car) });
  const lab = linearToLab(linear);
  return { linear, srgb: linear.map(toSrgb), lab, ita: ita(lab), constitutiveMelanin: constitutive, facultativeMelanin: facultative };
}

export const toHex = (srgb) => `#${srgb.map((c) => Math.round(clamp01(c) * 255).toString(16).padStart(2, '0')).join('')}`;

/** The constants the skin shader needs, generated from this file so the shader and the tested model cannot drift. */
export function glslConstants() {
  const f = (n) => { const t = String(Number(n.toPrecision(6))); return /[.e]/.test(t) ? t : `${t}.0`; };
  const v3 = (a) => `vec3(${a.map(f).join(', ')})`;
  return [
    `const vec3 SKIN_K_MEL = ${v3(K_MEL)};`, `const vec3 SKIN_K_HB = ${v3(K_HB)};`, `const vec3 SKIN_K_CAR = ${v3(K_CAR)};`,
    `const vec3 SKIN_R0 = ${v3(R0)};`, `const float SKIN_S_MEL = ${S_MEL.toFixed(3)};`, `const float SKIN_S_HB = ${S_HB.toFixed(3)};`, `const float SKIN_S_CAR = ${S_CAR.toFixed(3)};`,
  ].join('\n');
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href && process.argv.includes('--glsl')) console.log(glslConstants());
