import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

describe('Shopping acknowledged persistence', () => {
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
