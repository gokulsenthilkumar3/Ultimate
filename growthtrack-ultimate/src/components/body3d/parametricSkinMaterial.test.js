import { MeshPhysicalMaterial, ShaderLib, Texture, Color } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { createParametricSkinMaterial } from './parametricSkinMaterial';
import { updatePhysicalSkinMaterial } from './physicalSkinMaterial';

const pack = () => Object.fromEntries(['albedo', 'roughness', 'normal', 'scatterMask', 'thickness', 'diffusionLut'].map(name => [name, new Texture()]));
const manifest = { version: 'cc0-skin-v1', albedoReference: [0.776, 0.429, 0.27] };

describe('textured canonical skin', () => {
  it('retains authored PBR inputs and colour tint across edits without owning cached maps', () => {
    const textures = pack(), dispose = Object.values(textures).map(texture => vi.spyOn(texture, 'dispose'));
    const material = createParametricSkinMaterial(textures, manifest);
    expect(material).toBeInstanceOf(MeshPhysicalMaterial);
    expect(material.map).toBe(textures.albedo);
    expect(material.normalMap).toBe(textures.normal);
    expect(material.roughnessMap).toBe(textures.roughness);
    expect(material.roughness).toBe(1);
    expect(material.normalScale.toArray()).toEqual([0.3, 0.3]);
    updatePhysicalSkinMaterial(material, { skinColorHex: '#987755' });
    const target = new Color('#987755');
    for (let i = 0; i < 3; i++) expect(material.color.toArray()[i] * manifest.albedoReference[i]).toBeCloseTo(target.toArray()[i], 5);
    const portable = material.clone();
    expect(portable.map).toBe(textures.albedo);
    expect(portable.normalMap).toBe(textures.normal);
    portable.dispose(); material.dispose();
    dispose.forEach(spy => expect(spy).not.toHaveBeenCalled());
  });

  it('preintegrates a normalized diffusion profile with geometry thickness while retaining physical lights and shadows', () => {
    const textures = pack(), material = createParametricSkinMaterial(textures, manifest);
    const shader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader };
    material.onBeforeCompile(shader);
    expect(shader.uniforms.uParametricScatterMask.value).toBe(textures.scatterMask);
    expect(shader.fragmentShader).toContain('texture2D(uParametricDiffusionLut, lookup).rgb');
    expect(shader.fragmentShader).toContain('texture2D(uParametricThickness, vParametricSkinUv).rgb');
    expect(shader.fragmentShader).toContain('mix(integrated, vec3(max(-macroCosine, 0.0)), thinWeight)');
    expect(shader.fragmentShader).toContain('reflectedLight.directDiffuse += directLight.color * BRDF_Lambert(material.diffuseContribution)');
    expect(shader.fragmentShader).toContain('RE_Direct_Physical(directLight');
    expect(shader.fragmentShader).not.toContain('RE_Direct_GrowthTrackSkin');
    expect(shader.fragmentShader).not.toContain('vec3 wrapped =');
    expect(shader.fragmentShader).not.toContain('totalEmissiveRadiance +=');
    expect(shader.vertexShader).toContain('vParametricSkinUv = uv;');
    expect(shader.vertexShader).toContain('vParametricTissueNormal = normalize(transformedNormal);');
    expect(shader.uniforms.uParametricThickness.value).toBe(textures.thickness);
    expect(shader.uniforms.uParametricDiffusionDistanceMm.value.toArray()).toEqual([1.2, 0.55, 0.3]);
    expect(material.userData.skinScattering).toMatchObject({ model: 'burley-profile-local-preintegration-v1', regionalMask: true, thicknessMap: true, physiologicalDermalThickness: false });
    expect(material.transmission).toBe(0);
    expect(material.emissive.getHex()).toBe(0);
    updatePhysicalSkinMaterial(material, { skinScattering: false });
    expect(shader.uniforms.uSkinScatteringStrength.value).toBe(0);
    material.dispose();
  });

  it('rejects incomplete map packs and invalid colour calibration', () => {
    expect(() => createParametricSkinMaterial({}, manifest)).toThrow(/albedo/);
    expect(() => createParametricSkinMaterial(pack(), { albedoReference: [0, 0.5, 0.5] })).toThrow(/colour reference/);
    expect(() => createParametricSkinMaterial(pack(), manifest, '#bd8b6a', { tissueManifest: {} })).toThrow(/unit-labelled/);
  });
});
