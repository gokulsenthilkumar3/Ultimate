import { describe, expect, it } from 'vitest';
import { needsAnimatedFrames, renderInputsChanged } from './avatarRenderPolicy';
import { modelLoadTier, resolveModelAsset } from './modelAssetRegistry';

const quiet = {
  gpuTier: 'MED', viewMode: 'SOLO', autoRotate: false,
  avatarWorkspace: { naturalMotion: true, showStage: true, lightingMode: 'neutral', inspectorOpen: true, inspectorSection: 'measurements', avatarContext: 'current' },
  animationState: { animationId: 'idle', playing: true },
};

describe('on-demand avatar rendering', () => {
  it('lets a neutral measurement view rest even with the floor visible', () => {
    expect(needsAnimatedFrames(quiet)).toBe(false);
    expect(needsAnimatedFrames({ ...quiet, animationState: { animationId: 'walk', playing: false } })).toBe(false);
  });
  it('keeps deliberate movement, camera rotation and cinematic staging live', () => {
    expect(needsAnimatedFrames({ ...quiet, autoRotate: true })).toBe(true);
    expect(needsAnimatedFrames({ ...quiet, poseDragging: true })).toBe(true);
    expect(needsAnimatedFrames({ ...quiet, avatarWorkspace:{...quiet.avatarWorkspace,inspectorSection:'pose'}, animationState: { animationId: 'walk', playing: true } })).toBe(true);
    expect(needsAnimatedFrames({ ...quiet, avatarWorkspace: { ...quiet.avatarWorkspace, lightingMode: 'cinematic' } })).toBe(true);
  });
  it('animates natural motion only outside measurement and goal inspection, respecting reduced motion', () => {
    const appearance = { ...quiet, avatarWorkspace: { ...quiet.avatarWorkspace, inspectorSection: 'face' } };
    expect(needsAnimatedFrames(appearance)).toBe(true);
    expect(needsAnimatedFrames(appearance, true)).toBe(false);
    expect(needsAnimatedFrames({ ...appearance, avatarWorkspace: { ...appearance.avatarWorkspace, avatarContext: 'goal' } })).toBe(false);
  });
  it('wakes for scene edits and capture protection without a telemetry feedback loop', () => {
    expect(renderInputsChanged({ ...quiet, cameraRevision: 2 }, { ...quiet, cameraRevision: 1 })).toBe(true);
    expect(renderInputsChanged({ ...quiet, captureRedacted: true }, quiet)).toBe(true);
    expect(renderInputsChanged({ ...quiet, rendererQualityTelemetry: { fps: 60 } }, quiet)).toBe(false);
    expect(renderInputsChanged({ ...quiet, modelRegionFrames: {} }, quiet)).toBe(false);
  });
});

describe('model downloads independent of adaptive GPU tiers', () => {
  it.each(['automatic', 'balanced', 'performance'])('keeps %s on a lightweight bundled model', preference => {
    expect(resolveModelAsset({ modelPreset: 'male' }, modelLoadTier(preference)).path).toMatch(/humanoid-human-r2-core\.glb$/);
  });
  it('loads full detail only when requested and preserves a saved custom model', () => {
    expect(resolveModelAsset({ modelPreset: 'male' }, modelLoadTier('high')).path).toMatch(/humanoid-human-r2-hero\.glb$/);
    expect(resolveModelAsset({ avatarAsset: 'my-saved-model.glb' }, modelLoadTier('automatic')).path).toMatch(/my-saved-model\.glb$/);
    expect(resolveModelAsset({ modelPreset: 'male', modelVersion: 'human-r2' }, modelLoadTier('automatic')).lod).toBe('core');
  });
});

it('does not spend frames on overridden motion or static presets',()=>{
  const moving={...quiet,avatarWorkspace:{...quiet.avatarWorkspace,inspectorSection:'pose'},animationState:{animationId:'walking',playing:true}};
  expect(needsAnimatedFrames(moving)).toBe(true);
  expect(needsAnimatedFrames({...moving,avatarWorkspace:{...moving.avatarWorkspace,poseStudio:{current:{enabled:true}}}})).toBe(false);
  expect(needsAnimatedFrames({...moving,avatarWorkspace:{...moving.avatarWorkspace,inspectorSection:'measurements'}})).toBe(false);
  expect(needsAnimatedFrames({...moving,animationState:{animationId:'squat',playing:true}})).toBe(false);
});

it('preserves explicit legacy and owner-supplied model choices while upgrading the default human',()=>{
 expect(resolveModelAsset({modelPreset:'male',modelVersion:'legacy'},'MED').path).toMatch(/humanoid-base-lite\.glb$/);
 expect(resolveModelAsset({modelPreset:'male',avatarAsset:'humanoid-preview-75-lite.glb'},'MED').path).toMatch(/humanoid-preview-75-lite\.glb$/);
 expect(resolveModelAsset({modelPreset:'male'},'MED').nativeFamily).toBe('generic-adult-r2');
});
