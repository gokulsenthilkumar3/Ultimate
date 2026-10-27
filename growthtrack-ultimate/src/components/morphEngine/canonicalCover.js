import { Box3, BufferAttribute, BufferGeometry, DoubleSide, MeshStandardMaterial, SkinnedMesh, Vector3 } from 'three';

const FIT_BONES = /Hips|Pelvis|Spine|UpLeg|Thigh/i;

function copySelectedAttribute(attribute, vertices) {
  const result = new BufferAttribute(new attribute.array.constructor(vertices.length * attribute.itemSize), attribute.itemSize, attribute.normalized);
  for (let index = 0; index < vertices.length; index++) {
    for (let component = 0; component < attribute.itemSize; component++) {
      result.setComponent(index, component, attribute.getComponent(vertices[index], component));
    }
  }
  return result;
}

/**
 * A fitted-shorts PREVIEW shell, not an authored sewing pattern or certified
 * wardrobe item. It selects a fixed, compact pelvis/upper-thigh subset of the
 * neutral body and copies that correspondence after CPU identity edits.
 *
 * Clearance is applied to unposed positions along the body's current normals;
 * skinning then uses the same skeleton/bind space. This does not guarantee
 * collision-free results for arbitrary shapes, poses or garment layers.
 */
export function createCanonicalCover(body, { clearance = 0.008, band = [0.38, 0.57] } = {}) {
  const source = body?.geometry;
  const position = source?.attributes.position;
  const normals = source?.attributes.normal;
  const indices = source?.index;
  const skinIndex = source?.attributes.skinIndex;
  const skinWeight = source?.attributes.skinWeight;
  if (!body?.isSkinnedMesh || !body.skeleton || !position || !normals || !indices || !skinIndex || !skinWeight) {
    throw new Error('The fitted-shorts preview requires an indexed skinned body with normals and skin weights.');
  }
  if (!Number.isFinite(clearance) || clearance <= 0 || clearance > 0.05) {
    throw new Error('Preview clearance must be greater than zero and no more than 0.05 metres.');
  }
  if (!Array.isArray(band) || band.length !== 2 || !band.every(Number.isFinite) || band[0] < 0 || band[1] > 1 || band[0] >= band[1]) {
    throw new Error('The preview height band must be ordered within [0, 1].');
  }
  const bounds = new Box3().setFromBufferAttribute(position);
  const height = bounds.max.y - bounds.min.y;
  if (!(height > 0)) throw new Error('The fitted-shorts preview requires a body with nonzero height.');
  const bottom = bounds.min.y + height * band[0];
  const top = bounds.min.y + height * band[1];
  const eligible = new Uint8Array(position.count);
  for (let vertex = 0; vertex < position.count; vertex++) {
    if (position.getY(vertex) < bottom || position.getY(vertex) > top) continue;
    let fittedWeight = 0;
    for (let component = 0; component < skinWeight.itemSize; component++) {
      const bone = body.skeleton.bones[skinIndex.getComponent(vertex, component)];
      if (bone && FIT_BONES.test(bone.name)) fittedWeight += skinWeight.getComponent(vertex, component);
    }
    if (fittedWeight > 0.5) eligible[vertex] = 1;
  }
  const vertices = [];
  const remap = new Map();
  const triangles = [];
  for (let index = 0; index + 2 < indices.count; index += 3) {
    const triangle = [indices.getX(index), indices.getX(index + 1), indices.getX(index + 2)];
    if (!triangle.every(vertex => eligible[vertex])) continue;
    for (const vertex of triangle) {
      if (!remap.has(vertex)) { remap.set(vertex, vertices.length); vertices.push(vertex); }
      triangles.push(remap.get(vertex));
    }
  }
  if (!triangles.length) throw new Error('No pelvis/thigh triangles match the fitted-shorts preview region.');

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(vertices.length * 3), 3));
  geometry.setIndex(triangles);
  geometry.setAttribute('skinIndex', copySelectedAttribute(skinIndex, vertices));
  geometry.setAttribute('skinWeight', copySelectedAttribute(skinWeight, vertices));
  if (source.attributes.uv) geometry.setAttribute('uv', copySelectedAttribute(source.attributes.uv, vertices));
  const material = new MeshStandardMaterial({ color: '#273548', roughness: 0.95, metalness: 0, side: DoubleSide });
  const mesh = new SkinnedMesh(geometry, material);
  mesh.name = 'Fitted shorts preview';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.bindMode = body.bindMode;
  mesh.bind(body.skeleton, body.bindMatrix);
  mesh.userData = {
    previewGarment: 'fitted-shorts',
    fitValidation: 'not-certified',
    representation: 'selected-body-shell',
    clearanceMetres: clearance,
    baselineHeightBand: [...band],
    sourceVertexIndices: vertices,
  };
  const baselineCount = position.count;
  const baselineIndexVersion = indices.version;
  const normal = new Vector3();
  let previousPosition = null, previousNormal = null, previousVersion = -1, previousNormalVersion = -1;
  let disposed = false;

  function update() {
    if (disposed) throw new Error('This fitted-shorts preview has been disposed.');
    if (body.geometry !== source || source.index !== indices || indices.version !== baselineIndexVersion || source.attributes.position.count !== baselineCount) {
      throw new Error('Body topology changed; rebuild the fitted-shorts preview correspondence.');
    }
    if (body.parent && mesh.parent !== body.parent) body.parent.add(mesh);
    mesh.position.copy(body.position);
    mesh.quaternion.copy(body.quaternion);
    mesh.scale.copy(body.scale);
    mesh.matrix.copy(body.matrix);
    mesh.matrixAutoUpdate = body.matrixAutoUpdate;
    mesh.bindMode = body.bindMode;
    mesh.bindMatrix.copy(body.bindMatrix);
    mesh.bindMatrixInverse.copy(body.bindMatrixInverse);
    const points = source.attributes.position, bodyNormals = source.attributes.normal;
    if (points === previousPosition && bodyNormals === previousNormal && points.version === previousVersion && bodyNormals.version === previousNormalVersion) return false;
    const target = geometry.attributes.position;
    for (let index = 0; index < vertices.length; index++) {
      const vertex = vertices[index];
      normal.fromBufferAttribute(bodyNormals, vertex);
      if (!Number.isFinite(normal.lengthSq()) || normal.lengthSq() < 1e-12) normal.set(0, 0, 1);
      normal.normalize();
      const x = points.getX(vertex) + normal.x * clearance;
      const y = points.getY(vertex) + normal.y * clearance;
      const z = points.getZ(vertex) + normal.z * clearance;
      if (![x, y, z].every(Number.isFinite)) throw new Error('The fitted-shorts preview received non-finite body positions.');
      target.setXYZ(index, x, y, z);
    }
    target.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    mesh.boundingBox = null;
    mesh.boundingSphere = null;
    previousPosition = points;
    previousNormal = bodyNormals;
    previousVersion = points.version;
    previousNormalVersion = bodyNormals.version;
    return true;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    mesh.removeFromParent();
    geometry.dispose();
    material.dispose();
    // Shared skeleton and body resources remain owned by the avatar instance.
  }

  try { update(); } catch (error) { dispose(); throw error; }
  return { mesh, update, dispose };
}
