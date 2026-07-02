import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const API_BASE = 'http://localhost:3001/api';

async function apiSync(endpoint, method = 'POST', data = null) {
  try {
    const state = useStore.getState();
      const options = {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': String(state.user?.id || 1),
          'x-actor-name': String(state.user?.name || 'System'),
          'x-actor-email': String(state.user?.email || 'admin@growthtrack.ultimate')
        },
      };
    if (data) options.body = JSON.stringify(data);
    const res = await fetch(`${API_BASE}${endpoint}`, options);
    return await res.json();
  } catch (e) {
    console.warn(`[useStore] API sync failed for ${endpoint}:`, e.message);
    return null;
  }
}

// Data is now fetched from the backend API. 
// No hardcoded data is maintained in the application source code.


/**
 * GrowthTrack Ultimate — Zustand Store
 *
 * Replaces the monolithic `useLocalStorage('ultimate_user', USER)` pattern.
 * Each module has its own slice and actions so components only re-render
 * when their specific data changes.
 *
 * Persisted to localStorage via zustand/middleware persist.
 */
const useStore = create(
  persist(
    (set, get) => ({
      // ── UI State (not persisted — handled separately)
      theme: 'dark',
      palette: 'gold',
      activeTab: 'overview',
      pinnedTabs: ['overview', 'humanoid', 'physique', 'health', 'tasks', 'finance', 'dashboards'],
      isLoading: false,
      serverStatus: 'unknown', // 'online' | 'offline' | 'unknown'
      onboardingComplete: false,
      lastCheckIn: null, // ISO date string e.g. '2026-05-03'

      // ── Core user profile (hydrated from database)
      user: null,
      skills: [],
      calendar_events: [],

      // ── Finance slice
      finance: { transactions: [], budgets: [] },

      // ── Shopping slice
      shopping: { items: [] },

      // ── Entertainment slice
      entertainment: { media: [] },

      // ── Timesheet slice
      timesheet: { sessions: [] },
      metric_logs: [],

      // ── Migrated DB Slices (hydrated from DB)
      trainingPlan: null,
      nutritionStrategy: null,
      lifestyleTips: [],
      medicalData: null,
      physiqueTargets: null,
      assessmentQA: [],

      // UI Actions
      // ──────────────────────────────────────────────────────────
      setLastCheckIn: (date) => set({ lastCheckIn: date }),
      setUser: (user) => set({ user }),
      setOnboardingComplete: (val) => set({ onboardingComplete: val }),
      setTheme: (theme) => set({ theme }),
      setPalette: (palette) => set({ palette }),
      setActiveTab: (activeTab) => set({ activeTab }),
      setOnboardingComplete: (val) => set({ onboardingComplete: val }),
      togglePinnedTab: (tabId) => set((state) => {
        if (state.pinnedTabs.includes(tabId)) {
          return { pinnedTabs: state.pinnedTabs.filter(id => id !== tabId) };
        } else {
          return { pinnedTabs: [...state.pinnedTabs, tabId] };
        }
      }),

      // ──────────────────────────────────────────────────────────
      // User Actions — granular updates
      // ──────────────────────────────────────────────────────────
      /** Replace the entire user object (used by legacy setUser callers) */
      setUser: (userOrUpdater) => {
        set((state) => {
          const newUser = typeof userOrUpdater === 'function'
            ? userOrUpdater(state.user)
            : userOrUpdater;
          apiSync('/user', 'POST', newUser);
          return { user: newUser };
        });
      },

      /** Merge a partial update into a user sub-key (e.g., 'lifestyle') */
      updateUserSlice: (key, data) => {
        set((state) => {
          const newUser = {
            ...state.user,
            [key]: { ...(state.user?.[key] || {}), ...data },
          };
          apiSync('/user', 'POST', newUser);
          return { user: newUser };
        });
      },

      // ──────────────────────────────────────────────────────────
      // Sync Actions
      // ──────────────────────────────────────────────────────────
      fetchInitialData: async () => {
        set({ isLoading: true });
        const fetchJSON = async (ep) => await apiSync(ep, 'GET');

        try {
          const [
            user, tasks, shopping, timesheet,
            training, nutrition, lifestyle,
            medical, physique, assessment, metricLogs, skills, events,
            financeData, notes, goals, sleep, docs, subs, habits, media
          ] = await Promise.all([
            fetchJSON('/user_profile'),
            fetchJSON('/tasks'),
            fetchJSON('/shopping'),
            fetchJSON('/timesheet'),
            fetchJSON('/training_plan'),
            fetchJSON('/nutrition_strategy'),
            fetchJSON('/lifestyle_tips'),
            fetchJSON('/medical_data'),
            fetchJSON('/physique_targets'),
            fetchJSON('/assessment_qa'),
            fetchJSON('/metric_logs'),
            fetchJSON('/skills'),
            fetchJSON('/calendar_events'),
            fetchJSON('/finance'),
            fetchJSON('/notes'),
            fetchJSON('/goals'),
            fetchJSON('/sleep_logs'),
            fetchJSON('/documents'),
            fetchJSON('/subscriptions'),
            fetchJSON('/habits'),
            fetchJSON('/entertainment'),
          ]);

          const newState = {
            isLoading: false,
            skills: Array.isArray(skills) ? skills : [],
            calendar_events: Array.isArray(events) ? events : [],
            timesheet: { sessions: Array.isArray(timesheet) ? timesheet : [] },
            shopping: { items: Array.isArray(shopping) ? shopping : [] },
            metric_logs: Array.isArray(metricLogs) ? metricLogs : [],
            trainingPlan: training,
            nutritionStrategy: nutrition,
            lifestyleTips: Array.isArray(lifestyle) ? lifestyle : [],
            medicalData: medical,
            physiqueTargets: physique,
            assessmentQA: Array.isArray(assessment) ? assessment : [],
            notes: Array.isArray(notes) ? notes : [],
            goals: Array.isArray(goals) ? goals : [],
            sleep_logs: Array.isArray(sleep) ? sleep : [],
            documents: Array.isArray(docs) ? docs : [],
            subscriptions: Array.isArray(subs) ? subs : [],
            habits: Array.isArray(habits) ? habits : [],
            entertainment: { media: Array.isArray(media) ? media : [] },
          };

          if (user) newState.user = user;
          if (financeData) {
            newState.finance = {
              transactions: financeData.transactions || [],
              budgets: financeData.budgets || []
            };
          }

          set(newState);

          // Merge tasks into user object
          const pending = Array.isArray(tasks) ? tasks.filter(t => !t.done) : [];
          const completed = Array.isArray(tasks) ? tasks.filter(t => t.done) : [];
          set((state) => ({
            user: {
              ...state.user,
              tasks: { pending, completed, recurring: state.user?.tasks?.recurring || [] }
            }
          }));
        } catch (err) {
          console.error('[useStore] fetchInitialData error:', err);
          set({ isLoading: false });
        }
      },

      saveMetricLog: async (log) => {
        const res = await apiSync('/metric_logs', 'POST', log);
        if (res && res.id) {
          set(state => ({ metric_logs: [{ ...log, id: res.id }, ...state.metric_logs] }));
        }
      },

      // ──────────────────────────────────────────────────────────
      // Finance Actions
      // ──────────────────────────────────────────────────────────
      addTransaction: async (tx) => {
        const payload = { ...tx, id: Date.now().toString(), date: tx.date || new Date().toISOString().split('T')[0] };
        // Optimistic update
        set((state) => ({
          finance: { ...state.finance, transactions: [payload, ...state.finance.transactions] },
        }));
        // Persist to DB
        apiSync('/finance', 'POST', payload).catch(e => console.warn('[Finance] sync failed', e));
      },

      deleteTransaction: async (id) => {
        set((state) => ({
          finance: { ...state.finance, transactions: state.finance.transactions.filter((t) => t.id !== id) },
        }));
        apiSync(`/finance/${id}`, 'DELETE').catch(() => {});
      },

      addBudget: async (budget) => {
        const payload = { ...budget, id: Date.now().toString() };
        set((state) => ({
          finance: { ...state.finance, budgets: [...(state.finance.budgets || []), payload] },
        }));
        apiSync('/budgets', 'POST', payload).catch(() => {});
      },

      deleteBudget: async (id) => {
        set((state) => ({
          finance: { ...state.finance, budgets: (state.finance.budgets || []).filter(b => b.id !== id) },
        }));
        apiSync(`/budgets/${id}`, 'DELETE').catch(() => {});
      },

      // Shopping Actions
      // ──────────────────────────────────────────────────────────
      addShoppingItem: async (item) => {
        const res = await apiSync('/shopping', 'POST', item);
        if (res?.id) {
          set((state) => ({
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

      deleteShoppingItem: (id) => {
        apiSync(`/shopping/${id}`, 'DELETE');
        set((state) => ({
          shopping: {
            ...state.shopping,
            items: state.shopping.items.filter((i) => i.id !== id),
          },
        }));
      },

      toggleShoppingPurchased: (id) => {
        const item = get().shopping.items.find(i => i.id === id);
        if (item) {
          apiSync(`/shopping/${id}`, 'PUT', { purchased: !item.purchased });
          set((state) => ({
            shopping: {
              ...state.shopping,
              items: state.shopping.items.map((i) =>
                i.id === id ? { ...i, purchased: !item.purchased } : i
              ),
            },
          }));
        }
      },

      // ──────────────────────────────────────────────────────────
      // Task Actions
      // ──────────────────────────────────────────────────────────
      addTask: async (task) => {
        const res = await apiSync('/tasks', 'POST', task);
        if (res?.id) {
          set((state) => {
            const currentTasks = state.user?.tasks || { pending: [], completed: [], recurring: [] };
            return {
              user: {
                ...state.user,
                tasks: {
                  ...currentTasks,
                  pending: [{ ...task, id: res.id, done: false }, ...(currentTasks.pending || [])],
                },
              },
            };
          });
        }
      },

      deleteTask: (id, list) => {
        apiSync(`/tasks/${id}`, 'DELETE');
        set((state) => {
          const currentTasks = state.user?.tasks || { pending: [], completed: [], recurring: [] };
          return {
            user: {
              ...state.user,
              tasks: {
                ...currentTasks,
                [list]: (currentTasks[list] || []).filter((t) => t.id !== id),
              },
            },
          };
        });
      },

      completeTask: (id) => {
        const currentTasks = get().user?.tasks || { pending: [], completed: [], recurring: [] };
        const task = currentTasks.pending?.find((t) => t.id === id);
        if (task) {
          const completedAt = new Date().toISOString();
          apiSync(`/tasks/${id}`, 'PUT', { done: true, completedAt });
          set((state) => {
            const stateTasks = state.user?.tasks || { pending: [], completed: [], recurring: [] };
            return {
              user: {
                ...state.user,
                tasks: {
                  ...stateTasks,
                  pending: (stateTasks.pending || []).filter((t) => t.id !== id),
                  completed: [{ ...task, done: true, completedAt }, ...(stateTasks.completed || [])],
                },
              },
            };
          });
        }
      },

      updateTask: (id, updates) => {
        apiSync(`/tasks/${id}`, 'PUT', updates);
        set((state) => {
          const currentTasks = state.user?.tasks || { pending: [], completed: [], recurring: [] };
          return {
            user: {
              ...state.user,
              tasks: {
                ...currentTasks,
                pending: (currentTasks.pending || []).map(t => t.id === id ? { ...t, ...updates } : t),
              },
            },
          };
        });
      },

      reopenTask: (id) => {
        const currentTasks = get().user?.tasks || { pending: [], completed: [], recurring: [] };
        const task = currentTasks.completed?.find((t) => t.id === id);
        if (task) {
          apiSync(`/tasks/${id}`, 'PUT', { done: false, completedAt: null });
          set((state) => {
            const stateTasks = state.user?.tasks || { pending: [], completed: [], recurring: [] };
            return {
              user: {
                ...state.user,
                tasks: {
                  ...stateTasks,
                  completed: (stateTasks.completed || []).filter(t => t.id !== id),
                  pending: [{ ...task, done: false, completedAt: null }, ...(stateTasks.pending || [])],
                },
              },
            };
          });
        }
      },

      checkServerHealth: async () => {
        try {
          const res = await fetch(`${API_BASE}/health`, { method: 'GET', signal: AbortSignal.timeout(4000) });
          set({ serverStatus: res.ok ? 'online' : 'offline' });
        } catch {
          set({ serverStatus: 'offline' });
        }
      },

      // ──────────────────────────────────────────────────────────
      // Timesheet Actions
      // ──────────────────────────────────────────────────────────
      addTimesheetSession: async (session) => {
        const res = await apiSync('/timesheet', 'POST', session);
        if (res?.id) {
          set((state) => ({
            timesheet: {
              ...state.timesheet,
              sessions: [{ ...session, id: res.id }, ...state.timesheet.sessions],
            },
          }));
        }
      },

      deleteTimesheetSession: (id) => {
        apiSync(`/timesheet/${id}`, 'DELETE');
        set((state) => ({
          timesheet: {
            ...state.timesheet,
            sessions: state.timesheet.sessions.filter((s) => s.id !== id),
          },
        }));
      },

      // ──────────────────────────────────────────────────────────
      // Entertainment Actions
      // ──────────────────────────────────────────────────────────
      addMediaItem: async (item) => {
        const res = await apiSync('/entertainment', 'POST', item);
        if (res?.id) {
          set((state) => ({
            entertainment: {
              ...state.entertainment,
              media: [...state.entertainment.media, { ...item, id: res.id }],
            },
          }));
        }
      },

      deleteMediaItem: async (id) => {
        apiSync(`/entertainment/${id}`, 'DELETE');
        set((state) => ({
          entertainment: {
            ...state.entertainment,
            media: state.entertainment.media.filter((m) => m.id !== id),
          },
        }));
      },

      updateMediaProgress: async (id, field, value) => {
        const item = get().entertainment.media.find(m => m.id === id);
        if (item) {
          const updates = { ...item, [field]: value };
          apiSync('/entertainment', 'POST', updates); // POST handles updates if id is present
          set((state) => ({
            entertainment: {
              ...state.entertainment,
              media: state.entertainment.media.map((m) =>
                m.id === id ? { ...m, [field]: value } : m
              ),
            },
          }));
        }
      },

      // ──────────────────────────────────────────────────────────
      // Notes Actions
      // ──────────────────────────────────────────────────────────
      addNote: async (note) => {
        const res = await apiSync('/notes', 'POST', note);
        if (res?.id) {
          set((state) => ({ notes: [{ ...note, id: res.id }, ...state.notes] }));
        }
      },
      deleteNote: (id) => {
        apiSync(`/notes/${id}`, 'DELETE');
        set((state) => ({ notes: state.notes.filter(n => n.id !== id) }));
      },
      updateNote: (id, updates) => {
        apiSync('/notes', 'POST', { id, ...updates });
        set((state) => ({ notes: state.notes.map(n => n.id === id ? { ...n, ...updates } : n) }));
      },

      // ──────────────────────────────────────────────────────────
      // Goal Actions
      // ──────────────────────────────────────────────────────────
      addGoal: async (goal) => {
        const res = await apiSync('/goals', 'POST', goal);
        if (res?.id) {
          set((state) => ({ goals: [{ ...goal, id: res.id }, ...state.goals] }));
        }
      },
      deleteGoal: (id) => {
        apiSync(`/goals/${id}`, 'DELETE');
        set((state) => ({ goals: state.goals.filter(g => g.id !== id) }));
      },
      updateGoal: (id, updates) => {
        apiSync('/goals', 'POST', { id, ...updates });
        set((state) => ({ goals: state.goals.map(g => g.id === id ? { ...g, ...updates } : g) }));
      },

      // ──────────────────────────────────────────────────────────
      // Sleep Actions
      // ──────────────────────────────────────────────────────────
      saveSleepLog: async (log) => {
        await apiSync('/sleep_logs', 'POST', log);
        set((state) => ({
          sleep_logs: [log, ...state.sleep_logs.filter(l => l.date !== log.date)].sort((a, b) => b.date.localeCompare(a.date))
        }));
      },

      // ──────────────────────────────────────────────────────────
      // Document Actions
      // ──────────────────────────────────────────────────────────
      addDocument: async (doc) => {
        const res = await apiSync('/documents', 'POST', doc);
        if (res?.id) {
          set((state) => ({ documents: [{ ...doc, id: res.id }, ...state.documents] }));
        }
      },
      deleteDocument: (id) => {
        apiSync(`/documents/${id}`, 'DELETE');
        set((state) => ({ documents: state.documents.filter(d => d.id !== id) }));
      },

      // ──────────────────────────────────────────────────────────
      // Habit Actions
      // ──────────────────────────────────────────────────────────
      addHabit: async (habit) => {
        const res = await apiSync('/habits', 'POST', habit);
        if (res?.id) {
          set((state) => ({ habits: [...state.habits, { ...habit, id: res.id, completed_dates: [], streak: 0 }] }));
        }
      },
      deleteHabit: (id) => {
        apiSync(`/habits/${id}`, 'DELETE');
        set((state) => ({ habits: state.habits.filter(h => h.id !== id) }));
      },
      updateHabit: (id, updates) => {
        apiSync(`/habits/${id}`, 'PUT', updates);
        set((state) => ({ habits: state.habits.map(h => h.id === id ? { ...h, ...updates } : n) }));
      },

      // ──────────────────────────────────────────────────────────
      // Subscription Actions
      // ──────────────────────────────────────────────────────────
      addSubscription: async (sub) => {
        const res = await apiSync('/subscriptions', 'POST', sub);
        if (res?.id) {
          set((state) => ({ subscriptions: [...state.subscriptions, { ...sub, id: res.id, active: 1 }] }));
        }
      },
      deleteSubscription: (id) => {
        apiSync(`/subscriptions/${id}`, 'DELETE');
        set((state) => ({ subscriptions: state.subscriptions.filter(s => s.id !== id) }));
      },
    }),
    {
      name: 'growthtrack-ultimate-v4',
      storage: createJSONStorage(() => localStorage),
      version: 4,
      // Only persist UI preferences and local data — never transient server state
      partialize: (state) => ({
        theme: state.theme,
        palette: state.palette,
        activeTab: state.activeTab,
        pinnedTabs: state.pinnedTabs,
        // Persist finance locally as fallback if server is offline
        finance: state.finance,
        entertainment: state.entertainment,
        timesheet: state.timesheet,
        shopping: state.shopping,
        onboardingComplete: state.onboardingComplete,
        lastCheckIn: state.lastCheckIn,
      }),
      migrate: (persistedState, version) => {
        // Clean migration — no dependency on deleted USER constant
        try {
          if (version < 4) {
            const oldTheme = localStorage.getItem('ultimate_theme');
            if (oldTheme) persistedState.theme = JSON.parse(oldTheme);
            const oldPalette = localStorage.getItem('ultimate_palette');
            if (oldPalette) persistedState.palette = JSON.parse(oldPalette);
          }
        } catch {
          // silent — start fresh
        }
        return persistedState;
      },
    }
  )
);

// ── Granular selectors (stable references, prevent unnecessary re-renders)
export const selectUser = (s) => s.user;
export const selectSetUser = (s) => s.setUser;
export const selectUpdateUserSlice = (s) => s.updateUserSlice;

export const selectTheme = (s) => s.theme;
export const selectPalette = (s) => s.palette;
export const selectActiveTab = (s) => s.activeTab;
export const selectPinnedTabs = (s) => s.pinnedTabs;
export const selectSetTheme = (s) => s.setTheme;
export const selectSetPalette = (s) => s.setPalette;
export const selectSetActiveTab = (s) => s.setActiveTab;
export const selectTogglePinnedTab = (s) => s.togglePinnedTab;
export const selectOnboardingComplete = (s) => s.onboardingComplete;
export const selectSetOnboardingComplete = (s) => s.setOnboardingComplete;

export const selectFinance = (s) => s.finance;
export const selectAddTransaction = (s) => s.addTransaction;
export const selectDeleteTransaction = (s) => s.deleteTransaction;

export const selectShopping = (s) => s.shopping;
export const selectAddShoppingItem = (s) => s.addShoppingItem;
export const selectDeleteShoppingItem = (s) => s.deleteShoppingItem;
export const selectToggleShoppingPurchased = (s) => s.toggleShoppingPurchased;

export const selectEntertainment = (s) => s.entertainment;
export const selectAddMediaItem = (s) => s.addMediaItem;
export const selectDeleteMediaItem = (s) => s.deleteMediaItem;
export const selectUpdateMediaProgress = (s) => s.updateMediaProgress;

export const selectAddTask = (s) => s.addTask;
export const selectDeleteTask = (s) => s.deleteTask;
export const selectCompleteTask = (s) => s.completeTask;
export const selectUpdateTask = (s) => s.updateTask;
export const selectReopenTask = (s) => s.reopenTask;
export const selectFetchInitialData = (s) => s.fetchInitialData;
export const selectCheckServerHealth = (s) => s.checkServerHealth;
export const selectServerStatus = (s) => s.serverStatus;
export const selectIsLoading = (s) => s.isLoading;

export const selectTimesheet = (s) => s.timesheet;
export const selectAddTimesheetSession = (s) => s.addTimesheetSession;
export const selectDeleteTimesheetSession = (s) => s.deleteTimesheetSession;

export const selectTrainingPlan = (s) => s.trainingPlan;
export const selectNutritionStrategy = (s) => s.nutritionStrategy;
export const selectLifestyleTips = (s) => s.lifestyleTips;
export const selectMedicalData = (s) => s.medicalData;
export const selectPhysiqueTargets = (s) => s.physiqueTargets;
export const selectAssessmentQA = (s) => s.assessmentQA;

export const selectAddBudget = (s) => s.addBudget;
export const selectDeleteBudget = (s) => s.deleteBudget;

export const selectNotes = (s) => s.notes;
export const selectAddNote = (s) => s.addNote;
export const selectDeleteNote = (s) => s.deleteNote;
export const selectUpdateNote = (s) => s.updateNote;

export const selectGoals = (s) => s.goals;
export const selectAddGoal = (s) => s.addGoal;
export const selectDeleteGoal = (s) => s.deleteGoal;
export const selectUpdateGoal = (s) => s.updateGoal;

export const selectSleepLogs = (s) => s.sleep_logs;
export const selectSaveSleepLog = (s) => s.saveSleepLog;

export const selectDocuments = (s) => s.documents;
export const selectAddDocument = (s) => s.addDocument;
export const selectDeleteDocument = (s) => s.deleteDocument;

export const selectHabits = (s) => s.habits;
export const selectAddHabit = (s) => s.addHabit;
export const selectDeleteHabit = (s) => s.deleteHabit;
export const selectUpdateHabit = (s) => s.updateHabit;

export const selectSubscriptions = (s) => s.subscriptions;
export const selectAddSubscription = (s) => s.addSubscription;
export const selectDeleteSubscription = (s) => s.deleteSubscription;

export default useStore;
