// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { sharedServerUrl, privateDesktopPort } from '../../desktop-config';
describe('private shared desktop origin', () => {
  it('allocates an independent loopback port rather than occupying the workspace API port', async () => {
    const port = await privateDesktopPort();
    expect(port).toBeGreaterThan(0); expect(port).not.toBe(3001);
  });
  it('preserves the configured HTTPS deployment base', () => {
    expect(sharedServerUrl('https://tracker.example/private').href).toBe('https://tracker.example/private/');
    expect(sharedServerUrl('')).toBeNull();
  });
  it.each(['http://tracker.example/', 'file:///private', 'https://user:password@tracker.example/', 'https://tracker.example/?token=x', 'https://tracker.example/#private'])('rejects unsafe shared configuration %s', value => expect(() => sharedServerUrl(value)).toThrow());
  it('allows local UI development only through an explicit loopback option', () => {
    expect(() => sharedServerUrl('http://127.0.0.1:5000/Ultimate/')).toThrow();
    expect(sharedServerUrl('http://127.0.0.1:5000/Ultimate/', { allowLoopback: true }).href).toBe('http://127.0.0.1:5000/Ultimate/');
    expect(() => sharedServerUrl('http://192.168.1.5:5000/', { allowLoopback: true })).toThrow();
    expect(() => sharedServerUrl('http://127.0.0.1.evil.test/', { allowLoopback: true })).toThrow();
  });
});
