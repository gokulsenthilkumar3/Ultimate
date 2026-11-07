import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../lib/apiClient';
import Helpdesk from '../components/Helpdesk';

vi.mock('../lib/apiClient', () => ({ apiRequest: vi.fn() }));

describe('Helpdesk navigation and diagnostics', () => {
  it('keeps quick links inside the configured application base', () => {
    render(<MemoryRouter basename="/Ultimate" initialEntries={['/Ultimate/hub/helpdesk']}><Helpdesk /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Profile & Settings' })).toHaveAttribute('href', '/Ultimate/hub/settings');
    expect(screen.getByRole('link', { name: 'Activity Logs' })).toHaveAttribute('href', '/Ultimate/hub/logs');
  });

  it.each([
    ['degraded', 'DISCONNECTED', false, false],
    ['online', 'CONNECTED', true, true],
    ['degraded', 'CONNECTED', false, true],
    [undefined, undefined, false, false],
  ])('evaluates API %s and database %s independently', async (status, dbStatus, apiOk, dbOk) => {
    vi.mocked(apiRequest).mockImplementation(async url => url === '/api/health' ? { status, database: { status: dbStatus } } : { id: 'owner' });
    render(<MemoryRouter><Helpdesk /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: 'Run diagnostics' }));
    await waitFor(() => expect(screen.getByText('Auth Layer').closest('.helpdesk-k-probe')).toHaveClass('helpdesk-k-probe--ok'));
    expect(screen.getByText('Core API').closest('.helpdesk-k-probe')).toHaveClass(`helpdesk-k-probe--${apiOk ? 'ok' : 'fail'}`);
    expect(screen.getByText('Database').closest('.helpdesk-k-probe')).toHaveClass(`helpdesk-k-probe--${dbOk ? 'ok' : 'fail'}`);
  });
});
