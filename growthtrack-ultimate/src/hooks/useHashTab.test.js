import { describe, expect, it } from 'vitest';
import { decodeHashTab } from './useHashTab';

describe('decodeHashTab', () => {
  it('normalizes valid hashes', () => {
    expect(decodeHashTab('#Notes')).toBe('notes');
    expect(decodeHashTab('#dashboards%20')).toBe('dashboards ');
  });

  it('rejects malformed URL encoding without throwing', () => {
    expect(decodeHashTab('#%')).toBe('');
    expect(decodeHashTab('#%E0%A4%A')).toBe('');
  });
});
