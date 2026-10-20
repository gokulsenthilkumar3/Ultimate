import { Box3, Vector3 } from 'three';

// Bounds come from evaluated skin vertices, so focus follows the asset, morphs
// and pose rather than assuming a particular model's hand/foot positions.
const REGION_BONES = {
  head: ['Head'], neck: ['Neck'], chest: ['Spine2'], shoulders: ['LeftShoulder','RightShoulder','LeftUpperArm','RightUpperArm'],
  waist: ['Spine','Spine1'], glutes: ['Hips','LeftUpLeg','RightUpLeg'], leftArm: ['LeftUpperArm'], rightArm: ['RightUpperArm'],
  leftForearm: ['LeftForeArm'], rightForearm: ['RightForeArm'], leftHand: ['LeftHand'], rightHand: ['RightHand'],
  leftThigh: ['LeftUpLeg'], rightThigh: ['RightUpLeg'], calves: ['LeftLeg','RightLeg'], leftFoot: ['LeftFoot'], rightFoot: ['RightFoot'],
};

export function createRegionFrameSampler(body, anatomy) {
  const indices = body?.geometry?.attributes.skinIndex, weights = body?.geometry?.attributes.skinWeight;
  if (!indices || !weights || !body.skeleton) return null;
  const boneIndices = Object.fromEntries(Object.entries(REGION_BONES).map(([key, names]) => [key, new Set(
    body.skeleton.bones.flatMap((bone,index) => names.some(name => bone.name === name || bone.name === `mixamorig${name}`) ? [index] : []),
  )]));
  const members = Object.fromEntries(Object.keys(REGION_BONES).map(key => [key, []]));
  for (let index = 0; index < indices.count; index++) {
    let dominant = 0;
    for (let component = 1; component < weights.itemSize; component++) if (weights.getComponent(index,component) > weights.getComponent(index,dominant)) dominant = component;
    const boneIndex = indices.getComponent(index,dominant);
    for (const [key,bones] of Object.entries(boneIndices)) {
      if (bones.has(boneIndex)) members[key].push(index);
    }
  }
  const point = new Vector3();
  const origin = new Vector3();
  function measure(mesh, vertices) {
    const box = new Box3();
    for (const index of vertices) {
      mesh.getVertexPosition(index,point).applyMatrix4(mesh.matrixWorld).sub(origin);
      box.expandByPoint(point);
    }
    if (box.isEmpty()) return null;
    return { center: box.getCenter(new Vector3()).toArray(), size: box.getSize(new Vector3()).toArray(), source: 'evaluated-surface' };
  }
  return (includePrivate = false, root = null) => {
    if (root) root.getWorldPosition(origin); else origin.set(0,0,0);
    body.updateWorldMatrix(true, false); body.skeleton.update();
    const result = Object.fromEntries(Object.entries(members).flatMap(([key,vertices]) => {
      const frame = measure(body,vertices); return frame ? [[key,frame]] : [];
    }));
    if (includePrivate && anatomy) {
      anatomy.updateWorldMatrix(true, false);
      const region = measure(anatomy, Array.from({ length: anatomy.geometry.attributes.position.count }, (_,i) => i));
      if (region) result.anatomy = region;
    }
    return result;
  };
}
