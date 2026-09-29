// @vitest-environment node
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import { staticBuildVersion } from '../../build/serviceWorkerPlugin';

function worker() {
  const events = {};
  const cache = { match: vi.fn().mockResolvedValue(undefined), put: vi.fn().mockResolvedValue(undefined) };
  const caches = { keys: vi.fn().mockResolvedValue(['growthtrack-shell-v1', 'growthtrack-static-old', 'other-app']), delete: vi.fn(), open: vi.fn().mockResolvedValue(cache) };
  const fetch = vi.fn().mockResolvedValue(new Response('asset'));
  const self = { registration: { scope: 'https://example.test/custom/' }, clients: { claim: vi.fn() }, skipWaiting: vi.fn(), addEventListener: (name, handler) => { events[name] = handler; } };
  vm.runInNewContext(readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8'), { self, caches, URL, fetch });
  return { events, caches, cache, fetch };
}

describe('private static-only service worker', () => {
  it.each(['/api/state', '/auth/session', '/custom/login', '/custom/finance/overview', '/custom/assets/avatar.glb', '/custom/assets/private-123456.js?token=x'])('does not cache or intercept %s', path => {
    const { events, fetch } = worker();
    const respondWith = vi.fn();
    events.fetch({ request: new Request(`https://example.test${path}`), respondWith });
    expect(respondWith).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
  });
  it('honors the deployment base and caches only hashed static assets', async () => {
    const { events, cache, fetch } = worker();
    let result;
    events.fetch({ request: new Request('https://example.test/custom/assets/app-123456ab.js'), respondWith: promise => { result = promise; } });
    expect((await result).status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1); expect(cache.put).toHaveBeenCalledTimes(1);
  });
  it('removes the old broad personal cache without touching other apps', async () => {
    const { events, caches } = worker();
    let activated;
    events.activate({ waitUntil: promise => { activated = promise; } }); await activated;
    expect(caches.delete.mock.calls.map(([name]) => name)).toEqual(['growthtrack-shell-v1', 'growthtrack-static-old']);
  });
  it('versions each emitted build reproducibly', () => {
    expect(staticBuildVersion(['b.js', 'a.css'])).toBe(staticBuildVersion(['a.css', 'b.js']));
    expect(staticBuildVersion(['a-1.js'])).not.toBe(staticBuildVersion(['a-2.js']));
  });
});
