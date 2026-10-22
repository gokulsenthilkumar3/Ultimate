import { SkeletonUtils } from 'three-stdlib';

export function cloneHumanoidScene(source) {
  const scene = SkeletonUtils.clone(source), inverseSets = new Map();
  // SkeletonUtils remaps bones, but Skeleton.clone retains the source inverse
  // matrices. The morph rig edits those matrices as segment lengths change.
  // Share them only among surfaces of this figure, never with the GLTF cache
  // or another Current/Goal figure.
  scene.traverse(node => {
    if (!node.isSkinnedMesh || !node.skeleton) return;
    const original = node.skeleton.boneInverses;
    if (!inverseSets.has(original)) inverseSets.set(original, original.map(matrix => matrix.clone()));
    node.skeleton.boneInverses = inverseSets.get(original);
  });
  return scene;
}
