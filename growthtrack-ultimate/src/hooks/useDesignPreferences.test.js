import { describe, expect, it } from 'vitest';
import { resolveAppearance } from './useDesignPreferences';
describe('appearance contract', () => {
  it('resolves new system preferences without changing saved modes', () => {
    expect(resolveAppearance('system', true)).toBe('dark');
    expect(resolveAppearance('system', false)).toBe('light');
    expect(resolveAppearance('amoled', false)).toBe('amoled');
    expect(resolveAppearance('light', true)).toBe('light');
  });
});
