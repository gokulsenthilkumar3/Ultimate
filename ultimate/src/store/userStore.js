/**
 * userStore.js — Ultimate Dynamic Data Store
 * Replaces hardcoded userData.js
 * All data is editable via UI, savable to localStorage, and API-sync ready
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const API_BASE = import.meta.env.VITE_API_BASE || null;

// Helper: sync a section to REST API
async function apiSync(endpoint, data) {
  if (!API_BASE) return;
  try {
    await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (e) {
    console.warn('[userStore] API sync failed:', e);
  }
}

// Default empty user schema — NO hardcoded personal data
const DEFAULT_USER = {
  // Identity
  name: '',
  age: null,
  born: '',
  height: null,
  heightFt: '',
  weight: null,
  bodyFat: null,
  muscleMass: null,
  skinTone: '#C68642',

  // Measurements
  legHeight: null,
  shoulderHeight: null,

  // Sleep
  sleep: {
    avgHours: null,
    weeklyDebt: null,
    bedtime: '',
    wakeTime: '',
  },

  // Goals
  goal: {
    weight: null,
    bodyFat: null,
    muscleMass: null,
    bench: null,
    deadline: '',
    timelineMonths: null,
  },

  // Performance scores (0-100)
  scores: {
    strength: 0,
    endurance: 0,
    recovery: 0,
    nutrition: 0,
    sleep: 0,
    mobility: 0,
  },

  // Daily habits
  habits: [],

  // Training
  training: {
    schedule: [],
    currentProgram: '',
    weeklyVolume: null,
  },

  // Nutrition
  nutrition: {
    dailyCalories: null,
    protein: null,
    carbs: null,
    fats: null,
    mealPlan: [],
  },

  // Finance
  finance: {
    monthlySavings: null,
    investments: [],
    expenses: [],
    sipTargets: [],
  },

  // Entertainment
  entertainment: {
    watchlist: [],
    currentlyWatching: [],
    completed: [],
  },

  // Shopping
  shopping: {
    wishlist: [],
    purchased: [],
    budget: null,
  },

  // Tasks
  tasks: {
    pending: [],
    completed: [],
    recurring: [],
  },

  // Medical
  medical: {
    conditions: [],
    medications: [],
    allergies: [],
    lastCheckup: '',
  },

  // Progress log
  progressLog: [],

  // App meta
  _lastUpdated: null,
  _version: '2.0.0',
};

export const useUserStore = create(
  persist(
    (set, get) => ({
      user: { ...DEFAULT_USER },
      isLoading: false,
      error: null,

      // Update a single top-level field
      updateField: (key, value) => {
        set((state) => ({
          user: { ...state.user, [key]: value, _lastUpdated: new Date().toISOString() },
        }));
        apiSync('/user', { [key]: value });
      },

      // Update a nested section object (merge)
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

      // Add item to an array within a section
      addToArray: (section, arrayKey, item) => {
        set((state) => {
          const sectionData = state.user[section] || {};
          const arr = sectionData[arrayKey] || [];
          return {
            user: {
              ...state.user,
              [section]: { ...sectionData, [arrayKey]: [...arr, { ...item, id: Date.now() }] },
              _lastUpdated: new Date().toISOString(),
            },
          };
        });
      },

      // Add to top-level array (e.g. habits, progressLog)
      addToTopArray: (key, item) => {
        set((state) => ({
          user: {
            ...state.user,
            [key]: [...(state.user[key] || []), typeof item === 'string' ? item : { ...item, id: Date.now() }],
            _lastUpdated: new Date().toISOString(),
          },
        }));
      },

      // Remove from array by id or index
      removeFromArray: (section, arrayKey, idOrIndex) => {
        set((state) => {
          const sectionData = state.user[section] || {};
          const arr = sectionData[arrayKey] || [];
          const filtered = typeof idOrIndex === 'number' && !arr[idOrIndex]?.id
            ? arr.filter((_, i) => i !== idOrIndex)
            : arr.filter((item) => item.id !== idOrIndex);
          return {
            user: {
              ...state.user,
              [section]: { ...sectionData, [arrayKey]: filtered },
              _lastUpdated: new Date().toISOString(),
            },
          };
        });
      },

      // Reset to defaults
      resetUser: () => set({ user: { ...DEFAULT_USER } }),

      // Load user from API (on mount if API_BASE set)
      fetchUser: async () => {
        if (!API_BASE) return;
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/user`);
          if (!res.ok) throw new Error('Failed to fetch user');
          const data = await res.json();
          set({ user: { ...DEFAULT_USER, ...data }, isLoading: false });
        } catch (e) {
          set({ error: e.message, isLoading: false });
        }
      },

      // Computed: BMI
      getBMI: () => {
        const { weight, height } = get().user;
        if (!weight || !height) return null;
        return (weight / ((height / 100) * (height / 100))).toFixed(1);
      },

      // Computed: health score (0-100)
      getHealthScore: () => {
        const { scores } = get().user;
        const vals = Object.values(scores);
        if (!vals.length) return 0;
        return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
      },
    }),
    {
      name: 'ultimate-user-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useUserStore;
