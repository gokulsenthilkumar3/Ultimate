import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { HAIR_ALBEDO_REFERENCE, STRAND_FEATURES, createHairCardMaterial, createStrandMaterial, hairAlbedoTint, scalpHairline } from './featureMaterials';

describe('feature materials', () => {
  it('tints hair relative to the texture so the chosen colour is the rendered average', () => {
    const tint = hairAlbedoTint('#21140f');
    const target = new THREE.Color('#21140f');
    tint.forEach((value, channel) => expect(value * HAIR_ALBEDO_REFERENCE[channel]).toBeCloseTo([target.r, target.g, target.b][channel], 5));
    expect(Math.max(...hairAlbedoTint('#ffffff'))).toBe(10);
    expect(Math.min(...hairAlbedoTint('#000000'))).toBe(0.05);
  });

  it('draws hair cards opaque and alpha tested, without clearcoat', () => {
    const material = createHairCardMaterial({ map: new THREE.Texture() }, '#21140f');
    expect(material).toMatchObject({ transparent: false, alphaTest: 0.5, alphaToCoverage: true, clearcoat: 0, side: THREE.DoubleSide });
  });

  it.each(STRAND_FEATURES)('blends %s and colours them from the hair colour', (feature) => {
    const material = createStrandMaterial(feature, { map: new THREE.Texture() }, '#21140f');
    expect(material).toMatchObject({ transparent: true, depthWrite: false, alphaTest: 0.02 });
    const shader = { fragmentShader: '#include <map_fragment>' };
    material.onBeforeCompile(shader);
    expect(shader.fragmentShader).toContain('diffuseColor.rgb = diffuse;');
    expect(material.color.r).toBeLessThanOrEqual(new THREE.Color('#21140f').r);
  });

  it('derives the scalp hairline from the rest-pose crown and stature', () => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, -0.8, 0, 0, 0.9, 0], 3));
    // A morph must not move the hairline: it is measured on rest positions.
    geometry.morphAttributes.position = [new THREE.Float32BufferAttribute([0, 0, 0, 0, 0.5, 0], 3)];
    const buzz = scalpHairline(geometry, 'buzz');
    expect(buzz.stature).toBeCloseTo(1.7, 6);
    expect(buzz.front).toBeCloseTo(0.9 - 0.028 * 1.7, 6);
    expect(buzz.back).toBeCloseTo(0.9 - 0.085 * 1.7, 6);
    const cards = scalpHairline(geometry, 'short');
    expect(cards.front).toBeLessThan(buzz.front);
    expect(cards.back).toBeLessThan(buzz.back);
    expect(scalpHairline(null, 'short')).toBeNull();
  });
});
