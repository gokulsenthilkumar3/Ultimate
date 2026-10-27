import { readFileSync } from 'node:fs';
import { Color, Texture, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { cloneHumanoidScene } from './cloneHumanoidScene';
import { createParametricIdentity } from './parametricIdentity';
import { createParametricEyes, EYE_OPTICS, refractEyeRay, retainParametricEyeShapes } from './parametricEyes';

let source;
beforeAll(async () => {
  const data = readFileSync('public/assets/models/parametric-base-v1.glb');
  const bytes = new ArrayBuffer(data.length); new Uint8Array(bytes).set(data);
  source = (await new GLTFLoader().parseAsync(bytes, '')).scene;
});
const assets = () => ({ albedo: new Texture(), manifest: JSON.parse(readFileSync('public/assets/parametric/eyes/manifest.json', 'utf8')) });

describe('layered canonical eye assembly', () => {
  it('obeys Snell refraction instead of making view-independent iris offsets', () => {
    const normal = new Vector3(0, 0, 1), straight = new Vector3(0, 0, -1);
    expect(refractEyeRay(straight, normal).toArray()).toEqual([0, 0, -1]);
    for (const degrees of [20, 45, 60]) {
      const angle = degrees * Math.PI / 180, incident = new Vector3(Math.sin(angle), 0, -Math.cos(angle));
      const refracted = refractEyeRay(incident, normal);
      expect(refracted.length()).toBeCloseTo(1, 8);
      expect(refracted.x).toBeCloseTo(Math.sin(angle) / EYE_OPTICS.effectiveIor, 8);
      expect(Math.acos(-refracted.z)).toBeLessThan(angle);
      expect(refractEyeRay(incident, normal, 1).distanceTo(incident)).toBeLessThan(1e-8);
    }
    expect(() => refractEyeRay(straight, normal, 0)).toThrow(/IOR/);
    expect(() => refractEyeRay(new Vector3(), normal)).toThrow(/nonzero/);
    expect(() => refractEyeRay(normal, normal)).toThrow(/incident/);
  });

  it('creates physically separated opaque iris/pupil, aperture sclera and forward-facing transmissive corneas', () => {
    const identity = createParametricIdentity(source), eyes = identity.scene.getObjectByName('Eyes'), pack = assets();
    const original = eyes.geometry.attributes.position.array.slice(), originalVisibility = eyes.visible;
    const textureDisposal = vi.spyOn(pack.albedo, 'dispose'), geometryDisposal = vi.spyOn(eyes.geometry, 'dispose'), skeletonDisposal = vi.spyOn(eyes.skeleton, 'dispose');
    const assembly = createParametricEyes(eyes, pack);
    try {
      expect(eyes.visible).toBe(false);
      expect(assembly.meshes).toHaveLength(8);
      expect(assembly.update()).toBe(false);
      for (const record of assembly.records) {
        const mesh = record.mesh, positions = mesh.geometry.attributes.position, normals = mesh.geometry.attributes.normal;
        expect(mesh.parent).toBe(eyes.parent);
        expect(mesh.skeleton).toBe(eyes.skeleton);
        expect(mesh.geometry.morphAttributes.position).toBeUndefined();
        expect(positions.array.every(Number.isFinite)).toBe(true);
        for (let i = 0; i < normals.count; i++) expect(Math.hypot(normals.getX(i), normals.getY(i), normals.getZ(i))).toBeCloseTo(1, 5);
        if (record.kind !== 'sclera') for (let i = 0; i < normals.count; i++) expect(normals.getZ(i)).toBeGreaterThan(0.5);
        if (record.kind === 'cornea') {
          expect(mesh.material.transmission).toBe(1);
          expect(mesh.material.ior).toBe(EYE_OPTICS.effectiveIor);
          expect(mesh.material.thickness).toBeGreaterThan(0);
          expect(mesh.castShadow).toBe(false);
          const iris = assembly.records.find(candidate => candidate.side === record.side && candidate.kind === 'iris');
          mesh.geometry.computeBoundingBox(); iris.mesh.geometry.computeBoundingBox();
          expect(mesh.geometry.boundingBox.max.z - iris.mesh.geometry.boundingBox.max.z).toBeGreaterThan(0.002);
        }
      }
      expect(eyes.geometry.attributes.position.array).toEqual(original);
    } finally {
      assembly.dispose(); assembly.dispose();
      expect(eyes.visible).toBe(originalVisibility);
      expect(assembly.meshes.every(mesh => !mesh.parent)).toBe(true);
      expect(textureDisposal).not.toHaveBeenCalled(); expect(geometryDisposal).not.toHaveBeenCalled(); expect(skeletonDisposal).not.toHaveBeenCalled();
      identity.dispose(); pack.albedo.dispose();
    }
  });

  it('follows eye identity moves and the head pose while each figure keeps independent iris colour', () => {
    const first = createParametricIdentity(source), second = createParametricIdentity(source), pack = assets();
    const eyes = first.scene.getObjectByName('Eyes'), assembly = createParametricEyes(eyes, pack, { eyeColor: '#336633' });
    const other = createParametricEyes(second.scene.getObjectByName('Eyes'), pack, { eyeColor: '#3366aa' });
    try {
      const before = assembly.meshes[0].geometry.attributes.position.array.slice(), colourBefore = other.meshes.find(mesh => mesh.userData.eyeLayer === 'iris').material.color.clone();
      first.setWeights({ eyeOutwardLeft: 0.8, eyeHigherRight: 0.6, headWider: 0.4 });
      expect(assembly.update({ eyeColor: '#663322' })).toBe(true);
      expect(assembly.meshes[0].geometry.attributes.position.array).not.toEqual(before);
      expect(other.meshes.find(mesh => mesh.userData.eyeLayer === 'iris').material.color).toEqual(colourBefore);
      const cornea = assembly.meshes.find(mesh => mesh.userData.eyeLayer === 'cornea');
      const neutral = cornea.applyBoneTransform(0, new Vector3().fromBufferAttribute(cornea.geometry.attributes.position, 0));
      eyes.skeleton.bones.find(bone => /Head$/.test(bone.name)).rotation.y = 0.2;
      first.scene.updateMatrixWorld(true); eyes.skeleton.update();
      const posed = cornea.applyBoneTransform(0, new Vector3().fromBufferAttribute(cornea.geometry.attributes.position, 0));
      expect(posed.distanceTo(neutral)).toBeGreaterThan(0.005);
      expect(assembly.meshes.every(mesh => mesh.bindMatrix.equals(eyes.bindMatrix))).toBe(true);
      expect(assembly.meshes.find(mesh => mesh.userData.eyeLayer === 'iris').material.color).toBeInstanceOf(Color);
      for (const eyeColor of ['#523b2d', '#ffffff', '#00ff00', '#000000']) {
        assembly.update({ eyeColor });
        for (const mesh of assembly.meshes.filter(mesh => mesh.userData.eyeLayer === 'iris')) {
          expect(mesh.material.color.toArray().every(value => Number.isFinite(value) && value >= 0 && value <= 1)).toBe(true);
        }
      }
    } finally { assembly.dispose(); other.dispose(); first.dispose(); second.dispose(); pack.albedo.dispose(); }
  });

  it('keeps all 30 source eye channels in offline geometry without touching the cached basis', () => {
    const scene = cloneHumanoidScene(source), eyes = scene.getObjectByName('Eyes'), sourceEyes = source.getObjectByName('Eyes'), pack = assets();
    const original = sourceEyes.geometry.attributes.position.array.slice(), originalWeights = [...sourceEyes.morphTargetInfluences];
    eyes.morphTargetInfluences[eyes.morphTargetDictionary.eyeOutwardLeft] = 0.65;
    const assembly = createParametricEyes(eyes, pack), baseline = assembly.meshes.map(mesh => mesh.geometry.attributes.position.array.slice());
    try {
      retainParametricEyeShapes(eyes, assembly);
      assembly.meshes.forEach((mesh, index) => {
        expect(mesh.geometry.morphAttributes.position).toHaveLength(30);
        expect(mesh.geometry.morphAttributes.normal).toHaveLength(30);
        expect(mesh.morphTargetDictionary).toEqual(eyes.morphTargetDictionary);
        expect(mesh.morphTargetInfluences[eyes.morphTargetDictionary.eyeOutwardLeft]).toBe(0.65);
        expect(mesh.geometry.attributes.position.array).toEqual(baseline[index]);
        expect(mesh.geometry.morphAttributes.position.every(attribute => attribute.array.every(Number.isFinite))).toBe(true);
        expect(mesh.geometry.morphAttributes.normal.every(attribute => attribute.array.every(Number.isFinite))).toBe(true);
      });
      expect(sourceEyes.geometry.attributes.position.array).toEqual(original);
      expect(sourceEyes.morphTargetInfluences).toEqual(originalWeights);
    } finally { assembly.dispose(); pack.albedo.dispose(); }
  });

  it('rejects malformed sources and restores visibility after construction failure', () => {
    expect(() => createParametricEyes(null)).toThrow(/canonical/);
    const identity = createParametricIdentity(source), eyes = identity.scene.getObjectByName('Eyes');
    expect(() => createParametricEyes(eyes, {}, { eyeColor: 'url(example)' })).toThrow(/colour/);
    expect(eyes.visible).toBe(true);
    const assembly = createParametricEyes(eyes);
    assembly.dispose();
    expect(() => assembly.update()).toThrow(/disposed/);
    identity.dispose();
  });
});
