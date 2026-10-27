import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SKIN_APPEARANCE_PRESETS } from '../lib/skinAppearancePresets';
import {
  BODY_ALBEDO_REFERENCE,
  createPhysicalSkinMaterial,
  pubicHairDensity,
  updatePhysicalSkinMaterial,
} from '../components/body3d/physicalSkinMaterial';

describe('physical skin material', () => {
  it('uses the same six display swatches as the editor and never adds self-emission', () => {
    SKIN_APPEARANCE_PRESETS.forEach(({ hex }, index) => {
      const material = createPhysicalSkinMaterial(index);
      const expected = new THREE.Color(hex);
      expect(material.color.r).toBeCloseTo(expected.r, 5);
      expect(material.color.g).toBeCloseTo(expected.g, 5);
      expect(material.color.b).toBeCloseTo(expected.b, 5);
      updatePhysicalSkinMaterial(material, { fitzpatrickIndex: index });
      expect(material.emissiveIntensity).toBe(0);
      expect(material.emissive.getHex()).toBe(0);
      material.dispose();
    });
  });
  it('keeps authored PBR maps while using the physical material pipeline', () => {
    const map = new THREE.Texture();
    const normalMap = new THREE.Texture();
    const roughnessMap = new THREE.Texture();
    const metallicMap = new THREE.Texture();
    const aoMap = new THREE.Texture();
    const source = new THREE.MeshStandardMaterial({ map, normalMap, roughnessMap, metalnessMap: metallicMap });
    source.aoMap = aoMap;
    source.vertexColors = true;

    const material = createPhysicalSkinMaterial(3, source, { bodyHairIntensity: 0.25 });

    expect(material).toBeInstanceOf(THREE.MeshPhysicalMaterial);
    expect(material.map).toBe(map);
    expect(material.normalMap).toBe(normalMap);
    expect(material.roughnessMap).toBe(roughnessMap);
    expect(material.metalnessMap).toBe(metallicMap);
    expect(material.aoMap).toBeNull();
    expect(material.clearcoat).toBeGreaterThan(0);
    expect(material.sheen).toBeGreaterThan(0);
    expect(material.thickness).toBeGreaterThan(0);
    expect(material.userData.aoStrategy).toBe('baked-base-color');
    expect(material.uniforms.uBodyHairIntensity.value).toBe(0.25);

    material.dispose();
    source.dispose();
  });

  it('updates appearance uniforms without replacing the material', () => {
    const material = createPhysicalSkinMaterial(0);
    updatePhysicalSkinMaterial(material, {
      fitzpatrickIndex: 5,
      vascularityIntensity: 0.72,
      bodyHairIntensity: 0.46,
      time: 4.5,
    });

    expect(material.uniforms.uVascularityIntensity.value).toBe(0.72);
    expect(material.uniforms.uBodyHairIntensity.value).toBe(0.46);
    expect(material.uniforms.uTime.value).toBe(4.5);
    expect(material.color.r).toBeCloseTo(new THREE.Color('#51382c').r, 4);
    expect(material.emissiveIntensity).toBe(0);

    material.dispose();
  });

  it('blends surface detail independently of skin identity, source maps and performance gating', () => {
    const source = new THREE.MeshStandardMaterial({ map: new THREE.Texture(), normalMap: new THREE.Texture(), roughnessMap: new THREE.Texture() });
    source.normalScale.set(.6,.8);
    const settings = { skinMicroDetail: .8, skinFreckleDensity: .6, skinFreckleSeed: 24 };
    const full = createPhysicalSkinMaterial(3, source, { skinAppearance: settings });
    const half = createPhysicalSkinMaterial(3, source, { skinAppearance: { ...settings, humanRealismPercent: 50 } });
    const smooth = createPhysicalSkinMaterial(3, source, { skinAppearance: { ...settings, humanRealismPercent: 0 } });
    expect(full.normalScale.toArray()).toEqual([.6,.8]);
    expect(half.normalScale.toArray()).toEqual([.3,.4]);
    expect(smooth.normalScale.toArray()).toEqual([0,0]);
    expect(source.normalScale.toArray()).toEqual([.6,.8]);
    for (const [material, percent, strength] of [[full,100,.8],[half,50,.4],[smooth,0,0]]) {
      expect(material.userData.humanRealismPercent).toBe(percent);
      expect(material.uniforms.uSkinMicroStrength.value).toBe(strength);
      expect(material.map).toBe(source.map);
      expect(material.normalMap).toBe(source.normalMap);
      expect(material.roughnessMap).toBe(source.roughnessMap);
      expect(material.color.toArray()).toEqual(full.color.toArray());
      expect(material.uniforms.uFreckles.value.toArray()).toEqual(full.uniforms.uFreckles.value.toArray());
      for (const microDetail of [false,true]) {
        updatePhysicalSkinMaterial(material,{microDetail});
        expect(material.uniforms.uHumanRealism.value).toBe(percent/100);
        expect(material.uniforms.uSkinMicroStrength.value).toBe(strength);
        expect(material.uniforms.uSkinMicroDetail.value).toBe(microDetail?1:0);
      }
      const shader={...THREE.ShaderLib.physical,uniforms:{}};
      material.onBeforeCompile(shader);
      expect(shader.uniforms.uHumanRealism).toBe(material.uniforms.uHumanRealism);
      expect(shader.fragmentShader).toContain('roughnessFactor = mix(roughness,roughnessFactor,uHumanRealism)');
      material.dispose();
    }
    source.dispose();
  });

  it('supports atlas-free anatomy surface detail when explicitly requested', () => {
    const microTile=new THREE.Texture();
    const material=createPhysicalSkinMaterial(3,null,{surfaceDetail:true,microTile,skinAppearance:{humanRealismPercent:50,skinMicroDetail:.8}});
    const shader={...THREE.ShaderLib.physical,uniforms:{}};
    material.onBeforeCompile(shader);
    expect(material.map).toBeNull();
    expect(material.userData.layeredSkinShader).toBe(true);
    expect(shader.uniforms.uSkinMicroTile.value).toBe(microTile);
    expect(shader.uniforms.uSkinMicroReady.value).toBe(1);
    expect(shader.uniforms.uSkinMicroStrength.value).toBe(.4);
    expect(shader.fragmentShader).toContain('vGrowthTrackBasePosition*1000.0');
    material.dispose();microTile.dispose();
  });

  it('renders a textured body at the chosen tone on average', () => {
    const map = new THREE.Texture();
    const material = createPhysicalSkinMaterial(3, new THREE.MeshStandardMaterial({ map }));
    const target = new THREE.Color('#ac7d63');
    // texture median × tint = the type IV colour (within the clamp range).
    expect(material.color.r * BODY_ALBEDO_REFERENCE[0]).toBeCloseTo(target.r, 3);
    expect(material.color.g * BODY_ALBEDO_REFERENCE[1]).toBeCloseTo(target.g, 3);
    expect(material.color.b * BODY_ALBEDO_REFERENCE[2]).toBeCloseTo(target.b, 3);
    material.dispose();
  });

  it('places pubic hair from the anatomy anchor and the profile body-hair pattern', () => {
    expect([undefined, '', 'natural', 'light', 'none', 'defined'].map(pubicHairDensity)).toEqual([0.9, 0.9, 0.9, 0.5, 0, 1]);
    const source = new THREE.MeshStandardMaterial({ map: new THREE.Texture() });
    const material = createPhysicalSkinMaterial(3, source, { pubicRegion: { origin: [0, 0.05, 0.12], unitsPerCm: 0.0099, pattern: 'light', color: '#3a2a1a' } });
    // Stored for the reveal; the uniform stays off until the anatomy is shown.
    expect(material.userData.pubicHairDensity).toBe(0.5);
    expect(material.uniforms.uPubicHair.value).toBe(0);
    expect(material.uniforms.uPubicOrigin.value.toArray()).toEqual([0, 0.05, 0.12]);
    expect(material.uniforms.uUnitsPerCm.value).toBe(0.0099);
    // Without an anchor (no anatomy in the asset) the region stays off.
    expect(createPhysicalSkinMaterial(3, source).userData.pubicHairDensity).toBe(0);
    material.dispose();
  });

  it('accepts a validated custom skin color while retaining the PBR response', () => {
    const material = createPhysicalSkinMaterial(3, null, { skinColorHex: '#A56B42' });
    expect(material.color.r).toBeCloseTo(new THREE.Color('#A56B42').r, 4);

    updatePhysicalSkinMaterial(material, { fitzpatrickIndex: 1, skinColorHex: '#6B3B20' });
    expect(material.color.g).toBeCloseTo(new THREE.Color('#6B3B20').g, 4);
    expect(material.uniforms.uBaseColor.value.b).toBeCloseTo(new THREE.Color('#6B3B20').b, 4);

    material.dispose();
  });

  it('ignores unrelated shader materials used by diagnostic modes', () => {
    const material = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 7 } },
      vertexShader: 'void main(){gl_Position=vec4(position,1.0);}',
      fragmentShader: 'void main(){gl_FragColor=vec4(1.0);}',
    });

    expect(() => updatePhysicalSkinMaterial(material, { time: 12 })).not.toThrow();
    expect(material.uniforms.uTime.value).toBe(7);
    material.dispose();
  });
});
