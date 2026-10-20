// Pixel-break budget: how close can the camera get before a texture is magnified past a limit?
//
// Pixelation appears when one texel covers more than about one screen pixel. For a perspective camera looking at a
// surface that faces it:
//
//   screen px per cm = viewportHeightPx * dpr / (2 * distanceM * tan(fov / 2) * 100)
//   magnification    = screenPxPerCm / texelsPerCm            (1 = one texel per pixel; above 1 the texture is stretched)
//
// The detail ladder in docs/real-human-3d/04-skin-hair-eyes.md keeps `magnification` under MAGNIFICATION_LIMIT at the
// closest zoom each region allows, by adding resolution (texture tiles) and tiling micro-detail rather than by stopping
// the camera early.

export const MAGNIFICATION_LIMIT = 1.25;

const rad = (deg) => (deg * Math.PI) / 180;

/** Screen pixels covered by one centimetre of a camera-facing surface at `distanceM`. */
export function screenPxPerCm({ distanceM, fovDeg, viewportHeightPx, dpr = 1 }) {
  if (!(distanceM > 0)) throw new RangeError('distanceM must be positive');
  const visibleCm = 2 * distanceM * Math.tan(rad(fovDeg) / 2) * 100;
  return (viewportHeightPx * dpr) / visibleCm;
}

/** How many screen pixels one texel covers. Above MAGNIFICATION_LIMIT the surface looks blocky. */
export function magnification({ texelsPerCm, ...camera }) {
  return screenPxPerCm(camera) / texelsPerCm;
}

/** Closest distance (metres) at which a region stays within `limit` screen pixels per texel. */
export function minDistanceForTexelDensity({ texelsPerCm, fovDeg, viewportHeightPx, dpr = 1, limit = MAGNIFICATION_LIMIT }) {
  const pxPerCmAtLimit = texelsPerCm * limit;
  const visibleCm = (viewportHeightPx * dpr) / pxPerCmAtLimit;
  return visibleCm / (2 * Math.tan(rad(fovDeg) / 2) * 100);
}

/** Texels per cm a region needs so the camera can reach `distanceM` without exceeding `limit`. */
export function texelsPerCmNeeded({ distanceM, fovDeg, viewportHeightPx, dpr = 1, limit = MAGNIFICATION_LIMIT }) {
  return screenPxPerCm({ distanceM, fovDeg, viewportHeightPx, dpr }) / limit;
}

/**
 * The detail ladder. Skin colour varies slowly, so the base colour map may be stretched further than fine detail may
 * (BASE_LIMIT screen pixels per texel); the tiling micro-detail that carries pores and creases may not be stretched past
 * MAGNIFICATION_LIMIT. A region's closest camera distance is whichever of the two limits bites first.
 */
export const BASE_LIMIT = 2;

export function closestDistance({ baseTexelsPerCm, microTexelsPerCm, fovDeg, viewportHeightPx, dpr = 1 }) {
  const camera = { fovDeg, viewportHeightPx, dpr };
  const base = minDistanceForTexelDensity({ texelsPerCm: baseTexelsPerCm, ...camera, limit: BASE_LIMIT });
  const micro = microTexelsPerCm ? minDistanceForTexelDensity({ texelsPerCm: microTexelsPerCm, ...camera, limit: MAGNIFICATION_LIMIT }) : 0;
  return Math.max(base, micro);
}
