import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WellnessCommand from './WellnessCommand';
import useStore from '../store/useStore';

vi.mock('./Overview', () => ({ default: () => <div>Wellness overview</div> }));
vi.mock('../lib/apiClient', () => ({ apiRequest: vi.fn() }));
vi.mock('../lib/logger', () => ({ logCRUD: vi.fn().mockResolvedValue(undefined) }));
beforeEach(() => {
  useStore.getState().resetSessionData();
  useStore.setState({ user: { id: 'owner' }, habits: [{ id: 'habit' }], sleep_logs: [{ id: 'sleep-one' }, { id: 'sleep-two' }], metric_logs: [{ id: 'metric' }], sleepLogs: [], metricLogs: [] });
});
afterEach(cleanup);
describe('WellnessCommand domain and route contracts', () => {
  it('counts the canonical store collections', () => {
    render(<MemoryRouter initialEntries={['/wellness/overview']}><WellnessCommand /></MemoryRouter>);
    expect(screen.getByText(/1 habits tracked/)).toBeVisible();
    expect(within(screen.getByText('Sleep entries').parentElement).getByText('2')).toBeVisible();
    expect(within(screen.getByText('Health metrics').parentElement).getByText('1')).toBeVisible();
  });
  it('links to owning modules without outer tabs or an embedded global Overview', () => {
    render(<MemoryRouter initialEntries={['/wellness/overview']}><WellnessCommand /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Mood check-in' })).toHaveAttribute('href', '/wellness/mind?view=checkin');
    expect(screen.getByRole('link', { name: 'Log sleep' })).toHaveAttribute('href', '/wellness/sleep?view=log');
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByText('Wellness overview')).toBeNull();
    expect(screen.queryByRole('tabpanel')).toBeNull();
  });
  it('summarizes the latest valid observations with dates and recorded habit check-offs', () => {
    const today = new Date(); const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    useStore.setState({ sleep_logs: [{ date: '2026-09-20', hours: 6 }, { date: '2026-09-22', duration: 8 }, { date: 'invalid', hours: 24 }], moodLogs: [{ date: '2026-09-20', mood: 1 }, { date: '2026-09-23', mood: '4' }], habits: [{ id: 'habit', completed_dates: [date] }], user: { id: 'owner', dateFormat: 'YYYY-MM-DD' } });
    render(<MemoryRouter><WellnessCommand /></MemoryRouter>);
    expect(screen.getByText('8 hours')).toBeVisible();
    expect(screen.getByText('Good')).toBeVisible();
    expect(screen.getByText('Recorded for 2026-09-22')).toBeVisible();
    expect(screen.getByText('Recorded for 2026-09-23')).toBeVisible();
    expect(screen.getByText('1 recorded check-offs')).toBeVisible();
  });
  it('shows missing observations explicitly rather than an invented wellness score', () => {
    render(<MemoryRouter><WellnessCommand /></MemoryRouter>);
    expect(screen.getByText('No dated sleep entries.')).toBeVisible();
    expect(screen.getByText('No dated mood check-ins.')).toBeVisible();
    expect(screen.queryByText(/wellness score/i)).toBeNull();
  });
});
