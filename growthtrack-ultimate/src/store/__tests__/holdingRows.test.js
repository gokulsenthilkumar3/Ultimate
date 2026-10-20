import { beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import useStore from '../useStore';
import { apiRequest } from '../../lib/apiClient';

vi.mock('../../lib/apiClient', () => ({ apiRequest: vi.fn() }));
vi.mock('../../lib/logger', () => ({ logCRUD: vi.fn().mockResolvedValue(undefined) }));

const holding = { id: 'mf', name: 'Index fund', symbol: '120716', type: 'Mutual Fund', units: 10, buyPrice: 100, currentPrice: 90, revision: 1 };
const state = () => useStore.getState();
const lastCall = () => { const [path, options] = vi.mocked(apiRequest).mock.calls.at(-1); return { path, method: options.method, body: JSON.parse(options.body) }; };

beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto);
  vi.mocked(apiRequest).mockReset();
  state().resetSessionData();
  useStore.setState({ user: { id: 'owner' }, recordRows: true, portfolio: [holding] });
});

describe('holding writes with row storage', () => {
  it('sends one holding with the revision it was read at', async () => {
    apiRequest.mockResolvedValueOnce({ ...holding, units: 12, revision: 2 });
    await state().updateHolding('mf', { units: 12 });
    expect(lastCall()).toMatchObject({ path: '/api/v1/finance/holdings/mf', method: 'PUT', body: { expectedRevision: 1, record: { units: 12 } } });
    expect(lastCall().body.mutationId).toMatch(/^[0-9a-f-]{36}$/);
    expect(state().portfolio).toEqual([{ ...holding, units: 12, revision: 2 }]);

    apiRequest.mockResolvedValueOnce({ ...holding, id: 'btc', name: 'Bitcoin', type: 'Crypto', revision: 1 });
    await state().addHolding({ ...holding, id: 'btc', name: 'Bitcoin', type: 'Crypto', revision: undefined });
    expect(lastCall()).toMatchObject({ path: '/api/v1/finance/holdings', method: 'POST', body: { id: 'btc' } });

    apiRequest.mockResolvedValueOnce({ id: 'btc', revision: 2, deleted: true });
    await state().deleteHolding('btc');
    expect(lastCall()).toMatchObject({ path: '/api/v1/finance/holdings/btc', method: 'DELETE', body: { expectedRevision: 1 } });
    expect(state().portfolio.map(row => row.id)).toEqual(['mf']);
  });

  it('keeps a synced price when this tab is stale and shows the latest version', async () => {
    const synced = { ...holding, currentPrice: 123.45, priceDate: '2026-10-16', revision: 2 };
    apiRequest.mockRejectedValueOnce(Object.assign(new Error('conflict'), { status: 409, payload: { code: 'VERSION_CONFLICT', current: synced } }));
    await expect(state().updateHolding('mf', { ...holding, units: 11 })).rejects.toThrow(/changed elsewhere/);
    expect(state().portfolio).toEqual([synced]);
    expect(vi.mocked(apiRequest).mock.calls.some(([path]) => path === '/portfolio' || path.endsWith('/api/portfolio'))).toBe(false);
  });

  it('never sends the whole portfolio document while rows are enabled', async () => {
    useStore.setState({ portfolio: [{ ...holding, revision: undefined }] });
    await expect(state().updateHolding('mf', { units: 2 })).rejects.toThrow(/out of date/);
    expect(apiRequest).not.toHaveBeenCalled();
  });
});
