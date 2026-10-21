import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
const mocks = vi.hoisted(() => ({ state: {}, ask: vi.fn().mockResolvedValue('Saved activity summary') }));
vi.mock('../store/useStore', () => ({ default: selector => selector ? selector(mocks.state) : mocks.state }));
vi.mock('../lib/growthcast', () => ({ askLocalGrowthcast: mocks.ask }));
vi.mock('./Analytics', () => ({ default: () => <h2>Analytics owner</h2> }));
vi.mock('./TransformationPredictor', () => ({ default: () => <h2>Forecast owner</h2> }));
vi.mock('./Dashboards', () => ({ default: () => <h2>Dashboards owner</h2> }));
vi.mock('./Overview', () => ({ default: () => <h2>Overview owner</h2> }));
vi.mock('./Current', () => ({ default: () => <h2>Current owner</h2> }));
vi.mock('./ActionCenter', () => ({ default: () => <h2>Actions owner</h2> }));
vi.mock('./Progress', () => ({ default: () => { throw new Error('Writable Progress must not mount inside Insights'); } }));
import InsightsHub from './InsightsHub';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.state = {
    user: {}, metric_logs: [{ date: '2026-09-15' }, { date: '2026-09-01' }, { date: '2026-09-08' }],
    goals: [{ status: 'completed' }, { status: 'active' }], tasks: [{ completed: true }, { completed: false }],
    habits: [{}], sleep_logs: [{}],
  };
});
afterEach(cleanup);
function show(props = {}, url = '/insights') {
  const query = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<MemoryRouter initialEntries={[url]}><QueryClientProvider client={query}><InsightsHub {...props} /></QueryClientProvider></MemoryRouter>);
}
it.each([
  ['analytics', 'Analytics owner'], ['forecast', 'Forecast owner'], ['dashboards', 'Dashboards owner'],
  ['overview', 'Overview owner'], ['current', 'Current owner'], ['actions', 'Actions owner'],
])('renders nested %s directly even when a conflicting legacy hash is present', async (initialTab, heading) => {
  show({ initialTab }, '/insights/' + initialTab + '?view=progress#progress');
  expect(await screen.findByRole('heading', { name: heading })).toBeVisible();
  expect(screen.queryByRole('tablist')).toBeNull();
  expect(screen.queryByText('See how far you’ve come.')).toBeNull();
  expect(screen.queryByText('Local Growthcast Agent')).toBeNull();
});
it('renders Progress as a read-only cross-domain summary with canonical links', () => {
  show({ initialTab: 'progress' }, '/insights/progress');
  const summary = within(screen.getByLabelText('Read-only progress summary'));
  ['Saved measurement records', 'Completed goals', 'Pending tasks', 'Tracked habits', 'Saved sleep records'].forEach(text => expect(summary.getByText(text)).toBeVisible());
  expect(summary.getByRole('link', { name: 'Open measurement history' })).toHaveAttribute('href', '/wellness/physique?view=history');
  expect(summary.getByRole('link', { name: 'Open canonical logs' })).toHaveAttribute('href', '/hub/logs');
  expect(screen.queryByRole('button')).toBeNull();
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(screen.queryByRole('tablist')).toBeNull();
});
it('retains a useful standalone overview command with actual saved counts', async () => {
  show();
  expect(screen.getByRole('heading', { name: 'See how far you’ve come.' })).toBeVisible();
  expect(screen.getByText('Completed goals')).toBeVisible();
  expect(screen.getByText('1 of 2')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Forecast' })).toHaveAttribute('href', '/insights/forecast');
  expect(screen.queryByText(/Momentum \d|Data confidence|Trajectory ML/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Ask Agent' }));
  await waitFor(() => expect(mocks.ask).toHaveBeenCalled());
  expect(mocks.ask.mock.calls[0][0]).toContain('"pendingTasks":1');
  expect(mocks.ask.mock.calls[0][0]).not.toMatch(/momentum score|confidence%/i);
});
it('preserves legacy hash selection for the standalone command', async () => {
  show({}, '/insights#forecast');
  expect(await screen.findByRole('heading', { name: 'Forecast owner' })).toBeVisible();
  expect(screen.queryByText('See how far you’ve come.')).toBeNull();
});
it('does not require the overview agent query provider to mount a nested owner', async () => {
  render(<MemoryRouter><InsightsHub initialTab="analytics" /></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: 'Analytics owner' })).toBeVisible();
});
