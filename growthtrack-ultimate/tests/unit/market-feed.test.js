// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createMarketFeed } from '../../server/domains/equity/marketFeed.js';

describe('NiftyLens market cache adapter', () => {
  it('accepts Firebase empty-collection responses as an empty snapshot', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }));
    const data = await createMarketFeed({
      environment: { NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'fixture-project', NEXT_PUBLIC_FIREBASE_API_KEY: 'fixture-key' },
      fetchImpl,
    })();
    expect(data.quotes).toEqual([]);
    expect(data.snapshot).toBe(true);
    expect(data.provider).toContain('Firebase');
  });
});
