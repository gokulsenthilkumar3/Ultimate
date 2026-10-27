import { BufferAttribute, BufferGeometry, Scene } from 'three';
import { cloneHumanoidScene } from './cloneHumanoidScene.js';
import { createCanonicalCover } from './canonicalCover.js';
import { exportRiggedParametricAvatar } from './parametricExport.js';
import { createParametricAttachments, retainParametricAttachmentShapes } from './parametricAttachments.js';
import { createParametricEyes, retainParametricEyeShapes } from './parametricEyes.js';
import { createParametricRigFit } from './parametricRigFit.js';

// Exporters may temporarily replace normal/index attributes. Own the geometry
// container while sharing its immutable CPU basis; never duplicate 306 full
// body arrays merely to prepare an offline editing file.
function exportGeometry(source) {
  const geometry = new BufferGeometry();
  geometry.name = source.name;
  geometry.setIndex(source.index);
  for (const [name, attribute] of Object.entries(source.attributes)) geometry.setAttribute(name, attribute);
  geometry.morphAttributes = Object.fromEntries(Object.entries(source.morphAttributes).map(([name, targets]) => [name, [...targets]]));
  geometry.morphTargetsRelative = source.morphTargetsRelative;
  for (const group of source.groups) geometry.addGroup(group.start, group.count, group.materialIndex);
  geometry.setDrawRange(source.drawRange.start, source.drawRange.count);
  geometry.userData = { ...source.userData };
  return geometry;
}

function namesByIndex(mesh) {
  const targets = mesh.geometry.morphAttributes.position || [];
  const dictionary = new Map(Object.entries(mesh.morphTargetDictionary || {}).map(([name, index]) => [index, name]));
  return targets.map((target, index) => dictionary.get(index) || target.name || String(index));
}

function copyCoverTargets(body, cover) {
  const basis = body.geometry;
  const targets = basis.morphAttributes.position || [];
  const vertices = cover.mesh.userData.sourceVertexIndices;
  const base = basis.attributes.position;
  cover.mesh.geometry.morphTargetsRelative = true;
  cover.mesh.geometry.morphAttributes.position = targets.map((target) => {
    if (target.count !== base.count || target.itemSize < 3) throw new Error('The editing body has incompatible shape correspondence.');
    const values = new Float32Array(vertices.length * 3);
    for (let index = 0; index < vertices.length; index++) {
      const vertex = vertices[index], offset = index * 3;
      values[offset] = target.getX(vertex) - (basis.morphTargetsRelative ? 0 : base.getX(vertex));
      values[offset + 1] = target.getY(vertex) - (basis.morphTargetsRelative ? 0 : base.getY(vertex));
      values[offset + 2] = target.getZ(vertex) - (basis.morphTargetsRelative ? 0 : base.getZ(vertex));
    }
    return new BufferAttribute(values, 3);
  });
  const names = namesByIndex(body);
  cover.mesh.morphTargetDictionary = Object.fromEntries(names.map((name, index) => [name, index]));
  cover.mesh.morphTargetInfluences = [...body.morphTargetInfluences];
  cover.mesh.userData.editingFit = 'body-position-deltas-with-neutral-normal-clearance';
}

/**
 * Offline-only full shape basis. NEVER mount this scene in a Canvas: the
 * 306-target body is deliberately retained for desktop/DCC editing and may
 * exceed a browser's GPU layer limits. The ordinary viewer remains CPU-baked.
 *
 * The cover keeps the neutral normal offset plus corresponding body position
 * deltas. This is an approximate conforming preview, not collision-certified
 * clothing. Rest joints are fitted to the selected identity; later external
 * changes to the shape weights still need their own joint/garment fitting.
 */
export function prepareParametricEditingScene(sourceScene, {
  parameters = {}, skinMaterial, eyeColor, asset, context = 'current', sourceUrl, attachmentAssets, eyeAssets,
} = {}) {
  if (!sourceScene?.isObject3D) throw new Error('A pristine parametric source scene is required for shape-editing export.');
  if (!['current', 'goal'].includes(context)) throw new Error('The editing export context must be current or goal.');
  if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) throw new Error('Shape parameters must be a name-to-number object.');
  for (const [name, value] of Object.entries(parameters)) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) throw new Error(`Invalid editing shape weight: ${name}.`);
  }
  const identityTransform = sourceScene.position.lengthSq() < 1e-12
    && sourceScene.quaternion.angleTo(sourceScene.quaternion.clone().identity()) < 1e-8
    && sourceScene.scale.toArray().every(value => Math.abs(value - 1) < 1e-8);
  if (!identityTransform) throw new Error('The pristine source wrapper must retain its identity transform.');
  const clone = cloneHumanoidScene(sourceScene);
  const scene = new Scene();
  scene.name = 'GrowthTrack editable parametric avatar';
  scene.add(...clone.children);
  const geometries = new Set(), materials = new Map(), skeletons = new Set();
  let cover = null, attachments = null, eyes = null, disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    eyes?.dispose();
    cover?.dispose();
    attachments?.dispose();
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials.values()) material.dispose();
    for (const skeleton of skeletons) skeleton.dispose();
    scene.removeFromParent();
  };
  try {
    const supported = new Set();
    const cloneMaterial = material => {
      if (!material) return material;
      if (!materials.has(material)) {
        const fallback = material.clone();
        if (fallback.emissive?.r === 0 && fallback.emissive.g === 0 && fallback.emissive.b === 0) fallback.emissiveIntensity = 1;
        materials.set(material, fallback);
      }
      return materials.get(material);
    };
    scene.traverse(mesh => {
      if (mesh.isSkinnedMesh && mesh.skeleton) skeletons.add(mesh.skeleton);
      if (!mesh.isMesh || !mesh.geometry?.attributes.position) return;
      mesh.geometry = exportGeometry(mesh.geometry);
      geometries.add(mesh.geometry);
      const originalMaterial = mesh.name === 'Body' && skinMaterial ? skinMaterial : mesh.material;
      mesh.material = Array.isArray(originalMaterial) ? originalMaterial.map(cloneMaterial) : cloneMaterial(originalMaterial);
      if (mesh.name === 'Eyes' && eyeColor !== undefined) {
        if (typeof eyeColor !== 'string' || !/^#[\da-f]{6}$/i.test(eyeColor)) throw new Error('The editing eye colour must be a six-digit hex colour.');
        for (const material of [mesh.material].flat()) material.color?.set(eyeColor);
      }
      const names = namesByIndex(mesh);
      mesh.morphTargetDictionary = Object.fromEntries(names.map((name, index) => [name, index]));
      mesh.morphTargetInfluences = names.map(name => {
        supported.add(name);
        return Object.hasOwn(parameters, name) ? parameters[name] : 0;
      });
      if ([mesh.material].flat().some(material => material?.normalMap) && mesh.geometry.index && mesh.geometry.attributes.uv) mesh.geometry.computeTangents();
    });
    for (const name of Object.keys(parameters)) if (!supported.has(name)) throw new Error(`Unsupported editing shape: ${name}.`);
    const body = scene.getObjectByName('Body');
    if (!body?.isSkinnedMesh || !body.geometry.morphAttributes.position?.length) throw new Error('The editing source has no supported rigged Body shape basis.');
    cover = createCanonicalCover(body);
    copyCoverTargets(body, cover);
    if (attachmentAssets) {
      // Retained morph combinations are evaluated by the external editor;
      // they cannot carry the browser's nonlinear posed contact solver.
      attachments = createParametricAttachments(body, attachmentAssets, { contactCorrection: false });
      retainParametricAttachmentShapes(body, attachments);
    }
    if (eyeAssets) {
      const sourceEyes = scene.getObjectByName('Eyes');
      eyes = createParametricEyes(sourceEyes, eyeAssets, { eyeColor });
      retainParametricEyeShapes(sourceEyes, eyes);
    }
    // Keep the immutable named morph basis while fitting the owned skeleton
    // against a temporary evaluation of the selected body identity.
    const basis = body.geometry, selected = new BufferGeometry();
    selected.setIndex(basis.index);
    // GLTFLoader can expose interleaved positions. Pack only xyz; copying its
    // backing array would also copy normals/UVs and corrupt joint anchors.
    const values = new Float32Array(basis.attributes.position.count * 3);
    for (let vertex = 0; vertex < basis.attributes.position.count; vertex++) for (let axis = 0; axis < 3; axis++) {
      values[vertex * 3 + axis] = basis.attributes.position.getComponent(vertex, axis);
    }
    const targets = basis.morphAttributes.position || [];
    for (let shape = 0; shape < targets.length; shape++) {
      const weight = body.morphTargetInfluences[shape];
      if (!weight) continue;
      for (let vertex = 0; vertex < basis.attributes.position.count; vertex++) for (let axis = 0; axis < 3; axis++) {
        const offset = vertex * 3 + axis;
        values[offset] += weight * (targets[shape].getComponent(vertex, axis) - (basis.morphTargetsRelative ? 0 : basis.attributes.position.getComponent(vertex, axis)));
      }
    }
    selected.setAttribute('position', new BufferAttribute(values, 3));
    try {
      body.geometry = selected;
      createParametricRigFit(body, basis, skeletons)?.update();
    } finally { body.geometry = basis; selected.dispose(); }
    scene.userData = { avatar: {
      asset: asset ? JSON.parse(JSON.stringify(asset)) : null,
      context, units: 'm', geometry: 'full-parametric-editing-basis',
      profile: 'desktop-shape-editing',
      rigFitting: 'selected-identity-rest-joints',
      rigFitParameters: { ...parameters },
      externalShapeEdits: 'refit-joints-and-garment-after-changing-identity',
      externalPoseEdits: 'refit-garment-after-changing-pose',
      fitValidity: { appliesTo: 'selected-identity-and-rest-pose', invalidatedBy: ['shape-weight-changes', 'pose-changes'], solverIncluded: false },
      browserSkinScattering: 'not-exported',
      shapeNormals: 'source-provided-only',
      coverFit: 'approximate-body-delta-transfer',
      attachments: attachmentAssets ? 'cc0-hair-and-tee-proxy-transfer' : 'none',
      eyeOptics: eyes ? eyes.statistics.eyeOptics : 'source-eyes',
      eyeFit: eyes ? 'affine-source-bounds-combinations-approximate' : 'source-eyes',
      license: 'CC0-1.0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      source: sourceUrl || (asset?.sourceRevision ? `https://github.com/nirholas/three.ws/tree/${asset.sourceRevision}/avatar-sources/anny` : 'https://github.com/nirholas/three.ws'),
      provenance: 'MakeHuman/MPFB2 basis via Anny and three.ws. Source notices accompany GrowthTrack editable packages.',
    } };
    scene.updateMatrixWorld(true);
    const statistics = Object.freeze({
      bodyShapeTargets: body.morphTargetInfluences.length,
      coverVertices: cover.mesh.geometry.attributes.position.count,
      coverShapeTargets: cover.mesh.morphTargetInfluences.length,
      attachmentMeshes: attachments?.meshes.length || 0,
      eyeMeshes: eyes?.meshes.length || 0,
      viewingGpuCompatibility: 'not-claimed-offline-export-only',
    });
    return { scene, statistics, dispose };
  } catch (error) { dispose(); throw error; }
}

/** Large standard GLB with named body/auxiliary shapes and selected weights. */
export async function exportParametricEditingAvatar(sourceScene, options) {
  const prepared = prepareParametricEditingScene(sourceScene, options);
  try { return await exportRiggedParametricAvatar(prepared.scene, prepared.scene.userData.avatar); }
  finally { prepared.dispose(); }
}
