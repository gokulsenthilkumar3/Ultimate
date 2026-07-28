import { StateCreator } from 'zustand';
import { apiSync } from '../useStore';
import { Transaction, Budget } from '../../schemas';

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

export const createFinanceSlice: StateCreator<any, [], [], FinanceSlice> = (set) => ({
  finance: { transactions: {}, budgets: {} },

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
      finance: { ...state.finance, transactions: { ...state.finance.transactions, [payload.id]: payload } },
    }));
    apiSync('/finance', 'POST', payload).catch(e => console.warn('[Finance] sync failed', e));
  },

  deleteTransaction: async (id) => {
    set((state: any) => {
      const { [id]: _, ...rest } = state.finance.transactions;
      return { finance: { ...state.finance, transactions: rest } };
    });
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
      finance: { ...state.finance, budgets: { ...(state.finance.budgets || {}), [payload.id]: payload } },
    }));
    apiSync('/budgets', 'POST', payload).catch(() => {});
  },

  deleteBudget: async (id) => {
    set((state: any) => {
      const { [id]: _, ...rest } = (state.finance.budgets || {});
      return { finance: { ...state.finance, budgets: rest } };
    });
    apiSync(`/budgets/${id}`, 'DELETE').catch(() => {});
  },

  syncBankData: async (provider: string) => {
    try {
      const result = await apiSync('/finance/sync/bank', 'POST', { provider });
      if (result && result.data && Array.isArray(result.data.transactions)) {
        set((state: any) => {
          const newTxs = { ...(state.finance?.transactions || {}) };
          let added = 0;
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
        return result.data.transactions.length; // return count of new txs
      }
    } catch (e) {
      console.error('Failed to sync bank data', e);
      throw e;
    }
    return 0;
  },
});
