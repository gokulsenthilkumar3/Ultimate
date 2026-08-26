import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createFinanceSlice } from '../financeSlice';

// vi.mock must be at the top level — Vitest hoists it before any test runs.
// Placing it inside beforeEach causes a hoisting warning and will become a
// hard error in Vitest v5+.
vi.mock('../../useStore', () => ({
  apiSync: vi.fn().mockResolvedValue({}),
}));

describe('financeSlice', () => {
  let set: any;
  let get: any;
  let state: any;

  beforeEach(() => {
    state = { finance: { transactions: {}, budgets: {} } };
    set = vi.fn((updater) => {
      state = typeof updater === 'function' ? updater(state) : updater;
    });
    get = vi.fn(() => state);
  });

  it('initializes with empty finance object', () => {
    const slice = createFinanceSlice(set, get, null as any);
    expect(slice.finance).toEqual({ transactions: {}, budgets: {} });
  });

  it('addTransaction updates state', async () => {
    const slice = createFinanceSlice(set, get, null as any);
    const mockTx = { amount: 100, category: 'Food', type: 'Expense' };
    
    await slice.addTransaction(mockTx);

    expect(set).toHaveBeenCalled();
    const transactions = Object.values(state.finance.transactions) as any[];
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      amount: 100,
      category: 'Food',
      type: 'Expense'
    });
    expect(transactions[0].id).toBeDefined();
    expect(transactions[0].date).toBeDefined();
  });

  it('deleteTransaction updates state', async () => {
    const slice = createFinanceSlice(set, get, null as any);
    state.finance.transactions = { '1': { id: '1', amount: 50 }, '2': { id: '2', amount: 20 } };
    
    await slice.deleteTransaction('1');

    expect(set).toHaveBeenCalled();
    expect(Object.keys(state.finance.transactions)).toEqual(['2']);
    expect(state.finance.transactions['2'].id).toBe('2');
  });
});
