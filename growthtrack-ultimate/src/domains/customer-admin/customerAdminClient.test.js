import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../lib/apiClient';
import { customerErrorState, listCustomers, validateCustomerPage } from './customerAdminClient';
const row = { id: 'one', product: 'finsync', name: 'Test customer', email: 'test@example.test', status: 'active', plan: 'Standard', lastActiveAt: null };
const page = { product: 'finsync', rows: [row], total: 1, limit: 25, offset: 0 };
afterEach(() => vi.restoreAllMocks());
describe('production customer boundary', () => {
  it('keeps only allowed presentation fields', () => {
    const result = validateCustomerPage({ ...page, rows: [{ ...row, secretField: 'must-not-enter-ui', paymentInstrument: 'private' }] }, 'finsync');
    expect(result.rows).toEqual([row]);
  });
  it.each([
    { ...page, product: 'oxfin' }, { ...page, rows: [{ ...row, product: 'oxfin' }] },
    { ...page, rows: [row, row], total: 2 }, { ...page, total: -1 },
    { ...page, limit: 100 }, { ...page, offset: 25 },
    { ...page, rows: [{ ...row, lastActiveAt: 'invalid' }] },
    { ...page, rows: Array.from({ length: 26 }, (_, i) => ({ ...row, id: String(i) })), total: 26 },
  ])('rejects invalid or mismatched product/page data', payload => expect(() => validateCustomerPage(payload, 'finsync')).toThrow());
  it('accepts a source shrink so the UI can clamp the page', () => expect(validateCustomerPage({ ...page, rows: [], total: 1, offset: 25 }, 'finsync', { offset: 25, limit: 25 }).rows).toEqual([]));
  it('builds an encoded bounded GET using the existing authenticated API client', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue(page);
    await listCustomers('finsync', { query: ' name+a@example.test ', status: 'active' });
    const [url] = get.mock.calls[0];
    expect(url.startsWith('/api/admin/products/finsync/customers?')).toBe(true);
    const params = new URL(url, 'https://local.test').searchParams;
    expect(params.get('q')).toBe('name+a@example.test'); expect(params.get('limit')).toBe('25');
    expect(get).toHaveBeenCalledOnce();
  });
  it('rejects invalid requests before any network call', async () => {
    const get = vi.spyOn(apiClient, 'get');
    await expect(listCustomers('../oxfin')).rejects.toThrow();
    await expect(listCustomers('finsync', { limit: 10000 })).rejects.toThrow();
    expect(get).not.toHaveBeenCalled();
  });
  it.each([[{ status: 403 }, 'denied'], [{ status: 401 }, 'unauthorized'], [{ status: 503, payload: { code: 'ADMIN_ADAPTER_NOT_CONFIGURED' } }, 'setup'], [{ status: 503 }, 'unavailable'], [{ status: 0 }, 'unavailable'], [new Error('Malformed'), 'error']])('keeps denied, setup, unavailable and malformed states distinct', (error, expected) => expect(customerErrorState(error)).toBe(expected));
});
