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
vi.mock('./components/HubCommand', () => ({ default: () => <h1>Hub owner</h1> }));
vi.mock('./components/LifeCommand', () => ({ default: () => <h1>Life owner</h1> }));
vi.mock('./components/AppLauncher', () => ({ default: () => <h1>Apps owner</h1> }));
vi.mock('./components/UnifiedWorkspace', () => ({ default: () => <h1>Companion owner</h1> }));
vi.mock('./components/AiDashboard', () => ({ default: () => <h1>Agents owner</h1> }));
vi.mock('./components/Databases', () => ({ default: () => <h1>Databases owner</h1> }));
vi.mock('./components/ProfileEditor', () => ({ default: () => <h1>Profile owner</h1> }));
vi.mock('./components/NotificationCenter', () => ({ default: () => <h1>Notifications owner</h1> }));
vi.mock('./components/Helpdesk', () => ({ default: () => <h1>Help owner</h1> }));
vi.mock('./components/Logs', () => ({ default: () => <h1>Logs owner</h1> }));
vi.mock('./components/About', () => ({ default: () => <h1>About owner</h1> }));
vi.mock('./components/Pricing', () => ({ default: () => <h1>Plans owner</h1> }));
vi.mock('./components/SocialMedia', () => ({ default: () => <h1>Social owner</h1> }));
vi.mock('./components/Entertainment', () => ({ default: () => <h1>Entertainment owner</h1> }));
vi.mock('./components/Maps', () => ({ default: () => <h1>Places owner</h1> }));
vi.mock('./domains/customer-admin/CustomerAdminPage', () => ({ default: () => <h1>Customer admin owner</h1> }));
vi.mock('./domains/family/FamilyPage', () => ({ default: () => <h1>Family owner</h1> }));
vi.mock('./domains/equity/EquityPage', () => ({ default: () => <h1>Equity owner</h1> }));

const areas = FEATURES.filter(feature => ['hub', 'life'].includes(feature.area));
it.each(areas.flatMap(feature => (feature.views.length ? feature.views : ['']).map(view => [feature.id, feature.area, feature.canonicalPath, view])))('keeps %s in its domain on %s / %s with view %s', async (id, area, canonicalPath, view) => {
  mocks.state.activeTab = id;
  const path = canonicalPath + (view ? '?view=' + view : ''); show(path);
  await screen.findByRole('heading', { level: 1 });
  // Companion native shortcuts intentionally leave the bridge for the owning product.
  if (id === 'companion' && ['equity', 'forex', 'family'].includes(view)) {
    const target = FEATURES.find(feature => feature.id === view);
    expect(screen.getByTestId('location')).toHaveTextContent(target.canonicalPath);
    expect(document.querySelector('[data-page-motion-owner="hub"]')).toBeNull();
  } else {
    expect(document.querySelector('[data-page-motion-owner]')).toHaveAttribute('data-page-motion-owner', area);
    expect(document.querySelectorAll('[data-page-motion-owner]')).toHaveLength(1);
    expect(screen.getByTestId('location')).toHaveTextContent(path);
  }
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
});
it('opens the Life directory at its canonical overview', async () => {
  mocks.state.activeTab = 'life'; show('/life/');
  expect(await screen.findByRole('heading', { name: 'Life owner' })).toBeVisible();
  expect(screen.getByTestId('location')).toHaveTextContent('/life/overview');
  expect(document.querySelector('[data-page-motion-owner]')).toHaveAttribute('data-page-motion-owner', 'life');
});
