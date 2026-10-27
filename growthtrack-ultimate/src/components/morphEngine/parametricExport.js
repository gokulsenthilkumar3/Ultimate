import { BufferGeometry, Scene } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { cloneHumanoidScene } from './cloneHumanoidScene.js';

/** r184's exporter assumes bones[0] is the root; this basis orders it otherwise. */
export function normalizeExportedSkinRoots(gltf) {
  const nodes = gltf.nodes || [], parents = new Map();
  nodes.forEach((node, parent) => {
    for (const child of node.children || []) {
      if (!Number.isInteger(child) || child < 0 || child >= nodes.length || parents.has(child)) throw new Error('The exported rig has invalid node ancestry.');
      parents.set(child, parent);
    }
  });
  const ancestors = joint => {
    const result = [];
    while (joint !== undefined) {
      if (!Number.isInteger(joint) || joint < 0 || joint >= nodes.length || result.includes(joint)) throw new Error('The exported rig has an invalid joint hierarchy.');
      result.push(joint); joint = parents.get(joint);
    }
    return result;
  };
  for (const skin of gltf.skins || []) {
    if (!skin.joints?.length) throw new Error('The exported rig has no joints.');
    const paths = skin.joints.map(ancestors);
    const root = paths[0].find(candidate => paths.every(path => path.includes(candidate)));
    if (root === undefined) delete skin.skeleton; // optional for a forest of root joints
    else skin.skeleton = root;
  }
  return gltf;
}

export async function exportRiggedParametricAvatar(source, metadata, { bodyMaterial } = {}) {
  // Export a detached skeleton clone, retaining source buffers but never
  // reparenting or disposing live renderer resources. The wrapper is identity.
  if (source.position.lengthSq() > 1e-12 || source.quaternion.angleTo(source.quaternion.clone().identity()) > 1e-8 || source.scale.toArray().some(value => Math.abs(value - 1) > 1e-8)) throw new Error('The canonical export wrapper must retain its original transform.');
  const clone = cloneHumanoidScene(source), scene = new Scene();
  const ownedMaterials = [], ownedGeometries = [];
  if (bodyMaterial) {
    const fallback = bodyMaterial.clone();
    // Zero emission remains zero with default strength. Avoid exporting an
    // ineffective strength extension for the opaque PBR fallback.
    if (fallback.emissive?.r === 0 && fallback.emissive.g === 0 && fallback.emissive.b === 0) fallback.emissiveIntensity = 1;
    clone.getObjectByName('Body').material = fallback;
    ownedMaterials.push(fallback);
  }
  // WebGL derives the normal-map tangent frame in the shader. A portable GLB
  // should carry tangents, but computing them on every slider change is costly.
  // Give only this detached export an owned geometry container/tangent array;
  // the live positions, UVs and identity bank remain shared and untouched.
  clone.traverse(mesh => {
    const sourceGeometry = mesh.geometry;
    if (!mesh.isMesh || sourceGeometry?.attributes.tangent || !sourceGeometry?.index || !sourceGeometry.attributes.uv
      || ![mesh.material].flat().some(material => material?.normalMap)) return;
    const geometry = new BufferGeometry();
    geometry.setIndex(sourceGeometry.index);
    for (const [name, attribute] of Object.entries(sourceGeometry.attributes)) geometry.setAttribute(name, attribute);
    geometry.morphAttributes = Object.fromEntries(Object.entries(sourceGeometry.morphAttributes).map(([name, targets]) => [name, [...targets]]));
    geometry.morphTargetsRelative = sourceGeometry.morphTargetsRelative;
    for (const group of sourceGeometry.groups) geometry.addGroup(group.start, group.count, group.materialIndex);
    geometry.setDrawRange(sourceGeometry.drawRange.start, sourceGeometry.drawRange.count);
    geometry.userData = { ...sourceGeometry.userData };
    ownedGeometries.push(geometry); mesh.geometry = geometry;
    geometry.computeTangents();
  });
  scene.name = 'GrowthTrack parametric avatar';
  scene.userData = { avatar: metadata };
  const addRoot = node => {
    const identity = node.position.lengthSq() < 1e-12 && node.quaternion.angleTo(node.quaternion.clone().identity()) < 1e-8 && node.scale.toArray().every(value => Math.abs(value - 1) < 1e-8);
    // Omit identity-only scene wrappers, leaving skinned meshes as glTF scene
    // roots. Preserve every bone, mesh and nonidentity group transform.
    if ((node.isGroup || node.type === 'Object3D') && identity) for (const child of [...node.children]) addRoot(child);
    else scene.add(node);
  };
  for (const child of [...clone.children]) addRoot(child);
  scene.updateMatrixWorld(true);
  const skeletons = new Set();
  scene.traverse(node => { if (node.isSkinnedMesh) { skeletons.add(node.skeleton); node.skeleton.update(); } });
  const exporter = new GLTFExporter();
  exporter.register(writer => ({
    name: 'GrowthTrackCanonicalSkinRoot',
    afterParse() { normalizeExportedSkinRoots(writer.json); },
  }));
  try { return await exporter.parseAsync(scene, { binary: true, onlyVisible: true, trs: true }); }
  finally {
    for (const skeleton of skeletons) skeleton.dispose();
    for (const material of ownedMaterials) material.dispose();
    for (const geometry of ownedGeometries) geometry.dispose();
  }
}
