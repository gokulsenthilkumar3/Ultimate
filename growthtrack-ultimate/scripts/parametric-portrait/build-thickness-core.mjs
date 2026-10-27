import { BackSide, Ray } from 'three';

/** Neutral geometry chord in metres; null means no trustworthy exit surface. */
export function traceNormalChord(bvh, point, normal, { epsilonMetres = 0.00005, maximumRayMetres = 0.6 } = {}) {
  if (!(epsilonMetres > 0) || !(maximumRayMetres > epsilonMetres * 2) || normal.lengthSq() < 1e-12) throw new Error('Invalid thickness ray scale or normal.');
  const direction = normal.clone().normalize().negate();
  const ray = new Ray(point.clone().addScaledVector(direction, epsilonMetres), direction);
  const hit = bvh.raycastFirst(ray, BackSide, epsilonMetres, maximumRayMetres);
  const length = hit ? hit.distance + epsilonMetres : Infinity;
  return Number.isFinite(length) && length > epsilonMetres * 2 && length < maximumRayMetres ? length : null;
}
