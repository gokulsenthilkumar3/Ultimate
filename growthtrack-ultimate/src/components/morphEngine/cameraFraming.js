import { getDualSeparation } from './sceneLayout';

const positive = (value, fallback) => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : fallback;

/** Fit the entire figure (or pair) using both axes of the actual viewport. */
export function fitHumanFrame({ frame, width = 1000, height = 700, fov = 30, viewMode = 'SOLO', azimuth = 0, elevation = 0 } = {}) {
  const bodyHeight = positive(frame?.height, 1.92);
  const bodyWidth = positive(frame?.size?.x, 0.85);
  const bodyDepth = positive(frame?.size?.z, 0.38);
  const theta = azimuth * Math.PI / 180;
  const phi = elevation * Math.PI / 180;
  const widthAtAngle = Math.abs(Math.cos(theta)) * bodyWidth + Math.abs(Math.sin(theta)) * bodyDepth;
  const depthAtAngle = Math.abs(Math.sin(theta)) * bodyWidth + Math.abs(Math.cos(theta)) * bodyDepth;
  const projectedHeight = Math.abs(Math.cos(phi)) * bodyHeight + Math.abs(Math.sin(phi)) * depthAtAngle;
  const halfDepth = (Math.abs(Math.cos(phi)) * depthAtAngle + Math.abs(Math.sin(phi)) * bodyHeight) / 2;
  const totalWidth = widthAtAngle + (viewMode === 'DUAL' ? 2 * getDualSeparation(width) : 0);
  const verticalTangent = Math.tan(Math.min(80, positive(fov, 30)) * Math.PI / 360);
  const horizontalTangent = verticalTangent * positive(width, 1000) / positive(height, 700);
  const distance = Math.max(projectedHeight * 0.61 / verticalTangent, totalWidth * 0.60 / horizontalTangent) + halfDepth;
  return { distance, center: [0, bodyHeight * 0.51, 0] };
}

/** A preset should take the shortest turn from the user's current orbit. */
export function nearestOrbitAngle(current, target) {
  return current + Math.atan2(Math.sin(target - current), Math.cos(target - current));
}
