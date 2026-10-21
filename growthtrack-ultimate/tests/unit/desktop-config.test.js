// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { sharedServerUrl } from '../../desktop-config';
describe('private shared desktop origin', () => {
  it('preserves the configured HTTPS deployment base', () => {
    expect(sharedServerUrl('https://tracker.example/private').href).toBe('https://tracker.example/private/');
    expect(sharedServerUrl('')).toBeNull();
  });
  it.each(['http://tracker.example/', 'file:///private', 'https://user:password@tracker.example/', 'https://tracker.example/?token=x', 'https://tracker.example/#private'])('rejects unsafe shared configuration %s', value => expect(() => sharedServerUrl(value)).toThrow());
});
