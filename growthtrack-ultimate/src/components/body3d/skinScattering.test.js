import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  createPhysicalSkinMaterial,
  resolveSkinScattering,
  SKIN_SCATTERING_DEFAULTS,
  updatePhysicalSkinMaterial,
} from './physicalSkinMaterial';
import { applyAnatomySurface } from '../morphEngine/anatomySurface';

function compileSkin(material) {
  const shader = {
    uniforms: {},
    vertexShader: THREE.ShaderLib.physical.vertexShader,
    fragmentShader: THREE.ShaderLib.physical.fragmentShader,
  };
  material.onBeforeCompile(shader);
  return shader;
}

describe('skin diffuse scattering approximation', () => {
  it('bounds angular broadening and strength, with an explicit off setting', () => {
    expect(resolveSkinScattering()).toEqual(SKIN_SCATTERING_DEFAULTS);
    expect(resolveSkinScattering(false).strength).toBe(0);
    expect(resolveSkinScattering({ strength: 2, wrap: -1 })).toEqual({ strength: 1, wrap: 0 });
    expect(resolveSkinScattering({ strength: NaN, wrap: Infinity })).toEqual(SKIN_SCATTERING_DEFAULTS);
    expect(resolveSkinScattering({ strength: 0, wrap: 0 })).toEqual({ strength: 0, wrap: 0 });
  });

  it('composes with the installed physical lighting equation and leaves skinning/morphs intact', () => {
    const source = new THREE.MeshStandardMaterial({
      map: new THREE.Texture(), normalMap: new THREE.Texture(), roughnessMap: new THREE.Texture(),
    });
    const material = createPhysicalSkinMaterial(3, source, { skinScattering: { strength: .3, wrap: .5 } });
    const shader = compileSkin(material);

    // Contract against the actual installed engine: a changed equation name,
    // signature, field or include order requires reviewing this integration.
    expect(THREE.REVISION).toBe('184');
    expect(THREE.ShaderChunk.lights_physical_pars_fragment).toContain('void RE_Direct_Physical( const in IncidentLight');
    expect(THREE.ShaderChunk.lights_physical_pars_fragment).toContain('BRDF_Lambert( material.diffuseContribution )');
    expect(shader.fragmentShader.indexOf('void RE_Direct_GrowthTrackSkin')).toBeGreaterThan(shader.fragmentShader.indexOf('#include <lights_physical_pars_fragment>'));
    expect(shader.fragmentShader.indexOf('#define RE_Direct RE_Direct_GrowthTrackSkin')).toBeLessThan(shader.fragmentShader.indexOf('#include <lights_fragment_begin>'));
    expect(shader.fragmentShader).toContain('RE_Direct_Physical(directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight);');
    expect(shader.fragmentShader).toContain('reflectedLight.directDiffuse += directLight.color * BRDF_Lambert(material.diffuseContribution)');
    expect(shader.fragmentShader).toContain('sheenCompensation = 1.0 - max3(material.sheenColor)');
    expect(shader.fragmentShader).not.toContain('reflectedLight.directSpecular +=');
    expect(shader.fragmentShader).toContain('growthTrackValueNoise');
    for (const chunk of ['skinning_vertex', 'skinnormal_vertex', 'morphtarget_vertex', 'morphnormal_vertex', 'shadowmap_vertex']) {
      expect(shader.vertexShader).toContain(`#include <${chunk}>`);
    }
    expect(shader.uniforms.uSkinScatteringStrength).toBe(material.uniforms.uSkinScatteringStrength);
    expect(shader.uniforms.uSkinScatteringWrap).toBe(material.uniforms.uSkinScatteringWrap);
    expect(material.uniforms.uSkinScatteringWrap.value.toArray()).toEqual([.5, .175, .09]);
    expect(material.map).toBe(source.map);
    expect(material.normalMap).toBe(source.normalMap);
    expect(material.roughnessMap).toBe(source.roughnessMap);
    expect(material.transmission).toBe(0);
    expect(material.emissiveIntensity).toBe(0);
    expect(material.emissive.getHex()).toBe(0);
    expect(material.userData.skinScattering).toMatchObject({ model: 'normalized-diffuse-wrap-v1', shaderStatus: 'installed', thicknessMap: false });
    expect(material.userData.skinScattering.limitations).toContain('no-screen-space-diffusion');
    material.dispose(); source.dispose();
  });

  it('uses Three.js shadow attenuation rather than bypassing it for scattering', () => {
    const directLights = THREE.ShaderChunk.lights_fragment_begin;
    for (const kind of ['Point', 'Spot', 'Directional']) {
      const shadow = directLights.indexOf(`get${kind === 'Point' ? 'PointShadow' : 'Shadow'}(`, kind === 'Point' ? 0 : directLights.indexOf(kind === 'Spot' ? 'SpotLight spotLight' : 'DirectionalLight directionalLight'));
      const call = directLights.indexOf('RE_Direct( directLight', shadow);
      expect(shadow).toBeGreaterThan(-1);
      expect(call).toBeGreaterThan(shadow);
    }
    const material = createPhysicalSkinMaterial(3);
    const shader = compileSkin(material);
    const wrapper = shader.fragmentShader.slice(shader.fragmentShader.indexOf('void RE_Direct_GrowthTrackSkin'));
    expect(wrapper).not.toMatch(/directLight\.color\s*=/);
    expect(wrapper).not.toContain('totalEmissiveRadiance +=');
    expect(material.userData.layeredSkinShader).toBe(false);
    expect(shader.vertexShader).toBe(THREE.ShaderLib.physical.vertexShader);
    material.dispose();
  });

  it('disables the approximation on the existing low-tier detail gate without losing tuning', () => {
    const material = createPhysicalSkinMaterial(3, null, { skinScattering: { strength: .4, wrap: .2 }, skinAppearance: { humanRealismPercent: 50 } });
    const uniform = material.uniforms.uSkinScatteringStrength;
    expect(uniform.value).toBe(.2);
    updatePhysicalSkinMaterial(material, { microDetail: false });
    expect(uniform.value).toBe(0);
    expect(material.userData.skinScattering.strength).toBe(.4);
    updatePhysicalSkinMaterial(material, { microDetail: true });
    expect(uniform.value).toBe(.2);
    updatePhysicalSkinMaterial(material, { skinScattering: { wrap: .8, strength: .6 } });
    expect(uniform.value).toBe(.3);
    expect(material.uniforms.uSkinScatteringWrap.value.x).toBe(.8);
    updatePhysicalSkinMaterial(material, { skinScattering: false });
    expect(uniform.value).toBe(0);
    material.dispose();
  });

  it('keeps current and goal configurations isolated and respects zero realism', () => {
    const current = createPhysicalSkinMaterial(0, null, { skinScattering: { strength: .5 } });
    const goal = createPhysicalSkinMaterial(5, null, { skinScattering: { strength: .1 } });
    const smooth = createPhysicalSkinMaterial(3, null, { skinAppearance: { humanRealismPercent: 0 } });
    updatePhysicalSkinMaterial(current, { skinScattering: { strength: .9, wrap: .7 }, fitzpatrickIndex: 1 });
    expect(goal.uniforms.uSkinScatteringStrength.value).toBe(.1);
    expect(goal.uniforms.uSkinScatteringWrap.value.x).toBe(SKIN_SCATTERING_DEFAULTS.wrap);
    expect(current.uniforms.uSkinScatteringWrap.value).not.toBe(goal.uniforms.uSkinScatteringWrap.value);
    expect(smooth.uniforms.uSkinScatteringStrength.value).toBe(0);
    updatePhysicalSkinMaterial(smooth, { microDetail: true });
    expect(smooth.uniforms.uSkinScatteringStrength.value).toBe(0);
    for (const material of [current, goal, smooth]) material.dispose();
  });

  it('retains chained anatomy shader patches and records unsupported shader layouts', () => {
    const material = applyAnatomySurface(createPhysicalSkinMaterial(3, null, { surfaceDetail: true }));
    const shader = compileSkin(material);
    expect(shader.fragmentShader).toContain('void RE_Direct_GrowthTrackSkin');
    expect(shader.fragmentShader).toContain('float glansSurface');
    expect(shader.uniforms.uAnatomyCoverage).toBe(material.userData.anatomyCoverage);
    expect(material.customProgramCacheKey()).toContain('normalized-skin-wrap-v1');
    expect(material.customProgramCacheKey()).toContain('anatomy-v5');
    material.onBeforeCompile({ uniforms: {}, vertexShader: 'void main() {}', fragmentShader: 'void main() {}' });
    expect(material.userData.skinScattering.shaderStatus).toBe('unsupported-shader');
    compileSkin(material);
    expect(material.userData.skinScattering.shaderStatus).toBe('installed');
    material.dispose();
  });
});
