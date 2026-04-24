/**
 * userStore.js — Ultimate Dynamic Data Store v2.2
 * Improvements2504.2 — training.PRs/streak, lifestyle.habits/mood,
 *                       hydration.log, tasks priority/recurring
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const API_BASE = import.meta.env.VITE_API_BASE || null;

async function apiSync(endpoint, data) {
  if (!API_BASE) return;
  try {
    await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (e) {
    console.warn('[userStore] API sync failed:', e.message);
  }
}

const DEFAULT_USER = {
  name: '', age: null, born: '', height: null, heightFt: '',
  weight: null, bodyFat: null, muscleMass: null, skinTone: '#C68642',
  legHeight: null, shoulderHeight: null,

  sleep: { avgHours: null, weeklyDebt: null, bedtime: '', wakeTime: '' },

  goal: { weight: null, bodyFat: null, muscleMass: null, bench: null, deadline: '', timelineMonths: null },

  scores: { strength: 0, endurance: 0, recovery: 0, nutrition: 0, sleep: 0, mobility: 0 },

  habits: [],

  training: {
    schedule: [],
    currentProgram: '',
    weeklyVolume: null,
    PRs: {},
    prHistory: [],
    streak: 0,
    longestStreak: 0,
  },

  nutrition: { dailyCalories: null, protein: null, carbs: null, fats: null, mealPlan: [] },

  finance: { monthlySavings: null, investments: [], expenses: [], sipTargets: [] },

  entertainment: { watchlist: [], currentlyWatching: [], completed: [] },

  shopping: { wishlist: [], purchased: [], budget: null },

  tasks: {
    pending: [],
    completed: [],
    recurring: [],
  },

  lifestyle: {
    habits: [],
    mood: [],
    screenTime: null,
    outdoorMinutes: null,
  },

  hydration: {
    dailyGoalMl: 3000,
    log: [],
  },

  medical: { conditions: [], medications: [], allergies: [], lastCheckup: '' },

  progressLog: [],

  _lastUpdated: null,
  _version: '2.2.0',
};

export const useUserStore = create(
  persist(
    (set, get) => ({
      user: { ...DEFAULT_USER },
      isLoading: false,
      error: null,

      updateField: (key, value) => {
        set((state) => ({
          user: { ...state.user, [key]: value, _lastUpdated: new Date().toISOString() },
        }));
        apiSync('/user', { [key]: value });
      },

      updateSection: (section, updates) => {
        set((state) => ({
          user: {
            ...state.user,
            [section]: { ...state.user[section], ...updates },
            _lastUpdated: new Date().toISOString(),
          },
        }));
        apiSync(`/user/${section}`, updates);
      },

      addToArray: (section, arrayKey, item) => {
        set((state) => {
          const sec = state.user[section] || {};
          const arr = sec[arrayKey] || [];
          return {
            user: {
              ...state.user,
              [section]: { ...sec, [arrayKey]: [...arr, { ...item, id: Date.now() }] },
              _lastUpdated: new Date().toISOString(),
            },
          };
        });
      },

      addToTopArray: (key, item) => {
        set((state) => ({
          user: {
            ...state.user,
            [key]: [
              ...(state.user[key] || []),
              typeof item === 'string' ? item : { ...item, id: Date.now() },
            ],
            _lastUpdated: new Date().toISOString(),
          },
        }));
      },

      removeFromArray: (section, arrayKey, id) => {
        set((state) => {
          const sec = state.user[section] || {};
          return {
            user: {
              ...state.user,
              [section]: { ...sec, [arrayKey]: (sec[arrayKey] || []).filter((i) => i.id !== id) },
              _lastUpdated: new Date().toISOString(),
            },
          };
        });
      },

      resetUser: () => set({ user: { ...DEFAULT_USER } }),

      fetchUser: async () => {
        if (!API_BASE) return;
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/user`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          set({ user: { ...DEFAULT_USER, ...data }, isLoading: false });
        } catch (e) {
          console.warn('[userStore] fetchUser failed, using localStorage:', e.message);
          set({ error: e.message, isLoading: false });
        }
      },

      getBMI: () => {
        const { weight, height } = get().user;
        if (!weight || !height) return null;
        const h = height / 100;
        return (weight / (h * h)).toFixed(1);
      },

      getHealthScore: () => {
        const { scores } = get().user;
        const vals = Object.values(scores).filter((v) => typeof v === 'number');
        if (!vals.length) return 0;
        return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
      },

      getTDEE: () => {
        const { weight, height, age } = get().user;
        if (!weight || !height || !age) return null;
        const bmr = 10 * weight + 6.25 * height - 5 * age + 5;
        return Math.round(bmr * 1.55);
      },
    }),
    {
      name: 'ultimate-user-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useUserStore;
