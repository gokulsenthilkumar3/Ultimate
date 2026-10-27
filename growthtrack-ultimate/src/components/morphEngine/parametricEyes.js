import { BufferAttribute, BufferGeometry, Color, Float32BufferAttribute, MeshPhysicalMaterial, MeshStandardMaterial, SRGBColorSpace, SkinnedMesh, TextureLoader, Uint16BufferAttribute, Vector3 } from 'three';
import { avatarSha256 } from './avatarPackage.js';

const BASIS_HASH = '6627588660aa6c754aaa2edb181bc01a8ca60c3b4c534efa3e87f636ce5cda18';
const ATLAS_HASH = '4659691c7295ad6206c78b003e5fd0e5f91dcd53032fa914a229bb48cabe424b';
export const EYE_OPTICS = Object.freeze({ effectiveIor: 1.336, irisRadius: 0.46, pupilRadius: 0.16, irisRecess: 0.035, irisConcavity: 0.025, corneaHeight: 0.17, thicknessMetres: 0.0025 });
const SEGMENTS = 48, EDGE_Z = Math.sqrt(1 - EYE_OPTICS.irisRadius ** 2);
let assetPromise;
const rootUrl = () => `${import.meta.env?.BASE_URL || '/'}assets/parametric/eyes/`;

async function verified(file, hash, max = 2 * 1024 * 1024) {
  if (!/^[a-zA-Z0-9_.-]+$/.test(file) || !/^[a-f0-9]{64}$/.test(hash)) throw new Error('Unsupported eye asset identity.');
  const response = await fetch(rootUrl() + file);
  if (!response.ok) throw new Error(`The eye asset could not be loaded (${response.status}).`);
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > max || await avatarSha256(bytes) !== hash) throw new Error('The eye atlas or source notice changed.');
  return bytes;
}

export function loadParametricEyeAssets() {
  if (!assetPromise) assetPromise = (async () => {
    const response = await fetch(rootUrl() + 'manifest.json');
    if (!response.ok) throw new Error('The eye asset manifest could not be loaded.');
    const manifest = await response.json();
    if (manifest.version !== 1 || manifest.basisSha256 !== BASIS_HASH || manifest.albedo?.sha256 !== ATLAS_HASH) throw new Error('The eye assets need a different source basis.');
    const data = await verified(manifest.albedo.file, ATLAS_HASH);
    const url = URL.createObjectURL(new Blob([data], { type: 'image/png' }));
    let albedo;
    try {
      albedo = await new TextureLoader().loadAsync(url);
      if (albedo.image.width !== 1024 || albedo.image.height !== 1024) throw new Error('The eye atlas dimensions changed.');
      albedo.name = 'CC0 eye atlas'; albedo.flipY = false; albedo.colorSpace = SRGBColorSpace; albedo.needsUpdate = true;
      const notices = await Promise.all(manifest.licenseFiles.map(async file => [file.file, new TextDecoder().decode(await verified(file.file, file.sha256, 65536))]));
      return { manifest, albedo, licenseFiles: Object.fromEntries(notices) };
    } catch (error) { albedo?.dispose(); throw error; }
    finally { URL.revokeObjectURL(url); }
  })().catch(error => { assetPromise = null; throw error; });
  return assetPromise;
}

/** Air-to-eye Snell reference used to test the native transmission setup. */
export function refractEyeRay(incident, outwardNormal, ior = EYE_OPTICS.effectiveIor) {
  if (!(ior >= 1) || !Number.isFinite(ior)) throw new Error('Eye IOR must be finite and at least one.');
  const ray = incident.clone().normalize(), normal = outwardNormal.clone().normalize();
  if (!ray.lengthSq() || !normal.lengthSq()) throw new Error('Refraction requires nonzero vectors.');
  const eta = 1 / ior, cosine = -normal.dot(ray), k = 1 - eta * eta * (1 - cosine * cosine);
  if (cosine < 0) throw new Error('The incident ray must point into the outward surface normal.');
  return k < 0 ? null : ray.multiplyScalar(eta).addScaledVector(normal, eta * cosine - Math.sqrt(k)).normalize();
}

function geometry(points, uv, indices) {
  const result = new BufferGeometry();
  result.setAttribute('position', new Float32BufferAttribute(points, 3));
  result.setAttribute('uv', new Float32BufferAttribute(uv, 2)); result.setIndex(indices);
  result.computeVertexNormals(); return result;
}

function surface(kind, side, atlas) {
  const points = [], uv = [], indices = [], atlasCenter = side > 0 ? atlas.left : atlas.right;
  const rings = kind === 'sclera' ? 22 : kind === 'cornea' ? 10 : kind === 'iris' ? 8 : 1;
  for (let ring = 0; ring <= rings; ring++) {
    const t = ring / rings;
    let radius, z;
    if (kind === 'sclera') {
      const theta = Math.asin(EYE_OPTICS.irisRadius) + t * (Math.PI - Math.asin(EYE_OPTICS.irisRadius));
      radius = Math.sin(theta); z = Math.cos(theta);
    } else if (kind === 'iris') {
      radius = EYE_OPTICS.pupilRadius + t * (EYE_OPTICS.irisRadius - EYE_OPTICS.pupilRadius);
      z = EDGE_Z - EYE_OPTICS.irisRecess - EYE_OPTICS.irisConcavity * (1 - t) ** 2;
    } else if (kind === 'pupil') {
      radius = t * EYE_OPTICS.pupilRadius;
      z = EDGE_Z - EYE_OPTICS.irisRecess - EYE_OPTICS.irisConcavity - 0.003;
    } else {
      radius = t * EYE_OPTICS.irisRadius;
      const height = EYE_OPTICS.corneaHeight, capRadius = (EYE_OPTICS.irisRadius ** 2 + height ** 2) / (2 * height);
      z = EDGE_Z + height - capRadius + Math.sqrt(Math.max(0, capRadius ** 2 - radius ** 2));
    }
    for (let segment = 0; segment <= SEGMENTS; segment++) {
      const phi = segment / SEGMENTS * Math.PI * 2, x = radius * Math.cos(phi), y = radius * Math.sin(phi);
      points.push(x, y, z);
      const scale = kind === 'sclera' ? atlas.scleraRadius : atlas.irisRadius / EYE_OPTICS.irisRadius;
      uv.push(atlasCenter[0] + x * scale, atlasCenter[1] - y * scale);
      if (ring < rings && segment < SEGMENTS) {
        const a = ring * (SEGMENTS + 1) + segment, b = a + SEGMENTS + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  return geometry(points, uv, indices);
}

function eyeBounds(positions, ids) {
  const min = new Vector3(Infinity, Infinity, Infinity), max = new Vector3(-Infinity, -Infinity, -Infinity), point = new Vector3();
  for (const index of ids) { point.fromBufferAttribute(positions, index); min.min(point); max.max(point); }
  const center = min.clone().add(max).multiplyScalar(0.5), radius = max.clone().sub(min).multiplyScalar(0.5);
  if (![...center.toArray(), ...radius.toArray()].every(Number.isFinite) || Math.min(...radius.toArray()) <= 0.002) throw new Error('The canonical eye bounds are degenerate.');
  return { center, radius };
}

function fit(record, positions) {
  const { center, radius } = eyeBounds(positions, record.sourceIds), out = record.mesh.geometry.attributes.position;
  for (let vertex = 0; vertex < out.count; vertex++) for (let axis = 0; axis < 3; axis++) {
    out.setComponent(vertex, axis, center.getComponent(axis) + record.unit[vertex * 3 + axis] * radius.getComponent(axis));
  }
  out.needsUpdate = true; record.mesh.geometry.computeVertexNormals();
  const normals = record.mesh.geometry.attributes.normal, normal = new Vector3();
  for (const group of record.seams) {
    normal.set(0, 0, 0);
    for (const index of group) normal.add(new Vector3().fromBufferAttribute(normals, index));
    normal.normalize();
    for (const index of group) normals.setXYZ(index, normal.x, normal.y, normal.z);
  }
  record.mesh.geometry.computeBoundingBox(); record.mesh.geometry.computeBoundingSphere();
  record.mesh.boundingBox = null; record.mesh.boundingSphere = null;
  return { center, radius };
}

/** Independent layered eyes. Native transmissive corneas refract the recessed iris.
 * Fit is affine from source eye bounds, not measured biometry or lid correction. */
export function createParametricEyes(sourceEyes, assets = {}, { eyeColor = '#523b2d' } = {}) {
  if (!sourceEyes?.isSkinnedMesh || !sourceEyes.geometry?.attributes.position || !sourceEyes.geometry.attributes.skinWeight || !sourceEyes.geometry.attributes.skinIndex) throw new Error('Layered eyes require the canonical skinned eye source.');
  const positions = sourceEyes.geometry.attributes.position, sourceGeometry = sourceEyes.geometry;
  const sides = [-1, 1].map(side => ({ side, ids: Array.from({ length: positions.count }, (_, i) => i).filter(i => Math.sign(positions.getX(i)) === side) }));
  if (sides.some(side => side.ids.length < 8)) throw new Error('The canonical eye source must contain two separate eye regions.');
  const atlas = assets.manifest?.atlas || { left: [0.708, 0.298], right: [0.293, 0.710], irisRadius: 0.111, scleraRadius: 0.278 };
  const sclera = new MeshPhysicalMaterial({ color: '#fff8f2', map: assets.albedo || null, roughness: 0.29, metalness: 0, ior: EYE_OPTICS.effectiveIor, specularIntensity: 0.5, clearcoat: 0.28, clearcoatRoughness: 0.08 });
  const iris = new MeshStandardMaterial({ map: assets.albedo || null, roughness: 0.64, metalness: 0 });
  const pupil = new MeshStandardMaterial({ color: '#020201', roughness: 0.8, metalness: 0 });
  const cornea = new MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.025, metalness: 0, transmission: 1, thickness: EYE_OPTICS.thicknessMetres, ior: EYE_OPTICS.effectiveIor, specularIntensity: 1, opacity: 1, transparent: false, depthWrite: false });
  sclera.name = 'Eye sclera'; iris.name = 'Eye iris'; pupil.name = 'Eye pupil'; cornea.name = 'Eye transmissive cornea';
  const materials = { sclera, iris, pupil, cornea }, records = [], sourceVisibility = sourceEyes.visible;
  let disposed = false, previousPosition, previousVersion = -1;
  try {
    for (const { side, ids } of sides) for (const kind of ['sclera', 'iris', 'pupil', 'cornea']) {
      const geo = surface(kind, side, atlas), unit = geo.attributes.position.array.slice();
      const sourceBounds = eyeBounds(positions, ids), skinIds = new Uint16Array(geo.attributes.position.count * 4), weights = new Float32Array(skinIds.length);
      // The pinned eye is head-bound. Transfer the nearest source sample's
      // four weights rather than assuming a particular skeleton joint order.
      for (let vertex = 0; vertex < geo.attributes.position.count; vertex++) {
        const point = new Vector3(unit[vertex * 3], unit[vertex * 3 + 1], unit[vertex * 3 + 2]).multiply(sourceBounds.radius).add(sourceBounds.center);
        let nearest = ids[0], distance = Infinity;
        for (const index of ids) { const dx = positions.getX(index) - point.x, dy = positions.getY(index) - point.y, dz = positions.getZ(index) - point.z, d = dx * dx + dy * dy + dz * dz; if (d < distance) { distance = d; nearest = index; } }
        for (let k = 0; k < 4; k++) { skinIds[vertex * 4 + k] = sourceGeometry.attributes.skinIndex.getComponent(nearest, k); weights[vertex * 4 + k] = sourceGeometry.attributes.skinWeight.getComponent(nearest, k); }
      }
      geo.setAttribute('skinIndex', new Uint16BufferAttribute(skinIds, 4)); geo.setAttribute('skinWeight', new BufferAttribute(weights, 4));
      const mesh = new SkinnedMesh(geo, materials[kind]); mesh.name = `${side > 0 ? 'Left' : 'Right'} layered eye ${kind}`;
      mesh.bindMode = sourceEyes.bindMode; mesh.bind(sourceEyes.skeleton, sourceEyes.bindMatrix); mesh.frustumCulled = false;
      mesh.castShadow = false; mesh.receiveShadow = kind !== 'cornea'; mesh.renderOrder = kind === 'cornea' ? 2 : 0;
      mesh.userData = { eyeLayer: kind, side: side > 0 ? 'left' : 'right', source: 'CC0 MakeHuman brown eye atlas; project-generated layered geometry', optics: kind === 'cornea' ? 'native-transmission-effective-ior-1.336' : 'opaque-recessed-eye-surface', physiologicalCalibration: false };
      const shared = new Map();
      for (let i = 0; i < unit.length / 3; i++) {
        const key = [0, 1, 2].map(axis => Math.round(unit[i * 3 + axis] * 1e7)).join('/');
        if (!shared.has(key)) shared.set(key, []);
        shared.get(key).push(i);
      }
      records.push({ mesh, unit, sourceIds: ids, side, kind, seams: [...shared.values()].filter(group => group.length > 1) });
    }
  } catch (error) { records.forEach(record => record.mesh.geometry.dispose()); Object.values(materials).forEach(material => material.dispose()); throw error; }
  function update({ eyeColor: color = eyeColor } = {}) {
    if (disposed) throw new Error('These layered eyes have been disposed.');
    if (sourceEyes.geometry !== sourceGeometry || sourceGeometry.attributes.position.count !== positions.count) throw new Error('The source eye topology changed; rebuild the layered eyes.');
    if (typeof color !== 'string' || !/^#[\da-f]{6}$/i.test(color)) throw new Error('Eye colour must be a six-digit hex colour.');
    const tint = new Color(color), reference = [0.12, 0.035, 0.015];
    const factors = tint.toArray().map((value, channel) => assets.albedo ? value / reference[channel] : value);
    // Keep the artistic tint's channel ratios while fitting glTF's [0,1]
    // base-colour factors. The authored brown atlas cannot reproduce every
    // requested colour at its original luminance without a new iris texture.
    const maximum = Math.max(1, ...factors);
    iris.color.setRGB(...factors.map(value => value / maximum));
    const current = sourceGeometry.attributes.position, changed = current !== previousPosition || current.version !== previousVersion;
    for (const record of records) {
      const { mesh } = record;
      if (sourceEyes.parent && mesh.parent !== sourceEyes.parent) sourceEyes.parent.add(mesh);
      mesh.position.copy(sourceEyes.position); mesh.quaternion.copy(sourceEyes.quaternion); mesh.scale.copy(sourceEyes.scale); mesh.matrix.copy(sourceEyes.matrix); mesh.matrixAutoUpdate = sourceEyes.matrixAutoUpdate;
      mesh.bindMode = sourceEyes.bindMode; mesh.bindMatrix.copy(sourceEyes.bindMatrix); mesh.bindMatrixInverse.copy(sourceEyes.bindMatrixInverse);
      if (changed) fit(record, current);
    }
    previousPosition = current; previousVersion = current.version; sourceEyes.visible = false;
    return changed;
  }
  function dispose() {
    if (disposed) return; disposed = true;
    for (const { mesh } of records) { mesh.removeFromParent(); mesh.geometry.dispose(); }
    Object.values(materials).forEach(material => material.dispose());
    sourceEyes.visible = sourceVisibility;
  }
  try { update({ eyeColor }); } catch (error) { dispose(); throw error; }
  return { meshes: records.map(record => record.mesh), records, update, dispose, statistics: { eyeMeshes: records.length, eyeVertices: records.reduce((sum, record) => sum + record.mesh.geometry.attributes.position.count, 0), eyeTriangles: records.reduce((sum, record) => sum + record.mesh.geometry.index.count / 3, 0), eyeOptics: 'layered-native-transmission-v1', effectiveIor: EYE_OPTICS.effectiveIor, physiologicalCalibration: false } };
}

/** Retain the source eye's named channels only in the offline editing scene. */
export function retainParametricEyeShapes(sourceEyes, assembly) {
  if (!assembly?.records?.length) return;
  const basis = sourceEyes.geometry, base = basis.attributes.position, targets = basis.morphAttributes.position || [];
  const names = new Map(Object.entries(sourceEyes.morphTargetDictionary || {}).map(([name, index]) => [index, name]));
  const sample = new BufferAttribute(new Float32Array(base.count * 3), 3);
  const baselines = assembly.records.map(record => record.mesh.geometry.attributes.position.array.slice());
  const normalBaselines = assembly.records.map(record => record.mesh.geometry.attributes.normal.array.slice());
  for (const record of assembly.records) { record.mesh.geometry.morphAttributes.position = []; record.mesh.geometry.morphAttributes.normal = []; record.mesh.geometry.morphTargetsRelative = true; }
  try {
    targets.forEach((target, index) => {
      if (target.count !== base.count || target.itemSize < 3) throw new Error('Eye shapes lost their source correspondence.');
      for (let vertex = 0; vertex < base.count; vertex++) for (let axis = 0; axis < 3; axis++) sample.setComponent(vertex, axis, target.getComponent(vertex, axis) + (basis.morphTargetsRelative ? base.getComponent(vertex, axis) : 0));
      assembly.records.forEach((record, recordIndex) => {
        fit(record, sample);
        const values = record.mesh.geometry.attributes.position.array.slice();
        for (let i = 0; i < values.length; i++) values[i] -= baselines[recordIndex][i];
        const attribute = new BufferAttribute(values, 3); attribute.name = names.get(index) || String(index);
        record.mesh.geometry.morphAttributes.position.push(attribute);
        const normals = record.mesh.geometry.attributes.normal.array.slice();
        for (let i = 0; i < normals.length; i++) normals[i] -= normalBaselines[recordIndex][i];
        record.mesh.geometry.morphAttributes.normal.push(new BufferAttribute(normals, 3));
      });
    });
    for (const { mesh } of assembly.records) {
      mesh.morphTargetDictionary = Object.fromEntries(targets.map((_, index) => [names.get(index) || String(index), index]));
      mesh.morphTargetInfluences = [...sourceEyes.morphTargetInfluences];
      mesh.userData.editingFit = 'affine-source-eye-bounds-per-channel-combinations-approximate';
    }
  } finally {
    assembly.records.forEach(record => fit(record, base));
  }
}
