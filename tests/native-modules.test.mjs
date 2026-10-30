import test from 'node:test';
import assert from 'node:assert/strict';
import { createMarketFeed, normalizeQuote } from '../growthtrack-ultimate/server/domains/equity/marketFeed.js';
import { nativeEntryDestination } from '../growthtrack-ultimate/src/config/nativeEntries.js';
import { registerNativeModuleRoutes } from '../growthtrack-ultimate/server/domains/nativeModules.js';

const environment = { NEXT_PUBLIC_SUPABASE_URL: 'https://quotes.test', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-price-cache-key' };
const quote = { symbol: 'STORY', ltp: '110', open: 100, high: 112, low: 98, volume: 1000, updated_at: '2026-10-30T10:00:00Z' };

test('market snapshots validate fields and never turn missing observations into zero', () => {
  assert.equal(normalizeQuote({ ...quote, open: undefined }).changePercent, null);
  assert.equal(normalizeQuote({ ...quote, ltp: 'invalid' }), null);
  assert.equal(normalizeQuote({ ...quote, high: null }).high, null);
  assert.equal(normalizeQuote(quote).changePercent, 10);
});
test('concurrent snapshot requests share provider work and expire after ten seconds', async () => {
  let calls = 0, now = 0;
  const load = createMarketFeed({ environment, now: () => now, fetchImpl: async () => { calls += 1; return { ok: true, json: async () => [quote] }; } });
  const [first, second] = await Promise.all([load(), load()]);
  assert.equal(calls, 1); assert.equal(first, second);
  await load(); assert.equal(calls, 1);
  now = 10001; await load(); assert.equal(calls, 2);
});
test('market connection failures are recoverable and do not expose provider credentials', async () => {
  let works = false;
  const load = createMarketFeed({ environment, fetchImpl: async () => ({ ok: works, status: 403, json: async () => [quote] }) });
  await assert.rejects(load(), error => error.status === 503 && !error.message.includes(environment.NEXT_PUBLIC_SUPABASE_ANON_KEY));
  works = true; assert.equal((await load()).quotes.length, 1);
  await assert.rejects(createMarketFeed({ environment: {} })(), error => error.code === 'MARKET_FEED_NOT_CONFIGURED');
});
test('market cache is bounded to 200 records and rejects malformed provider data', async () => {
  const load = createMarketFeed({ environment, fetchImpl: async () => ({ ok: true, json: async () => Array.from({ length: 1000 }, (_, id) => ({ ...quote, symbol: String(id) })) }) });
  assert.equal((await load()).quotes.length, 200);
  await assert.rejects(createMarketFeed({ environment, fetchImpl: async () => ({ ok: true, json: async () => ({ unrelated: true }) }) })());
});
test('Firebase public cache uses no admin credential and normalizes typed values', async () => {
  const load = createMarketFeed({ environment: { NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'story-project', NEXT_PUBLIC_FIREBASE_API_KEY: 'public-key' }, fetchImpl: async (url, options) => {
    assert.equal(url.hostname, 'firestore.googleapis.com'); assert.deepEqual(options.headers, {});
    return { ok: true, json: async () => ({ documents: [{ name: 'projects/story-project/documents/price_cache/STORY', fields: { ltp: { doubleValue: 10 }, open: { integerValue: '8' } } }] }) };
  } });
  assert.equal((await load()).quotes[0].changePercent, 25);
});
test('former companion entries point to native routes without intercepting APIs, assets or customer apps', () => {
  assert.equal(nativeEntryDestination('/Ultimate/products/family/members/'), '/Ultimate/life/family?view=people');
  assert.equal(nativeEntryDestination('/Ultimate/products/equity/'), '/Ultimate/finance/equity');
  assert.equal(nativeEntryDestination('/Ultimate/products/forex/'), '/Ultimate/insights/forex');
  for (const path of ['/api/family/trees', '/Ultimate/products/equity/api/prices', '/Ultimate/products/family/src/App.tsx', '/Ultimate/products/finsync/']) assert.equal(nativeEntryDestination(path), null);
});

test('native API routes require Ultimate authentication before accessing their owners', async () => {
  const routes = [], auth = () => {};
  registerNativeModuleRoutes({ get: (...args) => routes.push(args) }, auth, { prices: async () => ({ quotes: [] }), fetchImpl: () => { throw new Error('unexpected'); } });
  assert.equal(routes.length, 3);
  routes.forEach(route => assert.equal(route[1], auth));
});
