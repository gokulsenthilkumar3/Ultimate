import { Box3, Matrix4, Vector3 } from 'three';

// Deterministic authored collider profile. Extents/radii are fitted from every
// assigned skin-triangle corner for this identity and pose, never shrunk to
// manufacture a gap. Bone-local boxes preserve distinct width/height/depth.
export function boneColliderKind(name, { palmCapsules = false } = {}) {
  if (palmCapsules && /Hand$/.test(name)) return 'capsule';
  if (/Hand(?:Thumb|Index|Middle|Ring|Pinky)|ForeArm|Arm$|Leg$/.test(name)) return 'capsule';
  return 'box'; // torso/spine, pelvis, palms, head, feet and shoulders
}

function segmentDistance(point, start, end) {
  const direction = end.clone().sub(start), length = direction.lengthSq();
  const t = length ? Math.max(0, Math.min(1, point.clone().sub(start).dot(direction) / length)) : 0;
  return point.distanceTo(start.clone().addScaledVector(direction, t));
}

/** Per-bone closed boxes and conservative capsule support polyhedra. Six axis
 * directions bound each capsule; the additional diagonals reduce overreach.
 * Analytic capsule parameters are retained for diagnostics/export. */
export function createBoneCollisionProxies(mesh, posedGeometry, clearance = 0.003, { analytic = false } = {}) {
  if (!Number.isFinite(clearance) || clearance < 0) throw new Error('Collider clearance must be finite and nonnegative.');
  const geometry = mesh.geometry, indices = geometry.index;
  const ids = geometry.attributes.skinIndex, weights = geometry.attributes.skinWeight;
  const groups = new Map();
  for (let face = 0; face < indices.count / 3; face++) {
    const scores = new Map(), vertices = [0, 1, 2].map(corner => indices.getX(face * 3 + corner));
    for (const vertex of vertices) for (let component = 0; component < 4; component++) {
      const bone = ids.getComponent(vertex, component), weight = weights.getComponent(vertex, component);
      if (weight > 0) scores.set(bone, (scores.get(bone) || 0) + weight);
    }
    const bone = [...scores].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (bone === undefined) throw new Error('A body triangle has no collider bone.');
    if (!groups.has(bone)) groups.set(bone, { vertices: new Set(), faces: [] });
    const group = groups.get(bone); group.faces.push(face); vertices.forEach(vertex => group.vertices.add(vertex));
  }
  return [...groups].map(([id, group]) => {
    const bone = mesh.skeleton.bones[id]; bone.updateWorldMatrix(true, false);
    const origin = bone.getWorldPosition(new Vector3()), rotation = new Matrix4().extractRotation(bone.matrixWorld);
    const frame = rotation.clone().setPosition(origin), inverse = frame.clone().invert();
    const points = [...group.vertices].map(vertex => new Vector3().fromBufferAttribute(posedGeometry.attributes.position, vertex));
    const kind = boneColliderKind(bone.name, { palmCapsules: analytic }), planes = [];
    let dimensions, radius, end, start = origin.clone(), boxBounds;
    if (kind === 'box') {
      const local = new Box3().setFromPoints(points.map(point => point.clone().applyMatrix4(inverse))).expandByScalar(clearance);
      boxBounds = new Box3();
      for (const x of [local.min.x, local.max.x]) for (const y of [local.min.y, local.max.y]) for (const z of [local.min.z, local.max.z]) {
        boxBounds.expandByPoint(new Vector3(x, y, z).applyMatrix4(frame));
      }
      dimensions = local.getSize(new Vector3()).toArray();
      for (let axis = 0; axis < 3; axis++) for (const sign of [-1, 1]) {
        const normal = new Vector3().setComponent(axis, sign).transformDirection(rotation);
        const bound = sign > 0 ? local.max.getComponent(axis) : -local.min.getComponent(axis);
        planes.push({ normal, constant: normal.dot(origin) + bound });
      }
    } else {
      const children = bone.children.filter(child => child.isBone);
      if (children.length) {
        end = new Vector3();
        // A palm's longitudinal axis points toward all finger roots, not just
        // the first child (often the thumb).
        const axisChildren = analytic ? children : children.slice(0, 1);
        for (const child of axisChildren) end.add(child.getWorldPosition(new Vector3()));
        end.divideScalar(axisChildren.length);
      }
      else {
        const parent = bone.parent?.isBone ? bone.parent.getWorldPosition(new Vector3()) : origin.clone().add(new Vector3(0, -0.01, 0));
        end = origin.clone().add(origin.clone().sub(parent).multiplyScalar(0.7));
      }
      if (analytic) {
        const direction = end.clone().sub(origin);
        if (direction.lengthSq() < 1e-12) direction.set(0, 1, 0).transformDirection(rotation);
        direction.normalize();
        const center = points.reduce((sum, point) => sum.add(point), new Vector3()).divideScalar(points.length);
        let low = Infinity, high = -Infinity;
        for (const point of points) {
          const value = point.clone().sub(center).dot(direction);
          low = Math.min(low, value); high = Math.max(high, value);
        }
        start = center.clone().addScaledVector(direction, low);
        end = center.clone().addScaledVector(direction, high);
      }
      radius = Math.max(...points.map(point => segmentDistance(point, start, end))) + clearance;
      for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) for (const z of [-1, 0, 1]) {
        if (!x && !y && !z) continue;
        const normal = new Vector3(x, y, z).normalize().transformDirection(rotation);
        planes.push({ normal, constant: Math.max(normal.dot(start), normal.dot(end)) + radius });
      }
    }
    // No approximate AABB may skip a capsule support-polyhedron corner.
    const bounds = analytic ? (kind === 'capsule' ? new Box3().setFromPoints([start, end]).expandByScalar(radius) : boxBounds)
      : new Box3(new Vector3(-Infinity, -Infinity, -Infinity), new Vector3(Infinity, Infinity, Infinity));
    return { region: bone.name.replace(/^mixamorig:?/, '').toLowerCase(), bone: bone.name, kind, dimensions, radius,
      start: start.toArray(), end: end?.toArray(), planes, bounds, sourceFaces: group.faces, vertices: group.vertices.size, watertight: true, clearance,
      representation: analytic ? 'analytic-capsules-and-oriented-boxes' : 'support-polyhedra' };
  });
}
