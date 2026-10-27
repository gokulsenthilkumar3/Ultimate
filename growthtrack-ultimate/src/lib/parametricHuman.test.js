import { describe, expect, it } from 'vitest';
import { PARAMETRIC_HUMAN, PARAMETRIC_PARAMETERS, PARAMETRIC_GROUPS, SIMPLE_HUMAN_CONTROLS, createParametricDocument, patchParametricContext, setSimpleControl, simpleControlValue, validateParametricDocument } from './parametricHuman';

describe('canonical human semantic controls', () => {
  it('binds 306 unique source channels and all simple controls to the pinned basis', () => {
    expect(PARAMETRIC_PARAMETERS).toHaveLength(306);
    expect(new Set(PARAMETRIC_PARAMETERS.map(item => item.id)).size).toBe(306);
    expect(SIMPLE_HUMAN_CONTROLS).toHaveLength(22);
    for (const item of PARAMETRIC_PARAMETERS) expect(PARAMETRIC_GROUPS.some(group => group.id === item.group)).toBe(true);
    for (const control of SIMPLE_HUMAN_CONTROLS) for (const key of [...control.positive, ...control.negative]) expect(PARAMETRIC_HUMAN.morphTargets).toContain(key);
  });
  it('pairs opposing directions without modifying unrelated channels or the original', () => {
    const original = { noseWider: 0.3, noseNarrower: 0.2, jawWider: 0.4 };
    const control = SIMPLE_HUMAN_CONTROLS.find(item => item.id === 'nose.width');
    const result = setSimpleControl(original, control, -0.7);
    expect(result).toEqual({ noseWider: 0, noseNarrower: 0.7, jawWider: 0.4 });
    expect(simpleControlValue(result, control)).toBe(-0.7);
    expect(original.noseWider).toBe(0.3);
  });
  it('coordinates both eyes while advanced channels keep their per-side identity', () => {
    const control = SIMPLE_HUMAN_CONTROLS.find(item => item.id === 'eyes.size');
    expect(setSimpleControl({}, control, 0.6)).toEqual({ eyeSmallerLeft: 0, eyeSmallerRight: 0, eyeBiggerLeft: 0.6, eyeBiggerRight: 0.6 });
    expect(() => setSimpleControl({}, control, NaN)).toThrow();
    expect(() => setSimpleControl({}, control, 1.1)).toThrow();
  });
  it('keeps Current and Goal detached across repeated changes', () => {
    const original = createParametricDocument();
    const current = patchParametricContext(original, { parameters: { noseWider: 0.4 } }, 'current');
    const goal = patchParametricContext(current, { appearance: { skinColor: '#123456' } }, 'goal');
    expect(goal.contexts.current.parameters.noseWider).toBe(0.4);
    expect(goal.contexts.goal.parameters).toEqual({});
    expect(original.contexts.current.parameters).toEqual({});
    expect(current.contexts.goal.appearance.skinColor).toBe('#bd8b6a');
  });
  it('rejects unsupported source, topology, values and unimplemented editing classes', () => {
    const document = createParametricDocument();
    for (const parameters of [{ missing: 0.5 }, { noseWider: -0.1 }, { noseWider: 2 }]) expect(() => patchParametricContext(document, { parameters })).toThrow();
    expect(() => patchParametricContext(document, { appearance: { skinColor: 'url(https://example.test)' } })).toThrow();
    expect(() => patchParametricContext(document, { expressions: { smile: 0.5 } })).toThrow(/adapter/);
    expect(() => patchParametricContext(document, { proportions: { height: 1.2 } })).toThrow(/adapter/);
    expect(() => validateParametricDocument({ ...document, asset: { ...document.asset, topologyHash: 'another-body' } })).toThrow(/topologyHash/);
  });
  it.each(['growthtrack-skin-v1', 'growthtrack-skin-v2'])('adapts known material %s without changing either saved shape or the input', previousMaterial => {
    const old = patchParametricContext(createParametricDocument(), { parameters: { noseWider: 0.4 } }, 'current');
    old.asset.materialVersion = previousMaterial;
    const upgraded = validateParametricDocument(old);
    expect(upgraded.asset.materialVersion).toBe('growthtrack-skin-v3');
    expect(upgraded.contexts.current.parameters).toEqual({ noseWider: 0.4 });
    expect(upgraded.contexts.goal.parameters).toEqual({});
    expect(upgraded.contexts.current.provenance.visualAssetUpgrade).toEqual({ from: previousMaterial, to: 'growthtrack-skin-v3' });
    expect(old.asset.materialVersion).toBe(previousMaterial);
    expect(old.contexts.current.provenance).toEqual({});
    expect(() => validateParametricDocument({ ...old, asset: { ...old.asset, topologyHash: 'foreign' } })).toThrow(/topologyHash/);
    expect(() => validateParametricDocument({ ...old, asset: { ...old.asset, materialVersion: 'unknown' } })).toThrow(/materialVersion/);
  });
  it('explicitly upgrades the known contact solver while preserving both identities and rejecting unknown solvers', () => {
    const old = patchParametricContext(createParametricDocument(), { parameters: { heightTaller: 0.5 } }, 'goal');
    old.asset.solverVersion = 'cpu-identity-v1';
    old.asset.materialVersion = 'growthtrack-skin-v1';
    const upgraded = validateParametricDocument(old);
    expect(upgraded.asset.solverVersion).toBe('cpu-identity-v2-contact');
    expect(upgraded.contexts.goal.parameters).toEqual({ heightTaller: 0.5 });
    expect(upgraded.contexts.current.parameters).toEqual({});
    expect(upgraded.contexts.goal.provenance.solverUpgrade.from).toBe('cpu-identity-v1');
    expect(old.asset.solverVersion).toBe('cpu-identity-v1');
    expect(old.contexts.goal.provenance).toEqual({});
    expect(() => validateParametricDocument({ ...old, asset: { ...old.asset, solverVersion: 'unknown' } })).toThrow(/solverVersion/);
  });
});
