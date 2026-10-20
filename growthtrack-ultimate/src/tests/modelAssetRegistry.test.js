import { describe, expect, it } from 'vitest';
import { resolveModelAsset } from '../components/morphEngine/modelAssetRegistry';

describe('model asset registry', () => {
  it('promotes the assessed male attachment upgrade at both quality levels',()=> {
    expect(resolveModelAsset({modelPreset:'male'},'HIGH')).toMatchObject({path:expect.stringMatching(/humanoid-adult-v2\.glb$/),version:'v2',anatomySex:'male',source:'default',v2Ready:true});
    expect(resolveModelAsset({modelPreset:'male'},'LOW').path).toMatch(/humanoid-adult-v2-lite\.glb$/);
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
