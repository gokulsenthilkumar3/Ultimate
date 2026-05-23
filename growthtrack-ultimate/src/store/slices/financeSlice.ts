import { StateCreator } from 'zustand';
import { apiSync } from '../useStore';
import { Transaction, Budget } from '../../schemas';

export interface FinanceSlice {
  finance: {
    transactions: Transaction[];
    budgets: Budget[];
  };
  addTransaction: (tx: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addBudget: (budget: Partial<Budget>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
}

export const createFinanceSlice: StateCreator<any, [], [], FinanceSlice> = (set) => ({
  finance: { transactions: [], budgets: [] },

  addTransaction: async (tx) => {
    const payload: Transaction = {
      ...tx,
      id: tx.id || Date.now().toString(),
      date: tx.date || new Date().toISOString().split('T')[0],
      amount: tx.amount || 0,
      type: tx.type || 'Expense',
      category: tx.category || 'Other'
    };
    set((state: any) => ({
      finance: { ...state.finance, transactions: [payload, ...state.finance.transactions] },
    }));
    apiSync('/finance', 'POST', payload).catch(e => console.warn('[Finance] sync failed', e));
  },

  deleteTransaction: async (id) => {
    set((state: any) => ({
      finance: { ...state.finance, transactions: state.finance.transactions.filter((t: Transaction) => t.id !== id) },
    }));
    apiSync(`/finance/${id}`, 'DELETE').catch(() => {});
  },

  addBudget: async (budget) => {
    const payload: Budget = {
      ...budget,
      id: budget.id || Date.now().toString(),
      category: budget.category || 'Other',
      limit_amount: budget.limit_amount || 0
    };
    set((state: any) => ({
      finance: { ...state.finance, budgets: [...(state.finance.budgets || []), payload] },
    }));
    apiSync('/budgets', 'POST', payload).catch(() => {});
  },

  deleteBudget: async (id) => {
    set((state: any) => ({
      finance: { ...state.finance, budgets: (state.finance.budgets || []).filter((b: Budget) => b.id !== id) },
    }));
    apiSync(`/budgets/${id}`, 'DELETE').catch(() => {});
  },
});
