import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  BODY_ALBEDO_REFERENCE,
  createPhysicalSkinMaterial,
  pubicHairDensity,
  updatePhysicalSkinMaterial,
} from '../components/body3d/physicalSkinMaterial';

describe('physical skin material', () => {
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
    // Type VI is #4D2E14 / #803014 in display values; materials hold linear values.
    expect(material.color.r).toBeCloseTo(new THREE.Color().setRGB(0.3, 0.18, 0.08, THREE.SRGBColorSpace).r, 4);
    expect(material.attenuationColor.r).toBeCloseTo(new THREE.Color().setRGB(0.5, 0.18, 0.08, THREE.SRGBColorSpace).r, 4);

    material.dispose();
  });

  it('renders a textured body at the chosen tone on average', () => {
    const map = new THREE.Texture();
    const material = createPhysicalSkinMaterial(3, new THREE.MeshStandardMaterial({ map }));
    const target = new THREE.Color().setRGB(0.78, 0.52, 0.26, THREE.SRGBColorSpace);
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
