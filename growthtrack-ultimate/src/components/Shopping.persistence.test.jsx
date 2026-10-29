import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import Shopping from './Shopping';
import useStore from '../store/useStore';
import { apiRequest } from '../lib/apiClient';

const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), info: vi.fn() }));
vi.mock('../hooks/useToast', () => ({ useToast: () => toast }));
vi.mock('../lib/apiClient', () => ({ apiRequest: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  useStore.getState().resetSessionData();
  useStore.setState({ user: { id: 'shopping-owner', currency: 'INR' }, shopping: { items: [] } });
  apiRequest.mockImplementation((path, options) => options.method === 'GET' ? Promise.resolve([]) : Promise.reject(new Error('Server rejected the save.')));
});
afterEach(cleanup);

const items = count => Array.from({ length: count }, (_, index) => ({
  id: `item-${index}`, name: `Synthetic item ${index}`, stage: 'future', priority: 'medium',
  category: index === 50 ? 'Books' : 'Other', quantity: 1, estimatedCost: 10,
}));
const nextPage = () => fireEvent.click(within(screen.getByRole('navigation', { name: 'Shopping pages' })).getByRole('button', { name: 'Next' }));
const previousPage = () => fireEvent.click(within(screen.getByRole('navigation', { name: 'Shopping pages' })).getByRole('button', { name: 'Previous' }));

describe('Shopping acknowledged persistence', () => {
  it('bounds large lists while keeping totals, full search, price drafts and rejected edits', async () => {
    useStore.setState({ shopping: { items: items(51) } });
    render(<Shopping />);
    const results = screen.getByRole('region', { name: 'Shopping results' });
    expect(within(results).getAllByRole('button', { name: /^Edit Synthetic item/ })).toHaveLength(25);
    expect(screen.getByText('Showing 1–25 of 51')).toBeInTheDocument();
    expect(screen.getByText(/51 pending/)).toBeInTheDocument();
    nextPage();
    expect(results).toHaveFocus();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Log new unit price for Synthetic item 25' }), { target: { value: '8' } });
    nextPage(); previousPage();
    expect(screen.getByRole('spinbutton', { name: 'Log new unit price for Synthetic item 25' })).toHaveValue(8);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Synthetic item 25' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Item name' }), { target: { value: 'Retained shopping draft' } });
    nextPage(); previousPage();
    expect(screen.getByRole('textbox', { name: 'Item name' })).toHaveValue('Retained shopping draft');
    fireEvent.click(screen.getByRole('button', { name: 'Save', exact: true }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByRole('textbox', { name: 'Item name' })).toHaveValue('Retained shopping draft');
    fireEvent.change(screen.getByRole('textbox', { name: 'Search shopping' }), { target: { value: 'Synthetic item 50' } });
    expect(screen.getByRole('button', { name: 'Edit Synthetic item 50' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Shopping pages' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search shopping' }), { target: { value: '' } });
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    expect(useStore.getState().shopping.items).toHaveLength(51);
    expect(useStore.getState().shopping.items[25].name).toBe('Synthetic item 25');
  }, 30_000);

  it('clamps after the final row is removed and does not jump back when a row is added', () => {
    useStore.setState({ shopping: { items: items(26) } });
    render(<Shopping />);
    nextPage();
    act(() => useStore.setState({ shopping: { items: items(25) } }));
    expect(screen.getByRole('button', { name: 'Edit Synthetic item 0', exact: true })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Shopping pages' })).not.toBeInTheDocument();
    act(() => useStore.setState({ shopping: { items: items(26) } }));
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
  }, 30_000);

  it('reveals a saved item in its new priority position rather than assuming the first page', async () => {
    apiRequest.mockResolvedValue({ success: true });
    useStore.setState({ shopping: { items: items(57).map((item, index) => ({ ...item, priority: index < 31 ? 'high' : 'medium' })) } });
    render(<Shopping />);
    nextPage(); nextPage();
    fireEvent.click(screen.getByLabelText('Edit Synthetic item 50'));
    fireEvent.change(screen.getByLabelText('Item name'), { target: { value: 'Saved medium priority item' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save', exact: true }));
    await waitFor(() => expect(screen.getByText('Page 2 of 3')).toBeInTheDocument());
    expect(screen.getByLabelText('Edit Saved medium priority item')).toBeInTheDocument();
    expect(useStore.getState().shopping.items).toHaveLength(57);
  }, 30_000);

  it('clears edit and price drafts on owner change with reused IDs', () => {
    useStore.setState({ shopping: { items: items(51) } });
    render(<Shopping />);
    nextPage();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Log new unit price for Synthetic item 25' }), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: 'Edit Synthetic item 25' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Item name' }), { target: { value: 'Owner-only draft' } });
    act(() => useStore.setState({ user: { id: 'another-owner', currency: 'INR' }, shopping: { items: items(51) } }));
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    nextPage();
    expect(screen.queryByDisplayValue('Owner-only draft')).not.toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Log new unit price for Synthetic item 25' }).value).toBe('');
  }, 30_000);

  it('keeps the creation form and stable draft identity after a failed save', async () => {
    render(<Shopping />);
    fireEvent.click(screen.getByRole('button', { name: 'Plan purchase' }));
    fireEvent.change(screen.getByPlaceholderText('Item name *'), { target: { value: 'Two books' } });
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(/Estimated unit cost/), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add', exact: true }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByPlaceholderText('Item name *')).toHaveValue('Two books');
    expect(useStore.getState().shopping.items).toEqual([]);
    expect(toast.success).not.toHaveBeenCalled();
    const first = JSON.parse(apiRequest.mock.calls.find(([, options]) => options.method === 'POST')[1].body);
    fireEvent.click(screen.getByRole('button', { name: 'Add', exact: true }));
    await waitFor(() => expect(apiRequest.mock.calls.filter(([, options]) => options.method === 'POST')).toHaveLength(2));
    const second = JSON.parse(apiRequest.mock.calls.filter(([, options]) => options.method === 'POST')[1][1].body);
    expect(second.id).toBe(first.id);
  });

  it('does not remove an item or announce success when deletion fails', async () => {
    useStore.setState({ shopping: { items: [{ id: 'item-1', name: 'Planned item', stage: 'future', priority: 'medium', quantity: 1 }] } });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<Shopping />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete Planned item' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByText('Planned item')).toBeVisible();
    expect(toast.info).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
