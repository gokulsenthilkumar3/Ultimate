import { describe, expect, it } from 'vitest';
import { MeshStandardMaterial, ShaderLib, Texture } from 'three';
import { glbMeshFixture } from '../../tests/helpers/glbMeshFixture';
import { bodyProfileToGoals, metricsToBodyProfile, publicBodyMetrics } from '../../lib/physiqueProfile';
import { prepareSkinRegions, skinLayerMultiplier } from './skinAppearance';
import { createPhysicalSkinMaterial } from './physicalSkinMaterial';
import { TAN_LINE_PATTERNS, resolveTanPattern, tanExposureAt } from './skinTanLines';
import { garmentCoverage } from '../../lib/wardrobeCoverage';

describe('saved clothing exposure history', () => {
  it('protects the selected garment regions without painting bands across hands or head', () => {
    expect(tanExposureAt('swim', [.1, .8], [1, 1, 0, 0])).toBe(0);
    expect(tanExposureAt('swim', [.1, 1.3], [0, 1, 0, 0])).toBe(1);
    expect(tanExposureAt('tank', [.1, 1.3], [0, 1, 0, 0])).toBe(0);
    expect(tanExposureAt('tank', [.3, 1.6], [0, 0, 1, 0])).toBe(1);
    expect(tanExposureAt('tee', [.3, 1.6], [0, 0, 1, 0])).toBe(0);
    expect(tanExposureAt('tee', [.5, 1.1], [0, 0, 0, 1])).toBe(1);
    expect(tanExposureAt('long', [.5, 1.1], [0, 0, 0, 1])).toBe(0);
    for (const { id } of TAN_LINE_PATTERNS) {
      expect(tanExposureAt(id, [.45, .8], [0, 0, 0, 0])).toBe(1); // hand at shorts height
      expect(tanExposureAt(id, [0, 1.8], [0, 0, 0, 0])).toBe(1); // face
    }
  });

  it('retains a tank neckline and soft, monotonic hem transitions', () => {
    expect(tanExposureAt('tank', [0, 1.5], [0, 1, 0, 0])).toBe(1);
    expect(tanExposureAt('tank', [.19, 1.5], [0, 1, 0, 0])).toBe(0);
    const exposure = [.66, .674, .68, .686, .70].map(y => tanExposureAt('swim', [.1, y], [1, 1, 0, 0]));
    expect(exposure).toEqual([...exposure].sort((a, b) => b - a));
    expect(exposure[2]).toBeCloseTo(.5);
    expect(exposure[0]).toBe(1); expect(exposure.at(-1)).toBe(0);
  });

  it('defaults unknown history to no pattern and does not mutate garment bands', () => {
    expect(resolveTanPattern('__proto__').id).toBe('none');
    expect(tanExposureAt('unknown', [.1, .8], [1, 1, 0, 0])).toBe(1);
    const first = garmentCoverage('GYM', 'tank'); first.lower[0] = -100;
    expect(garmentCoverage('GYM', 'tank').lower).toEqual([.62, .99]);
  });

  it.each(['humanoid-base.glb', 'humanoid-base-lite.glb', 'humanoid-adult-v2.glb', 'humanoid-adult-v2-lite.glb'])('binds continuous masks to the real %s surface', file => {
    const { body } = glbMeshFixture(file), original = body.geometry.attributes.position.array.slice();
    prepareSkinRegions(body);
    const geometry = body.geometry, regions = geometry.attributes.skinTanRegions, coordinates = geometry.attributes.skinTanCoordinates;
    expect(regions.count).toBe(original.length / 3);
    expect(Array.from(regions.array).every(value => Number.isFinite(value) && value >= 0 && value <= 1.00001)).toBe(true);
    const exposures = Array.from({ length: regions.count }, (_, i) => tanExposureAt('tank', [coordinates.getX(i), coordinates.getY(i)], [regions.getX(i), regions.getY(i), regions.getZ(i), regions.getW(i)]));
    expect(exposures.filter(value => value < .01).length).toBeGreaterThan(500);
    expect(exposures.filter(value => value > .99).length).toBeGreaterThan(500);
    expect(exposures.filter(value => value > 0 && value < 1).length).toBeGreaterThan(100);
    expect(body.geometry.attributes.position.array).toEqual(original);
    // The same rest-coordinate attributes stay attached as morphs and rig pose
    // move the surface; they are not recomputed from the deformed height.
    body.morphTargetInfluences[0] = 1;
    expect(body.geometry.attributes.skinTanCoordinates).toBe(coordinates);
  });

  it('changes only the tan term: flush and undertone remain on protected skin', () => {
    const layers = { tan: 1, flush: .3, undertone: -.5 };
    const protectedSkin = skinLayerMultiplier({ ...layers, exposure: tanExposureAt('tank', [.1, 1.3], [0, 1, 0, 0]) });
    expect(protectedSkin).toEqual(skinLayerMultiplier({ ...layers, tan: 0 }));
    expect(protectedSkin).not.toEqual([1, 1, 1]);
    expect(skinLayerMultiplier({ tan: 0 })).toEqual([1, 1, 1]);
  });

  it('keeps separate per-clone uniforms and all source maps through the physical shader', () => {
    const source = new MeshStandardMaterial({ map: new Texture(), normalMap: new Texture() });
    const current = createPhysicalSkinMaterial(3, source, { skinAppearance: { skinTan: .7, skinTanPattern: 'tank' } });
    const goal = createPhysicalSkinMaterial(3, source, { skinAppearance: { skinTan: .2, skinTanPattern: 'swim' } });
    const shader = { ...ShaderLib.physical, uniforms: {} }; current.onBeforeCompile(shader);
    expect(shader.fragmentShader).toContain('vSkinRegion.x*skinSunCoverage()');
    expect(shader.uniforms.uTanLower).toBe(current.uniforms.uTanLower);
    current.uniforms.uTanLower.value.x = -4;
    expect(goal.uniforms.uTanLower.value.x).toBe(.68);
    expect(current.map).toBe(source.map); expect(current.normalMap).toBe(source.normalMap);
    for (const material of [current, goal, source]) material.dispose();
  });

  it('round-trips goal appearance without adding measurement database fields or check-in values', () => {
    const metrics = { height: 175, skinTan: .7, skinTanPattern: 'tank' };
    expect(metricsToBodyProfile(metrics)).toEqual({ heightCm: 175 });
    expect(publicBodyMetrics(metrics)).toEqual({ height: 175 });
    expect(bodyProfileToGoals({}, { goalMetrics: metrics })).toEqual(metrics);
  });
});
