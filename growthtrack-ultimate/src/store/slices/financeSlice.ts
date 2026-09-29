import { StateCreator } from 'zustand';
import { apiSync } from '../useStore';
import { Transaction, Budget } from '../../schemas';
import { captureSession, mutationPayload } from '../persistence';

export interface FinanceSlice {
  finance: {
    transactions: Record<string, Transaction>;
    budgets: Record<string, Budget>;
  };
  addTransaction: (tx: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addBudget: (budget: Partial<Budget>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
}

export const createFinanceSlice: StateCreator<any, [], [], FinanceSlice> = (set, get) => ({
  finance: { transactions: {}, budgets: {} },

  addTransaction: async (tx) => {
    const currentSession = captureSession(get);
    const payload: Transaction = {
      ...tx,
      id: tx.id || Date.now().toString(),
      date: tx.date || new Date().toISOString().split('T')[0],
      amount: tx.amount || 0,
      type: tx.type || 'Expense',
      category: tx.category || 'Other'
    };
    set((state: any) => ({
      finance: { ...state.finance, transactions: { ...state.finance.transactions, [payload.id]: payload } },
    }));
    try {
      const response = await apiSync('/finance', 'POST', payload);
      if (currentSession() && response?.id != null) set((state: any) => {
        if (state.finance?.transactions?.[payload.id] !== payload) return state;
        return { finance: { ...state.finance, transactions: { ...state.finance.transactions, [payload.id]: { ...payload, ...response } } } };
      });
    } catch (error) {
      // Keep the form recoverable: remove only the optimistic record that this
      // request created, leaving any newer transaction untouched.
      set((state: any) => {
        const current = state.finance?.transactions?.[payload.id];
        if (!currentSession() || current !== payload) return state;
        const { [payload.id]: _, ...rest } = state.finance.transactions;
        return { finance: { ...state.finance, transactions: rest } };
      });
      throw error;
    }
  },

  deleteTransaction: async (id) => {
    const currentSession = captureSession(get);
    const previous = get().finance?.transactions?.[id];
    set((state: any) => {
      const { [id]: _, ...rest } = state.finance.transactions;
      return { finance: { ...state.finance, transactions: rest } };
    });
    try {
      await apiSync(`/finance/${id}`, 'DELETE', mutationPayload(previous));
    } catch (error) {
      set((state: any) => {
        if (!currentSession() || !previous || state.finance?.transactions?.[id]) return state;
        return { finance: { ...state.finance, transactions: { ...state.finance.transactions, [id]: previous } } };
      });
      throw error;
    }
  },

  addBudget: async (budget) => {
    const currentSession = captureSession(get);
    const payload: Budget = {
      ...budget,
      id: budget.id || Date.now().toString(),
      category: budget.category || 'Other',
      limit_amount: budget.limit_amount || 0
    };
    set((state: any) => ({
      finance: { ...state.finance, budgets: { ...(state.finance.budgets || {}), [payload.id]: payload } },
    }));
    try {
      const response = await apiSync('/budgets', 'POST', payload);
      if (currentSession() && response?.id != null) set((state: any) => {
        if (state.finance?.budgets?.[payload.id] !== payload) return state;
        return { finance: { ...state.finance, budgets: { ...state.finance.budgets, [payload.id]: { ...payload, ...response } } } };
      });
    } catch (error) {
      set((state: any) => {
        const current = state.finance?.budgets?.[payload.id];
        if (!currentSession() || current !== payload) return state;
        const { [payload.id]: _, ...rest } = state.finance.budgets;
        return { finance: { ...state.finance, budgets: rest } };
      });
      throw error;
    }
  },

  deleteBudget: async (id) => {
    const currentSession = captureSession(get);
    const previous = get().finance?.budgets?.[id];
    set((state: any) => {
      const { [id]: _, ...rest } = (state.finance.budgets || {});
      return { finance: { ...state.finance, budgets: rest } };
    });
    try {
      await apiSync(`/budgets/${id}`, 'DELETE', mutationPayload(previous));
    } catch (error) {
      set((state: any) => {
        if (!currentSession() || !previous || state.finance?.budgets?.[id]) return state;
        return { finance: { ...state.finance, budgets: { ...(state.finance.budgets || {}), [id]: previous } } };
      });
      throw error;
    }
  },

  syncBankData: async (provider: string) => {
    try {
      const result = await apiSync('/finance/sync/bank', 'POST', { provider });
      if (result && result.data && Array.isArray(result.data.transactions)) {
        let added = 0;
        set((state: any) => {
          const newTxs = { ...(state.finance?.transactions || {}) };
          result.data.transactions.forEach((tx: any) => {
            if (!newTxs[tx.id]) {
              newTxs[tx.id] = tx;
              added++;
            }
          });
          return {
            finance: {
              ...state.finance,
              transactions: newTxs
            }
          };
        });
        return added; // report only records newly merged into the local ledger
      }
    } catch (e) {
      console.error('Failed to sync bank data', e);
      throw e;
    }
    return 0;
  },
});
