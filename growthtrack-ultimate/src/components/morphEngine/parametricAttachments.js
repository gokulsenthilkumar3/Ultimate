import { BufferAttribute, BufferGeometry, Color, DoubleSide, Float32BufferAttribute, MeshPhysicalMaterial, MeshStandardMaterial, NoColorSpace, SRGBColorSpace, SkinnedMesh, TextureLoader, Uint16BufferAttribute, Vector3 } from 'three';
import { avatarSha256 } from './avatarPackage.js';
import { correctPosedGarment, prepareGarmentContact } from './posedGarmentContact.js';
import { createGarmentFitQueue } from './garmentFitQueue.js';

const BASIS_HASH = '6627588660aa6c754aaa2edb181bc01a8ca60c3b4c534efa3e87f636ce5cda18';
let assetsPromise;
const rootUrl = () => `${import.meta.env?.BASE_URL || '/'}assets/parametric/attachments/`;
const decode = bytes => new TextDecoder('utf-8', { fatal: true }).decode(bytes);

async function verifiedFile(file, expectedHash, limit = 8 * 1024 * 1024) {
  if (!/^[a-zA-Z0-9_.-]+$/.test(file) || !/^[a-f0-9]{64}$/.test(expectedHash)) throw new Error('Unsupported attachment asset identity.');
  const response = await fetch(rootUrl() + file);
  if (!response.ok) throw new Error(`The authored attachment asset could not be loaded (${response.status}).`);
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > limit || await avatarSha256(bytes) !== expectedHash) throw new Error('An authored attachment does not match its recorded source.');
  return bytes;
}

/** Hash-verified authored geometry/maps; cached textures remain loader-owned. */
export function loadParametricAttachmentAssets() {
  if (!assetsPromise) assetsPromise = (async () => {
    const response = await fetch(rootUrl() + 'manifest.json');
    if (!response.ok) throw new Error('The authored hair and tee manifest could not be loaded.');
    const manifest = await response.json();
    if (manifest.version !== 1 || manifest.basisSha256 !== BASIS_HASH || manifest.bodyVertexCount !== 14517) throw new Error('The authored attachments require a different body basis.');
    const licenseFiles = {}, loadedTextures = [];
    try {
      const recordResults = await Promise.allSettled(['short02', 'tee'].map(async name => {
        const entry = manifest.assets[name];
        const [data, albedo, normal, notice] = await Promise.all([
          verifiedFile(entry.file, entry.sha256), verifiedFile(entry.textures.albedo.file, entry.textures.albedo.sha256),
          verifiedFile(entry.textures.normal.file, entry.textures.normal.sha256), verifiedFile(entry.notice, entry.noticeSha256, 65536),
        ]);
        licenseFiles[entry.notice] = decode(notice);
        const mapResults = await Promise.allSettled([albedo, normal].map(async bytes => {
          const url = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
          try { const texture = await new TextureLoader().loadAsync(url); loadedTextures.push(texture); texture.flipY = false; return texture; }
          finally { URL.revokeObjectURL(url); }
        }));
        const mapError = mapResults.find(result => result.status === 'rejected');
        if (mapError) throw mapError.reason;
        const maps = mapResults.map(result => result.value);
        maps[0].colorSpace = SRGBColorSpace; maps[1].colorSpace = NoColorSpace;
        return { data: JSON.parse(decode(data)), albedo: maps[0], normal: maps[1] };
      }));
      // All map work must finish before the catch releases cached resources;
      // otherwise a slow sibling can create an unreachable texture afterward.
      const recordError = recordResults.find(result => result.status === 'rejected');
      if (recordError) throw recordError.reason;
      const records = recordResults.map(result => result.value);
      return { manifest, hair: records[0], garment: records[1], licenseFiles };
    } catch (error) { loadedTextures.forEach(texture => texture.dispose()); throw error; }
  })().catch(error => { assetsPromise = null; throw error; });
  return assetsPromise;
}

function validateBody(body, data) {
  const geometry = body?.geometry;
  if (!body?.isSkinnedMesh || !body.skeleton || !geometry?.index || !geometry.attributes.normal || !geometry.attributes.skinIndex || !geometry.attributes.skinWeight) throw new Error('Authored attachments require an indexed skinned canonical body.');
  if (data.version !== 1 || data.basisSha256 !== BASIS_HASH || data.bodyVertexCount !== geometry.attributes.position.count) throw new Error('Authored attachment/body topology mismatch.');
  if (!data.originalVertices?.length || data.uv.length !== data.originalVertices.length * 2 || !data.indices?.length) throw new Error('The authored attachment has invalid geometry correspondence.');
  for (const anchor of data.anchors) {
    if (anchor.indices.length !== anchor.weights.length || anchor.indices.some(index => !Number.isInteger(index) || index < 0 || index >= data.bodyVertexCount) || ![...anchor.weights, ...anchor.offset].every(Number.isFinite)) throw new Error('The authored attachment has invalid body anchors.');
  }
}

function evaluate(record, bodyPositions, bodyNormals, output) {
  const { data, anchorPositions } = record;
  for (let i = 0; i < data.anchors.length; i++) {
    const anchor = data.anchors[i];
    for (let axis = 0; axis < 3; axis++) {
      let value = anchor.offset[axis];
      for (let k = 0; k < anchor.indices.length; k++) value += bodyPositions.getComponent(anchor.indices[k], axis) * anchor.weights[k];
      anchorPositions[i * 3 + axis] = value;
    }
  }
  const scales = data.scales.map(([a, b, reference], axis) => Math.abs(anchorPositions[a * 3 + axis] - anchorPositions[b * 3 + axis]) / reference);
  const normal = new Vector3(), anchorPoint = new Vector3();
  for (let i = 0; i < data.originalVertices.length; i++) {
    const row = data.proxies[data.originalVertices[i]];
    for (let axis = 0; axis < 3; axis++) {
      let value = row[axis + 6] * scales[axis];
      for (let k = 0; k < 3; k++) value += anchorPositions[row[k] * 3 + axis] * row[k + 3];
      output[i * 3 + axis] = value;
    }
    const clearance = data.clearanceBindings[i];
    normal.set(0, 0, 0); anchorPoint.set(0, 0, 0);
    for (let k = 0; k < clearance.indices.length; k++) {
      const vertex = clearance.indices[k], weight = clearance.weights[k];
      normal.x += bodyNormals.getX(vertex) * weight; normal.y += bodyNormals.getY(vertex) * weight; normal.z += bodyNormals.getZ(vertex) * weight;
      anchorPoint.x += bodyPositions.getX(vertex) * weight; anchorPoint.y += bodyPositions.getY(vertex) * weight; anchorPoint.z += bodyPositions.getZ(vertex) * weight;
    }
    if (normal.lengthSq() < 1e-12) normal.set(0, 0, 1); else normal.normalize();
    const signed = (output[i * 3] - anchorPoint.x) * normal.x + (output[i * 3 + 1] - anchorPoint.y) * normal.y + (output[i * 3 + 2] - anchorPoint.z) * normal.z;
    const correction = Math.max(0, data.clearanceMetres - signed);
    output[i * 3] += normal.x * correction; output[i * 3 + 1] += normal.y * correction; output[i * 3 + 2] += normal.z * correction;
  }
  if (!output.every(Number.isFinite)) throw new Error('Authored attachment fitting produced non-finite positions.');
}

function skinAttributes(body, data) {
  const ids = new Uint16Array(data.originalVertices.length * 4), weights = new Float32Array(ids.length);
  const sourceIds = body.geometry.attributes.skinIndex, sourceWeights = body.geometry.attributes.skinWeight;
  for (let i = 0; i < data.originalVertices.length; i++) {
    const row = data.proxies[data.originalVertices[i]], influences = new Map();
    for (let k = 0; k < 3; k++) {
      const anchor = data.anchors[row[k]];
      for (let j = 0; j < anchor.indices.length; j++) for (let component = 0; component < 4; component++) {
        const vertex = anchor.indices[j], bone = sourceIds.getComponent(vertex, component);
        const weight = row[k + 3] * anchor.weights[j] * sourceWeights.getComponent(vertex, component);
        influences.set(bone, (influences.get(bone) || 0) + weight);
      }
    }
    const sorted = [...influences].filter(([, weight]) => weight > 0).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const total = sorted.reduce((sum, [, weight]) => sum + weight, 0);
    if (!(total > 0)) throw new Error('An authored attachment vertex has no valid canonical skin binding.');
    sorted.forEach(([bone, weight], component) => { ids[i * 4 + component] = bone; weights[i * 4 + component] = weight / total; });
  }
  return { ids, weights };
}

function smoothSeams(record) {
  const normal = record.mesh.geometry.attributes.normal;
  for (const seam of record.seams) {
    const sum = new Vector3();
    for (const id of seam) { sum.x += normal.getX(id); sum.y += normal.getY(id); sum.z += normal.getZ(id); }
    sum.normalize(); for (const id of seam) normal.setXYZ(id, sum.x, sum.y, sum.z);
  }
}

/**
 * Finite prototype: authored HM08 proxy bindings, transferred skin weights and
 * full posed surface correction. This is a static geometric fit with bounded
 * displacement, not cloth dynamics or an any-shape/any-motion guarantee.
 */
export function createParametricAttachments(body, assets, { hairColor = '#49342b', garmentColor = '#ffffff', contactCorrection = true, asyncFitting = false, onFitState, workerFactory } = {}) {
  if (!assets) return { meshes: [], statistics: { attachmentVertices: 0, attachmentTriangles: 0 }, update: () => false, dispose: () => {}, flush: () => Promise.resolve(), fittingState: { status: 'ready' } };
  const records = []; let disposed = false, previousPosition, previousNormal, previousVersion = -1, previousNormalVersion = -1, previousPose;
  const fitQueue = asyncFitting && contactCorrection ? createGarmentFitQueue({ onState: onFitState, workerFactory }) : null;
  const sourceGeometry = body.geometry, sourceIndex = sourceGeometry.index, sourceIndexVersion = sourceIndex.version;
  try {
    for (const asset of [assets.hair, assets.garment]) {
      if (!asset) continue;
      const data = asset.data; validateBody(body, data);
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(new Float32Array(data.originalVertices.length * 3), 3));
      geometry.setAttribute('uv', new Float32BufferAttribute(data.uv, 2)); geometry.setIndex(data.indices);
      const skin = skinAttributes(body, data);
      geometry.setAttribute('skinIndex', new Uint16BufferAttribute(skin.ids, 4)); geometry.setAttribute('skinWeight', new Float32BufferAttribute(skin.weights, 4));
      const hair = data.kind === 'hair';
      const material = hair ? new MeshPhysicalMaterial({ map: asset.albedo || null, normalMap: asset.normal || null,
        roughness: 0.58, metalness: 0, specularIntensity: 0.45, anisotropy: 0.6, anisotropyRotation: Math.PI / 2,
        sheen: 0.35, sheenRoughness: 0.45, sheenColor: '#765443', alphaTest: 0.5, alphaToCoverage: true, side: DoubleSide,
      }) : new MeshStandardMaterial({ map: asset.albedo || null, normalMap: asset.normal || null, color: garmentColor, roughness: 0.9, metalness: 0, side: DoubleSide });
      if (hair) {
        const tint = new Color(hairColor), reference = [0.068, 0.044, 0.03];
        material.color.setRGB(...tint.toArray().map((value, channel) => asset.albedo ? Math.max(0.05, Math.min(10, value / reference[channel])) : value));
      }
      const mesh = new SkinnedMesh(geometry, material);
      mesh.name = hair ? 'Authored short02 hair' : 'Authored casual tee';
      mesh.bindMode = body.bindMode; mesh.bind(body.skeleton, body.bindMatrix); mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
      mesh.userData = { authoredAttachment: data.name, license: 'CC0-1.0', source: 'MakeHuman CC0 system assets', fit: 'HM08-proxy-with-visible-surface-helper-approximation', fittingCertified: false, clearanceMetres: data.clearanceMetres, helperAnchors: data.anchors.filter(anchor => anchor.original >= 13380).length };
      const groups = new Map(); data.originalVertices.forEach((original, i) => { if (!groups.has(original)) groups.set(original, []); groups.get(original).push(i); });
      records.push({ mesh, data, anchorPositions: new Float64Array(data.anchors.length * 3), seams: [...groups.values()].filter(group => group.length > 1) });
    }
  } catch (error) { fitQueue?.dispose(); for (const record of records) { record.mesh.geometry.dispose(); record.mesh.material.dispose(); } throw error; }
  function refresh(record) {
    const { mesh } = record;
    mesh.geometry.attributes.position.needsUpdate = true; mesh.geometry.computeVertexNormals(); smoothSeams(record);
    mesh.geometry.computeTangents(); mesh.geometry.computeBoundingBox(); mesh.geometry.computeBoundingSphere(); mesh.boundingBox = null; mesh.boundingSphere = null;
  }
  function update() {
    if (disposed) throw new Error('These authored attachments have been disposed.');
    if (body.geometry !== sourceGeometry || sourceGeometry.index !== sourceIndex || sourceIndex.version !== sourceIndexVersion) throw new Error('Body topology changed; rebuild the authored attachment correspondence.');
    const points = sourceGeometry.attributes.position, normals = sourceGeometry.attributes.normal;
    const changed = points !== previousPosition || normals !== previousNormal || points.version !== previousVersion || normals.version !== previousNormalVersion;
    (body.parent || body).updateWorldMatrix(true, true);
    body.skeleton.update();
    const pose = [...body.skeleton.boneMatrices, ...body.matrixWorld.elements, ...body.bindMatrix.elements, ...body.bindMatrixInverse.elements];
    const poseChanged = !previousPose || pose.some((value, index) => value !== previousPose[index]);
    for (const record of records) {
      const { mesh } = record;
      if (body.parent && mesh.parent !== body.parent) body.parent.add(mesh);
      mesh.position.copy(body.position); mesh.quaternion.copy(body.quaternion); mesh.scale.copy(body.scale); mesh.matrix.copy(body.matrix); mesh.matrixAutoUpdate = body.matrixAutoUpdate;
      mesh.bindMode = body.bindMode; mesh.bindMatrix.copy(body.bindMatrix); mesh.bindMatrixInverse.copy(body.bindMatrixInverse);
      const correctContact = contactCorrection && record.data.kind !== 'hair';
      if (!changed && !(correctContact && poseChanged)) continue;
      const prior = fitQueue && correctContact ? mesh.geometry.attributes.position.array.slice() : null;
      evaluate(record, points, normals, mesh.geometry.attributes.position.array);
      mesh.updateWorldMatrix(true, false);
      if (correctContact && fitQueue) {
        const prepared = prepareGarmentContact(body, mesh, record.data);
        mesh.geometry.attributes.position.array.set(prior);
        mesh.visible = Boolean(record.hasValidFit);
        fitQueue.schedule({ payload: prepared.payload, apply(values, result) {
          prepared.apply(values); mesh.userData.contactFit = result;
          record.hasValidFit = true; mesh.visible = true; refresh(record);
        } });
      } else {
        if (correctContact) mesh.userData.contactFit = correctPosedGarment(body, mesh, record.data);
        refresh(record);
      }
    }
    previousPosition = points; previousNormal = normals; previousVersion = points.version; previousNormalVersion = normals.version;
    previousPose = pose;
    return changed || (contactCorrection && poseChanged);
  }
  function dispose() {
    if (disposed) return; disposed = true;
    fitQueue?.dispose();
    for (const { mesh } of records) { mesh.removeFromParent(); mesh.geometry.dispose(); mesh.material.dispose(); }
  }
  try { update(); } catch (error) { dispose(); throw error; }
  const statistics = { attachmentVertices: records.reduce((sum, { data }) => sum + data.originalVertices.length, 0), attachmentTriangles: records.reduce((sum, { data }) => sum + data.indices.length / 3, 0), attachmentMorphLayers: 0, attachmentFit: contactCorrection ? 'bounded-posed-surface-correction' : 'finite-prototype-not-collision-certified' };
  return { meshes: records.map(record => record.mesh), records, statistics, update, dispose,
    flush: () => fitQueue ? fitQueue.flush() : Promise.resolve(),
    get fittingState() { return fitQueue?.state || { status: 'ready' }; },
  };
}

/** Offline-only full shape bank: selected identity weights remain standard GLB
 * morph weights. Nonlinear clearance at combined extremes is approximate. */
export function retainParametricAttachmentShapes(body, attachments) {
  if (!attachments?.records?.length) return;
  const basis = body.geometry, targets = basis.morphAttributes.position || [], positions = basis.attributes.position;
  const names = new Map(Object.entries(body.morphTargetDictionary || {}).map(([name, index]) => [index, name]));
  const probe = new BufferGeometry(); probe.setIndex(basis.index);
  const sample = new BufferAttribute(new Float32Array(positions.count * 3), 3); probe.setAttribute('position', sample);
  try {
    const baseline = attachments.records.map(({ mesh }) => mesh.geometry.attributes.position.array.slice());
    for (const record of attachments.records) { record.mesh.geometry.morphAttributes.position = []; record.mesh.geometry.morphTargetsRelative = true; }
    targets.forEach((target, index) => {
      for (let vertex = 0; vertex < positions.count; vertex++) for (let axis = 0; axis < 3; axis++) sample.setComponent(vertex, axis, target.getComponent(vertex, axis) + (basis.morphTargetsRelative ? positions.getComponent(vertex, axis) : 0));
      probe.computeVertexNormals();
      attachments.records.forEach((record, recordIndex) => {
        const values = new Float32Array(record.mesh.geometry.attributes.position.array.length);
        evaluate(record, sample, probe.attributes.normal, values);
        for (let i = 0; i < values.length; i++) values[i] -= baseline[recordIndex][i];
        const attribute = new BufferAttribute(values, 3); attribute.name = names.get(index) || String(index);
        record.mesh.geometry.morphAttributes.position.push(attribute);
      });
    });
    for (const { mesh } of attachments.records) {
      mesh.morphTargetDictionary = Object.fromEntries(targets.map((_, index) => [names.get(index) || String(index), index]));
      mesh.morphTargetInfluences = [...body.morphTargetInfluences];
      mesh.userData.editingFit = 'per-channel-proxy-transfer-combinations-approximate';
    }
  } finally { probe.dispose(); }
}
