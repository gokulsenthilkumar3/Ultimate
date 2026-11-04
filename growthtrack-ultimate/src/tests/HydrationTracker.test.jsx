import React, { StrictMode } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { apiSyncMock } = vi.hoisted(() => ({ apiSyncMock: vi.fn() }));
vi.mock('../store/useStore', () => ({ default: selector => selector({ user: { id: 'owner-fixture' }, setUser: vi.fn() }), apiSync: (...args) => apiSyncMock(...args) }));
vi.mock('../hooks/useToast', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));
vi.mock('../components/motion/KineticContext', () => ({ useKinetic: () => ({ enabled: false }) }));
import HydrationTracker from '../components/HydrationTracker';

describe('hydration request ordering', () => {
  it('ignores stale StrictMode failures until the latest request settles, then recovers on explicit retry', async () => {
    const pending = [];
    apiSyncMock.mockImplementation(() => new Promise((resolve, reject) => pending.push({ resolve, reject })));
    render(<StrictMode><HydrationTracker /></StrictMode>);
    expect(pending).toHaveLength(2);
    await act(async () => pending[0].reject(new Error('Stale request failure')));
    expect(screen.getByRole('status')).toHaveTextContent('Loading hydration history');
    expect(screen.queryByRole('button', { name: 'Retry hydration history' })).toBeNull();
    await act(async () => pending[1].reject(new Error('Current request failure')));
    expect(await screen.findByRole('button', { name: 'Retry hydration history' })).toBeVisible();
    apiSyncMock.mockResolvedValueOnce([]);
    await userEvent.click(screen.getByRole('button', { name: 'Retry hydration history' }));
    expect(await screen.findByText('Rolling 24-hour history from the server. Use Refresh to check for new entries.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Retry hydration history' })).toBeNull();
  });
});
