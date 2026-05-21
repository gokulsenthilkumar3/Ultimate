import { apiSync } from '../useStore';

export const createFinanceSlice = (set, get) => ({
  finance: { transactions: [], budgets: [] },

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
});
