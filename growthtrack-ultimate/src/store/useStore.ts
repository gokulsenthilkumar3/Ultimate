import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createFinanceSlice } from './slices/financeSlice';
import { createTaskSlice } from './slices/taskSlice';
import { createHealthSlice } from './slices/healthSlice';
import { loadSyncedState, syncEndpoint } from '../lib/dataSync';

export async function apiSync(endpoint: string, method: string = 'POST', data: any = null): Promise<any> {
  try {
    if (endpoint.includes('/finance/sync/bank') && method === 'POST') {
      return { data: { transactions: [] } };
    }
    if (endpoint.includes('/health/sync/apple') && method === 'POST') {
      return { ok: true, data: { synced: true } };
    }
    const apiBase = (import.meta as any).env.VITE_API_URL || (import.meta as any).env.VITE_API_BASE || 'http://localhost:3001';
    const token = localStorage.getItem('growthtrack-session-token') || sessionStorage.getItem('growthtrack-session-token');
    // Use the durable API whenever a signed-in session is available. The
    // local sync layer remains a safe offline fallback for demo/local mode.
    if (token && (endpoint === '/logs' || !endpoint.startsWith('/api/'))) {
      const apiPath = ['/logs', '/referrals'].includes(endpoint) ? `/api${endpoint}` : endpoint;
      const response = await fetch(`${apiBase}${apiPath}`, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: method === 'GET' ? undefined : JSON.stringify(data ?? {}),
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) return response.json();
    }
    return await syncEndpoint(endpoint, method, data);
  } catch (e: any) {
    console.warn(`[useStore] sync failed for ${endpoint}:`, e.message);
    return null;
  }
}

const useStore = create<any>()(
  persist(
    (set, get, api) => ({
      ...createFinanceSlice(set, get, api),
      ...createTaskSlice(set, get, api),
      ...createHealthSlice(set, get, api),

      theme: 'dark',
      palette: 'gold',
      activeTab: 'overview',
      pinnedTabs: ['overview', 'humanoid', 'physique', 'health', 'tasks', 'finance', 'dashboards', 'logs'],
      navigationOrder: ['today', 'physique', 'insights', 'workspace', 'fitness', 'wellness', 'money', 'social', 'entertainment', 'tools', 'profile'],
      navigationTabOrder: {},

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
      setNavigationOrder: (navigationOrder: string[]) => set({ navigationOrder }),
      setNavigationTabOrder: (navigationTabOrder: Record<string, string[]>) => set({ navigationTabOrder }),
      isLoading: false,
      serverStatus: 'unknown',
      onboardingComplete: false,
      lastCheckIn: null,
      checkInAlertDismissedDate: null,

      user: null,
      skills: [],
      calendar_events: [],
      databases: [],

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
      setOnboardingComplete: (status: boolean) => set({ onboardingComplete: status }),
      setTheme: (theme: string) => set({ theme }),
      setPalette: (palette: string) => set({ palette }),

      setUser: (userOrUpdater: any) => {
        set((state: any) => {
          const newUser = typeof userOrUpdater === 'function'
            ? userOrUpdater(state.user)
            : userOrUpdater;
          apiSync('/user', 'POST', newUser);
          return { user: newUser };
        });
      },

      updateUser: (data: any) => {
        set((state: any) => {
          const newUser = { ...state.user, ...data };
          apiSync('/user', 'POST', newUser);
          return { user: newUser };
        });
      },

      updateUserSlice: (key: string, data: any) => {
        set((state: any) => {
          const newUser = {
            ...state.user,
            [key]: { ...(state.user?.[key] || {}), ...data },
          };
          apiSync('/user', 'POST', newUser);
          return { user: newUser };
        });
      },

      fetchInitialData: async () => {
        set({ isLoading: true });

        try {
          const stored = await loadSyncedState();
          const newState: any = { isLoading: false };

          if (stored && typeof stored === 'object') {
            Object.assign(newState, stored);
            // Normalize offline collection caches back to the shapes used by
            // the UI. This keeps the cache format stable across restarts.
            if (Array.isArray(stored.entertainment)) newState.entertainment = { media: stored.entertainment };
            if (Array.isArray(stored.shopping)) newState.shopping = { items: stored.shopping };
            if (Array.isArray(stored.tasks)) {
              const pending = stored.tasks.filter((item: any) => !item?.done);
              const completed = stored.tasks.filter((item: any) => item?.done);
              newState.user = { ...(newState.user || {}), tasks: { pending, completed } };
            }
            if (Array.isArray(stored.finance)) {
              newState.finance = { ...(newState.finance || {}), transactions: Object.fromEntries(stored.finance.map((item: any) => [item.id, item])) };
            }
          }

          set(newState);
        } catch (err) {
          console.error('[useStore] fetchInitialData error:', err);
          set({ isLoading: false });
        }
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

      addWorkoutFromTrainingDay: async (day: any) => {
        if (!day) return;
        const volume = (day.exercises || []).reduce(
          (s: any, e: any) => s + (Number(e.sets) * Number(e.reps) * Number(e.weight) || 0),
          0
        );
        const today = new Date().toISOString().slice(0, 10);
        const sessionRes = await apiSync('/workout_sessions', 'POST', {
          date: today,
          notes: day.muscleGroup || day.day,
          duration_minutes: null,
        });
        if (!sessionRes?.id) return;

        const exercisesPayload = {
          exercises: (day.exercises || []).map((ex: any) => ({
            exercise_name: ex.name,
            sets: Number(ex.sets) || null,
            reps: Number(ex.reps) || null,
            weight_kg: Number(ex.weight) || null,
            notes: null,
          })),
        };
        await apiSync(`/workout_sessions/${sessionRes.id}/exercises`, 'POST', exercisesPayload);

        set((state: any) => ({
          workouts: {
            sessions: [
              {
                id: sessionRes.id,
                date: today,
                notes: day.muscleGroup || day.day,
                duration_minutes: null,
                volume,
              },
              ...state.workouts.sessions,
            ],
            exercisesBySession: state.workouts.exercisesBySession,
          },
        }));
      },

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

      addShoppingItem: async (item: any) => {
        const res = await apiSync('/shopping', 'POST', item);
        if (res?.id) {
          set((state: any) => ({
            shopping: {
              ...state.shopping,
              items: [
                { ...item, id: res.id, purchased: false },
                ...state.shopping.items,
              ],
            },
          }));
        }
      },

      deleteShoppingItem: (id: string) => {
        apiSync(`/shopping/${id}`, 'DELETE');
        set((state: any) => ({
          shopping: {
            ...state.shopping,
            items: state.shopping.items.filter((i: any) => i.id !== id),
          },
        }));
      },

      toggleShoppingPurchased: (id: string) => {
        const item = get().shopping.items.find((i: any) => i.id === id);
        if (item) {
          apiSync(`/shopping/${id}`, 'PUT', { purchased: !item.purchased });
          set((state: any) => ({
            shopping: {
              ...state.shopping,
              items: state.shopping.items.map((i: any) =>
                i.id === id ? { ...i, purchased: !item.purchased } : i
              ),
            },
          }));
        }
      },

      checkServerHealth: async () => {
        try {
          const res = await fetch(`${((import.meta as any).env.VITE_API_URL || 'http://localhost:3001')}/api/health`, { method: 'GET', signal: AbortSignal.timeout(4000) });
          set({ serverStatus: res.ok ? 'online' : 'offline' });
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

      addMediaItem: async (item: any) => {
        const res = await apiSync('/entertainment', 'POST', item);
        if (res?.id) {
          set((state: any) => ({
            entertainment: {
              ...state.entertainment,
              media: [...state.entertainment.media, { ...item, id: res.id }],
            },
          }));
        }
      },

      deleteMediaItem: async (id: string) => {
        apiSync(`/entertainment/${id}`, 'DELETE');
        set((state: any) => ({
          entertainment: {
            ...state.entertainment,
            media: state.entertainment.media.filter((m: any) => m.id !== id),
          },
        }));
      },

      updateMediaProgress: async (id: string, field: string, value: any) => {
        const item = get().entertainment.media.find((m: any) => m.id === id);
        if (item) {
          const updates = { ...item, [field]: value };
          apiSync('/entertainment', 'POST', updates);
          set((state: any) => ({
            entertainment: {
              ...state.entertainment,
              media: state.entertainment.media.map((m: any) =>
                m.id === id ? { ...m, [field]: value } : m
              ),
            },
          }));
        }
      },

      // OTT sync state — persisted in store (not local useState)
      entertainmentSync: { otts: ['Netflix'] } as any,
      setEntertainmentSync: (sync: any) => set({ entertainmentSync: sync }),

      addNote: async (note: any) => {
        const res = await apiSync('/notes', 'POST', note);
        if (res?.id) {
          set((state: any) => ({ notes: [{ ...note, id: res.id }, ...state.notes] }));
        }
      },
      deleteNote: (id: string) => {
        apiSync(`/notes/${id}`, 'DELETE');
        set((state: any) => ({ notes: state.notes.filter((n: any) => n.id !== id) }));
      },
      updateNote: (id: string, updates: any) => {
        apiSync(`/notes/${id}`, 'PUT', updates);
        set((state: any) => ({ notes: state.notes.map((n: any) => n.id === id ? { ...n, ...updates } : n) }));
      },

      addGoal: async (goal: any) => {
        const res = await apiSync('/goals', 'POST', goal);
        if (res?.id) {
          set((state: any) => ({ goals: [{ ...goal, id: res.id }, ...state.goals] }));
        }
      },
      deleteGoal: (id: string) => {
        apiSync(`/goals/${id}`, 'DELETE');
        set((state: any) => ({ goals: state.goals.filter((g: any) => g.id !== id) }));
      },
      updateGoal: (id: string, updates: any) => {
        apiSync(`/goals/${id}`, 'PUT', updates);
        set((state: any) => ({ goals: state.goals.map((g: any) => g.id === id ? { ...g, ...updates } : g) }));
      },

      saveSleepLog: async (log: any) => {
        await apiSync('/sleep_logs', 'POST', log);
        set((state: any) => ({
          sleep_logs: [log, ...state.sleep_logs.filter((l: any) => l.date !== log.date)].sort((a, b) => b.date.localeCompare(a.date))
        }));
      },

      addDocument: async (doc: any) => {
        const res = await apiSync('/documents', 'POST', doc);
        if (res?.id) {
          set((state: any) => ({ documents: [{ ...doc, id: res.id }, ...state.documents] }));
        }
      },
      deleteDocument: (id: string) => {
        apiSync(`/documents/${id}`, 'DELETE');
        set((state: any) => ({ documents: state.documents.filter((d: any) => d.id !== id) }));
      },

      addHabit: async (habit: any) => {
        const res = await apiSync('/habits', 'POST', habit);
        if (res?.id) {
          set((state: any) => ({ habits: [...state.habits, { ...habit, id: res.id, completed_dates: [], streak: 0 }] }));
        }
      },
      deleteHabit: (id: string) => {
        apiSync(`/habits/${id}`, 'DELETE');
        set((state: any) => ({ habits: state.habits.filter((h: any) => h.id !== id) }));
      },
      updateHabit: (id: string, updates: any) => {
        apiSync(`/habits/${id}`, 'PUT', updates);
        set((state: any) => ({ habits: state.habits.map((h: any) => h.id === id ? { ...h, ...updates } : h) }));
      },

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

      addSubscription: async (sub: any) => {
        const res = await apiSync('/subscriptions', 'POST', sub);
        if (res?.id) {
          set((state: any) => ({ subscriptions: [...state.subscriptions, { ...sub, id: res.id, active: 1 }] }));
        }
      },
      deleteSubscription: (id: string) => {
        apiSync(`/subscriptions/${id}`, 'DELETE');
        set((state: any) => ({ subscriptions: state.subscriptions.filter((s: any) => s.id !== id) }));
      },

      updateTrainingPlan: async (data: any) => { set({ trainingPlan: data }); apiSync('/training_plan', 'POST', data); },
      updateNutritionStrategy: async (data: any) => { set({ nutritionStrategy: data }); apiSync('/nutrition_strategy', 'POST', data); },
      updateLifestyleTips: async (data: any) => { set({ lifestyleTips: data }); apiSync('/lifestyle_tips', 'POST', data); },
      updateMedicalData: async (data: any) => { set({ medicalData: data }); apiSync('/medical_data', 'POST', data); },
      updatePhysiqueTargets: async (data: any) => { set({ physiqueTargets: data }); apiSync('/physique_targets', 'POST', data); },
      updateAssessmentQA: async (data: any) => { set({ assessmentQA: data }); apiSync('/assessment_qa', 'POST', data); },
      updateSkills: async (data: any) => { set({ skills: data }); apiSync('/skills', 'POST', data); },
      updateCalendarEvents: async (data: any) => { set({ calendar_events: data }); apiSync('/calendar_events', 'POST', data); },
      setDatabases: (data: any[]) => set({ databases: data }),
      updateWellnessData: async (data: any) => { set({ wellnessData: data }); apiSync('/wellness_data', 'POST', data); },

      addMoodLog: async (log: any) => {
        await apiSync('/mood_logs', 'POST', log);
        set((state: any) => ({
          moodLogs: [log, ...state.moodLogs.filter((l: any) => l.date !== log.date)].sort((a, b) => b.date.localeCompare(a.date)),
        }));
      },

      addVitalLog: async (log: any) => {
        await apiSync('/vitals_logs', 'POST', log);
        set((state: any) => ({
          vitalsLogs: [log, ...state.vitalsLogs].sort((a, b) => b.date.localeCompare(a.date)),
        }));
      },

      addMedication: async (medication: any) => {
        const res = await apiSync('/medications', 'POST', medication);
        if (res?.id) {
          set((state: any) => ({ medications: [...state.medications, { ...medication, id: res.id }] }));
        }
      },

      deleteMedication: async (id: string) => {
        await apiSync(`/medications/${id}`, 'DELETE');
        set((state: any) => ({ medications: state.medications.filter((m: any) => m.id !== id) }));
      },
    }),
    {
      name: 'growthtrack-ultimate-v4',
      storage: createJSONStorage(() => localStorage),
      version: 4,
      // Persist every user-owned data domain. The previous whitelist only
      // saved a handful of modules, so a restart looked like a data reset.
      partialize: (state: any) => ({
        ...Object.fromEntries(Object.entries(state).filter(([key, value]) => typeof value !== 'function' && key !== 'isLoading' && key !== 'serverStatus')),
      }),
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
