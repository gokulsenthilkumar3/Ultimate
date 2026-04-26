import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { USER } from '../data/userData';

// ── Default finance data (moved from Finance.jsx local state)
const DEFAULT_FINANCE = {
  transactions: [
    { id: 1, type: 'Expense', category: 'Gym', amount: 2500, date: '2026-04-20', note: 'Monthly membership' },
    { id: 2, type: 'Expense', category: 'Supplements', amount: 4800, date: '2026-04-21', note: 'Protein & Creatine' },
    { id: 3, type: 'Income', category: 'Salary', amount: 85000, date: '2026-04-01', note: 'Monthly pay' },
    { id: 4, type: 'Investment', category: 'Stocks', amount: 15000, date: '2026-04-15', note: 'Nifty 50 Index' },
  ],
};

// ── Default shopping data (moved from Shopping.jsx local state)
const DEFAULT_SHOPPING = {
  items: [
    { id: 1, name: 'Whey Protein (2kg)', category: 'Supplements', priority: 'High', estimatedCost: 3500, purchased: false },
    { id: 2, name: 'Resistance Bands Set', category: 'Equipment', priority: 'Medium', estimatedCost: 850, purchased: false },
    { id: 3, name: 'Running Shoes', category: 'Apparel', priority: 'High', estimatedCost: 6500, purchased: false },
    { id: 4, name: 'Creatine Monohydrate', category: 'Supplements', priority: 'High', estimatedCost: 900, purchased: false },
  ],
};

// ── Default entertainment data (moved from Entertainment.jsx local state)
const DEFAULT_ENTERTAINMENT = {
  media: [
    { id: 1, title: 'Tokyo Revengers', type: 'Anime', season: 3, episode: 12, rating: 4.5, status: 'Watching' },
    { id: 2, title: 'Vinland Saga', type: 'Anime', season: 2, episode: 24, rating: 5.0, status: 'Completed' },
    { id: 3, title: 'The Boys', type: 'Series', season: 4, episode: 1, rating: 4.8, status: 'Watching' },
    { id: 4, title: 'Interstellar', type: 'Movie', season: 1, episode: 1, rating: 5.0, status: 'Completed' },
  ],
};

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

      // ── Core user profile (hydrated from userData.js defaults)
      user: USER,

      // ── Finance slice
      finance: DEFAULT_FINANCE,

      // ── Shopping slice
      shopping: DEFAULT_SHOPPING,

      // ── Entertainment slice
      entertainment: DEFAULT_ENTERTAINMENT,

      // ──────────────────────────────────────────────────────────
      // UI Actions
      // ──────────────────────────────────────────────────────────
      setTheme: (theme) => set({ theme }),
      setPalette: (palette) => set({ palette }),
      setActiveTab: (activeTab) => set({ activeTab }),

      // ──────────────────────────────────────────────────────────
      // User Actions — granular updates
      // ──────────────────────────────────────────────────────────
      /** Replace the entire user object (used by legacy setUser callers) */
      setUser: (userOrUpdater) =>
        set((state) => ({
          user:
            typeof userOrUpdater === 'function'
              ? userOrUpdater(state.user)
              : userOrUpdater,
        })),

      /** Merge a partial update into a user sub-key (e.g., 'lifestyle') */
      updateUserSlice: (key, data) =>
        set((state) => ({
          user: {
            ...state.user,
            [key]: { ...(state.user?.[key] || {}), ...data },
          },
        })),

      // ──────────────────────────────────────────────────────────
      // Finance Actions
      // ──────────────────────────────────────────────────────────
      addTransaction: (tx) =>
        set((state) => ({
          finance: {
            ...state.finance,
            transactions: [
              ...state.finance.transactions,
              { ...tx, id: Date.now(), date: new Date().toISOString().split('T')[0] },
            ],
          },
        })),

      deleteTransaction: (id) =>
        set((state) => ({
          finance: {
            ...state.finance,
            transactions: state.finance.transactions.filter((t) => t.id !== id),
          },
        })),

      // ──────────────────────────────────────────────────────────
      // Shopping Actions
      // ──────────────────────────────────────────────────────────
      addShoppingItem: (item) =>
        set((state) => ({
          shopping: {
            ...state.shopping,
            items: [
              ...state.shopping.items,
              { ...item, id: Date.now(), purchased: false },
            ],
          },
        })),

      deleteShoppingItem: (id) =>
        set((state) => ({
          shopping: {
            ...state.shopping,
            items: state.shopping.items.filter((i) => i.id !== id),
          },
        })),

      toggleShoppingPurchased: (id) =>
        set((state) => ({
          shopping: {
            ...state.shopping,
            items: state.shopping.items.map((i) =>
              i.id === id ? { ...i, purchased: !i.purchased } : i
            ),
          },
        })),

      // ──────────────────────────────────────────────────────────
      // Entertainment Actions
      // ──────────────────────────────────────────────────────────
      addMediaItem: (item) =>
        set((state) => ({
          entertainment: {
            ...state.entertainment,
            media: [...state.entertainment.media, { ...item, id: Date.now() }],
          },
        })),

      deleteMediaItem: (id) =>
        set((state) => ({
          entertainment: {
            ...state.entertainment,
            media: state.entertainment.media.filter((m) => m.id !== id),
          },
        })),

      updateMediaProgress: (id, field, value) =>
        set((state) => ({
          entertainment: {
            ...state.entertainment,
            media: state.entertainment.media.map((m) =>
              m.id === id ? { ...m, [field]: value } : m
            ),
          },
        })),
    }),
    {
      name: 'growthtrack-ultimate-v3',
      storage: createJSONStorage(() => localStorage),
      // Migrate from old key structure if needed
      version: 3,
      migrate: (persistedState, version) => {
        if (version < 3) {
          // Merge old 'ultimate_user' localStorage data if present
          try {
            const oldUser = localStorage.getItem('ultimate_user');
            if (oldUser) {
              persistedState.user = { ...USER, ...JSON.parse(oldUser) };
            }
            const oldTheme = localStorage.getItem('ultimate_theme');
            if (oldTheme) persistedState.theme = JSON.parse(oldTheme);
            const oldPalette = localStorage.getItem('ultimate_palette');
            if (oldPalette) persistedState.palette = JSON.parse(oldPalette);
            const oldTab = localStorage.getItem('ultimate_tab');
            if (oldTab) persistedState.activeTab = JSON.parse(oldTab);
          } catch {
            // silent — start fresh
          }
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
export const selectSetTheme = (s) => s.setTheme;
export const selectSetPalette = (s) => s.setPalette;
export const selectSetActiveTab = (s) => s.setActiveTab;

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

export default useStore;
