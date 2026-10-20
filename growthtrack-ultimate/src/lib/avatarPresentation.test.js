import { describe, expect, it } from 'vitest';
import { AVATAR_PANEL_WIDTH, DEFAULT_AVATAR_PRESENTATION, resolveAvatarEffects, sanitizeAvatarPresentation } from './avatarPresentation';
import { buildAvatarEvidence } from './avatarEvidence';
import { resolveBodyMetrics } from './bodyMetricFallbacks';

describe('saved avatar presentation contract', () => {
  it('whitelists choices, clamps width, and rejects malformed preferences', () => {
    for (const value of [null, [], 'compact', undefined]) expect(sanitizeAvatarPresentation(value)).toEqual(DEFAULT_AVATAR_PRESENTATION);
    expect(sanitizeAvatarPresentation({ density:'compact', guideDetail:'concise', interfaceEffects:false, inspectorWidth:999, weight:80 })).toEqual({ ...DEFAULT_AVATAR_PRESENTATION,density:'compact', guideDetail:'concise', interfaceEffects:false, inspectorWidth:AVATAR_PANEL_WIDTH.max });
    expect(sanitizeAvatarPresentation({ inspectorWidth:1 }).inspectorWidth).toBe(AVATAR_PANEL_WIDTH.min);
    expect(sanitizeAvatarPresentation({ density:'invalid', interfaceEffects:'false', inspectorWidth:NaN })).toEqual(DEFAULT_AVATAR_PRESENTATION);
  });
  it('retains custom backgrounds and independent neutral lighting, rejecting malformed colors',()=> {
    expect(sanitizeAvatarPresentation({backgroundMode:'gradient',backgroundColor:'#abcdef',backgroundBottomColor:'#123456',showStage:false,lightingMode:'neutral'})).toMatchObject({backgroundMode:'gradient',backgroundColor:'#abcdef',backgroundBottomColor:'#123456',showStage:false,lightingMode:'neutral'});
    expect(sanitizeAvatarPresentation({backgroundMode:'url',backgroundColor:'url(https://invalid)',lightingMode:'unknown'})).toMatchObject({backgroundMode:'scene',backgroundColor:DEFAULT_AVATAR_PRESENTATION.backgroundColor,lightingMode:'neutral'});
  });
  it('honors every effect toggle rather than applying an unconditional vignette', () => {
    const off = resolveAvatarEffects({ gpuTier:'HIGH', cinematic:{} });
    expect(Object.values(off).every(value => !value)).toBe(true);
    expect(resolveAvatarEffects({ gpuTier:'HIGH', cinematic:{ vignette:true } })).toEqual({ ...off,vignette:true });
  });
  it('gates requested effects by quality and reduced motion without mutating the request', () => {
    const cinematic = { bloom:true,vignette:true,depthOfField:true,chromaticAberration:true,filmGrain:true,ssao:true };
    expect(Object.values(resolveAvatarEffects({ cinematic,gpuTier:'LOW' })).every(value => !value)).toBe(true);
    expect(Object.values(resolveAvatarEffects({ cinematic,gpuTier:'HIGH',mode:'NONE' })).every(value => !value)).toBe(true);
    expect(resolveAvatarEffects({ cinematic,gpuTier:'HIGH',reducedMotion:true })).toEqual({ bloom:true,vignette:true,depthOfField:false,chromaticAberration:false,filmGrain:false,ssao:false });
    expect(Object.values(resolveAvatarEffects({ cinematic,gpuTier:'HIGH' })).every(Boolean)).toBe(true);
    expect(cinematic.filmGrain).toBe(true);
  });
});

describe('evidence-based avatar status', () => {
  it('does not invent likeness from complete measurements or passing renderer checks', () => {
    const metrics = { height:175,weight:74,bodyFat:19,chest:99,waist:82,hips:96,shoulderBreadth:44,arms:33,thighs:55,calves:37 };
    const evidence = buildAvatarEvidence({ metrics,qualityGate:{ checks:[{ status:'pass' }] },diagnostics:{ health:'healthy',modelAsset:{ version:'v2' } } });
    expect(evidence.measurements.percent).toBe(100);
    expect(evidence.checks.percent).toBe(100);
    expect(evidence.humanLikenessPercent).toBeNull();
    expect(evidence.humanLikenessLabel).toBe('Not assessed');
    expect(evidence.assetLabel).toBe('v2 asset loaded');
  });
  it('counts only valid recorded measurements and reports actual technical evidence', () => {
    const metrics = { height:175,weight:'',bodyFat:999,chest:99 };
    // Render estimates never replace the source records used for coverage.
    expect(resolveBodyMetrics(metrics).derivedKeys.length).toBeGreaterThan(0);
    const evidence = buildAvatarEvidence({ metrics,qualityGate:{ checks:[{ status:'pass' },{ status:'fail' },{ status:'pending' }] } });
    expect(evidence.measurements.supplied).toBe(2);
    expect(evidence.measurements.percent).toBe(20);
    expect(evidence.checks).toEqual({ passed:1,total:3,pending:1,percent:33 });
    expect(evidence.assetLabel).toBe('Loading model');
    expect(buildAvatarEvidence().checks.percent).toBeNull();
  });
});
