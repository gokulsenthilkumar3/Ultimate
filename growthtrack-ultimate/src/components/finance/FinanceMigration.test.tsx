import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FinanceState } from '../../utils/financeModel';
import type { Transaction } from '../../schemas';
import Finance from '../Finance';
import TransactionEditor from './TransactionEditor';
import TransactionsTab from './TransactionsTab';
import BudgetingTab from './BudgetingTab';
import SubscriptionsTab from './SubscriptionsTab';

const mocks = vi.hoisted(() => ({ state: {} as FinanceState, api: vi.fn(), success: vi.fn(), info: vi.fn(), error: vi.fn() }));
vi.mock('../../store/useStore', () => ({
  default: Object.assign((selector: (state: FinanceState) => unknown) => selector(mocks.state), {
    getState: () => mocks.state,
    setState: (updater: (state: FinanceState) => Partial<FinanceState>) => { mocks.state = { ...mocks.state, ...updater(mocks.state) }; },
  }), apiSync: mocks.api,
}));
vi.mock('../../hooks/useToast', () => ({ useToast: () => ({ success: mocks.success, info: mocks.info, error: mocks.error }) }));
afterEach(cleanup);
const money = (value: number) => '₹' + value.toFixed(2);
const entry = (id: string, overrides: Partial<Transaction> = {}): Transaction => ({ id, date: '2026-09-28', type: 'Expense', amount: 20, category: 'Food', method: 'Cash', note: 'Lunch ' + id, ...overrides });
const baseProps = { today: '2026-09-29', currencySymbol: '₹', formatMoney: money, user: {} };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.state = { user: { id: 'owner', timezone: 'Asia/Kolkata' }, finance: { transactions: { a: entry('a') }, budgets: {} }, subscriptions: [], addTransaction: vi.fn(async () => {}), deleteTransaction: vi.fn(async () => {}), addBudget: vi.fn(async () => {}), deleteBudget: vi.fn(async () => {}), isLoading: false };
});
function route(component: React.ReactNode, initial = '/finance/transactions') { return render(<MemoryRouter initialEntries={[initial]}>{component}</MemoryRouter>); }

describe('Finance canonical module rendering', () => {
  it('renders Transactions directly without a second module tab strip or h1', () => {
    route(<Finance initialTab="Transactions" />);
    expect(screen.getByRole('region', { name: 'Transactions table' })).toBeVisible();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.queryByText('Spending calendar')).not.toBeInTheDocument();
  });
  it('renders pathname modules and changes when initialTab changes', () => {
    const view = route(<Finance />, '/finance/transactions');
    expect(screen.getByRole('region', { name: 'Transactions table' })).toBeVisible();
    view.rerender(<MemoryRouter><Finance initialTab="Overview" /></MemoryRouter>);
    expect(screen.getByText('Recent activity')).toBeVisible();
    expect(screen.queryByRole('region', { name: 'Transactions table' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Transactions' })).toHaveAttribute('href', '/finance/transactions');
  });
  it('shows loading and initial-load errors instead of treating errors as an empty ledger', () => {
    mocks.state.isLoading = true;
    const view = route(<Finance initialTab="Transactions" />);
    expect(screen.getByRole('status')).toBeVisible();
    mocks.state.isLoading = false; mocks.state.initialLoadError = new Error('Network unavailable');
    view.rerender(<MemoryRouter><Finance initialTab="Transactions" /></MemoryRouter>);
    expect(screen.getByRole('alert')).toHaveTextContent('Network unavailable');
    expect(screen.queryByText('No transactions found')).not.toBeInTheDocument();
  });
  it('uses identical category and method filters for analytics totals and comparison data', async () => {
    mocks.state.finance.transactions = { current: entry('current', { amount: 10 }), previous: entry('previous', { date: '2026-08-28', amount: 1 }), rent: entry('rent', { category: 'Rent', amount: 200 }), bank: entry('bank', { method: 'Bank Transfer', amount: 100 }) };
    route(<Finance initialTab="Analytics" />, '/finance/analytics?month=2026-09&view=comparisons&category=Food&method=Cash');
    const table = await screen.findByRole('table', {}, { timeout: 8000 });
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(within(table).getAllByRole('row')[2]).toHaveTextContent('₹10');
    expect(table).not.toHaveTextContent('₹100');
    expect(table).not.toHaveTextContent('₹200');
    expect(screen.getByLabelText('Analysis category')).toHaveValue('Food');
  });
  it('restores the trends module with explicit missing and partial periods', async () => {
    mocks.state.finance.transactions = {};
    route(<Finance initialTab="Trends" />, '/finance/trends');
    expect(await screen.findByText('No recorded history')).toBeVisible();
    expect(screen.getByRole('table')).toHaveTextContent('partial');
    expect(screen.getByRole('table')).toHaveTextContent('No records');
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });
});

describe('Finance record workflows', () => {
  it('retains a transaction draft after failure and prevents duplicate submission while pending', async () => {
    let rejectSave: (error: Error) => void = () => {};
    const save = vi.fn(() => new Promise<void>((_resolve, reject) => { rejectSave = reject; }));
    render(<TransactionEditor {...baseProps} onSave={save} />);
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Food' } });
    fireEvent.change(screen.getByLabelText('Amount (₹)'), { target: { value: '12.50' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Keep this draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add transaction' }));
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    fireEvent.submit(screen.getByRole('button', { name: 'Saving…' }).closest('form')!);
    expect(save).toHaveBeenCalledTimes(1);
    await act(async () => rejectSave(new Error('Save rejected')));
    expect(screen.getByRole('alert')).toHaveTextContent('Save rejected');
    expect(screen.getByLabelText('Amount (₹)')).toHaveValue(12.5);
    expect(screen.getByLabelText('Description')).toHaveValue('Keep this draft');
  });
  it('uses edit mode without creating a new transaction and reports no success on failure', async () => {
    mocks.api.mockRejectedValue(new Error('Edit rejected'));
    route(<Finance initialTab="Transactions" />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Lunch a' }));
    fireEvent.change(screen.getByLabelText('Amount (₹)'), { target: { value: '25.50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await screen.findByRole('alert');
    expect(mocks.api).toHaveBeenCalledWith('/finance/a', 'PATCH', expect.objectContaining({ amount: 25.5 }));
    expect(mocks.state.addTransaction).not.toHaveBeenCalled();
    expect(mocks.state.finance.transactions.a.amount).toBe(20);
    expect(mocks.success).not.toHaveBeenCalled();
  });
  it('exports every filtered record, preserves sort and paginates independently', () => {
    const rows = Array.from({ length: 13 }, (_, index) => entry(String(index), { amount: index + 1 }));
    const create = vi.fn(() => 'blob:finance-export');
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() }));
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    route(<TransactionsTab {...baseProps} transactions={[...rows, entry('rent', { category: 'Rent' })]} onSave={vi.fn()} onDelete={vi.fn()} />, '/finance/transactions?category=Food&sort=amount-desc');
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(11);
    expect(within(table).getAllByRole('row')[1]).toHaveTextContent('₹13.00');
    expect(screen.queryByText('Lunch rent')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Export filtered CSV (13)' }));
    expect(create).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    expect(screen.getByText('Page 2 of 2')).toBeVisible();
    vi.restoreAllMocks();
  });
  it('confirms bulk deletion and reports failed records without a false completion', async () => {
    const remove = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('Rejected'));
    route(<TransactionsTab {...baseProps} transactions={[entry('a'), entry('b')]} onSave={vi.fn()} onDelete={remove} />);
    fireEvent.click(screen.getByLabelText('Select this page'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete selected' }));
    expect(remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /^Confirm delete$/ }));
    await waitFor(() => expect(remove).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('alert')).toHaveTextContent('1 transaction could not be deleted');
    expect(screen.getByText('1 selected')).toBeVisible();
  });
  it('accepts a zero budget and retains the form on failed acknowledgment', async () => {
    const save = vi.fn().mockRejectedValue(new Error('Budget rejected'));
    route(<BudgetingTab budgets={[]} transactions={[]} month="2026-09" {...baseProps} onSave={save} onDelete={vi.fn()} />, '/finance/budgeting');
    fireEvent.change(screen.getByLabelText('Budget category'), { target: { value: 'Food' } });
    fireEvent.change(screen.getByLabelText('Limit (₹)'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add budget' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Budget rejected');
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ limit_amount: 0, month: '2026-09' }), false);
    expect(screen.getByLabelText('Limit (₹)')).toHaveValue(0);
  });
  it('renders zero-budget status with a finite progress value', () => {
    route(<BudgetingTab budgets={[{ id: 'budget', category: 'Food', limit_amount: 0 }]} transactions={[entry('a')]} month="2026-09" {...baseProps} onSave={vi.fn()} onDelete={vi.fn()} />, '/finance/budgeting');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', 'Zero budget exceeded');
    expect(screen.getByText('Zero limit · ₹20.00 over budget')).toBeVisible();
  });
  it('retains failed subscription edits and confirms cancellation', async () => {
    const save = vi.fn().mockRejectedValue(new Error('Subscription rejected'));
    route(<SubscriptionsTab {...baseProps} subs={[{ id: 'sub', name: 'Gym', cost: 1200, cycle: 'yearly', active: 1 }]} transactions={[]} onSave={save} onDelete={vi.fn()} />, '/finance/subscriptions');
    expect(screen.getByText(/₹100.00 monthly equivalent/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Gym' }));
    fireEvent.change(screen.getByLabelText('Cost (₹)'), { target: { value: '1500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save subscription' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Subscription rejected');
    expect(screen.getByLabelText('Cost (₹)')).toHaveValue(1500);
    fireEvent.click(screen.getByRole('button', { name: 'Record cancellation' }));
    expect(save).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('group', { name: 'Confirm subscription change' })).toHaveTextContent('contact the provider');
  });
});
