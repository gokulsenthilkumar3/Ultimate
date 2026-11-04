import React from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useParametricAvatar from './useParametricAvatar';
import { AvatarRecordContext } from './useAvatarRecord';
import useStore from '../store/useStore';
import { apiRequest } from '../lib/apiClient';
import { createParametricDocument, patchParametricContext } from '../lib/parametricHuman';
import { patchAvatarPerson } from '../lib/avatarPeople';

vi.mock('../lib/apiClient', () => ({ apiRequest: vi.fn() }));
vi.mock('../lib/logger', () => ({ logCRUD: vi.fn().mockResolvedValue(undefined) }));

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const tick = async (milliseconds = 400) => act(async () => { await vi.advanceTimersByTimeAsync(milliseconds); await settle(); });
const edit = (hook, value, context = 'current') => act(() => {
  hook.current.replace(patchParametricContext(hook.current.read(), { parameters: { noseWider: value } }, context));
});
const body = (index = 0) => JSON.parse(vi.mocked(apiRequest).mock.calls[index][1].body);

beforeEach(() => {
  vi.useFakeTimers();
  // The real store runs singleton saves through requireRecord(), which needs an
  // acknowledged record id, and captureSession(), which compares _dataRevision.
  // Mirror the server envelope (persistUserSingleton returns the user row) and
  // bump the revision on every accepted write so queued saves resolve as saved.
  vi.mocked(apiRequest).mockReset().mockImplementation(async () => {
    useStore.setState(state => ({ _dataRevision: state._dataRevision + 1 }));
    return { id: 'parametric-owner' };
  });
  useStore.getState().resetSessionData();
  useStore.setState({ user: { id: 'parametric-owner' }, physiqueTargets: { goalMetrics: { waist: 80 }, renderSettings: { vignette: false } } });
});
afterEach(async () => { cleanup(); await settle(); vi.useRealTimers(); });

describe('parametric avatar persistence', () => {
  it('coalesces shape edits and merges with the latest unrelated targets at save time', async () => {
    const { result } = renderHook(() => useParametricAvatar());
    expect(result.current.status).toBe('new');
    edit(result, 0.2); edit(result, 0.6);
    act(() => useStore.setState({ physiqueTargets: { goalMetrics: { waist: 78 }, renderSettings: { vignette: false }, milestones: [{ id: 'existing' }] } }));
    await tick();
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(body()).toMatchObject({ goalMetrics: { waist: 78 }, renderSettings: { vignette: false }, milestones: [{ id: 'existing' }], parametricAvatar: { contexts: { current: { parameters: { noseWider: 0.6 } } } } });
    expect(result.current.status).toBe('saved');
  });

  it('keeps Current and Goal documents and saved history independent', async () => {
    const original = createParametricDocument();
    useStore.setState({ physiqueTargets: { parametricAvatar: original, goalMetrics: { waist: 80 } } });
    const { result } = renderHook(() => useParametricAvatar());
    edit(result, 0.25, 'current'); edit(result, 0.8, 'goal');
    expect(result.current.document.contexts.current.parameters.noseWider).toBe(0.25);
    expect(result.current.document.contexts.goal.parameters.noseWider).toBe(0.8);
    expect(original.contexts.current.parameters).toEqual({});
    expect(original.contexts.goal.parameters).toEqual({});
    await tick();
    expect(useStore.getState().physiqueTargets.parametricAvatar.contexts).toMatchObject({ current: { parameters: { noseWider: 0.25 } }, goal: { parameters: { noseWider: 0.8 } } });
  });

  it('shows an unsaved edit while a delayed request is pending, and acknowledges only after success', async () => {
    const response = deferred();
    vi.mocked(apiRequest).mockReturnValueOnce(response.promise);
    const { result } = renderHook(() => useParametricAvatar());
    edit(result, 0.4);
    await tick();
    expect(result.current.status).toBe('saving');
    expect(useStore.getState().physiqueTargets.parametricAvatar).toBeUndefined();
    await act(async () => { response.resolve({}); await settle(); });
    expect(result.current.status).toBe('saved');
    expect(useStore.getState().physiqueTargets.parametricAvatar.contexts.current.parameters.noseWider).toBe(0.4);
  });

  it('keeps a failed draft visible and makes explicit flush failure retryable', async () => {
    vi.mocked(apiRequest).mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useParametricAvatar());
    edit(result, 0.5);
    let request;
    act(() => { request = result.current.flush(); });
    await act(async () => { await expect(request).rejects.toThrow(/offline/); });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toMatch(/offline/);
    expect(result.current.document.contexts.current.parameters.noseWider).toBe(0.5);
    expect(useStore.getState().physiqueTargets.parametricAvatar).toBeUndefined();
    await act(async () => { await result.current.flush(); });
    expect(result.current.status).toBe('saved');
    expect(result.current.error).toBe('');
    expect(apiRequest).toHaveBeenCalledTimes(2);
  });

  it('serializes a newer draft behind an inflight save without losing its values', async () => {
    const response = deferred();
    vi.mocked(apiRequest).mockReturnValueOnce(response.promise);
    const { result } = renderHook(() => useParametricAvatar());
    edit(result, 0.2); await tick();
    edit(result, 0.9); await tick();
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(result.current.document.contexts.current.parameters.noseWider).toBe(0.9);
    await act(async () => { response.resolve({}); await settle(); });
    expect(apiRequest).toHaveBeenCalledTimes(2);
    expect(body(0).parametricAvatar.contexts.current.parameters.noseWider).toBe(0.2);
    expect(body(1).parametricAvatar.contexts.current.parameters.noseWider).toBe(0.9);
    expect(result.current.status).toBe('saved');
    expect(useStore.getState().physiqueTargets.parametricAvatar.contexts.current.parameters.noseWider).toBe(0.9);
  });

  it('drains a newer edit during explicit flush and rejects if that newest save fails before its debounce fires', async () => {
    const firstResponse = deferred();
    vi.mocked(apiRequest).mockReturnValueOnce(firstResponse.promise).mockRejectedValueOnce(new Error('newest draft offline'));
    const { result } = renderHook(() => useParametricAvatar());
    edit(result, 0.2);
    let request;
    act(() => { request = result.current.flush(); });
    const rejection = expect(request).rejects.toThrow(/newest draft offline/);
    await act(async () => { await settle(); });
    expect(apiRequest).toHaveBeenCalledTimes(1);

    // Do not advance the debounce clock. Navigation must await this newer
    // draft as part of the already-running flush rather than discard it.
    edit(result, 0.9);
    await act(async () => { firstResponse.resolve({}); await rejection; await settle(); });
    expect(apiRequest).toHaveBeenCalledTimes(2);
    expect(body(0).parametricAvatar.contexts.current.parameters.noseWider).toBe(0.2);
    expect(body(1).parametricAvatar.contexts.current.parameters.noseWider).toBe(0.9);
    expect(useStore.getState().physiqueTargets.parametricAvatar.contexts.current.parameters.noseWider).toBe(0.2);
    expect(result.current.document.contexts.current.parameters.noseWider).toBe(0.9);
    expect(result.current.status).toBe('error');
    expect(result.current.error).toMatch(/newest draft offline/);

    await act(async () => { await result.current.flush(); });
    expect(result.current.status).toBe('saved');
    expect(result.current.error).toBe('');
    expect(useStore.getState().physiqueTargets.parametricAvatar.contexts.current.parameters.noseWider).toBe(0.9);
    await tick();
    expect(apiRequest).toHaveBeenCalledTimes(3);
  });

  it('registers a synchronous person-switch flush and unregisters it on unmount', async () => {
    const flushers = new Set();
    const unregister = vi.fn();
    const registerFlush = vi.fn((flush) => { flushers.add(flush); return () => { flushers.delete(flush); unregister(); }; });
    const record = { personId: 'self', physiqueTargets: {}, updatePhysiqueTargets: useStore.getState().updatePhysiqueTargets, registerFlush };
    const wrapper = ({ children }) => <AvatarRecordContext.Provider value={record}>{children}</AvatarRecordContext.Provider>;
    const { result, unmount } = renderHook(() => useParametricAvatar(), { wrapper });
    expect(flushers.size).toBe(1);
    edit(result, 0.7);
    await act(async () => { for (const flush of flushers) await flush(); });
    expect(result.current.status).toBe('saved');
    expect(apiRequest).toHaveBeenCalledTimes(1);
    unmount();
    expect(flushers.size).toBe(0);
    expect(unregister).toHaveBeenCalledTimes(1);
    await tick();
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });

  it('flushes a pending draft on unmount without waiting for its debounce timer', async () => {
    const { result, unmount } = renderHook(() => useParametricAvatar());
    edit(result, 0.6);
    unmount();
    await act(async () => { await settle(); });
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(useStore.getState().physiqueTargets.parametricAvatar.contexts.current.parameters.noseWider).toBe(0.6);
    await tick();
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });

  it('keeps two people and the owner targets isolated through scoped save callbacks', async () => {
    const friendA = { id: 'a', name: 'A', physiqueTargets: { goalMetrics: { waist: 70 } } };
    const friendB = { id: 'b', name: 'B', physiqueTargets: { appearanceMetrics: { hairColor: '#111111' } } };
    useStore.setState({ physiqueTargets: { goalMetrics: { waist: 80 }, avatarPeople: { people: [friendA, friendB], activePersonId: 'a' } } });
    const recordFor = (person) => ({ personId: person.id, physiqueTargets: person.physiqueTargets, registerFlush: () => () => {}, updatePhysiqueTargets: update => useStore.getState().updatePhysiqueTargets(latest => patchAvatarPerson(latest, person.id, current => ({ physiqueTargets: update(current.physiqueTargets) }))) });
    let record = recordFor(friendA);
    const wrapper = ({ children }) => <AvatarRecordContext.Provider value={record}>{children}</AvatarRecordContext.Provider>;
    const first = renderHook(() => useParametricAvatar(), { wrapper });
    edit(first.result, 0.3); await tick(); first.unmount();
    record = recordFor(friendB);
    const second = renderHook(() => useParametricAvatar(), { wrapper });
    expect(second.result.current.document.contexts.current.parameters).toEqual({});
    edit(second.result, 0.9, 'goal'); await tick();
    const targets = useStore.getState().physiqueTargets;
    expect(targets.goalMetrics.waist).toBe(80);
    expect(targets.parametricAvatar).toBeUndefined();
    expect(targets.avatarPeople.people[0].physiqueTargets).toMatchObject({ goalMetrics: { waist: 70 }, parametricAvatar: { contexts: { current: { parameters: { noseWider: 0.3 } }, goal: { parameters: {} } } } });
    expect(targets.avatarPeople.people[1].physiqueTargets).toMatchObject({ appearanceMetrics: { hairColor: '#111111' }, parametricAvatar: { contexts: { current: { parameters: {} }, goal: { parameters: { noseWider: 0.9 } } } } });
  });

  it('does not send an unsaved old-account document through a new-account flush', async () => {
    const nextDocument = patchParametricContext(createParametricDocument(), { parameters: { noseNarrower: 0.4 } });
    const { result } = renderHook(() => useParametricAvatar());
    edit(result, 0.8);
    act(() => {
      useStore.getState().resetSessionData();
      useStore.setState({ user: { id: 'next-owner' }, physiqueTargets: { parametricAvatar: nextDocument } });
    });
    await tick();
    await act(async () => { await expect(result.current.flush()).rejects.toThrow(/account or person changed/); });
    expect(apiRequest).not.toHaveBeenCalled();
    expect(useStore.getState().physiqueTargets.parametricAvatar.id).toBe(nextDocument.id);
    // The workspace remounts by owner ID. A standalone stale hook must remain
    // pinned and reject edits until reopened rather than change its save owner.
    expect(() => edit(result, 0.2)).toThrow(/Reopen/);
    expect(result.current.error).toMatch(/account or person changed/);
  });

  it('does not acknowledge an old-account inflight response into the next account', async () => {
    const response = deferred(); vi.mocked(apiRequest).mockReturnValueOnce(response.promise);
    const nextDocument = createParametricDocument();
    const { result } = renderHook(() => useParametricAvatar());
    edit(result, 0.8); await tick();
    act(() => {
      useStore.getState().resetSessionData();
      useStore.setState({ user: { id: 'next-owner' }, physiqueTargets: { parametricAvatar: nextDocument } });
    });
    await act(async () => { response.resolve({}); await settle(); });
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(useStore.getState().physiqueTargets.parametricAvatar.id).toBe(nextDocument.id);
    expect(() => edit(result, 0.2)).toThrow(/Reopen/);
  });

  it('surfaces an incompatible saved document without replacing it or silently saving defaults', async () => {
    const incompatible = { ...createParametricDocument(), schemaVersion: 100 };
    useStore.setState({ physiqueTargets: { parametricAvatar: incompatible, goalMetrics: { waist: 80 } } });
    const { result } = renderHook(() => useParametricAvatar());
    expect(result.current.document).toBeNull();
    expect(result.current.error).toMatch(/could not be opened/);
    await tick();
    expect(apiRequest).not.toHaveBeenCalled();
    expect(useStore.getState().physiqueTargets.parametricAvatar).toBe(incompatible);
  });
});
