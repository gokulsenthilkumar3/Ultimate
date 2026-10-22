import { describe, expect, it } from 'vitest';
import { ShaderLib, SphereGeometry, Texture, Vector2 } from 'three';
import { createEyeMaterial, deriveEyeFrames, freezeEyePupil, updateEyePupil } from './eyeMaterial';
import { glbMeshFixture } from '../../tests/helpers/glbMeshFixture';
import { AVATAR_EXPOSURE } from '../../lib/avatarPresentation';
import { captureAvatarImage, registerCaptureGuard, registerCaptureScene } from './captureRuntime';

describe('wet eye material', () => {
  it.each(['humanoid-base.glb', 'humanoid-base-lite.glb', 'humanoid-adult-v2.glb', 'humanoid-adult-v2-lite.glb'])('derives a finite iris plane from each eye on %s without altering geometry', file => {
    const geometry = glbMeshFixture(file, true).features.find(item => item.feature === 'eyes').mesh.geometry;
    const original = geometry.attributes.position.array.slice(), { frames } = deriveEyeFrames(geometry);
    for (const frame of frames) {
      expect(frame.surface.toArray().every(Number.isFinite)).toBe(true);
      expect(frame.frontVertices).toBeGreaterThan(2);
      expect(frame.surface.w).toBeGreaterThan(.01); expect(frame.surface.w).toBeLessThan(.02);
    }
    expect(frames[0].surface.x).toBeLessThan(0); expect(frames[1].surface.x).toBeGreaterThan(0);
    expect(geometry.attributes.position.array).toEqual(original);
  });
  it('binds independent iris/pupil uniforms and retains the same coordinate varying through gaze and morphs', () => {
    const geometry = new SphereGeometry();
    const a = createEyeMaterial({}, geometry, '#4e7897', null, { eyeSeed: 321, eyePupilSizeMm: 5, irisLimbalRing: false });
    const b = createEyeMaterial({}, geometry, '#507453', null, { eyeSeed: 789, eyePupilMode: 'exposure' });
    const shader = { ...ShaderLib.physical, uniforms: {} }; a.onBeforeCompile(shader);
    expect(shader.uniforms.uEyeDetail.value.toArray()).toEqual([.6, 0, 321]);
    expect(shader.vertexShader).toContain('vEyeSurface=(position-eyeSurface.xyz)/eyeSurface.w;');
    expect(shader.fragmentShader).toContain('pupilCoverage');
    updateEyePupil(b, AVATAR_EXPOSURE.min, 0, true);
    expect(b.userData.pupil.value).toBe(7);
    expect(a.userData.pupil.value).toBe(5);
    expect(a.userData.eyeUniforms.uIrisPhase.value).not.toBe(b.userData.eyeUniforms.uIrisPhase.value);
    a.dispose(); b.dispose(); geometry.dispose();
  });
  it.each([false, true])('settles the capture pupil synchronously and restores its live transition, encoding failure=%s', failure => {
    const geometry = new SphereGeometry();
    const eye = createEyeMaterial({}, geometry, '#4e7897', null, { eyePupilMode: 'exposure', exposure: AVATAR_EXPOSURE.min });
    let ratio = 1, size = new Vector2(320, 240);
    const canvas = { width: 320, height: 240, toDataURL: () => {
      expect(eye.userData.pupil.value).toBe(2);
      if (failure) throw new Error('encoding failed');
      return 'data:image/png;base64,iVBORw==';
    } };
    const gl = { capabilities: { maxTextureSize: 4096 }, getSize: v => v.copy(size), getPixelRatio: () => ratio, setPixelRatio: v => { ratio = v; }, setSize: (x, y) => { size.set(x, y); }, render() {} };
    registerCaptureScene(canvas, { gl, scene: {}, camera: { aspect: 4 / 3, updateProjectionMatrix() {} } });
    registerCaptureGuard(canvas, () => freezeEyePupil(eye, AVATAR_EXPOSURE.max));
    if (failure) expect(() => captureAvatarImage(canvas)).toThrow('encoding failed'); else captureAvatarImage(canvas);
    expect(eye.userData.pupil.value).toBe(7);
    expect(eye.userData.pupil.target).toBe(7);
    eye.dispose(); geometry.dispose();
  });
  it('retains the iris texture while omitting an incorrectly shared body normal', () => {
    const geometry = new SphereGeometry(), map = new Texture(), bodyNormal = new Texture();
    const eye = createEyeMaterial({ map, normalMap: bodyNormal }, geometry, '#336699', bodyNormal);
    expect(eye.map).toBe(map);
    expect(eye.normalMap).toBeNull();
    expect(eye.clearcoat).toBe(1);
    expect(eye.clearcoatRoughness).toBeLessThan(.1);
    eye.dispose(); geometry.dispose();
  });

  it('keeps independently authored eye detail and per-clone gaze state', () => {
    const geometry = new SphereGeometry(), normalMap = new Texture();
    const a = createEyeMaterial({ normalMap }, geometry, '#336699');
    const b = createEyeMaterial({ normalMap }, geometry, '#663300');
    expect(a.normalMap).toBe(normalMap);
    a.userData.gaze.value.set(.02, -.01);
    expect(b.userData.gaze.value.toArray()).toEqual([0, 0]);
    a.dispose(); b.dispose(); geometry.dispose();
  });
});
