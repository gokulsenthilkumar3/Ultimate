import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ActionCenter from './ActionCenter';
import useStore from '../store/useStore';
import { apiRequest } from '../lib/apiClient';

vi.mock('../lib/apiClient', () => ({ apiRequest: vi.fn() }));
vi.mock('../lib/logger', () => ({ logCRUD: vi.fn().mockResolvedValue(undefined) }));
beforeEach(() => {
  vi.clearAllMocks(); useStore.getState().resetSessionData();
  useStore.setState({ user: { id: 'owner', tasks: { pending: [{ id: 'task', title: 'Overdue', dueDate: '2000-01-01' }], completed: [] } }, metric_logs: [{ id: 'water', metric: 'hydration' }], moodLogs: [{ date: new Date().toISOString().slice(0, 10) }], wellnessData: { sibling: 'keep', actionCenter: {} } });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
const mount = () => render(<MemoryRouter><ActionCenter /></MemoryRouter>);

describe('ActionCenter owner persistence', () => {
  it('reads canonical tasks, sleep and hydration records', () => {
    useStore.setState({ sleep_logs: [{ date: '2026-09-29', hours: 6 }] });
    mount(); expect(screen.getByText('Clear 1 overdue task')).toBeVisible();
    expect(screen.getByText('Protect tonight’s recovery')).toBeVisible();
    expect(screen.queryByText('Log your first hydration entry')).toBeNull();
    expect(screen.queryByText('Complete today’s check-in')).toBeNull();
  });
  it('keeps an action visible on save failure and persists it only after acknowledgement', async () => {
    apiRequest.mockRejectedValueOnce(new Error('Save failed'));
    mount(); fireEvent.click(screen.getByRole('button', { name: 'Not relevant' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Save failed');
    expect(screen.getByText('Clear 1 overdue task')).toBeVisible();
    apiRequest.mockResolvedValueOnce({ id: 'owner' });
    fireEvent.click(screen.getByRole('button', { name: 'Not relevant' }));
    await waitFor(() => expect(screen.queryByText('Clear 1 overdue task')).toBeNull());
    expect(apiRequest.mock.calls[1][0]).toBe('/api/wellness_data');
    expect(JSON.parse(apiRequest.mock.calls[1][1].body)).toEqual({ sibling: 'keep', actionCenter: { dismissed: ['overdue-tasks'] } });
  });
  it('does not share another account’s dismissals or legacy local state', () => {
    localStorage.setItem('growthtrack-action-center-state', JSON.stringify({ dismissed: ['overdue-tasks'] }));
    useStore.setState({ wellnessData: { actionCenter: { dismissed: ['overdue-tasks'] } } });
    mount(); expect(screen.queryByText('Clear 1 overdue task')).toBeNull();
    act(() => { useStore.getState().resetSessionData(); useStore.setState({ user: { id: 'next', tasks: { pending: [{ id: 'n', dueDate: '2000-01-01' }], completed: [] } }, metric_logs: [{ metric: 'hydration' }], moodLogs: [{ date: new Date().toISOString().slice(0, 10) }] }); });
    expect(screen.getByText('Clear 1 overdue task')).toBeVisible();
  });
  it('expires snoozes while the component remains mounted', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-29T12:00:00Z'));
    useStore.setState({ wellnessData: { actionCenter: { snoozed: { 'overdue-tasks': Date.now() + 60_000 } } } });
    mount(); expect(screen.queryByText('Clear 1 overdue task')).toBeNull();
    await act(async () => { vi.advanceTimersByTime(60_000); });
    expect(screen.getByText('Clear 1 overdue task')).toBeVisible();
  });
});
