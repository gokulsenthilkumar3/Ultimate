import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const mocks = vi.hoisted(() => ({ auth: { session: null, user: null, signIn: vi.fn(), signOut: vi.fn() }, state: {} }));
vi.mock('./context/AuthContext', () => ({ useAuth: () => mocks.auth }));
vi.mock('./store/useStore', () => ({ default: Object.assign(selector => selector(mocks.state), { getState: () => mocks.state }) }));
vi.mock('./hooks/useDesignPreferences', () => ({ default: () => ({ theme: 'light', reducedMotion: false }) }));
vi.mock('./hooks/useNotifications', () => ({ default: () => ({ unreadCount: 0 }) }));
vi.mock('./components/Header', () => ({ default: () => null }));
vi.mock('./components/CommandPalette', () => ({ default: () => null }));
vi.mock('./components/PremiumSidebar', () => ({ default: () => null }));
vi.mock('./components/FloatingPillDock', () => ({ default: () => null }));
vi.mock('./components/Overview', () => ({ default: () => <h1>Saved owner overview</h1> }));
vi.mock('./pages/LandingPage', () => ({ default: () => <h1>Fictional landing</h1> }));
vi.mock('./lib/logger', () => ({ logPageView: vi.fn() }));

function LocationProbe() {
  const location = useLocation();
  const from = location.state?.from;
  return <><output data-testid="path">{location.pathname}</output><output data-testid="return-path">{from ? from.pathname + from.search + from.hash : ''}</output></>;
}
function show(path) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><App /><LocationProbe /></MemoryRouter></QueryClientProvider>);
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('scrollTo', vi.fn());
  mocks.auth.session = null;
  mocks.auth.user = null;
  mocks.auth.loading = false;
  mocks.state = {
    user: { id: 'fictional-owner', name: 'Example' }, activeTab: 'overview', palette: 'forest',
    resetSessionData: vi.fn(), setActiveTab: vi.fn(), fetchInitialData: vi.fn(async () => {}), checkServerHealth: vi.fn(),
    setCheckInAlertDismissedDate: vi.fn(), isLoading: false, serverStatus: 'online', onboardingComplete: true,
  };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('application entry and protected flows', () => {
  it('paints public content while session verification is pending without requesting private data', async () => {
    mocks.auth.loading = true;
    show('/welcome');
    expect(await screen.findByRole('heading', { name: 'Fictional landing' })).toBeVisible();
    expect(mocks.state.fetchInitialData).not.toHaveBeenCalled();
  });

  it('holds a protected URL on its loading state until session verification finishes', async () => {
    mocks.auth.loading = true;
    show('/workspace/tasks?view=board#today');
    expect(await screen.findByRole('status', { name: 'Loading workspace command' })).toBeVisible();
    expect(screen.getByTestId('path')).toHaveTextContent('/workspace/tasks');
    expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(mocks.state.fetchInitialData).not.toHaveBeenCalled();
  });
  it('opens the fictional landing from the anonymous root without loading private records', async () => {
    show('/');
    expect(await screen.findByRole('heading', { name: 'Fictional landing' })).toBeVisible();
    expect(screen.getByTestId('path')).toHaveTextContent('/welcome');
    expect(mocks.state.fetchInitialData).not.toHaveBeenCalled();
    expect(mocks.auth.signIn).not.toHaveBeenCalled();
  });

  it('keeps protected destinations behind sign-in and retains query and hash return state', async () => {
    show('/workspace/tasks?view=board#today');
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeVisible();
    expect(screen.getByTestId('path')).toHaveTextContent('/login');
    expect(screen.getByTestId('return-path')).toHaveTextContent('/workspace/tasks?view=board#today');
    expect(mocks.state.fetchInitialData).not.toHaveBeenCalled();
  });

  it('keeps the signed-in root destination on the actual owner overview', async () => {
    mocks.auth.session = { expiresAt: '2099-01-01' };
    mocks.auth.user = { id: 'fictional-owner' };
    show('/');
    expect(await screen.findByRole('heading', { name: 'Saved owner overview' })).toBeVisible();
    expect(screen.getByTestId('path')).toHaveTextContent('/insights/overview');
    expect(mocks.state.fetchInitialData).toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: 'Fictional landing' })).not.toBeInTheDocument();
    expect(document.querySelector('.app-shell')).toHaveAttribute('data-ui-style', 'kinetic');
    expect(document.querySelector('.app-shell')).toHaveAttribute('data-design-revision', 'kinetic-workspace-v4');
    expect(screen.getByRole('navigation', { name: 'Page location' })).toBeVisible();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });
});
