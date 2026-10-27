import { describe, expect, it } from 'vitest';
import { MeshStandardMaterial, ShaderLib, Texture } from 'three';
import { APPEARANCE_DETAIL, appearanceHash, freckleCell, resolveFreckles, resolveHairDetail, resolveHumanRealism } from './appearanceDetail';
import { createHairCardMaterial } from '../components/morphEngine/featureMaterials';
import { createPhysicalSkinMaterial } from '../components/body3d/physicalSkinMaterial';
import { bodyProfileToGoals, metricsToBodyProfile, publicBodyMetrics } from './physiqueProfile';

describe('saved cosmetic surface detail', () => {
  it('keeps legacy profiles at full detail and bounds the realism percentage', () => {
    expect(resolveHumanRealism()).toBe(100);
    for (const value of [null, '', false, {}, [], 'invalid', NaN, Infinity]) {
      expect(resolveHumanRealism({ humanRealismPercent: value })).toBe(100);
    }
    expect(resolveHumanRealism({ humanRealismPercent: -20 })).toBe(0);
    expect(resolveHumanRealism({ humanRealismPercent: 120 })).toBe(100);
    expect(resolveHumanRealism({ humanRealismPercent: '35' })).toBe(35);
  });
  it('uses legacy-safe defaults and bounds malformed persisted values', () => {
    expect(resolveHairDetail()).toEqual({ density: 1, grey: 0, seed: 1 });
    expect(resolveFreckles()).toEqual(APPEARANCE_DETAIL.freckles.defaults);
    expect(resolveHairDetail({ hairDensity: -3, hairGrey: 9, hairSeed: Infinity })).toEqual({ density: 0, grey: 1, seed: 1 });
    for (const value of [null, '', false, {}, [], 'invalid', NaN, Infinity]) {
      expect(resolveFreckles({ skinFreckleSizeMm: value }).sizeMm).toBe(.65);
    }
    expect(resolveFreckles({ skinFreckleDensity: 5, skinFreckleSizeMm: -1, skinFreckleSeed: 65536.5 })).toMatchObject({ density: 1, sizeMm: .25, seed: 65535 });
  });

  it('matches unsigned 32-bit arithmetic for signed rest-space cells and all allowed seed extremes', () => {
    const u32 = value => BigInt.asUintN(32, value);
    const reference = (x, y, seed) => {
      let h = u32(BigInt(x) * 374761393n + BigInt(y) * 668265263n + BigInt(seed) * 1442695041n);
      h = u32((h ^ (h >> 13n)) * 1274126177n);
      return Number(u32(h ^ (h >> 16n)));
    };
    for (const x of [-10000, -1, 0, 1, 10000]) for (const y of [-100, 0, 100]) for (const seed of [1, 1234, 65535]) {
      expect(appearanceHash(x, y, seed)).toBe(reference(x, y, seed));
      const cell = freckleCell(x, y, seed);
      expect(cell).toEqual(freckleCell(x, y, seed));
      expect(cell.selected).toBeGreaterThanOrEqual(0); expect(cell.selected).toBeLessThan(1);
    }
    expect(freckleCell(15, -26, 1234)).not.toEqual(freckleCell(15, -26, 1235));
  });

  it('keeps clone uniforms separate while retaining source textures and using the same shadow cutout', () => {
    const source = new MeshStandardMaterial({ map: new Texture(), normalMap: new Texture() });
    const current = createHairCardMaterial(source, '#62412b', { hairDensity: .4, hairGrey: .7, hairSeed: 12 });
    const goal = createHairCardMaterial(source, '#171310', { hairDensity: .8, hairSeed: 42 });
    const compile = (material, library) => { const shader = { ...library, uniforms: {} }; material.onBeforeCompile(shader); return shader; };
    const visible = compile(current, ShaderLib.physical);
    const depth = compile(current.userData.depthMaterial, ShaderLib.depth);
    const distance = compile(current.userData.distanceMaterial, ShaderLib.distance);
    expect(visible.uniforms.uHairDetail.value.toArray()).toEqual([.4, .7, 12]);
    expect(depth.uniforms.uHairDetail).toBe(visible.uniforms.uHairDetail);
    expect(distance.uniforms.uHairDetail).toBe(visible.uniforms.uHairDetail);
    expect(visible.fragmentShader).toContain('sampledDiffuseColor.rgb * uHairSilverTint');
    for (const shader of [visible, depth, distance]) expect(shader.fragmentShader).toContain('if (retained >= uHairDetail.x) discard;');
    expect(goal.userData.hairDetail.value.toArray()).toEqual([.8, 0, 42]);
    current.userData.hairDetail.value.x = 0;
    expect(goal.userData.hairDetail.value.x).toBe(.8);
    expect(current.map).toBe(source.map); expect(current.normalMap).toBe(source.normalMap);
    for (const material of [current, goal]) { material.userData.depthMaterial.dispose(); material.userData.distanceMaterial.dispose(); material.dispose(); }
    source.dispose();
  });

  it('layers freckle pigment on rest coordinates without changing tone, maps or geometry', () => {
    const source = new MeshStandardMaterial({ map: new Texture(), normalMap: new Texture() });
    const material = createPhysicalSkinMaterial(3, source, { skinAppearance: { skinFreckleDensity: .8, skinFreckleSizeMm: .9, skinFreckleSeed: 456 } });
    const other = createPhysicalSkinMaterial(3, source);
    const shader = { ...ShaderLib.physical, uniforms: {} }; material.onBeforeCompile(shader);
    expect(shader.uniforms.uFreckles.value.toArray()).toEqual([.8, .9, .45, 456]);
    expect(other.uniforms.uFreckles.value.x).toBe(0);
    expect(material.color.toArray()).toEqual(other.color.toArray());
    expect(material.map).toBe(source.map); expect(material.normalMap).toBe(source.normalMap);
    expect(shader.vertexShader).toContain('vFreckleNormal = normal;');
    expect(shader.fragmentShader).toContain('skinFreckles(vGrowthTrackBasePosition, vSkinRegion.x)');
    material.dispose(); other.dispose(); source.dispose();
  });

  it('round-trips goal detail through the profile contract and excludes cosmetics from check-ins', () => {
    const detail = { hairGrey: .6, hairSeed: 74, hairDensity: .8, skinFreckleDensity: .5, skinFreckleSizeMm: .85, skinFreckleContrast: .7, skinFreckleSeed: 59, humanRealismPercent: 35 };
    expect(bodyProfileToGoals({}, { goalMetrics: detail })).toEqual(detail);
    const payload = metricsToBodyProfile(detail);
    expect(payload).toEqual({ hairDensity: .8, skinFreckleDensity: .5 });
    expect(publicBodyMetrics({ ...detail, height: 175 })).toEqual({ height: 175 });
  });
});
