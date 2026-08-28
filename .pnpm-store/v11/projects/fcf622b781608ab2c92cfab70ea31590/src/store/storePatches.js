/**
 * store/storePatches.js — GrowthTrack Ultimate
 *
 * Contains patched store action implementations that are NOT yet in useStore.ts.
 * Import the functions you need and use them as drop-in replacements inside
 * your Zustand slice until a full useStore.ts migration is complete.
 *
 * ───────────────────────────────────────────────────────────────────────
 * PATCH 1 — fetchInitialData with Promise.allSettled
 *
 * The original implementation used Promise.all which causes the entire
 * data fetch to fail if any single endpoint fails (e.g. Maps offline,
 * Entertainment API down). Swapping to Promise.allSettled means the user
 * still gets all data that IS available, and only the failed slice is
 * silently skipped / retried individually.
 *
 * Usage inside your Zustand store:
 *   import { makeFetchInitialData } from './storePatches';
 *   const fetchInitialData = makeFetchInitialData(set, get, apiBase);
 * ───────────────────────────────────────────────────────────────────────
 */

import { fetchWithRetry, safeUserId, retryConfig } from '../utils/apiRetry';

/**
 * makeFetchInitialData
 *
 * Factory that returns a `fetchInitialData` action for the Zustand store.
 * All endpoint fetches are wrapped in Promise.allSettled so partial failures
 * do NOT block the rest of the data from loading.
 *
 * @param {Function} set   — Zustand set
 * @param {Function} get   — Zustand get
 * @param {string}   base  — API base URL (e.g. import.meta.env.VITE_API_URL)
 * @returns {Function}     — the async fetchInitialData action
 */
export function makeFetchInitialData(set, get, base) {
  return async function fetchInitialData() {
    const uid = safeUserId(get().user);
    set({ isLoading: true, serverError: null });

    /** Endpoint map: storeKey → relative URL */
    const endpoints = {
      tasks:         `/tasks?userId=${uid}`,
      finance:       `/finance?userId=${uid}`,
      habits:        `/habits?userId=${uid}`,
      goals:         `/goals?userId=${uid}`,
      sleep:         `/sleep?userId=${uid}`,
      nutrition:     `/nutrition?userId=${uid}`,
      training:      `/training?userId=${uid}`,
      notes:         `/notes?userId=${uid}`,
      medical:       `/medical?userId=${uid}`,
      shopping:      `/shopping?userId=${uid}`,
      timesheet:     `/timesheet?userId=${uid}`,
      healthExtras:  `/health-extras?userId=${uid}`,
      calendar:      `/calendar?userId=${uid}`,
    };

    const entries  = Object.entries(endpoints);
    const promises = entries.map(([, url]) =>
      fetchWithRetry(`${base}${url}`, {}, retryConfig.standard)
        .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    );

    const results = await Promise.allSettled(promises);

    const update  = {};
    const failed  = [];

    results.forEach((result, i) => {
      const [key] = entries[i];
      if (result.status === 'fulfilled') {
        update[key] = result.value;
      } else {
        failed.push(key);
        console.warn(`[fetchInitialData] Partial failure for "${key}":`, result.reason?.message);
      }
    });

    set({ ...update, isLoading: false, _failedSlices: failed });
  };
}

/**
 * ───────────────────────────────────────────────────────────────────────
 * PATCH 2 — updateNote using PUT /notes/:id
 *
 * The original updateNote incorrectly called POST /notes (the create endpoint),
 * which creates a duplicate entry instead of updating the existing one.
 * The correct REST verb is PUT /notes/:id (or PATCH /notes/:id if your backend
 * supports partial updates).
 *
 * Usage inside your Zustand store slice:
 *   import { makeUpdateNote } from './storePatches';
 *   const updateNote = makeUpdateNote(set, get, apiBase);
 * ───────────────────────────────────────────────────────────────────────
 */

/**
 * makeUpdateNote
 *
 * @param {Function} set   — Zustand set
 * @param {Function} get   — Zustand get
 * @param {string}   base  — API base URL
 * @returns {Function}     — async (noteId, updatedFields) => updatedNote | null
 */
export function makeUpdateNote(set, get, base) {
  return async function updateNote(noteId, updatedFields) {
    if (!noteId) {
      console.error('[updateNote] noteId is required');
      return null;
    }

    const uid = safeUserId(get().user);

    try {
      const res = await fetchWithRetry(
        `${base}/notes/${noteId}`,
        {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ ...updatedFields, userId: uid }),
        },
        retryConfig.standard,
      );

      if (!res.ok) {
        console.error(`[updateNote] Server returned ${res.status}`);
        return null;
      }

      const updated = await res.json();

      // Optimistic-update the local store
      set(state => ({
        notes: (state.notes || []).map(n => (n.id === noteId ? { ...n, ...updated } : n)),
      }));

      return updated;
    } catch (err) {
      console.error('[updateNote] Request failed:', err.message);
      return null;
    }
  };
}

/**
 * ───────────────────────────────────────────────────────────────────────
 * PATCH 3 — togglePinnedTab
 *
 * Adds / removes a tab id from the user.pinnedTabs array in the store.
 * If pinnedTabs doesn’t exist yet it is initialised to [].
 * The action also persists the change to the API.
 * ───────────────────────────────────────────────────────────────────────
 */

/**
 * makeTogglePinnedTab
 *
 * @param {Function} set  — Zustand set
 * @param {Function} get  — Zustand get
 * @param {string}   base — API base URL
 * @returns {Function}    — async (tabId: string) => void
 */
export function makeTogglePinnedTab(set, get, base) {
  return async function togglePinnedTab(tabId) {
    const uid    = safeUserId(get().user);
    const pinned = get().user?.pinnedTabs ?? [];
    const next   = pinned.includes(tabId)
      ? pinned.filter(t => t !== tabId)
      : [...pinned, tabId];

    // Optimistic update
    set(state => ({
      user: state.user ? { ...state.user, pinnedTabs: next } : state.user,
    }));

    // Persist
    try {
      await fetchWithRetry(
        `${base}/users/${uid}/pinned-tabs`,
        {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ pinnedTabs: next }),
        },
        retryConfig.standard,
      );
    } catch (err) {
      console.warn('[togglePinnedTab] Persist failed, reverting:', err.message);
      // Revert optimistic update on failure
      set(state => ({
        user: state.user ? { ...state.user, pinnedTabs: pinned } : state.user,
      }));
    }
  };
}
