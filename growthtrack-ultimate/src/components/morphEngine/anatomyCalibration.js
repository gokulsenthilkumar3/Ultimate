// Centimetre calibration for the external-anatomy size controls.
//
// Owners enter resting (flaccid) length and mid-shaft circumference in cm.
// Reference ranges come from Veale D. et al. (2015), "Am I normal? A
// systematic review and construction of nomograms for flaccid and erect penis
// length and circumference in up to 15,521 men", BJU International 115(6).
//
// The anatomy in humanoid-base(.lite).glb is built so its morph range equals
// its original two-channel range (see anatomyCalibration.test.js). These
// legacy weights remain bounded. anatomyDeformation.js draws independent
// sections and out-of-band dimensions on assets declaring a section layout.
// Source values are retained; this band is advisory, not an entry restriction.

export const ANATOMY_REFERENCE = Object.freeze({
  citation: 'Veale et al. (2015), BJU International 115(6)',
  state: 'resting (flaccid)',
  anatomyLengthCm: Object.freeze({ meanCm: 9.16, sdCm: 1.57 }),
  anatomyGirthCm: Object.freeze({ meanCm: 9.31, sdCm: 0.9 }),
});

export const ANATOMY_CALIBRATION_VERSION = 'procedural-private-v1';

// Legacy asset-channel reference bands; not universal human limits.
export const ANATOMY_INPUT_RANGES = Object.freeze({
  anatomyLengthCm: Object.freeze({ min: 3, max: 16 }),
  anatomyGirthCm: Object.freeze({ min: 5, max: 14 }),
});

const round1 = value => Math.round(value * 10) / 10;

/** The central ~95% band (mean ± 2 SD) shown to the owner as context. */
export function typicalRange(key) {
  const reference = ANATOMY_REFERENCE[key];
  return reference ? { min: round1(reference.meanCm - 2 * reference.sdCm), max: round1(reference.meanCm + 2 * reference.sdCm) } : null;
}

// Measured from GrowthTrackPrivateAnatomy in both shipped GLBs (model units).
// Length runs along the centreline from the skin junction to the tip;
// circumference is the mid-shaft ring (layout in the mesh extras).
export const PLACEHOLDER_GEOMETRY = Object.freeze({
  bodyHeightUnits: 1.7304,
  lengthRestUnits: 0.02966,
  lengthDeltaUnits: 0.12854,
  circumferenceRestUnits: 0.04944,
  circumferenceDeltaUnits: 0.08899,
});

// The viewer fits the body to this stature, then stretches it vertically by the
// owner's height scale; circumferences are not stretched (computeHeightScale).
export const CALIBRATION_REFERENCE_HEIGHT_CM = 175;

const INCH_CM = 2.54;
const finite = value => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

/** Centimetre values from current keys, or converted from the retired inch
    fields (d_length / d_size / d_girth) of older profiles. */
export function resolveAnatomyCm(metrics = {}) {
  const lengthCm = finite(metrics.anatomyLengthCm);
  const girthCm = finite(metrics.anatomyGirthCm);
  const legacyLength = finite(metrics.d_length ?? metrics.d_size);
  const legacyGirth = finite(metrics.d_girth);
  return {
    lengthCm: lengthCm ?? (legacyLength == null ? null : round1(legacyLength * INCH_CM)),
    girthCm: girthCm ?? (legacyGirth == null ? null : round1(legacyGirth * INCH_CM)),
    convertedFromInches: (lengthCm == null && legacyLength != null) || (girthCm == null && legacyGirth != null),
  };
}

/** The sizes this asset can draw for a given height scale. */
export function displayLimits(heightScale = 1, geometry = PLACEHOLDER_GEOMETRY) {
  const toLengthCm = units => round1(units * (CALIBRATION_REFERENCE_HEIGHT_CM * heightScale) / geometry.bodyHeightUnits);
  const toGirthCm = units => round1(units * CALIBRATION_REFERENCE_HEIGHT_CM / geometry.bodyHeightUnits);
  return {
    anatomyLengthCm: { min: toLengthCm(geometry.lengthRestUnits), max: toLengthCm(geometry.lengthRestUnits + geometry.lengthDeltaUnits) },
    anatomyGirthCm: { min: toGirthCm(geometry.circumferenceRestUnits), max: toGirthCm(geometry.circumferenceRestUnits + geometry.circumferenceDeltaUnits) },
  };
}

function weightFor(valueCm, limits, fallbackCm = null) {
  if (valueCm == null) return { weight: fallbackCm == null ? 0 : weightFor(fallbackCm, limits).weight, clamped: null };
  const raw = (valueCm - limits.min) / (limits.max - limits.min);
  return { weight: Math.min(1, Math.max(0, raw)), clamped: raw < 0 ? 'below' : raw > 1 ? 'above' : null };
}

/** Morph weights that draw the entered centimetres as closely as the asset
    allows; a value that is not set is drawn at the population mean. */
export function anatomyMorphWeights(metrics = {}, { heightScale = 1, geometry = PLACEHOLDER_GEOMETRY } = {}) {
  const { lengthCm, girthCm } = resolveAnatomyCm(metrics);
  const limits = displayLimits(heightScale, geometry);
  const length = weightFor(lengthCm, limits.anatomyLengthCm, ANATOMY_REFERENCE.anatomyLengthCm.meanCm);
  const girth = weightFor(girthCm, limits.anatomyGirthCm, ANATOMY_REFERENCE.anatomyGirthCm.meanCm);
  return { d_length: length.weight, d_girth: girth.weight, clamped: { anatomyLengthCm: length.clamped, anatomyGirthCm: girth.clamped }, limits };
}
