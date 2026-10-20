import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { ANATOMY_BUMP_SCALE, ANATOMY_SURFACE_SIZE, anatomySurfaceHeight, applyAnatomySurface, getAnatomySurfaceTexture } from './anatomySurface';

describe('anatomy surface', () => {
  it('keeps the shaft nearly flat and folds the scrotum', () => {
    const range = (v0, v1) => {
      const values = [];
      for (let u = 0; u < 1; u += 0.01) for (let v = v0; v < v1; v += 0.01) values.push(anatomySurfaceHeight(u, v));
      return Math.max(...values) - Math.min(...values);
    };
    expect(range(0, 0.5)).toBeLessThan(0.05);
    expect(range(0.65, 0.95)).toBeGreaterThan(0.15);
    expect(range(0.65, 0.95) * ANATOMY_BUMP_SCALE).toBeLessThan(0.0005);
    // No folds where the skin joins the body.
    expect(range(0.5, 0.55)).toBeLessThan(0.1);
  });

  it('shares one mipmapped, non-colour texture and enables vertex pigment', () => {
    const texture = getAnatomySurfaceTexture();
    expect(getAnatomySurfaceTexture()).toBe(texture);
    expect(texture.image.width).toBe(ANATOMY_SURFACE_SIZE);
    expect(texture).toMatchObject({ generateMipmaps: true, colorSpace: THREE.NoColorSpace, wrapS: THREE.RepeatWrapping });
    const material = applyAnatomySurface(new THREE.MeshPhysicalMaterial());
    expect(material).toMatchObject({ vertexColors: true, bumpMap: texture });
    expect(material.bumpScale).toBe(ANATOMY_BUMP_SCALE);
  });

  it('joins the circumferential UV seam without a visible height jump', () => {
    for (const v of [.1, .3, .55, .7, .8, .95]) expect(anatomySurfaceHeight(0, v)).toBeCloseTo(anatomySurfaceHeight(1, v), 8);
  });
});
