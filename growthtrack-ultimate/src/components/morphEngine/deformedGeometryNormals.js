import * as THREE from 'three';

/** Refresh smooth normals from the current morph pose, only when it changes.
 * The anatomy spans a large length/girth range; its minimum-size normals are
 * unsuitable for every other pose. Geometry must belong to this mesh instance.
 */
export function createMorphNormalUpdater(mesh) {
  const geometry = mesh?.geometry;
  const base = geometry?.attributes?.position;
  const morphs = geometry?.morphAttributes?.position;
  if (!base || !morphs?.length) return null;
  if (!geometry.attributes.normal) geometry.computeVertexNormals();
  const scratch = new THREE.BufferGeometry();
  const position = new THREE.BufferAttribute(new Float32Array(base.array.length), 3);
  scratch.setAttribute('position', position);
  if (geometry.index) scratch.setIndex(geometry.index);
  const previous = new Float64Array(morphs.length).fill(NaN);
  let previousBaseVersion=-1;
  const update = () => {
    const weights = mesh.morphTargetInfluences || [];
    if (previousBaseVersion === base.version && previous.every((weight, index) => Math.abs(weight - (weights[index] || 0)) < 1e-6)) return false;
    previousBaseVersion=base.version;
    const baseInfluence = geometry.morphTargetsRelative ? 1 : 1 - weights.reduce((sum, weight) => sum + weight, 0);
    for (let index = 0; index < position.array.length; index += 1) position.array[index] = base.array[index] * baseInfluence;
    morphs.forEach((morph, index) => {
      const weight = weights[index] || 0; previous[index] = weight;
      if (!weight) return;
      for (let offset = 0; offset < position.array.length; offset += 1) position.array[offset] += morph.array[offset] * weight;
    });
    scratch.computeVertexNormals();
    geometry.attributes.normal.array.set(scratch.attributes.normal.array);
    geometry.attributes.normal.needsUpdate = true;
    return true;
  };
  update.dispose = () => scratch.dispose();
  return update;
}
