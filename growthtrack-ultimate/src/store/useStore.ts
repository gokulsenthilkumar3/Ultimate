import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { safeLocalStorage } from '../utils/safeLocalStorage';
import { createFinanceSlice } from './slices/financeSlice';
import { createTaskSlice, taskIsDone } from './slices/taskSlice';
import { createHealthSlice } from './slices/healthSlice';
import { apiRequest } from '../lib/apiClient';
import { captureSession, createWriteQueue, requireRecord } from './persistence';
import { createRecordActions } from './recordActions';
import { createJournalActions } from './journalActions';
import { createLibraryActions, createShoppingConversion, validateMedia, validateShopping } from './libraryActions';
import { createWorkoutCompletion } from './workoutActions';

export async function apiSync(endpoint: string, method: string = 'POST', data: any = null): Promise<any> {
  const apiPath = endpoint.startsWith('/api/') ? endpoint : `/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  return apiRequest(apiPath, {
    method,
    body: method === 'GET' || method === 'HEAD' ? undefined : data instanceof FormData ? data : JSON.stringify(data ?? {}),
  });
}

const PORTFOLIO_TYPES = new Set(['Stock', 'ETF', 'Mutual Fund', 'Crypto', 'Gold', 'Real Estate', 'Bond', 'FD', 'Cash', 'Other']);

export function normalizePortfolioHolding(holding: any, fallbackId = Date.now().toString()) {
  if (!holding || typeof holding !== 'object' || Array.isArray(holding)) return null;
  const name = String(holding.name ?? '').trim().slice(0, 120);
  const units = Number(holding.units);
  const buyPrice = Number(holding.buyPrice);
  const currentPrice = holding.currentPrice === '' || holding.currentPrice == null
    ? null
    : Number(holding.currentPrice);
  if (!name || !Number.isFinite(units) || units <= 0 || units > 1_000_000_000) return null;
  if (holding.buyPrice == null || typeof holding.buyPrice === 'boolean' || (typeof holding.buyPrice === 'string' && !holding.buyPrice.trim())) return null;
  if (!Number.isFinite(buyPrice) || buyPrice < 0 || buyPrice > 1_000_000_000_000) return null;
  if (typeof holding.currentPrice === 'boolean' || (currentPrice != null && (!Number.isFinite(currentPrice) || currentPrice < 0 || currentPrice > 1_000_000_000_000))) return null;
  const buyDate = String(holding.buyDate ?? '').trim();
  return {
    // Keep acknowledged currency, price observation dates, audit timestamps,
    // and valuation history. None of these is inferred from the purchase date.
    ...holding,
    id: String(holding.id ?? fallbackId),
    name,
    symbol: String(holding.symbol ?? '').trim().slice(0, 32).toUpperCase(),
    type: PORTFOLIO_TYPES.has(holding.type) ? holding.type : 'Other',
    units,
    buyPrice,
    currentPrice,
    buyDate: /^\d{4}-\d{2}-\d{2}$/.test(buyDate) ? buyDate : '',
  };
}

export function normalizePortfolio(rows: any) {
  if (rows == null) return [];
  if (!Array.isArray(rows)) throw new Error('Portfolio records are invalid. Refresh or restore the original data before editing.');
  return rows.map((row, index) => {
    const holding = normalizePortfolioHolding(row, `holding-${index + 1}`);
    if (!holding) throw new Error(`Portfolio holding ${index + 1} is invalid. No records were discarded.`);
    return holding;
  });
}

// User profile writes use the same ordered queue as portfolio writes. Profile
// screens can update several fields in one interaction (and the GitHub link
// is one of those fields), so allowing requests to race makes an older
// snapshot overwrite a newer one on the server. The catch is attached here so
// fire-and-forget callers remain safe while awaited callers can still surface
// the original error to the UI.
let userSyncQueue: Promise<any> = Promise.resolve();

function persistUser(nextUser: any) {
  const request = userSyncQueue.then(() => apiSync('/user', 'POST', nextUser));
  userSyncQueue = request.catch((error) => {
    console.error('[useStore] user persistence failed:', error);
    return null;
  });
  return request;
}

const useStore = create<any>()(
  persist(
    (set, get, api) => {
      const notes = createRecordActions(set, get, 'notes', '/notes');
      const goals = createRecordActions(set, get, 'goals', '/goals');
      const sleep = createRecordActions(set, get, 'sleep_logs', '/sleep_logs');
      const moods = createRecordActions(set, get, 'moodLogs', '/mood_logs');
      const vitals = createRecordActions(set, get, 'vitalsLogs', '/vitals_logs');
      const documents = createRecordActions(set, get, 'documents', '/documents');
      const habits = createRecordActions(set, get, 'habits', '/habits');
      const subscriptions = createRecordActions(set, get, 'subscriptions', '/subscriptions');
      const medications = createRecordActions(set, get, 'medications', '/medications');
      const shoppingItems = createLibraryActions(set, get, 'shopping', 'items', '/shopping', validateShopping);
      const mediaItems = createLibraryActions(set, get, 'entertainment', 'media', '/entertainment', validateMedia);
      const singletonQueue = createWriteQueue();
      const preferenceQueue = createWriteQueue();
      const portfolioQueue = createWriteQueue();
      let initialRequest = 0;
      const savePreferences = (updates: any) => {
        const current = captureSession(get);
        return preferenceQueue(`${get()._sessionVersion}:${get().user?.id}:preferences`, async () => {
          if (!current()) throw new Error('The session changed. Refresh and try again.');
          const keys = Object.keys(updates);
          const previous = Object.fromEntries(keys.map(key => [key, get()[key]]));
          set({ ...updates, preferenceSaveError: null });
          try {
            const response = requireRecord(await apiSync('/preferences', 'PUT', updates));
            if (current()) set((state: any) => Object.fromEntries(keys
              .filter(key => state[key] === updates[key])
              .map(key => [key, response[key] === undefined ? updates[key] : response[key]])));
            return response;
          } catch (error) {
            if (current()) set((state: any) => ({
              ...Object.fromEntries(keys.filter(key => state[key] === updates[key]).map(key => [key, previous[key]])),
              preferenceSaveError: error,
            }));
            throw error;
          }
        });
      };
      const saveSingleton = (key: string, route: string, data: any) => {
        const current = captureSession(get);
        return singletonQueue(`${get()._sessionVersion}:${get().user?.id}:${key}`, async () => {
          if (!current()) throw new Error('The session changed. Refresh and try again.');
          const next = typeof data === 'function' ? data(get()[key]) : data;
          const response = await apiSync(route, 'POST', next);
          if (current()) set((state: any) => ({ [key]: next, user: state.user ? { ...state.user, [key]: next } : state.user }));
          return response;
        });
      };
      return ({
      ...createFinanceSlice(set, get, api),
      ...createTaskSlice(set, get, api),
      ...createHealthSlice(set, get, api),
      ...createJournalActions(set, get),

      // Saved preferences win; new workspaces follow the operating system.
      theme: 'system',
      palette: 'gold',
      activeTab: 'overview',
      pinnedTabs: ['overview', 'humanoid', 'physique', 'health', 'tasks', 'finance', 'dashboards', 'logs'],
      navigationOrder: ['money', 'insights', 'wellness', 'work', 'life', 'system'],
      navigationTabOrder: {},
      sidebarCollapsed: false,
      reducedMotion: false,
      density: 'comfortable',

      togglePinnedTab: (tabId: string) => {
        set((state: any) => {
          const already = state.pinnedTabs.includes(tabId);
          return {
            pinnedTabs: already
              ? state.pinnedTabs.filter((t: any) => t !== tabId)
              : [...state.pinnedTabs, tabId],
          };
        });
      },
      setNavigationOrder: (navigationOrder: string[]) => savePreferences({ navigationOrder }),
      setNavigationTabOrder: (navigationTabOrder: Record<string, string[]>) => savePreferences({ navigationTabOrder }),
      setSidebarCollapsed: (sidebarCollapsed: boolean) => savePreferences({ sidebarCollapsed }),
      setReducedMotion: (reducedMotion: boolean) => savePreferences({ reducedMotion }),
      setDensity: (density: 'comfortable' | 'compact') => savePreferences({ density }),
      isLoading: false,
      initialLoadError: null,
      preferenceSaveError: null,
      _sessionVersion: 0,
      _dataRevision: 0,
      serverStatus: 'unknown',
      onboardingComplete: false,
      lastCheckIn: null,
      checkInAlertDismissedDate: null,

      user: null,
      skills: [],
      calendar_events: [],
      databases: [],
      appConfig: {},
      healthProfile: {},
      bodyProfile: null,

      shopping: { items: [] },
      entertainment: { media: [] },
      timesheetEntries: [],
      
      sleep_logs: [],
      nutrition_logs: [],
      notes: [],
      goals: [],
      documents: [],
      habits: [],
      subscriptions: [],
      portfolio: [],

      addTimesheetEntry: (entry: any) => set((state: any) => ({ timesheetEntries: [entry, ...state.timesheetEntries] })),
      deleteTimesheetEntry: (id: string) => set((state: any) => ({ timesheetEntries: state.timesheetEntries.filter((e: any) => e.id !== id) })),


      trainingPlan: null,
      nutritionStrategy: null,
      lifestyleTips: [],
      medicalData: null,
      physiqueTargets: null,
      assessmentQA: [],
      wellnessData: null,

      moodLogs: [],
      vitalsLogs: [],
      medications: [],

      workouts: {
        sessions: [],
        exercisesBySession: {},
      },

      habitLogsByHabit: {},

      setLastCheckIn: (date: string) => set({ lastCheckIn: date }),
      setCheckInAlertDismissedDate: (date: string) => set({ checkInAlertDismissedDate: date }),
      setActiveTab: (tab: string) => set({ activeTab: tab }),
      setOnboardingComplete: (status: boolean) => savePreferences({ onboardingComplete: status }),
      setTheme: (theme: string) => savePreferences({ theme }),
      setPalette: (palette: string) => savePreferences({ palette }),

      setUser: (userOrUpdater: any) => {
        const currentUser = get().user;
        const newUser = typeof userOrUpdater === 'function'
          ? userOrUpdater(currentUser)
          : userOrUpdater;
        if (newUser == null) { get().resetSessionData(); return Promise.resolve(null); }
        set({ user: newUser });
        return persistUser(newUser);
      },

      updateUser: (data: any) => {
        const newUser = { ...(get().user || {}), ...(data || {}) };
        set({ user: newUser });
        return persistUser(newUser);
      },

      updateUserSlice: (key: string, data: any) => {
        const currentUser = get().user || {};
        const currentValue = currentUser[key];
        // Object slices (for example repoNotes) merge so a single key edit
        // does not discard its siblings. Arrays and scalar values must be
        // replaced as-is; spreading manualProjects into an object was the
        // reason the Projects tab stopped rendering after adding a project.
        const canMergeObjects = data && typeof data === 'object' && !Array.isArray(data)
          && currentValue && typeof currentValue === 'object' && !Array.isArray(currentValue);
        const nextValue = canMergeObjects ? { ...currentValue, ...data } : data;
        const newUser = { ...currentUser, [key]: nextValue };
        set({ user: newUser });
        return persistUser(newUser);
      },

      setPortfolio: (nextOrUpdater: any) => {
        const current = captureSession(get);
        return portfolioQueue(`${get()._sessionVersion}:${get().user?.id}:portfolio`, async () => {
          if (!current()) throw new Error('The session changed. Refresh and try again.');
          const previous = get().portfolio || [];
          const proposed = typeof nextOrUpdater === 'function' ? nextOrUpdater(previous) : nextOrUpdater;
          const next = normalizePortfolio(proposed);
          const response = await apiSync('/portfolio', 'PUT', next);
          let rows = Array.isArray(response) ? response : response?.portfolio;
          if (typeof rows === 'string') {
            try { rows = JSON.parse(rows); }
            catch { throw new Error('The saved portfolio could not be verified. Refresh before retrying.'); }
          }
          let saved = next;
          if (rows !== undefined) {
            if (!Array.isArray(rows)) throw new Error('The saved portfolio could not be verified. Refresh before retrying.');
            saved = normalizePortfolio(rows);
            if (saved.length !== next.length || next.some((holding: any) => {
              const acknowledged: any = saved.find((row: any) => row.id === holding.id);
              return !acknowledged || ['currency', 'priceAsOf', 'priceDate', 'updatedAt', 'valuations'].some(key => holding[key] !== undefined && acknowledged[key] === undefined);
            })) throw new Error('The server did not retain the portfolio records or snapshot metadata. Refresh before retrying.');
          }
          if (current()) set((state: any) => ({ portfolio: saved, user: state.user ? { ...state.user, portfolio: saved } : state.user }));
          return response;
        });
      },

      addHolding: (holding: any) => {
        const normalized = normalizePortfolioHolding(holding);
        if (!normalized) return Promise.resolve(null);
        return get().setPortfolio((current: any[]) => [...current, normalized]);
      },

      updateHolding: (id: string | number, updates: any) => {
        return get().setPortfolio((current: any[]) => current.map((holding: any) => (
          String(holding.id) === String(id) ? { ...holding, ...updates } : holding
        )));
      },

      deleteHolding: (id: string | number) => {
        return get().setPortfolio((current: any[]) => current.filter((holding: any) => String(holding.id) !== String(id)));
      },

      updateBodyProfile: async (data: any) => {
        const previous = get().bodyProfile || {};
        const optimistic = { ...previous, ...data };
        set({ bodyProfile: optimistic });
        try {
          const saved = await apiSync('/body-profile', 'PUT', data);
          set({ bodyProfile: saved });
          return saved;
        } catch (error) {
          set({ bodyProfile: previous });
          throw error;
        }
      },

      fetchInitialData: async () => {
        const request = ++initialRequest;
        const current = captureSession(get);
        set({ isLoading: true, initialLoadError: null });

        try {
          const stored: any = await apiRequest('/api/state');
          if (!current() || request !== initialRequest) return stored;
          if (!stored?.user || !Array.isArray(stored.tasks)) throw new Error('The server returned an invalid workspace snapshot.');
          const pending = stored.tasks.filter((item: any) => !taskIsDone(item));
          const completed = stored.tasks.filter(taskIsDone);
          const preference = stored.preference || {};
          set({
            isLoading: false,
            initialLoadError: null,
            _dataRevision: get()._dataRevision + 1,
            user: { ...(stored.user || {}), tasks: { pending, completed } },
            theme: preference.theme || get().theme || 'system', palette: preference.palette || 'gold',
            sidebarCollapsed: Boolean(preference.sidebarCollapsed), onboardingComplete: Boolean(preference.onboardingComplete),
            reducedMotion: Boolean(preference.reducedMotion),
            density: preference.density === 'compact' ? 'compact' : 'comfortable',
            navigationOrder: preference.navigationOrder?.length ? preference.navigationOrder : get().navigationOrder,
            navigationTabOrder: preference.navigationTabOrder || {},
            bodyProfile: stored.bodyProfile || null, socialProfiles: stored.socialProfiles || [],
            healthProfile: stored.healthProfile || {}, appConfig: stored.config || {}, databases: stored.databases || [],
            finance: { ...(get().finance || {}), transactions: Object.fromEntries((stored.finance || []).map((item: any) => [item.id, item])), budgets: Object.fromEntries((stored.budgets || []).map((item: any) => [item.id, item])) },
            shopping: { items: stored.shopping || [] }, entertainment: { media: stored.entertainment || [] },
            timesheetEntries: stored.timesheet || [], sleep_logs: stored.sleep_logs || [], nutrition_logs: stored.nutrition_logs || [],
            notes: stored.notes || [], goals: stored.goals || [], documents: stored.documents || [], habits: stored.habits || [], subscriptions: stored.subscriptions || [],
            portfolio: normalizePortfolio(stored.user?.portfolio),
            metric_logs: stored.metric_logs || [], moodLogs: stored.moodLogs || [], vitalsLogs: stored.vitalsLogs || [], medications: stored.medications || [],
            workouts: { sessions: stored.workout_sessions || [], exercisesBySession: {} },
            trainingPlan: stored.user?.trainingPlan || null, nutritionStrategy: stored.user?.nutritionStrategy || null, lifestyleTips: stored.user?.lifestyleTips || [], medicalData: stored.user?.medicalData || null, physiqueTargets: stored.user?.physiqueTargets || null, assessmentQA: stored.user?.assessmentQA || [], skills: stored.user?.skills || [], calendar_events: stored.user?.calendar_events || [], wellnessData: stored.user?.wellnessData || null,
          });
          return stored;
        } catch (err) {
          console.error('[useStore] fetchInitialData error:', err);
          if (current() && request === initialRequest) set({ isLoading: false, initialLoadError: err });
          throw err;
        }
      },

      // App calls this when authentication changes, before loading an account.
      resetSessionData: () => {
        initialRequest += 1;
        set((state: any) => ({
          user: null, initialLoadError: null, preferenceSaveError: null, isLoading: false,
          _sessionVersion: state._sessionVersion + 1, _dataRevision: state._dataRevision + 1,
          notes: [], goals: [], sleep_logs: [], metric_logs: [], nutrition_logs: [], moodLogs: [], vitalsLogs: [], medications: [],
          habits: [], habitLogsByHabit: {}, subscriptions: [], documents: [], portfolio: [],
          shopping: { items: [] }, entertainment: { media: [] }, timesheetEntries: [], timesheet: { sessions: [] },
          finance: { transactions: {}, budgets: {} }, workouts: { sessions: [], exercisesBySession: {} },
          skills: [], calendar_events: [], trainingPlan: null, nutritionStrategy: null, lifestyleTips: [], medicalData: null,
          physiqueTargets: null, assessmentQA: [], wellnessData: null, bodyProfile: null, healthProfile: {},
          socialProfiles: [], databases: [], appConfig: {}, lastCheckIn: null, checkInAlertDismissedDate: null,
        }));
      },

      fetchWorkoutExercisesForSession: async (sessionId: string) => {
        const exercises = await apiSync(`/workout_sessions/${sessionId}/exercises`, 'GET');
        if (Array.isArray(exercises)) {
          set((state: any) => ({
            workouts: {
              ...state.workouts,
              exercisesBySession: {
                ...state.workouts.exercisesBySession,
                [sessionId]: exercises,
              },
            },
          }));
        }
      },

      addWorkoutFromTrainingDay: createWorkoutCompletion(set, get),

      deleteWorkoutSession: async (id: string) => {
        await apiSync(`/workout_sessions/${id}`, 'DELETE');
        set((state: any) => ({
          workouts: {
            sessions: state.workouts.sessions.filter((s: any) => s.id !== id),
            exercisesBySession: Object.fromEntries(
              Object.entries(state.workouts.exercisesBySession).filter(([key]) => Number(key) !== Number(id))
            ),
          },
        }));
      },

      addShoppingItem: shoppingItems.add,
      updateShoppingItem: shoppingItems.update,
      deleteShoppingItem: shoppingItems.remove,
      convertShoppingToExpense: createShoppingConversion(set, get, shoppingItems),
      toggleShoppingPurchased: (id: string) => shoppingItems.update(id, (item: any) => ({ purchased: !item.purchased, stage: item.purchased ? 'future' : 'purchased' })),

      toggleShoppingItem: (id: string) => get().toggleShoppingPurchased(id),

      checkServerHealth: async () => {
        try {
          await apiRequest('/api/health', { method: 'GET', timeoutMs: 4000 });
          set({ serverStatus: 'online' });
        } catch {
          set({ serverStatus: 'offline' });
        }
      },

      addTimesheetSession: async (session: any) => {
        const res = await apiSync('/timesheet', 'POST', session);
        if (res?.id) {
          set((state: any) => ({
            timesheet: {
              ...state.timesheet,
              sessions: [{ ...session, id: res.id }, ...state.timesheet.sessions],
            },
          }));
        }
      },

      deleteTimesheetSession: (id: string) => {
        apiSync(`/timesheet/${id}`, 'DELETE');
        set((state: any) => ({
          timesheet: {
            ...state.timesheet,
            sessions: state.timesheet.sessions.filter((s: any) => s.id !== id),
          },
        }));
      },

      addMediaItem: mediaItems.add,
      updateMediaItem: mediaItems.update,
      deleteMediaItem: mediaItems.remove,
      updateMediaProgress: (id: string, field: string, value: any) => mediaItems.update(id, { [field]: value }),

      // Manual subscription indicators, not linked accounts or watch sync.
      setEntertainmentSync: (sync: any) => get().updateWellnessData((data: any) => ({ ...data, entertainment: { ...data?.entertainment, ...sync } })),

      addNote: notes.add,
      deleteNote: notes.remove,
      updateNote: notes.update,

      addGoal: goals.add,
      deleteGoal: goals.remove,
      updateGoal: goals.update,

      saveSleepLog: sleep.upsertDate,

      addDocument: documents.add,
      deleteDocument: documents.remove,

      addHabit: (habit: any) => habits.add({ completed_dates: [], streak: 0, ...habit }),
      deleteHabit: habits.remove,
      updateHabit: habits.update,

      fetchHabitLogsForHabit: async (habitId: string) => {
        const logs = await apiSync(`/habit_logs/${habitId}`, 'GET');
        if (Array.isArray(logs)) {
          set((state: any) => ({
            habitLogsByHabit: {
              ...state.habitLogsByHabit,
              [habitId]: logs,
            },
          }));
        }
      },

      toggleHabitForDate: async (habitId: string, date: string) => {
        await apiSync('/habit_logs', 'POST', { habit_id: habitId, date });
        set((state: any) => {
          const existing = state.habitLogsByHabit[habitId] || [];
          const exists = existing.some((l: any) => l.date === date);
          const nextLogs = exists
            ? existing.filter((l: any) => l.date !== date)
            : [{ habit_id: habitId, date }, ...existing];
          return {
            habitLogsByHabit: {
              ...state.habitLogsByHabit,
              [habitId]: nextLogs,
            },
          };
        });
      },

      addSubscription: (sub: any) => subscriptions.add({ active: 1, ...sub }),
      deleteSubscription: subscriptions.remove,

      updateTrainingPlan: (data: any) => saveSingleton('trainingPlan', '/training_plan', data),
      updateNutritionStrategy: (data: any) => saveSingleton('nutritionStrategy', '/nutrition_strategy', data),
      updateLifestyleTips: (data: any) => saveSingleton('lifestyleTips', '/lifestyle_tips', data),
      updateMedicalData: (data: any) => saveSingleton('medicalData', '/medical_data', data),
      updatePhysiqueTargets: (data: any) => saveSingleton('physiqueTargets', '/physique_targets', data),
      updateAssessmentQA: (data: any) => saveSingleton('assessmentQA', '/assessment_qa', data),
      updateSkills: (data: any) => saveSingleton('skills', '/skills', data),
      addSkill: (skill: any) => saveSingleton('skills', '/skills', (current: any) => [...(current || []), skill]),
      updateSkill: (id: any, updates: any) => saveSingleton('skills', '/skills', (current: any) => (current || []).map((item: any) => item.id === id ? { ...item, ...updates } : item)),
      deleteSkill: (id: any) => saveSingleton('skills', '/skills', (current: any) => (current || []).filter((item: any) => item.id !== id)),
      updateCalendarEvents: (data: any) => saveSingleton('calendar_events', '/calendar_events', data),
      setDatabases: async (data: any[]) => {
        const current = captureSession(get);
        const response = await apiSync('/custom-tables', 'PUT', data);
        if (current()) set({ databases: Array.isArray(response) ? response : data });
        return response;
      },
      updateWellnessData: (data: any) => saveSingleton('wellnessData', '/wellness_data', data),
      updateActionCenterState: (updater: any) => get().updateWellnessData((data: any) => ({
        ...(data || {}), actionCenter: typeof updater === 'function' ? updater(data?.actionCenter || {}) : updater,
      })),

      addMoodLog: moods.upsertDate,

      addVitalLog: vitals.add,

      addMedication: medications.add,
      deleteMedication: medications.remove,
    });
    },
    {
      name: 'growthtrack-ultimate-v4',
      storage: createJSONStorage(() => safeLocalStorage),
      version: 4,
      // Persist shell preferences and the portfolio cache locally. Profile
      // and collection records remain server-owned and are hydrated through
      // fetchInitialData so stale local copies cannot overwrite the account.
      partialize: (state: any) => ({ theme: state.theme, palette: state.palette, activeTab: state.activeTab, navigationOrder: state.navigationOrder, navigationTabOrder: state.navigationTabOrder, sidebarCollapsed: state.sidebarCollapsed, reducedMotion: state.reducedMotion, density: state.density, portfolio: state.portfolio }),
      migrate: (persistedState: any, version) => {
        try {
          if (version < 4) {
            const oldTheme = localStorage.getItem('ultimate_theme');
            if (oldTheme) persistedState.theme = JSON.parse(oldTheme);
            const oldPalette = localStorage.getItem('ultimate_palette');
            if (oldPalette) persistedState.palette = JSON.parse(oldPalette);
          }
        } catch {}
        return persistedState;
      },
    }
  )
);

// Direct user replacement is also a session boundary (including legacy callers).
useStore.subscribe((state: any, previous: any) => {
  const owner = (value: any) => value?.id ?? value?.email ?? null;
  if (owner(state.user) !== owner(previous.user)) useStore.setState({ initialLoadError: null, preferenceSaveError: null, _sessionVersion: state._sessionVersion + 1 });
});

export const selectUser = (s: any) => s.user;
export const selectSetUser = (s: any) => s.setUser;
export const selectUpdateUserSlice = (s: any) => s.updateUserSlice;

export const selectTheme = (s: any) => s.theme;
export const selectPalette = (s: any) => s.palette;
export const selectActiveTab = (s: any) => s.activeTab;
export const selectPinnedTabs = (s: any) => s.pinnedTabs;
export const selectSetTheme = (s: any) => s.setTheme;
export const selectSetPalette = (s: any) => s.setPalette;
export const selectSetActiveTab = (s: any) => s.setActiveTab;
export const selectActiveTabSetter = (s: any) => s.setActiveTab;
export const selectTogglePinnedTab = (s: any) => s.togglePinnedTab;
export const selectOnboardingComplete = (s: any) => s.onboardingComplete;
export const selectSetOnboardingComplete = (s: any) => s.setOnboardingComplete;

export const selectFinance = (s: any) => s.finance;
export const selectAddTransaction = (s: any) => s.addTransaction;
export const selectDeleteTransaction = (s: any) => s.deleteTransaction;

export const selectShopping = (s: any) => s.shopping;
export const selectAddShoppingItem = (s: any) => s.addShoppingItem;
export const selectDeleteShoppingItem = (s: any) => s.deleteShoppingItem;
export const selectToggleShoppingPurchased = (s: any) => s.toggleShoppingPurchased;

export const selectEntertainment = (s: any) => s.entertainment;
export const selectAddMediaItem = (s: any) => s.addMediaItem;
export const selectDeleteMediaItem = (s: any) => s.deleteMediaItem;
export const selectUpdateMediaProgress = (s: any) => s.updateMediaProgress;

export const selectAddTask = (s: any) => s.addTask;
export const selectDeleteTask = (s: any) => s.deleteTask;
export const selectCompleteTask = (s: any) => s.completeTask;
export const selectUpdateTask = (s: any) => s.updateTask;
export const selectReopenTask = (s: any) => s.reopenTask;
export const selectFetchInitialData = (s: any) => s.fetchInitialData;
export const selectCheckServerHealth = (s: any) => s.checkServerHealth;
export const selectServerStatus = (s: any) => s.serverStatus;
export const selectIsLoading = (s: any) => s.isLoading;
export const selectInitialLoadError = (s: any) => s.initialLoadError;
export const selectPreferenceSaveError = (s: any) => s.preferenceSaveError;

export const selectTimesheet = (s: any) => s.timesheet;
export const selectAddTimesheetSession = (s: any) => s.addTimesheetSession;
export const selectDeleteTimesheetSession = (s: any) => s.deleteTimesheetSession;

export const selectTrainingPlan = (s: any) => s.trainingPlan;
export const selectUpdateTrainingPlan = (s: any) => s.updateTrainingPlan;
export const selectNutritionStrategy = (s: any) => s.nutritionStrategy;
export const selectUpdateNutritionStrategy = (s: any) => s.updateNutritionStrategy;
export const selectLifestyleTips = (s: any) => s.lifestyleTips;
export const selectUpdateLifestyleTips = (s: any) => s.updateLifestyleTips;
export const selectMedicalData = (s: any) => s.medicalData;
export const selectUpdateMedicalData = (s: any) => s.updateMedicalData;
export const selectPhysiqueTargets = (s: any) => s.physiqueTargets;
export const selectUpdatePhysiqueTargets = (s: any) => s.updatePhysiqueTargets;
export const selectAssessmentQA = (s: any) => s.assessmentQA;
export const selectUpdateAssessmentQA = (s: any) => s.updateAssessmentQA;
export const selectSkills = (s: any) => s.skills;
export const selectUpdateSkills = (s: any) => s.updateSkills;
export const selectCalendarEvents = (s: any) => s.calendar_events;
export const selectUpdateCalendarEvents = (s: any) => s.updateCalendarEvents;
export const selectWellnessData = (s: any) => s.wellnessData;
export const selectUpdateWellnessData = (s: any) => s.updateWellnessData;

export const selectMoodLogs = (s: any) => s.moodLogs;
export const selectAddMoodLog = (s: any) => s.addMoodLog;

export const selectHabitLogsByHabit = (s: any) => s.habitLogsByHabit;
export const selectFetchHabitLogsForHabit = (s: any) => s.fetchHabitLogsForHabit;
export const selectToggleHabitForDate = (s: any) => s.toggleHabitForDate;

export const selectAddBudget = (s: any) => s.addBudget;
export const selectDeleteBudget = (s: any) => s.deleteBudget;

export const selectNotes = (s: any) => s.notes;
export const selectAddNote = (s: any) => s.addNote;
export const selectDeleteNote = (s: any) => s.deleteNote;
export const selectUpdateNote = (s: any) => s.updateNote;

export const selectGoals = (s: any) => s.goals;
export const selectAddGoal = (s: any) => s.addGoal;
export const selectDeleteGoal = (s: any) => s.deleteGoal;
export const selectUpdateGoal = (s: any) => s.updateGoal;

export const selectSleepLogs = (s: any) => s.sleep_logs;
export const selectSaveSleepLog = (s: any) => s.saveSleepLog;

export const selectDocuments = (s: any) => s.documents;
export const selectAddDocument = (s: any) => s.addDocument;
export const selectDeleteDocument = (s: any) => s.deleteDocument;

export const selectHabits = (s: any) => s.habits;
export const selectAddHabit = (s: any) => s.addHabit;
export const selectDeleteHabit = (s: any) => s.deleteHabit;
export const selectUpdateHabit = (s: any) => s.updateHabit;

export const selectSubscriptions = (s: any) => s.subscriptions;
export const selectAddSubscription = (s: any) => s.addSubscription;
export const selectDeleteSubscription = (s: any) => s.deleteSubscription;

export const selectWorkouts = (s: any) => s.workouts;
export const selectAddWorkoutFromTrainingDay = (s: any) => s.addWorkoutFromTrainingDay;
export const selectDeleteWorkoutSession = (s: any) => s.deleteWorkoutSession;

export const selectVitalsLogs = (s: any) => s.vitalsLogs;
export const selectAddVitalLog = (s: any) => s.addVitalLog;

export const selectMedications = (s: any) => s.medications;
export const selectAddMedication = (s: any) => s.addMedication;
export const selectDeleteMedication = (s: any) => s.deleteMedication;

// 4G-1: new exports
export const selectSaveMetricLog = (s: any) => s.saveMetricLog;
export const selectAddMetricLog = (s: any) => s.addMetricLog;
export const selectNutritionLogs = (s: any) => s.nutrition_logs;
export const selectAddNutritionLog = (s: any) => s.addNutritionLog;
export const selectDeleteNutritionLog = (s: any) => s.deleteNutritionLog;
export const selectUpdateNutritionLog = (s: any) => s.updateNutritionLog;

export default useStore;
