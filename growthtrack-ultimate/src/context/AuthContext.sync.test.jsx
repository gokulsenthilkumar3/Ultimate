import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ session: vi.fn(), flush: vi.fn() }));
vi.mock('../lib/authProviders', () => ({ createAuthProvider: () => ({ session: mocks.session }) }));
vi.mock('../lib/logger', () => ({ setLoggingUser: vi.fn(), flushLogQueue: mocks.flush }));
import { AuthProvider, useAuth } from './AuthContext';
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const account = id => ({ user: { id }, session: { id: `session-${id}` } });
function Probe() { const { user, loading } = useAuth(); return <output>{loading ? 'loading' : user?.id || 'signed-out'}</output>; }
beforeEach(() => { localStorage.clear(); mocks.flush.mockResolvedValue(undefined); });
afterEach(() => { cleanup(); vi.resetAllMocks(); });
it('does not restore a late session after another window signs out', async () => {
  const request = deferred(); mocks.session.mockReturnValue(request.promise);
  render(<AuthProvider><Probe /></AuthProvider>);
  act(() => window.dispatchEvent(new StorageEvent('storage', { key: 'growthtrack-user', newValue: null })));
  await act(async () => request.resolve(account('old-owner')));
  expect(screen.getByText('signed-out')).toBeInTheDocument();
  expect(localStorage.getItem('growthtrack-user')).toBeNull();
});
it('does not announce a stale login when log flushing finishes after sign-out', async () => {
  const flush = deferred(); mocks.flush.mockReturnValue(flush.promise); mocks.session.mockResolvedValue(account('old-owner'));
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(mocks.flush).toHaveBeenCalled());
  act(() => window.dispatchEvent(new StorageEvent('storage', { key: 'growthtrack-user', newValue: null })));
  await act(async () => flush.resolve());
  expect(screen.getByText('signed-out')).toBeInTheDocument(); expect(localStorage.getItem('growthtrack-user')).toBeNull();
});
it('hides the previous account while checking a cross-window account change with the server', async () => {
  const next = deferred(); mocks.session.mockResolvedValueOnce(account('first')).mockReturnValueOnce(next.promise);
  render(<AuthProvider><Probe /></AuthProvider>); await screen.findByText('first');
  act(() => window.dispatchEvent(new StorageEvent('storage', { key: 'growthtrack-user', newValue: JSON.stringify({ id: 'untrusted' }) })));
  expect(screen.queryByText('first')).toBeNull(); expect(screen.queryByText('untrusted')).toBeNull();
  await act(async () => next.resolve(account('verified'))); expect(await screen.findByText('verified')).toBeInTheDocument();
});
