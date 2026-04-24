/**
 * userStore.js — Ultimate Dynamic Data Store v2.1
 * Replaces hardcoded userData.js
 *
 * Architecture:
 *   UI Components
 *        ↓ useUserStore() hook
 *   Zustand Store  (in-memory, reactive)
 *        ↓ persist middleware
 *   localStorage   ↔   REST API (VITE_API_BASE)
 *
 * API behaviour:
 *   - If VITE_API_BASE is set → fetchUser() loads from server on mount;
 *     updateField/updateSection fire a background PUT (non-blocking).
 *   - If VITE_API_BASE is NOT set → data lives in localStorage only.
 *     The app works fully offline — zero setup required.
 *
 * CRUD helpers:
 *   updateField(key, value)               — top-level scalar field
 *   updateSection(section, updates)       — nested object merge
 *   addToArray(section, arrayKey, item)   — push to nested array
 *   addToTopArray(key, item)              — push to top-level array
 *   removeFromArray(section, key, id)     — filter by .id
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const API_BASE = import.meta.env.VITE_API_BASE || null;

/** Fire-and-forget REST sync — never blocks the UI */
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

/** Default empty user schema — no hardcoded personal data */
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

  // Performance scores (0–100)
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
  _version: '2.1.0',
};

export const useUserStore = create(
  persist(
    (set, get) => ({
      user: { ...DEFAULT_USER },
      isLoading: false,
      error: null,

      /**
       * Update a single top-level scalar field.
       * @param {string} key
       * @param {*} value
       */
      updateField: (key, value) => {
        set((state) => ({
          user: { ...state.user, [key]: value, _lastUpdated: new Date().toISOString() },
        }));
        apiSync('/user', { [key]: value });
      },

      /**
       * Merge updates into a nested section object.
       * @param {string} section  e.g. 'sleep', 'finance'
       * @param {object} updates
       */
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

      /**
       * Push an item into a nested array (auto-assigns id).
       * @param {string} section   e.g. 'finance'
       * @param {string} arrayKey  e.g. 'expenses'
       * @param {object} item
       */
      addToArray: (section, arrayKey, item) => {
        set((state) => {
          const sectionData = state.user[section] || {};
          const arr = sectionData[arrayKey] || [];
          return {
            user: {
              ...state.user,
              [section]: {
                ...sectionData,
                [arrayKey]: [...arr, { ...item, id: Date.now() }],
              },
              _lastUpdated: new Date().toISOString(),
            },
          };
        });
      },

      /**
       * Push an item into a top-level array (e.g. habits, progressLog).
       * @param {string} key
       * @param {string|object} item
       */
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

      /**
       * Remove an item from a nested array by its .id.
       * @param {string} section
       * @param {string} arrayKey
       * @param {number} id  — the item's .id property
       */
      removeFromArray: (section, arrayKey, id) => {
        set((state) => {
          const sectionData = state.user[section] || {};
          const arr = sectionData[arrayKey] || [];
          return {
            user: {
              ...state.user,
              [section]: {
                ...sectionData,
                [arrayKey]: arr.filter((item) => item.id !== id),
              },
              _lastUpdated: new Date().toISOString(),
            },
          };
        });
      },

      /** Reset all user data to defaults */
      resetUser: () => set({ user: { ...DEFAULT_USER } }),

      /**
       * Load user from REST API on mount.
       * Only runs when VITE_API_BASE is configured.
       * Falls back silently to localStorage if API unavailable.
       */
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

      /**
       * Computed: Body Mass Index
       * @returns {string|null} BMI to 1 decimal, or null if data missing
       */
      getBMI: () => {
        const { weight, height } = get().user;
        if (!weight || !height) return null;
        const h = height / 100;
        return (weight / (h * h)).toFixed(1);
      },

      /**
       * Computed: overall health score (average of all score dimensions, 0–100)
       * @returns {number}
       */
      getHealthScore: () => {
        const { scores } = get().user;
        const vals = Object.values(scores).filter((v) => typeof v === 'number');
        if (!vals.length) return 0;
        return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
      },

      /**
       * Computed: TDEE estimate (Mifflin-St Jeor, moderate activity)
       * @returns {number|null}
       */
      getTDEE: () => {
        const { weight, height, age } = get().user;
        if (!weight || !height || !age) return null;
        // BMR (male default) × activity factor 1.55
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
