import React from 'react';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const mocks = vi.hoisted(() => ({ auth: {}, state: {}, signOut: vi.fn(), list: vi.fn(), remove: vi.fn() }));
vi.mock('./context/AuthContext', () => ({ useAuth: () => mocks.auth }));
vi.mock('./store/useStore', () => ({ default: Object.assign(selector => selector(mocks.state), { getState: () => mocks.state }) }));
vi.mock('./hooks/useDesignPreferences', () => ({ default: () => ({ theme: 'light', reducedMotion: false }) }));
vi.mock('./hooks/useNotifications', () => ({ default: () => ({ unreadCount: 0 }) }));
vi.mock('./components/Header', () => ({ default: () => null }));
vi.mock('./components/CommandPalette', () => ({ default: () => null }));
vi.mock('./components/FloatingPillDock', () => ({ default: () => null }));
vi.mock('./components/PremiumSidebar', () => ({ default: ({ onLogout }) => <button type="button" onClick={onLogout}>Open sign-out</button> }));
vi.mock('./components/Overview', () => ({ default: () => <h1>Owner workspace</h1> }));
vi.mock('./lib/logger', () => ({ logPageView: vi.fn() }));
vi.mock('./lib/drafts', () => ({ listDrafts: (...args) => mocks.list(...args), removeOwnerDrafts: (...args) => mocks.remove(...args) }));

function LocationProbe() { const location = useLocation(), from = location.state?.from; return <><span data-testid="path">{location.pathname}</span><span data-testid="return-path">{from ? from.pathname + from.search + from.hash : ''}</span></>; }
function show(path = '/insights/overview') {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={[path]}><App /><LocationProbe /></MemoryRouter></QueryClientProvider>);
}
async function openDialog() {
  await screen.findByRole('heading', { name: 'Owner workspace' });
  await userEvent.click(screen.getByRole('button', { name: 'Open sign-out' }));
  return within(await screen.findByRole('dialog', { name: 'Ready to sign out?' }));
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('scrollTo', vi.fn());
  mocks.auth = { session: { expiresAt: '2099-01-01' }, user: { id: 'example-owner' }, signOut: mocks.signOut, signIn: vi.fn() };
  mocks.state = { user: { id: 'example-owner', name: 'Example' }, activeTab: 'overview', palette: 'forest', reducedMotion: false, resetSessionData: vi.fn(), setActiveTab: vi.fn(), fetchInitialData: vi.fn(async () => {}), checkServerHealth: vi.fn(), setCheckInAlertDismissedDate: vi.fn(), isLoading: false, serverStatus: 'online', onboardingComplete: true };
  mocks.list.mockResolvedValue([{ id: 'example-draft-a' }, { id: 'example-draft-b' }]);
  mocks.remove.mockResolvedValue(undefined);
  mocks.signOut.mockImplementation(async () => { mocks.auth.session = null; return { error: null }; });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('owner sign-out outcomes', () => {
  it('returns focus after cancellation and does not change the account or drafts', async () => {
    show();
    const dialog = await openDialog();
    await userEvent.click(dialog.getByRole('button', { name: 'Stay signed in' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Open sign-out' })).toHaveFocus();
    expect(mocks.list).toHaveBeenCalledWith('example-owner');
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it('signs out with the keep default and shows that outcome on login', async () => {
    show('/insights/overview?view=priorities#record');
    const dialog = await openDialog();
    await userEvent.click(dialog.getByRole('button', { name: 'Sign out', exact: true }));
    expect(await screen.findByText(/Local drafts were left unchanged/)).toBeVisible();
    expect(screen.getByTestId('path')).toHaveTextContent('/login');
    expect(screen.getByTestId('return-path')).toHaveTextContent('/insights/overview?view=priorities#record');
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it('removes only the captured owner’s drafts after the explicit choice and successful sign-out', async () => {
    show();
    const dialog = await openDialog();
    await userEvent.click(dialog.getByRole('radio', { name: /^Remove local drafts/ }));
    await userEvent.click(dialog.getByRole('button', { name: 'Sign out & remove drafts' }));
    expect(await screen.findByText(/Local drafts were removed/)).toBeVisible();
    expect(mocks.remove).toHaveBeenCalledWith('example-owner');
    expect(mocks.signOut.mock.invocationCallOrder[0]).toBeLessThan(mocks.remove.mock.invocationCallOrder[0]);
  });

  it('keeps the dialog and drafts after a rejected sign-out and supports retry', async () => {
    mocks.signOut.mockRejectedValueOnce(new Error('Offline'));
    show();
    let dialog = await openDialog();
    await userEvent.click(dialog.getByRole('radio', { name: /^Remove local drafts/ }));
    await userEvent.click(dialog.getByRole('button', { name: 'Sign out & remove drafts' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('You’re still signed in');
    expect(mocks.remove).not.toHaveBeenCalled();
    dialog = within(screen.getByRole('dialog'));
    await userEvent.click(dialog.getByRole('button', { name: 'Sign out & remove drafts' }));
    expect(await screen.findByText(/Local drafts were removed/)).toBeVisible();
  });

  it('reports failed local cleanup on login after the server has signed the owner out', async () => {
    mocks.remove.mockRejectedValueOnce(new Error('Storage unavailable'));
    show();
    const dialog = await openDialog();
    await userEvent.click(dialog.getByRole('radio', { name: /^Remove local drafts/ }));
    await userEvent.click(dialog.getByRole('button', { name: 'Sign out & remove drafts' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('You’re signed out, but local drafts could not be removed');
    expect(screen.getByTestId('path')).toHaveTextContent('/login');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('keeps login disabled until cleanup finishes, then reports the completed outcome', async () => {
    let finishCleanup;
    mocks.remove.mockImplementationOnce(() => new Promise(resolve => { finishCleanup = resolve; }));
    show();
    const dialog = await openDialog();
    await userEvent.click(dialog.getByRole('radio', { name: /^Remove local drafts/ }));
    await userEvent.click(dialog.getByRole('button', { name: 'Sign out & remove drafts' }));
    expect(await screen.findByRole('button', { name: 'Finishing sign-out…' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Email address' })).toBeDisabled();
    expect(screen.queryByRole('heading', { name: 'Owner workspace' })).toBeNull();
    await act(async () => finishCleanup());
    expect(await screen.findByRole('status')).toHaveTextContent('Local drafts were removed');
    expect(screen.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled();
  });

  it('guards duplicate submission and dismissal while sign-out is pending', async () => {
    let finish;
    mocks.signOut.mockImplementationOnce(() => new Promise(resolve => { finish = () => { mocks.auth.session = null; resolve({ error: null }); }; }));
    show();
    const dialog = await openDialog();
    await userEvent.click(dialog.getByRole('button', { name: 'Sign out', exact: true }));
    expect(dialog.getByRole('button', { name: 'Signing out…' })).toBeDisabled();
    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    await act(async () => finish());
    expect(await screen.findByRole('status')).toHaveTextContent('Local drafts were left unchanged');
  });
});
