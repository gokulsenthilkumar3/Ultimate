import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import CustomerAdminPage from './CustomerAdminPage';
const makePage = (product = 'finsync') => ({ product, rows: [{ id: product + '-one', product, name: product === 'finsync' ? 'FinSync test customer' : 'OxFin test customer', email: `${product}@example.test`, status: 'active', plan: 'Standard', lastActiveAt: null }], total: 1, limit: 25, offset: 0 });
let client;
// Concurrent Vite transforms can occupy the worker before a resolved query notifies React.
configure({ asyncUtilTimeout: 5000 });
beforeEach(() => { client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); });
afterEach(() => { cleanup(); client.clear(); vi.restoreAllMocks(); });
function mount(product, view = 'customers') { return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[`/customers?view=${view}`]}><CustomerAdminPage product={product} /></MemoryRouter></QueryClientProvider>); }
describe('connected production presentation without sample fallback', () => {
  it('shows setup rather than fictional customers when the admin adapter is absent', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValue({ status: 503, payload: { code: 'ADMIN_ADAPTER_NOT_CONFIGURED' } });
    mount('finsync');
    expect(await screen.findByRole('heading', { name: 'FinSync administration is not connected' })).toBeVisible();
    expect(screen.queryByRole('table')).toBeNull(); expect(screen.getByText('SETUP')).toBeVisible();
    expect(screen.queryByText('LIVE')).toBeNull(); expect(screen.queryByText('DEMO')).toBeNull();
  });
  it('shows denied without customer data or a misleading retry', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValue({ status: 403 }); mount('oxfin');
    expect(await screen.findByRole('alert')).toHaveTextContent('Customer access is restricted');
    expect(screen.queryByRole('table')).toBeNull(); expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });
  it('shows validated read-only rows and restores focus after closing the preview', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue(makePage()); mount('finsync');
    await screen.findByRole('table', { name: 'FinSync customer directory' });
    const trigger = screen.getByRole('button', { name: 'Preview FinSync test customer' });
    fireEvent.click(trigger); expect(screen.getByRole('complementary', { name: 'FinSync customer preview' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Close customer preview' })); expect(trigger).toHaveFocus();
    expect(screen.queryByRole('button', { name: /save|delete|entitlement/i })).toBeNull();
  });
  it('rejects a cross-product response before rendering any customer', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue(makePage('oxfin')); mount('finsync');
    await screen.findByRole('alert'); expect(screen.queryByText('OxFin test customer')).toBeNull(); expect(screen.queryByRole('table')).toBeNull();
  });
  it('removes previous product rows and previews while the next product loads', async () => {
    let release;
    vi.spyOn(apiClient, 'get').mockImplementation(url => url.includes('/finsync/') ? Promise.resolve(makePage()) : new Promise(resolve => { release = resolve; }));
    mount(); fireEvent.click(await screen.findByRole('button', { name: 'Preview FinSync test customer' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Product' }), { target: { value: 'oxfin' } });
    expect(screen.queryByText('FinSync test customer')).toBeNull(); expect(screen.queryByRole('complementary')).toBeNull();
    await act(async () => release(makePage('oxfin')));
    expect(await screen.findByRole('table', { name: 'OxFin customer directory' })).toBeVisible();
  });
  it('resets offset and clears selected detail when filters change', async () => {
    const get = vi.spyOn(apiClient, 'get').mockImplementation(async url => {
      const params = new URL(url, 'https://local.test').searchParams;
      return { ...makePage(), offset: Number(params.get('offset')), rows: params.get('q') ? [] : makePage().rows, total: params.get('q') ? 0 : 100 };
    });
    mount('finsync'); await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(get.mock.calls.at(-1)[0]).toContain('offset=25'));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search customers' }), { target: { value: 'No match' } });
    await screen.findByRole('heading', { name: 'No records' });
    expect(new URL(get.mock.calls.at(-1)[0], 'https://local.test').searchParams.get('offset')).toBe('0');
    expect(screen.queryByRole('complementary')).toBeNull();
  });
  it.each(['activity', 'support'])('keeps %s honest until that service exists', async view => {
    vi.spyOn(apiClient, 'get').mockResolvedValue(makePage()); mount('finsync', view);
    await screen.findByRole('heading', { name: view === 'activity' ? 'Customer activity is not connected' : 'Customer support history is not connected' });
    expect(screen.queryByRole('textbox', { name: /note/i })).toBeNull();
    expect(within(screen.getByRole('navigation', { name: 'Customer administration views' })).getByRole('link', { name: view === 'activity' ? 'Activity' : 'Support' })).toHaveAttribute('aria-current', 'page');
  });
});
