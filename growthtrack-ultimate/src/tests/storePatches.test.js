/**
 * tests/storePatches.test.js — GrowthTrack Ultimate
 *
 * Unit tests for store/storePatches.js:
 *   • makeFetchInitialData (Promise.allSettled partial-failure behaviour)
 *   • makeUpdateNote (PUT /notes/:id)
 *   • makeTogglePinnedTab (add/remove from pinnedTabs)
 *
 * Uses vitest + msw (or manual fetch mocking) via vi.stubGlobal.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeFetchInitialData, makeUpdateNote, makeTogglePinnedTab } from '../store/storePatches';

// —————————————————————————————————————————————————————
// Helper: create a minimal fetch mock
// —————————————————————————————————————————————————————
function mockFetch(urlToResponse) {
  return vi.fn((url) => {
    const key = Object.keys(urlToResponse).find(k => url.includes(k));
    if (!key) return Promise.reject(new Error(`No mock for ${url}`));
    const resp = urlToResponse[key];
    if (resp instanceof Error) return Promise.reject(resp);
    return Promise.resolve({
      ok:     resp.ok ?? true,
      status: resp.status ?? 200,
      json:   () => Promise.resolve(resp.body ?? {}),
    });
  });
}

// —————————————————————————————————————————————————————
// makeFetchInitialData
// —————————————————————————————————————————————————————
describe('makeFetchInitialData', () => {
  let state, setFn, getFn;

  beforeEach(() => {
    state = { user: { id: 42 }, isLoading: false };
    setFn = vi.fn((updater) => {
      if (typeof updater === 'function') {
        Object.assign(state, updater(state));
      } else {
        Object.assign(state, updater);
      }
    });
    getFn = () => state;
  });

  it('sets isLoading to false after completion', async () => {
    // All endpoints succeed with empty arrays
    global.fetch = mockFetch({
      '/tasks':        { body: [] },
      '/finance':      { body: [] },
      '/habits':       { body: [] },
      '/goals':        { body: [] },
      '/sleep':        { body: [] },
      '/nutrition':    { body: [] },
      '/training':     { body: [] },
      '/notes':        { body: [] },
      '/medical':      { body: [] },
      '/shopping':     { body: [] },
      '/timesheet':    { body: [] },
      '/health-extras':{ body: [] },
      '/calendar':     { body: [] },
    });

    const fn = makeFetchInitialData(setFn, getFn, 'http://api');
    await fn();
    expect(state.isLoading).toBe(false);
  });

  it('still completes when one endpoint fails (allSettled behaviour)', async () => {
    global.fetch = mockFetch({
      '/tasks':        { body: [{ id: 1 }] },
      '/finance':      new Error('Network error'),  // one failure
      '/habits':       { body: [] },
      '/goals':        { body: [] },
      '/sleep':        { body: [] },
      '/nutrition':    { body: [] },
      '/training':     { body: [] },
      '/notes':        { body: [] },
      '/medical':      { body: [] },
      '/shopping':     { body: [] },
      '/timesheet':    { body: [] },
      '/health-extras':{ body: [] },
      '/calendar':     { body: [] },
    });

    const fn = makeFetchInitialData(setFn, getFn, 'http://api');
    await fn();

    expect(state.isLoading).toBe(false);
    expect(state.tasks).toEqual([{ id: 1 }]);
    expect(state._failedSlices).toContain('finance');
  });

  it('uses safeUserId fallback (id=1) when user is null', async () => {
    state.user = null;
    const calls = [];
    global.fetch = vi.fn((url) => {
      calls.push(url);
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    const fn = makeFetchInitialData(setFn, getFn, 'http://api');
    await fn();

    expect(calls.some(u => u.includes('userId=1'))).toBe(true);
  });
});

// —————————————————————————————————————————————————————
// makeUpdateNote
// —————————————————————————————————————————————————————
describe('makeUpdateNote', () => {
  let state, setFn, getFn;

  beforeEach(() => {
    state = {
      user: { id: 1 },
      notes: [
        { id: 10, title: 'Old title', content: 'Old content' },
      ],
    };
    setFn = vi.fn((updater) => {
      if (typeof updater === 'function') Object.assign(state, updater(state));
      else Object.assign(state, updater);
    });
    getFn = () => state;
  });

  it('calls PUT /notes/:id (not POST /notes)', async () => {
    const calls = [];
    global.fetch = vi.fn((url, opts) => {
      calls.push({ url, method: opts?.method });
      return Promise.resolve({
        ok:   true,
        json: () => Promise.resolve({ id: 10, title: 'New title', content: 'New content' }),
      });
    });

    const fn = makeUpdateNote(setFn, getFn, 'http://api');
    await fn(10, { title: 'New title', content: 'New content' });

    expect(calls[0].url).toMatch(/\/notes\/10$/);
    expect(calls[0].method).toBe('PUT');
  });

  it('returns null and does NOT update state when noteId is missing', async () => {
    const fn = makeUpdateNote(setFn, getFn, 'http://api');
    const result = await fn(null, { title: 'x' });
    expect(result).toBeNull();
    expect(setFn).not.toHaveBeenCalled();
  });

  it('updates notes array in store on success', async () => {
    global.fetch = vi.fn(() => Promise.resolve({
      ok:   true,
      json: () => Promise.resolve({ id: 10, title: 'Updated', content: 'New body' }),
    }));

    const fn = makeUpdateNote(setFn, getFn, 'http://api');
    await fn(10, { title: 'Updated', content: 'New body' });

    expect(state.notes[0].title).toBe('Updated');
  });
});

// —————————————————————————————————————————————————————
// makeTogglePinnedTab
// —————————————————————————————————————————————————————
describe('makeTogglePinnedTab', () => {
  let state, setFn, getFn;

  beforeEach(() => {
    state = {
      user: { id: 5, pinnedTabs: ['overview', 'tasks'] },
    };
    setFn = vi.fn((updater) => {
      if (typeof updater === 'function') Object.assign(state, updater(state));
      else Object.assign(state, updater);
    });
    getFn = () => state;
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));
  });

  it('pins a tab that is not yet pinned', async () => {
    const fn = makeTogglePinnedTab(setFn, getFn, 'http://api');
    await fn('goals');
    expect(state.user.pinnedTabs).toContain('goals');
  });

  it('unpins a tab that is already pinned', async () => {
    const fn = makeTogglePinnedTab(setFn, getFn, 'http://api');
    await fn('tasks');
    expect(state.user.pinnedTabs).not.toContain('tasks');
  });

  it('initialises pinnedTabs when undefined', async () => {
    state.user.pinnedTabs = undefined;
    const fn = makeTogglePinnedTab(setFn, getFn, 'http://api');
    await fn('finance');
    expect(state.user.pinnedTabs).toContain('finance');
  });

  it('reverts optimistic update if API call fails', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('Network')));
    const before = [...state.user.pinnedTabs];
    const fn = makeTogglePinnedTab(setFn, getFn, 'http://api');
    await fn('notes');
    // After revert, pinnedTabs should be back to original
    expect(state.user.pinnedTabs).toEqual(before);
  });
});
