import { describe, expect, it } from 'vitest';
import { resolveModelAsset } from '../components/morphEngine/modelAssetRegistry';

describe('model asset registry', () => {
  it.each(['humanoid-base.glb','humanoid-base-lite.glb','humanoid-adult-v2.glb','humanoid-adult-v2-lite.glb','humanoid-preview-75.glb','humanoid-preview-75-lite.glb'])('recognizes an explicitly saved bundled asset %s independently of selection source',avatarAsset=>{
    expect(resolveModelAsset({avatarAsset})).toMatchObject({source:'profile',isBundled:true,anatomySex:'male'});
  });
  it('does not grant bundled-only corrective processing to arbitrary saved uploads',()=>{
    expect(resolveModelAsset({avatarAsset:'owner-upload.glb'}).isBundled).toBe(false);
  });
  it('promotes the refined human preview at both quality levels while retaining covered and legacy choices',()=> {
    expect(resolveModelAsset({modelPreset:'male'},'HIGH')).toMatchObject({path:expect.stringMatching(/humanoid-human-r2-hero\.glb$/),version:'human-r2',anatomySex:'male',source:'human-family',v2Ready:true});
    expect(resolveModelAsset({modelPreset:'male'},'LOW').path).toMatch(/humanoid-human-r2-core\.glb$/);
    expect(resolveModelAsset({modelPreset:'female'}).v2Ready).toBe(false);
    expect(resolveModelAsset({modelPreset:'male',modelVersion:'legacy'}).path).toMatch(/humanoid-base-lite\.glb$/);
    expect(resolveModelAsset({avatarAsset:'humanoid-base.glb',modelPreset:'male'}).source).toBe('profile');
  });
  it('selects a logical mesh preset without requiring viewer changes', () => {
    const result = resolveModelAsset({ modelPreset: 'auto', biologicalSex: 'female' }, 'HIGH');
    expect(result.preset).toBe('female');
    expect(result.path).toMatch(/humanoid-base\.glb$/);
  });

  it('accepts a same-origin database asset key', () => {
    const result = resolveModelAsset({ avatarAsset: 'female-athletic.glb' }, 'HIGH');
    expect(result.path).toMatch(/assets\/models\/female-athletic\.glb$/);
    expect(result.source).toBe('profile');
    expect(result.isBundled).toBe(false);
  });

  it('rejects remote and traversal paths', () => {
    expect(resolveModelAsset({ avatarAsset: 'https://example.com/person.glb' }).source).toBe('default');
    expect(resolveModelAsset({ avatarAsset: '../private/person.glb' }).source).toBe('default');
  });

  it('uses the lightweight asset by default and reserves the hero asset for high quality', () => {
    expect(resolveModelAsset({}, 'MED').path).toMatch(/humanoid-base-lite\.glb$/);
    expect(resolveModelAsset({}, 'LOW').path).toMatch(/humanoid-base-lite\.glb$/);
    expect(resolveModelAsset({}, 'HIGH').path).toMatch(/humanoid-base\.glb$/);
  });
});
