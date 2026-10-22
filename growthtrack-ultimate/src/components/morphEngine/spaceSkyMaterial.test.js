import { describe, expect, it, vi } from 'vitest';
import { WebGLCoordinateSystem } from 'three';
import { bakeSpaceSky, createSpaceSkyMaterial } from './spaceSkyMaterial';
import { SPACE_SKY_PRESETS, spaceSkyResolution } from '../../lib/spaceSky';
import { DEFAULT_AVATAR_PRESENTATION, sanitizeAvatarPresentation } from '../../lib/avatarPresentation';

describe('space sky resources and saved settings', () => {
  it('round trips every preset without changing measurements or the camera and floor', () => {
    for (const preset of SPACE_SKY_PRESETS) {
      const value = sanitizeAvatarPresentation({ backgroundMode: 'space', spaceSky: preset.id, weight: 80 });
      expect(value).toEqual({ ...DEFAULT_AVATAR_PRESENTATION, backgroundMode: 'space', spaceSky: preset.id });
      expect(sanitizeAvatarPresentation(JSON.parse(JSON.stringify(value)))).toEqual(value);
    }
    expect(sanitizeAvatarPresentation({ spaceSky: 'https://example.test/sky' }).spaceSky).toBe('void-studio');
    expect(sanitizeAvatarPresentation({ backgroundMode: 'space', cameraMode: 'HANGING', showStage: true }).showStage).toBe(false);
    expect(['LOW','MED','HIGH'].map(spaceSkyResolution)).toEqual([128,256,512]);
  });

  it('uses distinct preset uniforms and a subdued version of the same shader for reflections', () => {
    const materials = SPACE_SKY_PRESETS.map(preset => createSpaceSkyMaterial(preset.id));
    expect(new Set(materials.map(material => material.uniforms.uPreset.value)).size).toBe(5);
    const reflection = createSpaceSkyMaterial('aurora', 0.12);
    expect(reflection.fragmentShader).toBe(materials[3].fragmentShader);
    expect(reflection.uniforms.uIntensity.value).toBe(0.12);
    [...materials, reflection].forEach(material => material.dispose());
  });

  function renderer(render = vi.fn()) {
    return {
      coordinateSystem: WebGLCoordinateSystem, xr: { enabled: true }, autoClear: false,
      getRenderTarget: () => 'previous-target', getActiveCubeFace: () => 2, getActiveMipmapLevel: () => 1,
      setRenderTarget: vi.fn(), render,
    };
  }

  it('bakes six faces without body geometry and releases temporary resources', () => {
    let geometryDisposed = false, materialDisposed = false;
    const gl = renderer(vi.fn(scene => {
      expect(scene.children).toHaveLength(1);
      scene.children[0].geometry.addEventListener('dispose', () => { geometryDisposed = true; });
      scene.children[0].material.addEventListener('dispose', () => { materialDisposed = true; });
    }));
    const target = bakeSpaceSky(gl, 'nebula', 'LOW');
    expect(gl.render).toHaveBeenCalledTimes(6);
    expect(target.width).toBe(128);
    expect(target.texture.name).toBe('SpaceSky:nebula');
    expect(gl.setRenderTarget).toHaveBeenLastCalledWith('previous-target',2,1);
    expect(gl.xr.enabled).toBe(true);
    expect(gl.autoClear).toBe(false);
    expect(geometryDisposed && materialDisposed).toBe(true);
    target.dispose();
  });

  it('restores the renderer and frees the cube when a bake fails', () => {
    const gl = renderer(vi.fn(() => { throw new Error('GPU allocation failed'); }));
    let targetDisposed = false;
    gl.setRenderTarget.mockImplementation(target => {
      if (typeof target === 'object') target.addEventListener('dispose', () => { targetDisposed = true; });
    });
    expect(() => bakeSpaceSky(gl,'orbit','MED')).toThrow('GPU allocation failed');
    expect(targetDisposed).toBe(true);
    expect(gl.setRenderTarget).toHaveBeenLastCalledWith('previous-target',2,1);
    expect(gl.xr.enabled).toBe(true);
    expect(gl.autoClear).toBe(false);
  });
});
