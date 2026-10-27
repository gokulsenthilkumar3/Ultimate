import { readFileSync } from 'node:fs';
import { Euler, Matrix4, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createParametricIdentity } from './parametricIdentity.js';
import { createParametricAttachments, retainParametricAttachmentShapes } from './parametricAttachments.js';
import { bakePosedSurface, solveGarmentContact } from './posedGarmentContact.js';
import { measureGarmentContact, GARMENT_POSES } from '../../../scripts/parametric-portrait/review-garment-matrix.mjs';

let source, assets;
beforeAll(async () => {
  const bytes = readFileSync('public/assets/models/parametric-base-v1.glb');
  const array = new ArrayBuffer(bytes.byteLength); new Uint8Array(array).set(bytes);
  source = (await new GLTFLoader().parseAsync(array, '')).scene;
  assets = { hair: { data: JSON.parse(readFileSync('public/assets/parametric/attachments/short02.json', 'utf8')) }, garment: { data: JSON.parse(readFileSync('public/assets/parametric/attachments/tee.json', 'utf8')) } };
});
const shapes = [
  {}, { headWider: 1 }, { headTaller: 1 }, { headDeeper: 1 }, { bodyHeavier: 1 },
  { shouldersWider: 1, chestDeeper: 0.7 }, { bustBigger: 1 }, { armsThicker: 1 },
  { waistWider: 1, bellyBigger: 0.6 }, { heightTaller: 0.5, bodyMasculine: 0.7 },
];

describe('authored canonical hair and tee attachments', () => {
  it('certifies the wide flexed torso after fallback while retaining negative signed diagnostics', () => {
    const identity = createParametricIdentity(source), body = identity.scene.getObjectByName('Body');
    identity.setWeights({ waistWider: 1 });
    const attachments = createParametricAttachments(body, assets);
    let bodyGeometry, garmentGeometry;
    try {
      for (const [name, angles] of Object.entries(GARMENT_POSES.find(pose => pose.id === 'torso-flexed').joints)) {
        body.skeleton.bones.find(bone => bone.name.replace(/^mixamorig:?/, '') === name).quaternion.setFromEuler(new Euler(...angles));
      }
      identity.scene.updateMatrixWorld(true); body.skeleton.update(); attachments.update();
      const garment = attachments.meshes.find(mesh => mesh.userData.authoredAttachment === 'tee');
      expect(garment.userData.contactFit.solver).toBe('convex-parts-certified-exterior');
      bodyGeometry = bakePosedSurface(body); garmentGeometry = bakePosedSurface(garment);
      const result = measureGarmentContact(bodyGeometry, garmentGeometry, { originalVertices: assets.garment.data.originalVertices, bodyMesh: body });
      expect(result.pass).toBe(true); expect(result.legacySignedPass).toBe(false);
      expect(result.minimumSignedNearestMm).toBeLessThan(0);
      expect(result.intersectionPairs).toBe(0); expect(result.minimumTriangleGapMm).toBeGreaterThanOrEqual(2);
      expect(result.proxyExterior.outsideProxy).toBe(true);
    } finally { bodyGeometry?.dispose(); garmentGeometry?.dispose(); attachments.dispose(); identity.dispose(); }
  }, 60000);

  it('applies transferred worker geometry only after a valid fit and preserves the live buffers', async () => {
    const identity = createParametricIdentity(source), body = identity.scene.getObjectByName('Body');
    const worker = { postMessage: vi.fn(), terminate: vi.fn() };
    const attachments = createParametricAttachments(body, assets, { asyncFitting: true, workerFactory: () => worker });
    const garment = attachments.meshes.find(mesh => mesh.userData.authoredAttachment === 'tee');
    try {
      expect(garment.visible).toBe(false);
      const ready = attachments.flush();
      const [message, transfers] = worker.postMessage.mock.calls[0];
      // Emulate the browser's transfer semantics; the body and displayed tee
      // must never share these detached buffers.
      const copied = structuredClone(message, { transfer: transfers });
      expect(body.geometry.attributes.position.array.byteLength).toBeGreaterThan(0);
      expect(garment.geometry.attributes.position.array.byteLength).toBeGreaterThan(0);
      const solved = solveGarmentContact(copied.payload);
      worker.onmessage({ data: { revision: copied.revision, ...solved } });
      await expect(ready).resolves.toMatchObject({ status: 'ready' });
      expect(garment.visible).toBe(true);
      const previous = garment.geometry.attributes.position.array.slice();
      identity.setWeights({ waistWider: 0.6 }); attachments.update();
      expect(garment.geometry.attributes.position.array).toEqual(previous);
      expect(garment.visible).toBe(true);
      expect(attachments.fittingState.status).toBe('pending');
    } finally { attachments.dispose(); identity.dispose(); }
  });

  it('keeps a fitted short-body reach clear after mapping back to render coordinates', () => {
    const identity = createParametricIdentity(source), body = identity.scene.getObjectByName('Body');
    identity.setWeights({ heightShorter: 0.75 });
    const attachments = createParametricAttachments(body, assets);
    const garment = attachments.meshes.find(mesh => mesh.userData.authoredAttachment === 'tee');
    let bodyGeometry, garmentGeometry;
    try {
      for (const [name, angles] of Object.entries(GARMENT_POSES.find(pose => pose.id === 'forward-reach').joints)) {
        body.skeleton.bones.find(bone => bone.name.replace(/^mixamorig:?/, '') === name).quaternion.setFromEuler(new Euler(...angles));
      }
      identity.scene.updateMatrixWorld(true); body.skeleton.update(); attachments.update();
      expect(garment.userData.contactFit.converged).toBe(true);
      bodyGeometry = bakePosedSurface(body); garmentGeometry = bakePosedSurface(garment);
      const contact = measureGarmentContact(bodyGeometry, garmentGeometry, { originalVertices: assets.garment.data.originalVertices, bodyMesh: body });
      expect(contact.pass, JSON.stringify(contact)).toBe(true);
      expect(contact.intersectionPairs).toBe(0);
      expect(contact.minimumTriangleGapMm).toBeGreaterThanOrEqual(2);
    } finally { bodyGeometry?.dispose(); garmentGeometry?.dispose(); attachments.dispose(); identity.dispose(); }
  }, 15000);

  it('retains authored patterns/UV seams, transfers normalized skin weights and owns its resources', () => {
    const identity = createParametricIdentity(source), body = identity.scene.getObjectByName('Body');
    const sourcePositions = body.geometry.attributes.position.array.slice();
    const disposeBody = vi.fn(); body.geometry.addEventListener('dispose', disposeBody);
    const attachments = createParametricAttachments(body, assets);
    expect(attachments.meshes.map(mesh => mesh.name)).toEqual(['Authored short02 hair', 'Authored casual tee']);
    expect(attachments.statistics).toMatchObject({ attachmentVertices: 2977, attachmentTriangles: 4872, attachmentMorphLayers: 0 });
    for (const mesh of attachments.meshes) {
      expect(mesh.skeleton).toBe(body.skeleton);
      expect(mesh.parent).toBe(body.parent);
      expect(mesh.geometry.morphAttributes.position).toBeUndefined();
      const weights = mesh.geometry.attributes.skinWeight;
      for (let vertex = 0; vertex < weights.count; vertex++) {
        const sum = [0, 1, 2, 3].reduce((value, component) => value + weights.getComponent(vertex, component), 0);
        expect(sum).toBeCloseTo(1, 6);
      }
    }
    expect(assets.hair.data.anchors.every(anchor => anchor.original < 13380)).toBe(true);
    expect(assets.garment.data.anchors.some(anchor => anchor.original >= 13380)).toBe(true);
    expect(attachments.update()).toBe(false);
    attachments.dispose(); attachments.dispose();
    expect(attachments.meshes.every(mesh => !mesh.parent)).toBe(true);
    expect(disposeBody).not.toHaveBeenCalled();
    expect(body.geometry.attributes.position.array).toEqual(sourcePositions);
    expect(() => attachments.update()).toThrow(/disposed/);
    identity.dispose();
  });

  it('follows ten identity configurations with finite geometry and the declared signed vertex clearance', () => {
    const original = source.getObjectByName('Body').geometry.attributes.position.array.slice();
    const identity = createParametricIdentity(source), body = identity.scene.getObjectByName('Body');
    const attachments = createParametricAttachments(body, assets);
    const initialHair = attachments.meshes[0].geometry.attributes.position.array.slice();
    let changedVertices = 0;
    try {
      for (const shape of shapes) {
        identity.setWeights(shape); attachments.update();
        const bodyPosition = body.geometry.attributes.position, bodyNormal = body.geometry.attributes.normal;
        for (const record of attachments.records) {
          const points = record.mesh.geometry.attributes.position, normals = record.mesh.geometry.attributes.normal;
          expect(points.array.every(Number.isFinite)).toBe(true); expect(normals.array.every(Number.isFinite)).toBe(true);
          for (let vertex = 0; vertex < points.count; vertex++) {
            const sample = record.data.clearanceBindings[vertex], anchor = new Vector3(), normal = new Vector3();
            for (let k = 0; k < 3; k++) {
              anchor.addScaledVector(new Vector3().fromBufferAttribute(bodyPosition, sample.indices[k]), sample.weights[k]);
              normal.addScaledVector(new Vector3().fromBufferAttribute(bodyNormal, sample.indices[k]), sample.weights[k]);
            }
            normal.normalize();
            const signed = new Vector3().fromBufferAttribute(points, vertex).sub(anchor).dot(normal);
            expect(signed).toBeGreaterThanOrEqual(record.data.clearanceMetres - 2e-7);
          }
        }
        if (shape.headWider) changedVertices = attachments.meshes[0].geometry.attributes.position.array.filter((value, i) => Math.abs(value - initialHair[i]) > 1e-5).length;
      }
      expect(changedVertices).toBeGreaterThan(1000);
      expect(source.getObjectByName('Body').geometry.attributes.position.array).toEqual(original);
    } finally { attachments.dispose(); identity.dispose(); }
  }, 20000);

  it('shares a canonical bind space and follows head/arm poses after identity changes', () => {
    const identity = createParametricIdentity(source), body = identity.scene.getObjectByName('Body');
    identity.setWeights({ headWider: 0.6, shouldersWider: 0.5 });
    const attachments = createParametricAttachments(body, assets), hair = attachments.meshes[0];
    try {
      const head = body.skeleton.bones.find(bone => /Head$/.test(bone.name));
      const initial = hair.applyBoneTransform(0, new Vector3().fromBufferAttribute(hair.geometry.attributes.position, 0));
      head.rotation.z += 0.2; identity.scene.updateMatrixWorld(true); body.skeleton.update();
      const posed = hair.applyBoneTransform(0, new Vector3().fromBufferAttribute(hair.geometry.attributes.position, 0));
      expect(posed.distanceTo(initial)).toBeGreaterThan(0.005);
      for (const mesh of attachments.meshes) {
        expect(mesh.bindMatrix.elements).toEqual(body.bindMatrix.elements);
        for (let vertex = 0; vertex < mesh.geometry.attributes.position.count; vertex += 25) {
          const result = mesh.applyBoneTransform(vertex, new Vector3().fromBufferAttribute(mesh.geometry.attributes.position, vertex));
          expect(result.toArray().every(Number.isFinite)).toBe(true);
        }
      }
      // Avatar transforms are copied instead of accidentally applying twice.
      body.position.x = 0.12; body.scale.setScalar(1.1); body.updateMatrix(); attachments.update();
      expect(hair.matrix.elements).toEqual(body.matrix.elements);
      expect(hair.bindMatrixInverse.elements).toEqual(body.bindMatrixInverse.elements);
    } finally { attachments.dispose(); identity.dispose(); }
  });

  it('retains all 306 named offline shape deltas without changing the live source', () => {
    const body = source.getObjectByName('Body'), original = body.geometry.attributes.position.array.slice(), originalWeights = [...body.morphTargetInfluences];
    // The editing scene owns its source-independent geometry and skeleton.
    const identity = createParametricIdentity(source), editingBody = identity.scene.getObjectByName('Body');
    editingBody.geometry.morphAttributes = body.geometry.morphAttributes;
    editingBody.geometry.morphTargetsRelative = body.geometry.morphTargetsRelative;
    editingBody.morphTargetDictionary = { ...body.morphTargetDictionary };
    editingBody.morphTargetInfluences = body.morphTargetInfluences.map(() => 0);
    editingBody.morphTargetInfluences[body.morphTargetDictionary.headWider] = 0.65;
    const attachments = createParametricAttachments(editingBody, assets);
    try {
      retainParametricAttachmentShapes(editingBody, attachments);
      for (const mesh of attachments.meshes) {
        expect(mesh.geometry.morphAttributes.position).toHaveLength(306);
        expect(mesh.morphTargetDictionary).toEqual(body.morphTargetDictionary);
        expect(mesh.morphTargetInfluences[mesh.morphTargetDictionary.headWider]).toBe(0.65);
        expect(mesh.geometry.morphAttributes.position.every(attribute => attribute.array.every(Number.isFinite))).toBe(true);
      }
      expect(body.geometry.attributes.position.array).toEqual(original);
      expect(body.morphTargetInfluences).toEqual(originalWeights);
    } finally { attachments.dispose(); identity.dispose(); }
  }, 20000);

  it('rejects topology swaps and supports the older no-attachment export profile', () => {
    expect(createParametricAttachments(null, null).meshes).toEqual([]);
    const identity = createParametricIdentity(source), body = identity.scene.getObjectByName('Body');
    const attachments = createParametricAttachments(body, assets);
    try {
      const oldIndex = body.geometry.index;
      body.geometry.setIndex(oldIndex.clone());
      expect(() => attachments.update()).toThrow(/topology/);
      body.geometry.setIndex(oldIndex);
      expect(() => createParametricAttachments(body, { hair: { data: { ...assets.hair.data, bodyVertexCount: 2 } } })).toThrow(/topology/);
      expect(body.bindMatrix).toBeInstanceOf(Matrix4);
    } finally { attachments.dispose(); identity.dispose(); }
  });
});
