import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePortfolioPayload } from '../../../server/domains/portfolio.js';

const holding = { id: 'asset-1', name: 'Recorded asset', symbol: 'ETF', type: 'ETF', units: 2, buyPrice: 100, currentPrice: 90, buyDate: '2026-08-01' };

test('explicit zero prices survive normalization and JSON persistence', () => {
  const result = normalizePortfolioPayload([{ ...holding, currentPrice: '0', priceDate: '2026-09-20', currency: 'usd', provenance: 'manual' }]);
  const restored = JSON.parse(JSON.stringify(result))[0];
  assert.equal(restored.currentPrice, 0);
  assert.equal(restored.priceDate, '2026-09-20');
  assert.equal(restored.currency, 'USD');
  assert.equal(restored.provenance, 'manual');
  assert.equal(normalizePortfolioPayload([{ ...holding, buyPrice: 0 }])[0].buyPrice, 0);
});

test('dated snapshots, history and nested provenance/currency fields round-trip without fabricated points', () => {
  const source = { ...holding,
    priceDate: '2026-09-20T15:30:00+05:30', priceCurrency: 'inr',
    provenance: { source: 'manual', recordedAt: '2026-09-20T15:30:00+05:30', reference: 'statement-1' },
    snapshots: [
      { date: '2026-08-20', price: 95, name: holding.name, symbol: holding.symbol, currency: 'USD', provenance: { source: 'manual' } },
      { date: '2026-09-20', price: 0, currency: 'USD', provenance: 'manual' },
    ],
    history: [{ date: '2026-08-20', value: 190, cashFlow: -10, currency: 'USD', provenance: 'statement' }],
    snapshot: { price: 90, date: '2026-09-20', name: holding.name, symbol: holding.symbol },
  };
  const result = JSON.parse(JSON.stringify(normalizePortfolioPayload([source])))[0];
  assert.deepEqual(result.snapshots, source.snapshots);
  assert.deepEqual(result.history, source.history);
  assert.deepEqual(result.provenance, source.provenance);
  assert.deepEqual(result.snapshot, source.snapshot);
  assert.equal(result.priceDate, source.priceDate);
  assert.equal(result.priceCurrency, 'INR');
  assert.equal(result.snapshots.length, 2);
});

test('date-keyed and identifier-keyed snapshot maps preserve recorded dates and zero observations', () => {
  const snapshots = { '2026-09-20': { price: 0, currency: 'USD' }, observation2: { date: '2026-09-21', price: 90, provenance: 'manual' } };
  const result = normalizePortfolioPayload([{ ...holding, snapshots }])[0];
  assert.deepEqual(result.snapshots, snapshots);
  assert.equal(Object.hasOwn(result.snapshots['2026-09-20'], 'date'), false);
});

test('missing manual prices remain unknown and legacy holdings gain no fabricated dates/history/provenance', () => {
  for (const currentPrice of ['', null, undefined]) {
    const result = normalizePortfolioPayload([{ ...holding, currentPrice }])[0];
    assert.equal(result.currentPrice, null);
    assert.equal(Object.hasOwn(result, 'priceDate'), false);
    assert.equal(Object.hasOwn(result, 'snapshots'), false);
    assert.equal(Object.hasOwn(result, 'provenance'), false);
  }
  assert.deepEqual(normalizePortfolioPayload([]), []);
});

test('invalid holdings reject the entire payload instead of silently deleting rows', () => {
  for (const value of [-1, NaN, Infinity, true, {}, 'not-a-price']) {
    assert.throws(() => normalizePortfolioPayload([holding, { ...holding, id: 'second', currentPrice: value }]), { status: 400, code: 'INVALID_PORTFOLIO' });
  }
  for (const value of [0, -1, true, '', null]) assert.throws(() => normalizePortfolioPayload([{ ...holding, units: value }]), { status: 400 });
  assert.throws(() => normalizePortfolioPayload([holding, holding]), { status: 400 });
  assert.throws(() => normalizePortfolioPayload({}), { status: 400 });
});

test('invalid calendar dates, currencies and undated history fail validation', () => {
  for (const fields of [
    { buyDate: '2026-02-30' }, { priceDate: '2026-02-30' }, { currency: 123 },
    { priceDate: 'today' }, { snapshots: [{ price: 10 }] },
    { snapshots: [{ date: '2026-09-20', price: -1 }] },
    { history: [{ date: '2026-13-01', value: 10 }] },
    { snapshots: { '2026-02-30': { price: 0 } } },
  ]) assert.throws(() => normalizePortfolioPayload([{ ...holding, ...fields }]), { status: 400 });
});

test('portfolio limits reject oversize payloads and unsafe metadata rather than truncating data', () => {
  assert.throws(() => normalizePortfolioPayload(Array.from({ length: 201 }, (_, index) => ({ ...holding, id: String(index) }))), { status: 413 });
  assert.throws(() => normalizePortfolioPayload([{ ...holding, history: Array.from({ length: 1001 }, () => ({ date: '2026-09-20', price: 1 })) }]), { status: 413 });
  assert.throws(() => normalizePortfolioPayload([{ ...holding, provenance: JSON.parse('{"__proto__":{"admin":true}}') }]), { status: 400 });
  assert.throws(() => normalizePortfolioPayload([{ ...holding, note: 'x'.repeat(512 * 1024) }]), { status: 413 });
});
