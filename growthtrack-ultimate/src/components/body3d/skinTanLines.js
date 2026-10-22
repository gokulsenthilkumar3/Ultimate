import { Vector2 } from 'three';
import { garmentCoverage } from '../../lib/wardrobeCoverage';

// A saved history of sun coverage, independent of the outfit displayed today.
// These are smooth regional approximations, not UV masks of authored seams.
export const TAN_LINE_PATTERNS = Object.freeze([
  { id: 'none', label: 'No clothing pattern' },
  { id: 'swim', label: 'Swim shorts', preset: 'SWIMWEAR', variant: 'board' },
  { id: 'tank', label: 'Tank & shorts', preset: 'GYM', variant: 'tank' },
  { id: 'tee', label: 'T-shirt & shorts', preset: 'GYM', variant: 'training' },
  { id: 'long', label: 'Long sleeves & trousers', preset: 'CASUAL', variant: 'sweatshirt' },
]);
export const RESET_SKIN_LAYERS = Object.freeze({ skinTan: 0, skinFlush: 0, skinUndertone: 'neutral', skinTanPattern: 'none' });
export function resolveTanPattern(value) {
  return TAN_LINE_PATTERNS.find(pattern => pattern.id === value) || TAN_LINE_PATTERNS[0];
}
// Approximately 1 cm at the reference stature. Kept identical in JS and GLSL.
const EDGE = .012;
const smooth = (a, b, value) => {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const band = (value, [min, max]) => smooth(min - EDGE, min + EDGE, value) * (1 - smooth(max - EDGE, max + EDGE, value));

/** Fraction of skin exposed to the sun. Regions: lower, torso, upper arm,
 * forearm. Hand/head weights are zero, so height bands cannot stripe them. */
export function tanExposureAt(patternId, [x, y], [lower, torso, upper, forearm]) {
  const pattern = resolveTanPattern(patternId);
  if (!pattern.preset) return 1;
  const shape = garmentCoverage(pattern.preset, pattern.variant);
  const region = value => smooth(.2, .6, value);
  const lowerCover = band(y, shape.lower) * region(lower);
  let top = band(y, shape.torso) * region(torso) * (1 - region(Math.max(upper, forearm)));
  if (shape.tank) {
    const body = (1 - smooth(1.43 - EDGE, 1.43 + EDGE, y)) * (1 - smooth(.245 - EDGE, .245 + EDGE, Math.abs(x)));
    const straps = smooth(1.43 - EDGE, 1.43 + EDGE, y) * band(Math.abs(x), [.155, .230]);
    top *= Math.max(body, straps);
  }
  const sleeves = Math.max(shape.sleeves > 0 ? region(upper) : 0, shape.sleeves > 1 ? region(forearm) : 0);
  return 1 - Math.max(lowerCover, top, sleeves);
}

export function tanLineUniforms(value) {
  const pattern = resolveTanPattern(value), shape = garmentCoverage(pattern.preset, pattern.variant);
  return {
    uTanPattern: { value: pattern.preset ? 1 : 0 },
    uTanLower: { value: new Vector2(...shape.lower) },
    uTanTorso: { value: new Vector2(...shape.torso) },
    uTanTank: { value: shape.tank ? 1 : 0 },
    uTanSleeves: { value: shape.sleeves },
  };
}

export const TAN_LINES_GLSL = `
  uniform float uTanPattern;
  uniform vec2 uTanLower;
  uniform vec2 uTanTorso;
  uniform float uTanTank;
  uniform float uTanSleeves;
  varying vec2 vSkinTanCoordinates;
  varying vec4 vSkinTanRegions;
  float tanBand(float p, vec2 limits) {
    return smoothstep(limits.x-${EDGE},limits.x+${EDGE},p) *
      (1.0-smoothstep(limits.y-${EDGE},limits.y+${EDGE},p));
  }
  float skinSunCoverage() {
    if(uTanPattern<.5) return 1.0;
    vec4 regions=smoothstep(vec4(.2),vec4(.6),vSkinTanRegions);
    float y=vSkinTanCoordinates.y,x=abs(vSkinTanCoordinates.x);
    float lower=tanBand(y,uTanLower)*regions.x;
    float top=tanBand(y,uTanTorso)*regions.y*(1.0-max(regions.z,regions.w));
    if(uTanTank>.5) {
      float body=(1.0-smoothstep(1.43-${EDGE},1.43+${EDGE},y))*(1.0-smoothstep(.245-${EDGE},.245+${EDGE},x));
      float straps=smoothstep(1.43-${EDGE},1.43+${EDGE},y)*tanBand(x,vec2(.155,.230));
      top*=max(body,straps);
    }
    float sleeves=max(uTanSleeves>.5?regions.z:0.0,uTanSleeves>1.5?regions.w:0.0);
    return 1.0-max(max(lower,top),sleeves);
  }
`;
