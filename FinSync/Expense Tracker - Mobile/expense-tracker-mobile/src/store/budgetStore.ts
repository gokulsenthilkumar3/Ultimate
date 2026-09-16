import { create } from 'zustand';
import {
  getBudgets, upsertBudget as dbUpsert, deleteBudget as dbDelete,
  BudgetWithDetails,
} from '../db/queries';
import { currentMonth } from '../utils/date';

interface BudgetStore {
  budgets: BudgetWithDetails[];
  month: string;
  loading: boolean;

  loadBudgets: (month?: string) => Promise<void>;
  upsertBudget: (month: string, categoryId: number | null, amount: number, alertPct: number) => Promise<void>;
  deleteBudget: (id: number) => Promise<void>;
}

export const useBudgetStore = create<BudgetStore>((set, get) => ({
  budgets: [],
  month: currentMonth(),
  loading: false,

  loadBudgets: async (month) => {
    const m = month ?? get().month;
    set({ loading: true, month: m });
    const budgets = await getBudgets(m);
    set({ budgets, loading: false });
  },

  upsertBudget: async (month, categoryId, amount, alertPct) => {
    await dbUpsert(month, categoryId, amount, alertPct);
    const budgets = await getBudgets(month);
    set({ budgets });
  },

  deleteBudget: async (id) => {
    await dbDelete(id);
    const budgets = await getBudgets(get().month);
    set({ budgets });
  },
}));
