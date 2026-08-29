import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  createPhysicalSkinMaterial,
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
    expect(material.color.r).toBeCloseTo(0.3, 4);
    expect(material.attenuationColor.r).toBeCloseTo(0.5, 4);

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
});
