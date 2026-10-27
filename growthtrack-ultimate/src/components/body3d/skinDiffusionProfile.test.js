import { describe, expect, it } from 'vitest';
import { boundedSkinResponse, diffusionRadialCdf, diffusionRadialPdf, diffusionThicknessWeight, preintegratedDiffusion } from './skinDiffusionProfile';

describe('millimetre-normalized diffusion profile', () => {
  it('integrates the two-exponential radial distribution to unit surface albedo at different length scales', () => {
    for (const distance of [0.25, 1.2, 4.82]) {
      const steps = 20000, width = 60 * distance / steps;
      let integral = 0;
      for (let sample = 0; sample < steps; sample++) integral += diffusionRadialPdf((sample + 0.5) * width, distance) * width;
      expect(integral).toBeCloseTo(1, 5);
      expect(diffusionRadialCdf(60 * distance, distance)).toBeCloseTo(1, 7);
      expect(diffusionRadialCdf(0, distance)).toBe(0);
    }
  });

  it('preserves the profile when all physical distances use the same unit scaling', () => {
    expect(diffusionRadialPdf(8, 3) * 2).toBeCloseTo(diffusionRadialPdf(4, 1.5), 12);
    expect(diffusionRadialCdf(8, 3)).toBeCloseTo(diffusionRadialCdf(4, 1.5), 12);
    const original = preintegratedDiffusion(0.1, 0.04, [1.2, 0.55, 0.3]);
    const scaled = preintegratedDiffusion(0.1, 0.02, [2.4, 1.1, 0.6]);
    original.forEach((value, channel) => expect(scaled[channel]).toBeCloseTo(value, 12));
  });

  it('returns Lambert on a flat surface and spreads red farther at a curved terminator', () => {
    expect(preintegratedDiffusion(-0.2, 0)).toEqual([0, 0, 0]);
    expect(preintegratedDiffusion(0.65, 0)).toEqual([0.65, 0.65, 0.65]);
    const edge = preintegratedDiffusion(0, 0.04);
    expect(edge[0]).toBeGreaterThan(edge[1]);
    expect(edge[1]).toBeGreaterThan(edge[2]);
    expect(edge[2]).toBeGreaterThan(0);
  });

  it('retains Lambert total directional energy under the local-curvature preintegration', () => {
    for (const curvature of [0.005, 0.04, 0.2]) {
      const energy = [0, 0, 0], steps = 240;
      for (let sample = 0; sample < steps; sample++) {
        const value = preintegratedDiffusion(-1 + (sample + 0.5) * 2 / steps, curvature);
        value.forEach((channel, index) => { energy[index] += channel * 2 / steps; });
      }
      energy.forEach(value => expect(value).toBeCloseTo(0.5, 3));
    }
  });

  it('uses measured geometry distance only in a bounded thickness response and supports explicit no-scattering', () => {
    expect(diffusionThicknessWeight(0, 1.2)).toBe(1);
    expect(diffusionThicknessWeight(60, 1.2)).toBeLessThan(1e-6);
    expect(diffusionThicknessWeight(2, 1.2)).toBeGreaterThan(diffusionThicknessWeight(2, 0.3));
    for (const cosine of [-1, -0.5, 0, 0.5, 1]) for (const thickness of [0, 0.75, 3, 60]) {
      const response = boundedSkinResponse(cosine, 0.1, thickness);
      expect(response.every(value => Number.isFinite(value) && value >= 0 && value <= 1)).toBe(true);
      expect(boundedSkinResponse(cosine, 0.1, thickness, 0)).toEqual([Math.max(cosine, 0), Math.max(cosine, 0), Math.max(cosine, 0)]);
    }
    const valid = boundedSkinResponse(-0.6, 0, 1, 1, 1, 1), unknown = boundedSkinResponse(-0.6, 0, 1, 1, 1, 0);
    expect(valid[0]).toBeGreaterThan(valid[2]);
    expect(unknown).toEqual([0, 0, 0]);
  });

  it('rejects invalid dimensions, units and quadrature requests', () => {
    expect(() => diffusionRadialPdf(1, 0)).toThrow();
    expect(() => diffusionThicknessWeight(-1, 1)).toThrow();
    expect(() => preintegratedDiffusion(2, 0.1)).toThrow();
    expect(() => preintegratedDiffusion(0.1, Infinity)).toThrow();
    expect(() => preintegratedDiffusion(0.1, 0.1, [1, 2])).toThrow();
  });
});
