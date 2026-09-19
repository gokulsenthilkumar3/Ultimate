import { describe, expect, it } from 'vitest';
import { resolveModelAsset } from '../components/morphEngine/modelAssetRegistry';

describe('model asset registry', () => {
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
