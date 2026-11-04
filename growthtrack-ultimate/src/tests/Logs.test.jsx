import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
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
  beforeEach(() => { apiSyncMock.mockReset(); });

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

  it('ignores an older response after changing filters', async () => {
    let finishOld;
    apiSyncMock.mockImplementation(path => {
      if (path === '/logs') return new Promise(resolve => { finishOld = resolve; });
      if (path.startsWith('/logs?category=auth')) return Promise.resolve({ logs: [{ id: 'new', category: 'auth', details: 'Current auth event' }], total: 1 });
      return Promise.resolve({ status: 'healthy' });
    });
    render(<Logs />);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Filter logs by category' }), 'auth');
    expect(await screen.findByText('Current auth event')).toBeVisible();
    await act(async () => finishOld({ logs: [{ id: 'old', category: 'audit', details: 'Stale event' }], total: 1 }));
    expect(screen.getByText('Current auth event')).toBeVisible();
    expect(screen.queryByText('Stale event')).toBeNull();
  });

  it('loads subsequent API pages rather than presenting the first page as all logs', async () => {
    apiSyncMock.mockImplementation(path => {
      if (path === '/logs') return Promise.resolve({ logs: [{ id: 'one', category: 'audit', details: 'First API page' }], total: 2, page: 1 });
      if (path === '/logs?page=2') return Promise.resolve({ logs: [{ id: 'two', category: 'audit', details: 'Second API page' }], total: 2, page: 2 });
      return Promise.resolve({ status: 'healthy' });
    });
    render(<Logs />);
    expect(await screen.findByText('First API page')).toBeVisible();
    expect(screen.getByText(/1 of 2 available loaded/)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Load more logs' }));
    expect(await screen.findByText('Second API page')).toBeVisible();
    expect(screen.getByText('First API page')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Load more logs' })).toBeNull();
  });

  it('classifies expired authentication tokens as failures and searches their failure details', async () => {
    apiSyncMock.mockImplementation(path => path.startsWith('/logs?') || path === '/logs'
      ? Promise.resolve({ logs: [{ id: 'auth-failed', category: 'auth', action: 'login_failed', failure_reason: 'Token expired' }], total: 1 })
      : Promise.resolve({ status: 'healthy' }));
    render(<Logs />);
    expect(await screen.findByText('Token expired')).toBeVisible();
    expect(screen.getByText('error', { selector: '.log-severity' })).toBeVisible();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search audit logs' }), 'expired');
    expect(await screen.findByText('Token expired')).toBeVisible();
  });

  it('exports quoted CSV cells and neutralizes spreadsheet formulas', async () => {
    apiSyncMock.mockImplementation(path => path === '/logs'
      ? Promise.resolve({ logs: [{ id: 'csv', category: 'audit', details: '=1+1,"quoted"\nsecond line' }], total: 1 })
      : Promise.resolve({ status: 'healthy' }));
    let blob;
    const create = vi.spyOn(URL, 'createObjectURL').mockImplementation(value => { blob = value; return 'blob:fixture'; });
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    try {
      render(<Logs />);
      expect(await screen.findByText(/quoted/)).toBeVisible();
      await userEvent.click(screen.getByRole('button', { name: 'CSV' }));
      const content = await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsText(blob); });
      expect(content).toContain('"\'=1+1,""quoted""\nsecond line"');
      expect(content).toContain('\r\n');
    } finally { click.mockRestore(); create.mockRestore(); revoke.mockRestore(); }
  });
});
