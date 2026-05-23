import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createFinanceSlice } from '../financeSlice';

describe('financeSlice', () => {
  let set: any;
  let get: any;
  let state: any;

  beforeEach(() => {
    state = { finance: { transactions: [], budgets: [] } };
    set = vi.fn((updater) => {
      state = typeof updater === 'function' ? updater(state) : updater;
    });
    get = vi.fn(() => state);

    // Mock global apiSync import somehow if needed, or rely on fetch mocking.
    // For now we just test the set/get logic.
    vi.mock('../../useStore', () => ({
      apiSync: vi.fn().mockResolvedValue({}),
    }));
  });

  it('initializes with empty finance object', () => {
    const slice = createFinanceSlice(set, get, null as any);
    expect(slice.finance).toEqual({ transactions: [], budgets: [] });
  });

  it('addTransaction updates state', async () => {
    const slice = createFinanceSlice(set, get, null as any);
    const mockTx = { amount: 100, category: 'Food', type: 'Expense' };
    
    await slice.addTransaction(mockTx);

    expect(set).toHaveBeenCalled();
    expect(state.finance.transactions.length).toBe(1);
    expect(state.finance.transactions[0]).toMatchObject({
      amount: 100,
      category: 'Food',
      type: 'Expense'
    });
    expect(state.finance.transactions[0].id).toBeDefined();
    expect(state.finance.transactions[0].date).toBeDefined();
  });

  it('deleteTransaction updates state', async () => {
    const slice = createFinanceSlice(set, get, null as any);
    state.finance.transactions = [{ id: '1', amount: 50 }, { id: '2', amount: 20 }];
    
    await slice.deleteTransaction('1');

    expect(set).toHaveBeenCalled();
    expect(state.finance.transactions.length).toBe(1);
    expect(state.finance.transactions[0].id).toBe('2');
  });
});
