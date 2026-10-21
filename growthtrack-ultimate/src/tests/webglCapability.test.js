import { describe, expect, it, vi } from 'vitest';
import { probeWebGL } from '../lib/webglCapability';

describe('WebGL capability gate', () => {
  it('declines unavailable or blocked contexts', () => {
    expect(probeWebGL(() => ({ getContext: () => null }))).toBe(false);
    expect(probeWebGL(() => { throw new Error('Blocked'); })).toBe(false);
  });
  it('rejects a lost context', () => {
    expect(probeWebGL(() => ({ getContext: () => ({ isContextLost: () => true }) }))).toBe(false);
  });
  it('requires WebGL2 and releases its temporary context', () => {
    const loseContext = vi.fn();
    const getContext = vi.fn(() => ({ isContextLost: () => false, getExtension: () => ({ loseContext }) }));
    expect(probeWebGL(() => ({ getContext }))).toBe(true);
    expect(getContext).toHaveBeenCalledWith('webgl2', { failIfMajorPerformanceCaveat: true });
    expect(loseContext).toHaveBeenCalledOnce();
  });
  it('does not turn cleanup failure into a render failure', () => {
    expect(probeWebGL(() => ({ getContext: () => ({ isContextLost: () => false, getExtension: () => { throw new Error('Unavailable'); } }) }))).toBe(true);
  });
});
