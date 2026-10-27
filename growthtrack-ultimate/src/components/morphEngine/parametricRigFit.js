import { BufferGeometry, Triangle, Vector3 } from 'three';
import { MeshBVH } from 'three-mesh-bvh';

/** Approximate joint placement from immutable source-surface correspondence.
 * This follows identity proportions; it is not an anatomical joint estimate.
 * Only the instance's bones and inverse binds are changed. */
export function createParametricRigFit(body, referenceGeometry, skeletons) {
  if (!body?.isSkinnedMesh || !referenceGeometry.index) return null;
  body.updateWorldMatrix(true, true);
  const reference = new BufferGeometry();
  reference.setAttribute('position', referenceGeometry.attributes.position);
  reference.setIndex(referenceGeometry.index);
  const triangle = new Triangle(), point = new Vector3(), delta = new Vector3();
  const base = reference.attributes.position;
  let anchors;
  try {
    const bvh = new MeshBVH(reference, { indirect: true });
    const depth = node => node.parent ? 1 + depth(node.parent) : 0;
    anchors = body.skeleton.bones.map(bone => {
      const original = body.worldToLocal(bone.getWorldPosition(new Vector3()));
      // An elbow can be closer to the belly than to its arm surface. Restrict
      // correspondence to skin influenced by this joint or its children so a
      // belly/girth edit cannot relocate an unrelated arm pivot.
      const related = new Set(body.skeleton.bones.flatMap((candidate, index) => candidate === bone || candidate.parent === bone ? [index] : []));
      const skinIds = referenceGeometry.attributes.skinIndex, skinWeights = referenceGeometry.attributes.skinWeight;
      const sample = new Vector3();
      let hit = null, best = Infinity;
      if (skinIds && skinWeights) bvh.shapecast({
        boundsTraverseOrder: bounds => bounds.distanceToPoint(original),
        intersectsBounds: (_bounds, _leaf, distance) => distance <= best,
        intersectsTriangle: (face, faceIndex) => {
          let influence = 0;
          for (let corner = 0; corner < 3; corner++) {
            const vertex = reference.index.getX(faceIndex * 3 + corner);
            for (let component = 0; component < 4; component++) if (related.has(skinIds.getComponent(vertex, component))) influence += skinWeights.getComponent(vertex, component);
          }
          if (influence < 0.3) return false;
          face.closestPointToPoint(original, sample);
          const distance = sample.distanceTo(original);
          if (distance < best) { best = distance; hit = { faceIndex, point: sample.clone() }; }
          return false;
        },
      });
      hit ||= bvh.closestPointToPoint(original);
      const indices = [0, 1, 2].map(corner => reference.index.getX(hit.faceIndex * 3 + corner));
      triangle.set(...indices.map(index => new Vector3().fromBufferAttribute(base, index)));
      return { bone, original, indices, weights: triangle.getBarycoord(hit.point, new Vector3()).toArray(),
        quaternion: bone.quaternion.clone(), scale: bone.scale.clone(), neutralLocal: bone.position.clone(), depth: depth(bone) };
    }).sort((a, b) => a.depth - b.depth);
  } finally { reference.dispose(); }
  return {
    update() {
      const positions = body.geometry.attributes.position;
      const poses = anchors.map(({ bone, neutralLocal }) => ({ translation: bone.position.clone().sub(neutralLocal), quaternion: bone.quaternion.clone(), scale: bone.scale.clone() }));
      for (const anchor of anchors) { anchor.bone.quaternion.copy(anchor.quaternion); anchor.bone.scale.copy(anchor.scale); }
      body.updateWorldMatrix(true, false);
      for (const anchor of anchors) {
        point.copy(anchor.original);
        anchor.indices.forEach((index, corner) => {
          delta.set(positions.getX(index) - base.getX(index), positions.getY(index) - base.getY(index), positions.getZ(index) - base.getZ(index));
          point.addScaledVector(delta, anchor.weights[corner]);
        });
        body.localToWorld(point);
        const { bone } = anchor;
        if (bone.parent) { bone.parent.updateWorldMatrix(true, false); bone.parent.worldToLocal(point); }
        bone.position.copy(point); bone.updateWorldMatrix(false, false);
        anchor.neutralLocal.copy(bone.position);
      }
      // Parents must be fitted before children, and every skeleton sharing
      // these bones needs the new neutral inverse binds (eyes/oral meshes too).
      for (const skeleton of skeletons) skeleton.calculateInverses();
      anchors.forEach(({ bone }, index) => {
        bone.position.add(poses[index].translation); bone.quaternion.copy(poses[index].quaternion); bone.scale.copy(poses[index].scale);
      });
      for (const { bone } of anchors) bone.updateWorldMatrix(true, false);
      for (const skeleton of skeletons) skeleton.update();
    },
  };
}
