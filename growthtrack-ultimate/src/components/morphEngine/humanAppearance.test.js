import { describe, expect, it } from 'vitest';
import { BufferGeometry, DoubleSide, Mesh, MeshBasicMaterial, Ray, Raycaster, Vector3 } from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { glbMeshFixture } from '../../tests/helpers/glbMeshFixture';
import { prepareEyelidCorrective } from './eyelidCorrective';
import { bindBrowsToSkin } from './browSurfaceBinding';
import { createIdle, createIdleController, idleMotionEnabled } from './idleMotion';
import { fitModelFeatures } from './fitModelFeatures';

const bundledModels = [
  'humanoid-base.glb', 'humanoid-base-lite.glb',
  'humanoid-adult-v2.glb', 'humanoid-adult-v2-lite.glb',
  'humanoid-preview-75.glb', 'humanoid-preview-75-lite.glb',
];

describe('human appearance on the shipped geometry', () => {
  it.each(bundledModels)('occludes the full sampled eye aperture from front and oblique angles in %s', file => {
    const { body, features } = glbMeshFixture(file, true);
    fitModelFeatures(body, features);
    const report = prepareEyelidCorrective(body, features);
    expect(report).not.toBeNull();
    const source = features.find(item => item.feature === 'eyes').mesh;
    const eyeGeometry = new BufferGeometry().setIndex(source.geometry.index);
    eyeGeometry.setAttribute('position', source.geometry.attributes.position.clone());
    eyeGeometry.applyMatrix4(source.matrixWorld);
    const eyeSurface = new MeshBVH(eyeGeometry, { indirect: true });
    // Bake only the positions required for intersection. Ordinary Mesh.raycast
    // otherwise reevaluates all 58 morph channels for every tested triangle.
    const skinGeometry = blink => {
      const geometry = new BufferGeometry().setIndex(body.geometry.index);
      const position = body.geometry.attributes.position.clone();
      const delta = body.geometry.morphAttributes.position[body.morphTargetDictionary.blink];
      for (let i = 0; i < position.array.length; i++) position.array[i] += delta.array[i] * blink;
      return geometry.setAttribute('position', position);
    };
    const openGeometry = skinGeometry(0), closedGeometry = skinGeometry(1);
    const openSurface = new MeshBVH(openGeometry, { indirect: true });
    const closedSurface = new MeshBVH(closedGeometry, { indirect: true });
    const ray = new Ray();
    for (const angle of [-.6, 0, .6]) {
      let exposed = 0;
      for (const eye of report.landmarks) for (let x = -4; x <= 4; x++) for (let y = 1; y < 5; y++) {
        const anchor = new Vector3(eye.x + x * .002, eye.lower + (eye.upper - eye.lower) * y / 5, eye.front - .003);
        const direction = new Vector3(Math.sin(angle), 0, Math.cos(angle));
        ray.set(anchor.add(direction), direction.clone().negate());
        const eyeball = eyeSurface.raycastFirst(ray, DoubleSide), open = openSurface.raycastFirst(ray, DoubleSide);
        if (!eyeball || open && open.distance < eyeball.distance) continue;
        exposed++;
        const closed = closedSurface.raycastFirst(ray, DoubleSide);
        expect(closed, `missing lid at angle ${angle}, aperture ${x},${y}`).not.toBeNull();
        expect(closed.distance).toBeLessThanOrEqual(eyeball.distance + .00001);
      }
      expect(exposed).toBeGreaterThan(60);
    }
    for (const geometry of [eyeGeometry, openGeometry, closedGeometry]) geometry.dispose();
  });
  it.each(bundledModels)('closes the eyelids over the eyeballs in %s without moving the rest of the body', file => {
    const { body, features } = glbMeshFixture(file, true);
    fitModelFeatures(body, features);
    const original = body.geometry.morphAttributes.position[body.morphTargetDictionary.blink];
    const report = prepareEyelidCorrective(body, features);
    expect(report?.moved).toBeGreaterThan(20);
    const corrected = body.geometry.morphAttributes.position[body.morphTargetDictionary.blink];
    expect(corrected).not.toBe(original);
    const position = body.geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      if (position.getY(i) < .70) expect(new Vector3().fromBufferAttribute(corrected, i).length()).toBe(0);
      expect(Number.isFinite(corrected.getY(i))).toBe(true);
    }
    const surface = new Mesh(body.geometry, new MeshBasicMaterial({ side: DoubleSide }));
    const ray = new Raycaster();
    const frontAt = (x, y, blink) => {
      surface.morphTargetInfluences[body.morphTargetDictionary.blink] = blink;
      ray.set(new Vector3(x, y, 1), new Vector3(0, 0, -1));
      return ray.intersectObject(surface)[0]?.point.z ?? -Infinity;
    };
    for (const eye of report.landmarks) {
      const y = eye.lower + (eye.upper - eye.lower) * .5;
      for (const dx of [-.003, 0, .003]) {
        expect(frontAt(eye.x + dx, y, 0)).toBeLessThan(eye.front - .004);
        expect(frontAt(eye.x + dx, y, 1)).toBeGreaterThanOrEqual(eye.front - .001);
      }
    }
    // A blink deforms the lids, never removes the eyes or folds the scalp.
    for (const { mesh, feature } of features) {
      if (!['eyes', 'hair'].includes(feature)) continue;
      expect(mesh.visible).toBe(true);
      expect(Array.from(mesh.geometry.morphAttributes.position[mesh.morphTargetDictionary.blink].array).every(value => value === 0)).toBe(true);
    }
    surface.material.dispose();
  });

  it.each(bundledModels)('binds eyebrow cards to the actual skin and transfers facial morphs without changing the other %s clone', file => {
    const { body, features } = glbMeshFixture(file, true);
    const other = glbMeshFixture(file, true);
    const otherBrow = other.features.find(item => item.feature === 'eyebrows').mesh;
    const untouched = Array.from(otherBrow.geometry.attributes.position.array);
    fitModelFeatures(body, features);
    prepareEyelidCorrective(body, features);
    const report = bindBrowsToSkin(body, features);
    expect(report.bound / report.total).toBeGreaterThan(.95);
    const brow = features.find(item => item.feature === 'eyebrows').mesh;
    expect(brow.userData.surfaceBinding.clearance).toBeGreaterThan(0);
    for (const target of brow.geometry.morphAttributes.position) expect(Array.from(target.array).every(Number.isFinite)).toBe(true);
    expect(Array.from(otherBrow.geometry.attributes.position.array)).toEqual(untouched);
  });
});

describe('natural idle motion', () => {
  it('is deterministic across sampling rates, fully closes blinks and uses a bounded natural rhythm', () => {
    const sparse = createIdle(17), frequent = createIdle(17);
    for (let t = 0; t < 120; t += 1 / 60) frequent.sample(t);
    expect(sparse.sample(120)).toEqual(frequent.sample(120));
    const times = sparse.blinkTimes(600);
    expect(times.length / 10).toBeGreaterThanOrEqual(12);
    expect(times.length / 10).toBeLessThanOrEqual(24);
    expect(sparse.sample(times[0] + .09).blink).toBe(1);
    for (let t = 0; t < 60; t += .05) {
      const sample = sparse.sample(t);
      expect(sample.blink).toBeGreaterThanOrEqual(0);
      expect(sample.blink).toBeLessThanOrEqual(1);
      expect(Math.abs(sample.gaze.yaw)).toBeLessThan(.03);
      expect(Math.abs(sample.gaze.pitch)).toBeLessThan(.02);
    }
  });

  it.each([
    { naturalMotion: false }, { reducedMotion: true }, { measurementView: true },
    { capturing: true }, { visible: false }, { current: false }, { solo: false },
    { normal: false }, { playing: false }, { animationId: 'walk' },
  ])('keeps inspection, capture and explicit user preferences still: %j', state => {
    expect(idleMotionEnabled()).toBe(true);
    expect(idleMotionEnabled(state)).toBe(false);
  });

  it('pauses the local clock without catch-up and preserves an explicit blink', () => {
    const a = createIdleController(17), b = createIdleController(17);
    expect(a.advance(.04, true)).toEqual(b.advance(.04, true));
    expect(a.advance(600, false, .8)).toEqual({ blink: .8, breath: 0, gaze: { yaw: 0, pitch: 0 }, active: false });
    expect(a.advance(.04, true)).toEqual(b.advance(.04, true));
    expect(a.advance(100, true)).toEqual(b.advance(.1, true));
    expect(a.advance(NaN, false, NaN).blink).toBe(0);
  });
});
