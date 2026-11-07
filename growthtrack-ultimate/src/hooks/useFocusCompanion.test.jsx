import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ read: vi.fn(), save: vi.fn() }));
vi.mock('../lib/drafts', () => ({ readDraft: mocks.read, saveDraft: mocks.save }));
import useFocusCompanion from './useFocusCompanion';
import { createFocusTimer } from '../lib/focusCompanion';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.resetAllMocks(); });
it('keeps a newer cross-window timer when older device recovery finishes late and clears on owner change', async () => {
  let recover, bus; mocks.read.mockImplementationOnce(() => new Promise(resolve => { recover = resolve; })).mockResolvedValue(null); mocks.save.mockResolvedValue(undefined);
  vi.stubGlobal('BroadcastChannel', class { constructor() { bus = this; } close() {} postMessage() {} });
  const { result, rerender } = renderHook(({ owner }) => useFocusCompanion(owner), { initialProps: { owner: 'first' } });
  const newer = createFocusTimer(40);
  act(() => bus.onmessage({ data: { ownerId: 'first', source: 'other-window', revision: Date.now(), timer: newer } }));
  await act(async () => recover({ data: createFocusTimer(10) }));
  await waitFor(() => expect(result.current.ready).toBe(true)); expect(result.current.timer).toEqual(newer);
  rerender({ owner: 'second' }); expect(result.current.timer).toBeNull();
  await waitFor(() => expect(result.current.ready).toBe(true));
  expect(mocks.save.mock.calls.filter(([owner, , timer]) => owner === 'second' && timer !== null)).toHaveLength(0);
});
