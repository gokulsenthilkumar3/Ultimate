import { beforeEach, describe, expect, it, vi } from 'vitest';
import useStore, { normalizePortfolio, normalizePortfolioHolding } from '../store/useStore';

describe('portfolio persistence contract', () => {
  beforeEach(() => {
    useStore.setState({ portfolio: [] });
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve('{}'),
    })));
  });

  it('normalizes valid holdings and drops unsafe rows', () => {
    expect(normalizePortfolio([
      { id: 9, name: '  Reliance  ', symbol: 'reliance', type: 'Stock', units: '2', buyPrice: '100', currentPrice: '' },
      { name: '', units: 1, buyPrice: 10 },
      { name: 'Bad', units: -1, buyPrice: 10 },
    ])).toEqual([{
      id: '9', name: 'Reliance', symbol: 'RELIANCE', type: 'Stock', units: 2,
      buyPrice: 100, currentPrice: 100, buyDate: '',
    }]);
  });

  it('keeps add, update, and delete actions normalized and durable', async () => {
    const store = useStore.getState();
    await store.addHolding({ id: 1, name: 'ETF', type: 'ETF', units: '3', buyPrice: '50', currentPrice: '55' });
    expect(useStore.getState().portfolio).toHaveLength(1);
    expect(useStore.getState().portfolio[0].units).toBe(3);

    await useStore.getState().updateHolding(1, { currentPrice: '60' });
    expect(useStore.getState().portfolio[0].currentPrice).toBe(60);

    await useStore.getState().deleteHolding(1);
    expect(useStore.getState().portfolio).toEqual([]);
    expect(globalThis.fetch).toHaveBeenCalled();
  });

  it('rejects invalid holdings before they reach state', async () => {
    await useStore.getState().addHolding({ name: 'Invalid', units: 'NaN', buyPrice: 10, currentPrice: 10 });
    expect(useStore.getState().portfolio).toEqual([]);
    expect(normalizePortfolioHolding({ name: 'Invalid', units: Infinity, buyPrice: 10 })).toBeNull();
  });
});
