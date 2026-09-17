import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
});
