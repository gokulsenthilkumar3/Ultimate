import { BufferAttribute, BufferGeometry } from 'three';
import { cloneHumanoidScene } from './cloneHumanoidScene.js';
import { createParametricRigFit } from './parametricRigFit.js';

/**
 * Three.js r184 WebGLMorphtargets stores one RGBA32F array layer per target,
 * with one, two or three texels per vertex for position, normal and colour.
 * Without maxTextureSize this is the unpadded resource-size lower bound;
 * it is not a measurement of resident GPU memory.
 */
export function estimateMorphTextureBytes(geometry, { maxTextureSize = Infinity } = {}) {
  if (!(maxTextureSize > 0)) throw new Error('maxTextureSize must be positive.');
  const morphs = geometry?.morphAttributes || {};
  const count = (morphs.position || morphs.normal || morphs.color || []).length;
  let texelsPerVertex = 0;
  if (morphs.position !== undefined) texelsPerVertex = 1;
  if (morphs.normal !== undefined) texelsPerVertex = 2;
  if (morphs.color !== undefined) texelsPerVertex = 3;
  const texels = (geometry?.attributes?.position?.count || 0) * texelsPerVertex;
  if (!count || !texels) return 0;
  const width = Math.min(texels, maxTextureSize);
  const height = Math.ceil(texels / width);
  return width * height * 4 * Float32Array.BYTES_PER_ELEMENT * count;
}

/** Query the enabled WebGL context, never infer support from a device name. */
export function readMorphCapabilities(rendererOrContext) {
  const gl = rendererOrContext?.getContext?.() || rendererOrContext;
  const read = (constant) => {
    if (constant === undefined || typeof gl?.getParameter !== 'function') return null;
    try {
      const value = gl.getParameter(constant);
      return Number.isFinite(value) && value > 0 ? value : null;
    } catch { return null; }
  };
  const maxArrayTextureLayers = read(gl?.MAX_ARRAY_TEXTURE_LAYERS);
  return Object.freeze({
    backend: maxArrayTextureLayers !== null ? 'webgl2' : 'unknown',
    maxArrayTextureLayers,
    maxTextureSize: read(gl?.MAX_TEXTURE_SIZE),
  });
}

// BufferGeometry.clone() copies the entire morph bank. Copy only ordinary
// attributes so the 306-target immutable editing basis is shared on the CPU,
// while none of it becomes a GPU morph texture on the viewing geometry.
function cloneAttribute(attribute) {
  if (!attribute.isInterleavedBufferAttribute) return attribute.clone();
  const result = new BufferAttribute(new attribute.array.constructor(attribute.count * attribute.itemSize), attribute.itemSize, attribute.normalized);
  result.name = attribute.name;
  for (let vertex = 0; vertex < attribute.count; vertex++) {
    for (let component = 0; component < attribute.itemSize; component++) {
      result.setComponent(vertex, component, attribute.getComponent(vertex, component));
    }
  }
  return result;
}

function cloneViewingGeometry(source) {
  const result = new BufferGeometry();
  result.name = source.name;
  result.setIndex(source.index?.clone() || null);
  for (const [name, attribute] of Object.entries(source.attributes)) {
    if (name === 'position') continue;
    result.setAttribute(name, cloneAttribute(attribute));
  }
  result.setAttribute('position', new BufferAttribute(new Float32Array(source.attributes.position.count * 3), 3));
  for (const group of source.groups) result.addGroup(group.start, group.count, group.materialIndex);
  result.setDrawRange(source.drawRange.start, source.drawRange.count);
  result.userData = { ...source.userData };
  result.morphTargetsRelative = true;
  return result;
}

function targetNames(node, targets) {
  const indexed = new Map(Object.entries(node.morphTargetDictionary || {}).map(([name, index]) => [index, name]));
  return targets.map((target, index) => indexed.get(index) || target.name || String(index));
}

function clampWeight(value, min, max) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : 0;
}

function assertPositionTarget(target, base, meshName) {
  if (target.itemSize < 3 || target.count !== base.count) {
    throw new Error(`Invalid position morph on ${meshName || 'unnamed mesh'}: vertex correspondence is required.`);
  }
}

function expressionDelta(target, base, relative) {
  const values = new Float32Array(base.count * 3);
  for (let i = 0; i < base.count; i++) {
    const offset = i * 3;
    values[offset] = target.getX(i) - (relative ? 0 : base.getX(i));
    values[offset + 1] = target.getY(i) - (relative ? 0 : base.getY(i));
    values[offset + 2] = target.getZ(i) - (relative ? 0 : base.getZ(i));
  }
  return new BufferAttribute(values, 3);
}

function updateExpressionNormals(record) {
  if (!record.expressions.length) return;
  const geometry = record.view.geometry;
  const expressionGeometry = new BufferGeometry();
  expressionGeometry.setIndex(geometry.index);
  const positions = new BufferAttribute(new Float32Array(geometry.attributes.position.array.length), 3);
  expressionGeometry.setAttribute('position', positions);
  try {
    for (let expression = 0; expression < record.expressions.length; expression++) {
      const delta = geometry.morphAttributes.position[expression].array;
      const base = geometry.attributes.position.array;
      for (let i = 0; i < base.length; i++) positions.array[i] = base[i] + delta[i];
      expressionGeometry.computeVertexNormals();
      const normalDelta = geometry.morphAttributes.normal[expression];
      const normals = expressionGeometry.attributes.normal.array;
      const baseNormals = geometry.attributes.normal.array;
      for (let i = 0; i < normals.length; i++) normalDelta.array[i] = normals[i] - baseNormals[i];
      normalDelta.needsUpdate = true;
    }
  } finally {
    // The temporary index is owned by the viewing geometry; disposing this
    // never disposes attributes (nor any shared editing resource) in Three.js.
    expressionGeometry.dispose();
  }
}

/**
 * Create an independent skinned viewing scene with CPU-evaluated identity.
 *
 * setWeights replaces the identity document: omitted names return to zero.
 * Weights are by GLTF morph name and apply to every matching auxiliary mesh.
 * Default source channels are unsigned [0, 1]; signed bases can opt into -1.
 * Only explicitly named expressionTargets remain GPU morphs. Their additive
 * deltas/normals are retained; no learned identity/expression correctives or
 * anatomically calibrated rest-skeleton fitting are claimed. Rest joints follow
 * source-surface displacements as an explicit geometric approximation.
 *
 * The source scene and its materials, attributes, bones and inverse bind
 * matrices are never mutated. Textures remain shared and are not disposed.
 */
export function createParametricIdentity(sourceScene, {
  expressionTargets = [], minWeight = 0, maxWeight = 1, maxTextureSize = Infinity,
} = {}) {
  if (!sourceScene?.isObject3D) throw new Error('A loaded GLTF scene is required.');
  if (!Number.isFinite(minWeight) || !Number.isFinite(maxWeight) || minWeight > maxWeight) {
    throw new Error('Identity weight bounds must be finite and ordered.');
  }
  if (!Array.isArray(expressionTargets) || expressionTargets.some(name => typeof name !== 'string')) {
    throw new Error('expressionTargets must be an array of morph names.');
  }
  const expressionNames = new Set(expressionTargets);
  const scene = cloneHumanoidScene(sourceScene);
  const records = [];
  const geometries = new Set();
  const materials = new Map();
  const skeletons = new Set();
  let disposed = false;

  function dispose() {
    if (disposed) return;
    disposed = true;
    scene.removeFromParent();
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials.values()) material.dispose();
    for (const skeleton of skeletons) skeleton.dispose();
  }

  try {
    scene.traverse((view) => {
      if (view.isSkinnedMesh && view.skeleton) skeletons.add(view.skeleton);
      if (!view.isMesh || !view.geometry?.attributes.position) return;
      const basis = view.geometry;
      const targets = basis.morphAttributes.position || [];
      const base = basis.attributes.position;
      targets.forEach(target => assertPositionTarget(target, base, view.name));
      const names = targetNames(view, targets);
      const expressions = names.map((name, index) => ({ name, index })).filter(target => expressionNames.has(target.name));
      const identities = names.map((name, index) => ({ name, index })).filter(target => !expressionNames.has(target.name));
      view.geometry = cloneViewingGeometry(basis);
      geometries.add(view.geometry);
      const cloneMaterial = (material) => {
        if (!material) return material;
        if (!materials.has(material)) {
          const clone = material.clone();
          clone.onBeforeCompile = material.onBeforeCompile;
          clone.customProgramCacheKey = material.customProgramCacheKey;
          materials.set(material, clone);
        }
        return materials.get(material);
      };
      view.material = Array.isArray(view.material) ? view.material.map(cloneMaterial) : cloneMaterial(view.material);
      if (expressions.length) {
        view.geometry.morphAttributes.position = expressions.map(({ index }) => expressionDelta(targets[index], base, basis.morphTargetsRelative));
        view.geometry.morphAttributes.normal = expressions.map(() => new BufferAttribute(new Float32Array(base.count * 3), 3));
        view.morphTargetDictionary = Object.fromEntries(expressions.map(({ name }, index) => [name, index]));
        view.morphTargetInfluences = expressions.map(() => 0);
      } else {
        view.morphTargetDictionary = {};
        view.morphTargetInfluences = [];
      }
      records.push({ view, basis, base, targets, identities, expressions, previous: null });
    });

    const bodyRecord = records.find(record => record.view.name === 'Body' && record.view.isSkinnedMesh);
    const rigFit = bodyRecord ? createParametricRigFit(bodyRecord.view, bodyRecord.basis, skeletons) : null;
    function setWeights(weights = {}) {
      if (disposed) throw new Error('This parametric identity has been disposed.');
      if (!weights || typeof weights !== 'object' || Array.isArray(weights)) throw new Error('Identity weights must be a name-to-number object.');
      const started = performance.now();
      let changed = false;
      let updatedMeshes = 0;
      for (const record of records) {
        const values = record.identities.map(({ name }) => clampWeight(Object.hasOwn(weights, name) ? weights[name] : 0, minWeight, maxWeight));
        if (record.previous && values.every((value, index) => value === record.previous[index])) continue;
        const points = record.view.geometry.attributes.position;
        const output = points.array;
        for (let i = 0; i < record.base.count; i++) {
          const offset = i * 3;
          output[offset] = record.base.getX(i);
          output[offset + 1] = record.base.getY(i);
          output[offset + 2] = record.base.getZ(i);
        }
        for (let index = 0; index < values.length; index++) {
          const weight = values[index];
          if (weight === 0) continue;
          const target = record.targets[record.identities[index].index];
          const relative = record.basis.morphTargetsRelative;
          for (let i = 0; i < record.base.count; i++) {
            const offset = i * 3;
            output[offset] += (target.getX(i) - (relative ? 0 : record.base.getX(i))) * weight;
            output[offset + 1] += (target.getY(i) - (relative ? 0 : record.base.getY(i))) * weight;
            output[offset + 2] += (target.getZ(i) - (relative ? 0 : record.base.getZ(i))) * weight;
          }
        }
        points.needsUpdate = true;
        record.view.geometry.computeVertexNormals();
        if (record.view.geometry.attributes.tangent) {
          if (record.view.geometry.index && record.view.geometry.attributes.uv) record.view.geometry.computeTangents();
          else record.view.geometry.deleteAttribute('tangent');
        }
        updateExpressionNormals(record);
        record.view.geometry.computeBoundingBox();
        record.view.geometry.computeBoundingSphere();
        // Skinning bounds include pose; invalidate them for the next renderer
        // query rather than retaining a previous identity's bounds.
        if (record.view.isSkinnedMesh) {
          record.view.boundingBox = null;
          record.view.boundingSphere = null;
        }
        record.previous = values;
        changed = true;
        updatedMeshes++;
      }
      if (changed) rigFit?.update();
      return { changed, durationMs: performance.now() - started, updatedMeshes };
    }

    setWeights({});
    const statistics = Object.freeze({
      meshCount: records.length,
      vertices: records.reduce((total, record) => total + record.base.count, 0),
      sourceMorphTargets: records.reduce((total, record) => total + record.targets.length, 0),
      largestSourceMorphBank: Math.max(0, ...records.map(record => record.targets.length)),
      retainedExpressionTargets: records.reduce((total, record) => total + record.expressions.length, 0),
      largestViewingMorphBank: Math.max(0, ...records.map(record => record.expressions.length)),
      sourceMorphTextureBytes: records.reduce((total, record) => total + estimateMorphTextureBytes(record.basis, { maxTextureSize }), 0),
      viewingMorphTextureBytes: records.reduce((total, record) => total + estimateMorphTextureBytes(record.view.geometry, { maxTextureSize }), 0),
      textureEstimateIncludesPadding: Number.isFinite(maxTextureSize),
      identityEvaluation: 'cpu',
      rigFitting: rigFit ? 'surface-anchored-approximation' : 'not-performed',
    });
    return { scene, setWeights, statistics, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
