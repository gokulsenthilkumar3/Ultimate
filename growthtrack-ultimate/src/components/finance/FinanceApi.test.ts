import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FinanceState } from '../../utils/financeModel';
import { deleteFinanceBudget, deleteFinanceSubscription, deleteFinanceTransaction, refreshFinanceTransactions, saveFinanceBudget, saveFinanceSubscription, saveFinanceTransaction } from '../../utils/financeApi';
import { commitFinanceCsv, previewFinanceCsv } from '../../utils/financeImport';

const mocks = vi.hoisted(() => ({ state: {} as FinanceState, request: vi.fn(), publish: vi.fn() }));
vi.mock('../../store/useStore', () => ({ default: {
  getState: () => mocks.state,
  setState: (updater: (state: FinanceState) => Partial<FinanceState>) => { mocks.publish(); mocks.state = { ...mocks.state, ...updater(mocks.state) }; },
}, apiSync: mocks.request }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.state = { user: { id: 'owner' }, _sessionVersion: 1, _dataRevision: 1, finance: { transactions: {}, budgets: {} }, subscriptions: [{ id: 's', name: 'Gym', cost: 100 }], addTransaction: vi.fn(async () => {}), deleteTransaction: vi.fn(async () => {}), addBudget: vi.fn(async () => {}), deleteBudget: vi.fn(async () => {}) };
});
describe('Finance acknowledged mutations', () => {
  it('publishes a subscription only after a valid acknowledged record', async () => {
    let acknowledge: (record: object) => void = () => {};
    mocks.request.mockImplementation(() => new Promise(resolve => { acknowledge = resolve; }));
    const operation = saveFinanceSubscription({ name: 'Bill', cost: 30, cycle: 'yearly' });
    expect(mocks.publish).not.toHaveBeenCalled();
    acknowledge({ id: 'new', name: 'Bill', cost: 30 });
    await operation;
    expect(mocks.state.subscriptions).toHaveLength(2);
    expect(mocks.state.subscriptions[1]).toMatchObject({ id: 'new', cycle: 'yearly', cost: 30 });
  });
  it('creates a subscription with its retained draft ID for safe interrupted retries', async () => {
    mocks.request.mockResolvedValue({ id: 'draft', name: 'Bill', cost: 30 });
    await saveFinanceSubscription({ id: 'draft', name: 'Bill', cost: 30 }, false);
    expect(mocks.request).toHaveBeenCalledWith('/subscriptions', 'POST', expect.objectContaining({ id: 'draft' }));
    expect(mocks.state.subscriptions[1].id).toBe('draft');
  });
  it('rejects an invalid acknowledgment without changing local records', async () => {
    mocks.request.mockResolvedValue({});
    await expect(saveFinanceSubscription({ name: 'Bill', cost: 10 })).rejects.toThrow();
    expect(mocks.publish).not.toHaveBeenCalled();
    mocks.request.mockResolvedValue({ success: true, count: 0 });
    await expect(deleteFinanceSubscription('s')).rejects.toThrow();
    expect(mocks.state.subscriptions).toHaveLength(1);
  });
  it('propagates legacy create promise rejection and budget create rejection', async () => {
    const transaction = { id: 't', date: '2026-09-28', type: 'Expense' as const, category: 'Food', amount: 10 };
    mocks.state.addTransaction = vi.fn().mockRejectedValue(new Error('Create failed'));
    mocks.state.addBudget = vi.fn().mockRejectedValue(new Error('Budget failed'));
    await expect(saveFinanceTransaction(transaction, false)).rejects.toThrow('Create failed');
    await expect(saveFinanceBudget({ id: 'b', category: 'Food', limit_amount: 0 }, false)).rejects.toThrow('Budget failed');
    expect(mocks.publish).not.toHaveBeenCalled();
  });
  it('patches edits and preserves other ledger records', async () => {
    const existing = { id: 'other', date: '2026-09-28', type: 'Income' as const, category: 'Salary', amount: 100 };
    mocks.state.finance.transactions.other = existing;
    mocks.request.mockResolvedValue({ success: true, count: 1 });
    await saveFinanceTransaction({ id: 't', date: '2026-09-28', type: 'Expense', category: 'Food', amount: 0.3 }, true);
    expect(mocks.request).toHaveBeenCalledWith('/finance/t', 'PATCH', expect.objectContaining({ amount: 0.3 }));
    expect(mocks.state.finance.transactions.other).toEqual(existing);
    expect(mocks.state.finance.transactions.t.amount).toBe(0.3);
  });
  it('keeps the draft revision in edit requests and stores the new acknowledgment revision', async () => {
    const oldVersion = '2026-09-28T10:00:00.000Z', newVersion = '2026-09-29T10:00:00.000Z';
    mocks.request.mockResolvedValue({ success: true, count: 1, updatedAt: newVersion });
    await saveFinanceTransaction({ id: 't', date: '2026-09-28', type: 'Expense', category: 'Food', amount: 10, updatedAt: oldVersion }, true);
    expect(mocks.request).toHaveBeenCalledWith('/finance/t', 'PATCH', expect.objectContaining({ expectedUpdatedAt: oldVersion }));
    expect(mocks.state.finance.transactions.t.updatedAt).toBe(newVersion);
    await saveFinanceBudget({ id: 'b', category: 'Food', limit_amount: 0, updatedAt: oldVersion }, true);
    expect(mocks.request).toHaveBeenCalledWith('/budgets/b', 'PATCH', expect.objectContaining({ expectedUpdatedAt: oldVersion }));
    expect(mocks.state.finance.budgets.b.updatedAt).toBe(newVersion);
  });
  it('does not treat a resolved legacy action without server metadata as a saved record', async () => {
    const transaction = { id: 't', date: '2026-09-28', type: 'Expense' as const, category: 'Food', amount: 10 };
    mocks.state.addTransaction = vi.fn(async () => { mocks.state.finance.transactions.t = transaction; });
    await expect(saveFinanceTransaction(transaction, false)).rejects.toThrow('did not acknowledge');
    await expect(saveFinanceBudget({ id: 'b', category: 'Food', limit_amount: 0 }, false)).rejects.toThrow('did not acknowledge');
  });
  it('accepts a zero-limit budget after its store promise publishes acknowledgment metadata', async () => {
    mocks.state.addBudget = vi.fn(async budget => { mocks.state.finance.budgets.b = { id: 'b', category: 'Food', limit_amount: budget.limit_amount ?? 0, updatedAt: '2026-09-29T10:00:00Z' }; });
    await expect(saveFinanceBudget({ id: 'b', category: 'Food', limit_amount: 0 }, false)).resolves.toBeUndefined();
    expect(mocks.state.finance.budgets.b.limit_amount).toBe(0);
  });
  it('retains transactions and budgets when delete acknowledgment is malformed', async () => {
    mocks.state.finance.transactions.t = { id: 't', date: '2026-09-28', type: 'Expense', category: 'Food', amount: 10 };
    mocks.state.finance.budgets.b = { id: 'b', category: 'Food', limit_amount: 0 };
    mocks.request.mockResolvedValue({ success: true, count: 0 });
    await expect(deleteFinanceTransaction('t')).rejects.toThrow();
    await expect(deleteFinanceBudget('b')).rejects.toThrow();
    expect(mocks.state.finance.transactions.t).toBeDefined();
    expect(mocks.state.finance.budgets.b).toBeDefined();
    expect(mocks.publish).not.toHaveBeenCalled();
  });
  it('does not publish a stale account response', async () => {
    let acknowledge: (record: object) => void = () => {};
    mocks.request.mockImplementation(() => new Promise(resolve => { acknowledge = resolve; }));
    const operation = saveFinanceSubscription({ id: 's', name: 'Gym', cost: 200 });
    mocks.state = { ...mocks.state, user: { id: 'another-owner' }, _sessionVersion: 2 };
    acknowledge({ success: true, count: 1 });
    await expect(operation).rejects.toThrow('session changed');
    expect(mocks.publish).not.toHaveBeenCalled();
  });
  it('refreshes nullable imported rows after acknowledgment and keeps old records on a bad response', async () => {
    mocks.request.mockResolvedValue([{ id: 'csv', date: '2026-09-28', type: 'Expense', amount: 10, category: null, method: null, note: null }]);
    await refreshFinanceTransactions();
    expect(mocks.state.finance.transactions.csv.category).toBe('Other');
    mocks.request.mockResolvedValue({ rows: [] });
    await expect(refreshFinanceTransactions()).rejects.toThrow('ledger response');
    expect(mocks.state.finance.transactions.csv).toBeDefined();
  });
});
describe('Finance CSV API contract', () => {
  it('uses the explicit commit endpoint and rejects invented import success', async () => {
    mocks.request.mockResolvedValue({ imported: 1, duplicates: 2, total: 3, replayed: false });
    expect(await commitFinanceCsv('preview')).toMatchObject({ imported: 1 });
    expect(mocks.request).toHaveBeenCalledWith('/finance/import/csv/commit', 'POST', { previewId: 'preview' });
    mocks.request.mockResolvedValue({ imported: 999, duplicates: 0, total: 3, replayed: false });
    await expect(commitFinanceCsv('preview')).rejects.toThrow();
  });
  it('requires preview rows and validation metadata instead of treating empty replies as importable', async () => {
    mocks.request.mockResolvedValue({});
    await expect(previewFinanceCsv('amount,type,date\n10,Expense,2026-09-28')).rejects.toThrow();
    expect(mocks.request).toHaveBeenCalledWith('/finance/import/csv/preview', 'POST', expect.objectContaining({ content: expect.any(String) }));
  });
});
