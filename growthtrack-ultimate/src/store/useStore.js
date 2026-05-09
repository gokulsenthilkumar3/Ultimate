import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const API_BASE = import.meta.env.VITE_API_BASE || '';

export async function apiSync(endpoint, method = 'POST', data = null) {
  try {
    const state = useStore.getState();
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': state.user?.id || 1,
        'x-actor-name': state.user?.name || 'System',
      },
    };
    if (data) options.body = JSON.stringify(data);
    const res = await fetch(`${API_BASE}${endpoint}`, options);
    if (!res.ok) throw new Error(`HTTP ${res.status} on ${endpoint}`);
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch (e) {
    console.warn(`[useStore] API sync failed for ${endpoint}:`, e.message);
    return null;
  }
}

const useStore = create(
  persist(
    (set, get) => ({
      theme: 'dark',
      palette: 'gold',
      activeTab: 'overview',
      pinnedTabs: ['overview', 'humanoid', 'physique', 'health', 'tasks', 'finance', 'dashboards'],
      isLoading: false,
      serverStatus: 'unknown',
      onboardingComplete: false,
      lastCheckIn: null,

      user: null,
      skills: [],
      calendar_events: [],

      finance: { transactions: [], budgets: [] },
      shopping: { items: [] },
      entertainment: { media: [] },
      timesheet: { sessions: [] },
      metric_logs: [],

      trainingPlan: null,
      nutritionStrategy: null,
      lifestyleTips: [],
      medicalData: null,
      physiqueTargets: null,
      assessmentQA: [],
      wellnessData: null,

      moodLogs: [],

      workouts: {
        sessions: [],
        exercisesBySession: {},
      },

      setLastCheckIn: (date) => set({ lastCheckIn: date }),

      setUser: (userOrUpdater) => {
        set((state) => {
          const newUser = typeof userOrUpdater === 'function'
            ? userOrUpdater(state.user)
            : userOrUpdater;
          apiSync('/user', 'POST', newUser);
          return { user: newUser };
        });
      },

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

      fetchInitialData: async () => {
        set({ isLoading: true });
        const fetchJSON = async (ep) => await apiSync(ep, 'GET');

        try {
          const [
            user, tasks, shopping, timesheet,
            training, nutrition, lifestyle,
            medical, physique, assessment, wellness, metricLogs, skills, events,
            financeData, notes, goals, sleep, docs, subs, habits, media, healthExtras,
            workoutSessions, moodLogs
          ] = await Promise.all([
            fetchJSON('/user'),
            fetchJSON('/tasks'),
            fetchJSON('/shopping'),
            fetchJSON('/timesheet'),
            fetchJSON('/training_plan'),
            fetchJSON('/nutrition_strategy'),
            fetchJSON('/lifestyle_tips'),
            fetchJSON('/medical_data'),
            fetchJSON('/physique_targets'),
            fetchJSON('/assessment_qa'),
            fetchJSON('/wellness_data'),
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
            fetchJSON('/health_extras'),
            fetchJSON('/workout_sessions'),
            fetchJSON('/mood_logs'),
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
            wellnessData: wellness,
            notes: Array.isArray(notes) ? notes : [],
            goals: Array.isArray(goals) ? goals : [],
            sleep_logs: Array.isArray(sleep) ? sleep : [],
            documents: Array.isArray(docs) ? docs : [],
            subscriptions: Array.isArray(subs) ? subs : [],
            habits: Array.isArray(habits) ? habits : [],
            entertainment: { media: Array.isArray(media) ? media : [] },
            health_extras: healthExtras || {},
            moodLogs: Array.isArray(moodLogs) ? moodLogs : [],
          };

          if (user) newState.user = user;
          if (financeData) {
            newState.finance = {
              transactions: financeData.transactions || [],
              budgets: financeData.budgets || []
            };
          }

          if (Array.isArray(workoutSessions)) {
            newState.workouts = {
              sessions: workoutSessions,
              exercisesBySession: {},
            };
          }

          set(newState);

          if (Array.isArray(tasks) && tasks.length > 0) {
            const pending = tasks.filter(t => !t.done);
            const completed = tasks.filter(t => t.done);
            set((state) => ({
              user: {
                ...state.user,
                tasks: { pending, completed, recurring: state.user?.tasks?.recurring || [] }
              }
            }));
          }
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

      updateHealthExtras: async (data) => {
        set((state) => ({ health_extras: { ...(state.health_extras || {}), ...data } }));
        await apiSync('/health_extras', 'PUT', data);
      },

      fetchWorkoutExercisesForSession: async (sessionId) => {
        const exercises = await apiSync(`/workout_sessions/${sessionId}/exercises`, 'GET');
        if (Array.isArray(exercises)) {
          set((state) => ({
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

      addWorkoutFromTrainingDay: async (day) => {
        if (!day) return;
        const volume = (day.exercises || []).reduce(
          (s, e) => s + (Number(e.sets) * Number(e.reps) * Number(e.weight) || 0),
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
          exercises: (day.exercises || []).map((ex) => ({
            exercise_name: ex.name,
            sets: Number(ex.sets) || null,
            reps: Number(ex.reps) || null,
            weight_kg: Number(ex.weight) || null,
            notes: null,
          })),
        };
        await apiSync(`/workout_sessions/${sessionRes.id}/exercises`, 'POST', exercisesPayload);

        set((state) => ({
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

      deleteWorkoutSession: async (id) => {
        await apiSync(`/workout_sessions/${id}`, 'DELETE');
        set((state) => ({
          workouts: {
            sessions: state.workouts.sessions.filter((s) => s.id !== id),
            exercisesBySession: Object.fromEntries(
              Object.entries(state.workouts.exercisesBySession).filter(([key]) => Number(key) !== Number(id))
            ),
          },
        }));
      },

      addTransaction: async (tx) => {
        const payload = { ...tx, id: Date.now().toString(), date: tx.date || new Date().toISOString().split('T')[0] };
        set((state) => ({
          finance: { ...state.finance, transactions: [payload, ...state.finance.transactions] },
        }));
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

      addTask: async (task) => {
        const res = await apiSync('/tasks', 'POST', task);
        if (res?.id) {
          set((state) => ({
            user: {
              ...state.user,
              tasks: {
                ...state.user.tasks,
                pending: [{ ...task, id: res.id, done: false }, ...state.user.tasks.pending],
              },
            },
          }));
        }
      },

      deleteTask: (id, list) => {
        apiSync(`/tasks/${id}`, 'DELETE');
        set((state) => ({
          user: {
            ...state.user,
            tasks: {
              ...state.user.tasks,
              [list]: state.user.tasks[list].filter((t) => t.id !== id),
            },
          },
        }));
      },

      completeTask: (id) => {
        const task = get().user?.tasks?.pending?.find((t) => t.id === id);
        if (task) {
          const completedAt = new Date().toISOString();
          apiSync(`/tasks/${id}`, 'PUT', { done: true, completedAt });
          set((state) => ({
            user: {
              ...state.user,
              tasks: {
                ...state.user.tasks,
                pending: (state.user.tasks.pending || []).filter((t) => t.id !== id),
                completed: [{ ...task, done: true, completedAt }, ...(state.user.tasks.completed || [])],
              },
            },
          }));
        }
      },

      updateTask: (id, updates) => {
        apiSync(`/tasks/${id}`, 'PUT', updates);
        set((state) => ({
          user: {
            ...state.user,
            tasks: {
              ...state.user.tasks,
              pending: (state.user.tasks?.pending || []).map(t => t.id === id ? { ...t, ...updates } : t),
            },
          },
        }));
      },

      reopenTask: (id) => {
        const task = get().user?.tasks?.completed?.find((t) => t.id === id);
        if (task) {
          apiSync(`/tasks/${id}`, 'PUT', { done: false, completedAt: null });
          set((state) => ({
            user: {
              ...state.user,
              tasks: {
                ...state.user.tasks,
                completed: (state.user.tasks.completed || []).filter(t => t.id !== id),
                pending: [{ ...task, done: false, completedAt: null }, ...(state.user.tasks.pending || [])],
              },
            },
          }));
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
          apiSync('/entertainment', 'POST', updates);
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

      saveSleepLog: async (log) => {
        await apiSync('/sleep_logs', 'POST', log);
        set((state) => ({
          sleep_logs: [log, ...state.sleep_logs.filter(l => l.date !== log.date)].sort((a, b) => b.date.localeCompare(a.date))
        }));
      },

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
        set((state) => ({ habits: state.habits.map(h => h.id === id ? { ...h, ...updates } : h) }));
      },

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

      updateTrainingPlan: async (data) => {
        set({ trainingPlan: data });
        apiSync('/training_plan', 'POST', data);
      },
      updateNutritionStrategy: async (data) => {
        set({ nutritionStrategy: data });
        apiSync('/nutrition_strategy', 'POST', data);
      },
      updateLifestyleTips: async (data) => {
        set({ lifestyleTips: data });
        apiSync('/lifestyle_tips', 'POST', data);
      },
      updateMedicalData: async (data) => {
        set({ medicalData: data });
        apiSync('/medical_data', 'POST', data);
      },
      updatePhysiqueTargets: async (data) => {
        set({ physiqueTargets: data });
        apiSync('/physique_targets', 'POST', data);
      },
      updateAssessmentQA: async (data) => {
        set({ assessmentQA: data });
        apiSync('/assessment_qa', 'POST', data);
      },
      updateSkills: async (data) => {
        set({ skills: data });
        apiSync('/skills', 'POST', data);
      },
      updateCalendarEvents: async (data) => {
        set({ calendar_events: data });
        apiSync('/calendar_events', 'POST', data);
      },
      updateWellnessData: async (data) => {
        set({ wellnessData: data });
        apiSync('/wellness_data', 'POST', data);
      },

      addMoodLog: async (log) => {
        await apiSync('/mood_logs', 'POST', log);
        set((state) => ({
          moodLogs: [log, ...state.moodLogs.filter(l => l.date !== log.date)].sort((a, b) => b.date.localeCompare(a.date)),
        }));
      },
    }),
    {
      name: 'growthtrack-ultimate-v4',
      storage: createJSONStorage(() => localStorage),
      version: 4,
      partialize: (state) => ({
        theme: state.theme,
        palette: state.palette,
        pinnedTabs: state.pinnedTabs,
        finance: state.finance,
        entertainment: state.entertainment,
        timesheet: state.timesheet,
        shopping: state.shopping,
        onboardingComplete: state.onboardingComplete,
        lastCheckIn: state.lastCheckIn,
      }),
      migrate: (persistedState, version) => {
        try {
          if (version < 4) {
            const oldTheme = localStorage.getItem('ultimate_theme');
            if (oldTheme) persistedState.theme = JSON.parse(oldTheme);
            const oldPalette = localStorage.getItem('ultimate_palette');
            if (oldPalette) persistedState.palette = JSON.parse(oldPalette);
          }
        } catch {
        }
        return persistedState;
      },
    }
  )
);

export const selectUser = (s) => s.user;
export const selectSetUser = (s) => s.setUser;
export const selectUpdateUserSlice = (s) => s.updateUserSlice;

export const selectTheme = (s) => s.theme;
export const selectPalette = (s) => s.palette;
export const selectActiveTab = (s) => s.activeTab;
export const selectPinnedTabs = (s) => s.pinnedTabs;
export const selectSetTheme = (s) => s.setTheme;
export const selectSetPalette = (s) => s.setPalette;
export const selectActiveTabSetter = (s) => s.setActiveTab;
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
export const selectUpdateTrainingPlan = (s) => s.updateTrainingPlan;
export const selectNutritionStrategy = (s) => s.nutritionStrategy;
export const selectUpdateNutritionStrategy = (s) => s.updateNutritionStrategy;
export const selectLifestyleTips = (s) => s.lifestyleTips;
export const selectUpdateLifestyleTips = (s) => s.updateLifestyleTips;
export const selectMedicalData = (s) => s.medicalData;
export const selectUpdateMedicalData = (s) => s.updateMedicalData;
export const selectPhysiqueTargets = (s) => s.physiqueTargets;
export const selectUpdatePhysiqueTargets = (s) => s.updatePhysiqueTargets;
export const selectAssessmentQA = (s) => s.assessmentQA;
export const selectUpdateAssessmentQA = (s) => s.updateAssessmentQA;
export const selectSkills = (s) => s.skills;
export const selectUpdateSkills = (s) => s.updateSkills;
export const selectCalendarEvents = (s) => s.calendar_events;
export const selectUpdateCalendarEvents = (s) => s.updateCalendarEvents;
export const selectWellnessData = (s) => s.wellnessData;
export const selectUpdateWellnessData = (s) => s.updateWellnessData;

export const selectMoodLogs = (s) => s.moodLogs;
export const selectAddMoodLog = (s) => s.addMoodLog;

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

export const selectWorkouts = (s) => s.workouts;
export const selectAddWorkoutFromTrainingDay = (s) => s.addWorkoutFromTrainingDay;
export const selectDeleteWorkoutSession = (s) => s.deleteWorkoutSession;

export default useStore;
