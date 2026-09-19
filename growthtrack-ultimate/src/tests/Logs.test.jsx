import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiSyncMock } = vi.hoisted(() => ({ apiSyncMock: vi.fn() }));

vi.mock('../store/useStore', () => ({
  default: (selector) => selector({ user: { id: 'owner-test' } }),
  apiSync: (...args) => apiSyncMock(...args),
}));

vi.mock('../hooks/useToast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

import Logs from '../components/Logs';

describe('Logs service states', () => {
  beforeEach(() => apiSyncMock.mockReset());

  it('reads logs and diagnostics with GET requests', async () => {
    apiSyncMock
      .mockResolvedValueOnce({ logs: [], total: 0 })
      .mockResolvedValueOnce({ status: 'healthy', counts: { total: 0 }, database: { status: 'connected' } });

    render(<Logs />);

    await waitFor(() => expect(apiSyncMock).toHaveBeenCalledTimes(2));
    expect(apiSyncMock).toHaveBeenNthCalledWith(1, '/logs', 'GET');
    expect(apiSyncMock).toHaveBeenNthCalledWith(2, '/logs/diagnostics', 'GET');
    expect(await screen.findByText('No logs found')).toBeVisible();
    expect(screen.queryByText('Logging diagnostics unavailable')).toBeNull();
  });

  it('shows unavailable diagnostics instead of a successful empty state', async () => {
    apiSyncMock
      .mockResolvedValueOnce({ logs: [], total: 0 })
      .mockRejectedValueOnce(new Error('Diagnostics unavailable.'));

    render(<Logs />);

    expect(await screen.findByText('Logging diagnostics unavailable')).toBeVisible();
    expect(screen.queryByText('No logs found')).toBeNull();
  });

  it('paginates records and exposes accessible filter labels', async () => {
    const logs = Array.from({ length: 30 }, (_, index) => ({
      id: String(index + 1), category: 'audit', action: 'update',
      details: `Event ${index + 1}`, timestamp: `2026-09-${String((index % 19) + 1).padStart(2, '0')}T10:00:00.000Z`,
    }));
    apiSyncMock
      .mockResolvedValueOnce({ logs, total: logs.length })
      .mockResolvedValueOnce({ status: 'healthy', counts: { total: logs.length } });

    render(<Logs />);
    expect(await screen.findByText('Event 30')).toBeVisible();
    expect(screen.getByRole('searchbox', { name: 'Search audit logs' })).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Filter logs by category' })).toBeVisible();
    expect(screen.getByText('Page 1 of 2')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Page 2 of 2')).toBeVisible();
    expect(screen.getByText('Showing 26–30 of 30')).toBeVisible();
  });
});
