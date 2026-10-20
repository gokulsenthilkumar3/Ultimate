// Inverse kinematics for dragging a hand or foot: an exact two-bone solver for limbs, and FABRIK for longer chains
// (spine, neck, fingers). Pure vector maths on [x, y, z] arrays; the viewer converts the returned joint positions into
// bone rotations on the skeleton (aim each bone's local axis at the next joint, keeping its twist).

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => { const l = len(a); return l > 1e-12 ? mul(a, 1 / l) : [0, 0, 0]; };

export const dist = (a, b) => len(sub(a, b));

/**
 * Two-bone IK. `root` is the shoulder or hip, `l1` and `l2` the bone lengths, `target` where the wrist or ankle should
 * go, `pole` a point the middle joint (elbow or knee) bends toward. `maxFlexRad` limits how far the joint can fold
 * (an elbow about 2.6 rad, a knee about 2.4), so a target too close to the root cannot fold the limb through itself.
 * Returns { mid, end, reached, stretch }: `reached` is false when the target is out of range and the limb is
 * straightened toward it instead.
 */
export function solveTwoBone({ root, l1, l2, target, pole, maxFlexRad = 2.5 }) {
  const toTarget = sub(target, root);
  const rawDist = len(toTarget);
  const dir = rawDist > 1e-9 ? mul(toTarget, 1 / rawDist) : [0, -1, 0];
  const minReach = Math.sqrt(l1 * l1 + l2 * l2 - 2 * l1 * l2 * Math.cos(Math.PI - maxFlexRad));
  const maxReach = (l1 + l2) * 0.9999;
  const d = Math.min(maxReach, Math.max(minReach, rawDist));

  const cosA = Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
  const along = l1 * cosA;
  const across = l1 * Math.sqrt(1 - cosA * cosA);

  // The bend direction is the pole direction with its component along the limb removed.
  const toPole = sub(pole, root);
  let side = sub(toPole, mul(dir, dot(toPole, dir)));
  if (len(side) < 1e-6) side = sub([0, 0, 1], mul(dir, dir[2]));           // pole on the limb axis: pick any perpendicular
  side = norm(side);

  const mid = add(root, add(mul(dir, along), mul(side, across)));
  const end = add(root, mul(dir, d));
  return { mid, end, reached: rawDist >= minReach - 1e-9 && rawDist <= maxReach + 1e-9, stretch: Math.max(0, rawDist - maxReach) };
}

/**
 * FABRIK: `points` is the chain from root to tip. The root stays where it is when `pinRoot` is set. Returns new points
 * with the original bone lengths.
 */
export function solveFabrik(points, target, { pinRoot = true, iterations = 16, tolerance = 1e-4 } = {}) {
  const n = points.length;
  const lengths = []; for (let i = 0; i < n - 1; i += 1) lengths.push(dist(points[i], points[i + 1]));
  const total = lengths.reduce((a, b) => a + b, 0);
  const p = points.map(v => [...v]);
  const root = [...p[0]];

  if (pinRoot && dist(root, target) >= total) {                          // out of reach: lay the chain straight toward it
    const dir = norm(sub(target, root));
    for (let i = 1; i < n; i += 1) p[i] = add(p[i - 1], mul(dir, lengths[i - 1]));
    return p;
  }
  for (let it = 0; it < iterations && dist(p[n - 1], target) > tolerance; it += 1) {
    p[n - 1] = [...target];
    for (let i = n - 2; i >= 0; i -= 1) p[i] = add(p[i + 1], mul(norm(sub(p[i], p[i + 1])), lengths[i]));
    if (pinRoot) p[0] = [...root];
    for (let i = 1; i < n; i += 1) p[i] = add(p[i - 1], mul(norm(sub(p[i], p[i - 1])), lengths[i - 1]));
  }
  return p;
}

/**
 * Foot lock: while a foot is planted, hold its world position and only release it when the body has moved so far that
 * the leg would overstretch, so a drag of the pelvis or a step does not make the feet skate.
 */
export function footLock(plantedFoot, hip, legLength, slack = 0.98) {
  return dist(hip, plantedFoot) <= legLength * slack;
}
