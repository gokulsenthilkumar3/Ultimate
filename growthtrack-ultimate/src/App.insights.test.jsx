import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FEATURES } from './config/featureRegistry';
import App from './App';

const mocks = vi.hoisted(() => ({ state: {}, auth: { session: { expiresAt: '2099-01-01' }, user: { id: 'fixture-owner' }, loading: false } }));
vi.mock('./context/AuthContext', () => ({ useAuth: () => mocks.auth }));
vi.mock('./store/useStore', () => ({ default: Object.assign(selector => selector ? selector(mocks.state) : mocks.state, { getState: () => mocks.state }) }));
vi.mock('./hooks/useDesignPreferences', () => ({ default: () => ({ theme: 'light', reducedMotion: false }) }));
vi.mock('./hooks/useNotifications', () => ({ default: () => ({ unreadCount: 0 }) }));
vi.mock('./components/Header', () => ({ default: () => null }));
vi.mock('./components/CommandPalette', () => ({ default: () => null }));
vi.mock('./components/PremiumSidebar', () => ({ default: () => null }));
vi.mock('./components/FloatingPillDock', () => ({ default: () => null }));
vi.mock('./components/Overview', () => ({ default: () => <h1>Overview owner</h1> }));
vi.mock('./components/Current', () => ({ default: () => <h1>Current owner</h1> }));
vi.mock('./components/ActionCenter', () => ({ default: () => <h1>Actions owner</h1> }));
vi.mock('./components/InsightsHub', () => ({ default: ({ initialTab }) => <h1>{initialTab} owner</h1> }));
vi.mock('./domains/forex/ForexPage', () => ({ default: ({ view }) => <h1>Forex owner {view}</h1> }));
vi.mock('./components/Tasks', () => ({ default: () => <h1>Tasks owner</h1> }));
vi.mock('./lib/logger', () => ({ logPageView: vi.fn() }));

beforeEach(() => {
  vi.stubGlobal('scrollTo', vi.fn());
  mocks.state = { user: { id: 'fixture-owner' }, activeTab: 'overview', palette: 'forest', resetSessionData: vi.fn(), setActiveTab: vi.fn(), fetchInitialData: vi.fn(async () => {}), checkServerHealth: vi.fn(), setCheckInAlertDismissedDate: vi.fn(), isLoading: false, serverStatus: 'online', onboardingComplete: true };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function Location() { return <output data-testid="location">{useLocation().pathname + useLocation().search}</output>; }
function show(path) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter basename="/Ultimate" initialEntries={['/Ultimate' + path]}><App /><Location /></MemoryRouter></QueryClientProvider>);
}
const insights = FEATURES.filter(feature => feature.area === 'insights');
it.each(insights.flatMap(feature => (feature.views.length ? feature.views : ['']).map(view => [feature.id, feature.canonicalPath, view])))('owns %s on %s with view %s while retaining the actual module', async (id, canonicalPath, view) => {
  mocks.state.activeTab = id;
  const path = canonicalPath + (view ? '?view=' + view : ''); show(path);
  await screen.findByRole('heading', { level: 1 });
  expect(document.querySelector('.insights-frame')).toHaveAttribute('data-insights-page', id);
  expect(document.querySelectorAll('.insights-frame')).toHaveLength(1);
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  expect(screen.getByTestId('location')).toHaveTextContent(path);
});
it('opens the Insights directory on the canonical overview', async () => {
  show('/insights/'); expect(await screen.findByRole('heading', { name: 'Overview owner' })).toBeVisible();
  expect(document.querySelector('.insights-frame')).toHaveAttribute('data-insights-page', 'overview');
});
it('leaves another area outside the Insights motion owner', async () => {
  mocks.state.activeTab = 'tasks'; show('/workspace/tasks');
  expect(await screen.findByRole('heading', { name: 'Tasks owner' })).toBeVisible();
  expect(document.querySelector('.insights-frame')).toBeNull();
});
