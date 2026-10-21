import { z } from 'zod';
import useStore, { apiSync } from '../store/useStore';
import type { FinanceBudget as Budget, FinanceTransaction as Transaction } from './financeModel';
import type { FinanceState, Subscription } from './financeModel';
import { readFinanceTransactions } from './financeModel';
import { captureSession, mutationPayload } from '../store/persistence';

const mutationAck = z.object({ success: z.literal(true), count: z.number().int().positive(), updatedAt: z.string().optional() });
const subscriptionRecord = z.object({ id: z.string().min(1), name: z.string(), cost: z.number().finite(), active: z.number().optional() }).passthrough();

/** Legacy create/delete actions return acknowledged promises. Edits use the existing PATCH API. */
export async function saveFinanceTransaction(transaction: Transaction, editing: boolean): Promise<void> {
  const state = useStore.getState() as FinanceState;
  const current = captureSession(useStore.getState);
  if (!editing) {
    await state.addTransaction(transaction);
    if (!current()) throw new Error('The session changed. Reload the ledger to confirm the saved change.');
    const saved = (useStore.getState() as FinanceState).finance.transactions[transaction.id];
    if (!saved?.updatedAt) throw new Error('The server did not acknowledge the saved transaction. Refresh before retrying.');
    return;
  }
  const { id, ...changes } = transaction;
  const response: unknown = await apiSync(`/finance/${encodeURIComponent(id)}`, 'PATCH', mutationPayload(transaction, changes));
  const acknowledged = mutationAck.parse(response);
  if (!current()) throw new Error('The session changed. Reload the ledger to confirm the saved change.');
  useStore.setState((current: FinanceState) => ({ finance: { ...current.finance, transactions: { ...current.finance.transactions, [id]: { ...transaction, ...(acknowledged.updatedAt ? { updatedAt: acknowledged.updatedAt } : {}) } } } }));
}

/** Publish subscription records only after validating the server acknowledgment. */
export async function saveFinanceSubscription(subscription: Omit<Subscription, 'id'> & { id?: string }, editing = Boolean(subscription.id)): Promise<void> {
  const current = captureSession(useStore.getState);
  if (editing) {
    if (!subscription.id) throw new Error('A subscription ID is required to edit.');
    const { id, ...changes } = subscription;
    const response: unknown = await apiSync(`/subscriptions/${encodeURIComponent(id)}`, 'PATCH', mutationPayload(subscription, changes));
    const acknowledged = mutationAck.parse(response);
    if (!current()) throw new Error('The session changed. Reload subscriptions to confirm the saved change.');
    useStore.setState((state: FinanceState) => ({ subscriptions: state.subscriptions.map(row => row.id === id ? { ...row, ...changes, ...(acknowledged.updatedAt ? { updatedAt: acknowledged.updatedAt } : {}) } : row) }));
  } else {
    const response: unknown = await apiSync('/subscriptions', 'POST', subscription);
    const acknowledged = subscriptionRecord.parse(response);
    if (!current()) throw new Error('The session changed. Reload subscriptions to confirm the saved change.');
    const row: Subscription = { ...subscription, id: acknowledged.id, name: acknowledged.name, cost: acknowledged.cost, active: acknowledged.active ?? 1, ...(typeof acknowledged.updatedAt === 'string' ? { updatedAt: acknowledged.updatedAt } : {}) };
    useStore.setState((state: FinanceState) => ({ subscriptions: [...state.subscriptions.filter(item => item.id !== row.id), row] }));
  }
}

export async function deleteFinanceSubscription(id: string): Promise<void> {
  const current = captureSession(useStore.getState);
  const previous = (useStore.getState() as FinanceState).subscriptions.find(row => row.id === id);
  const response: unknown = await apiSync(`/subscriptions/${encodeURIComponent(id)}`, 'DELETE', mutationPayload(previous));
  mutationAck.parse(response);
  if (!current()) throw new Error('The session changed. Reload subscriptions to confirm deletion.');
  useStore.setState((state: FinanceState) => ({ subscriptions: state.subscriptions.filter(row => row.id !== id) }));
}

export async function saveFinanceBudget(budget: Budget, editing: boolean): Promise<void> {
  const current = captureSession(useStore.getState);
  if (!editing) {
    await (useStore.getState() as FinanceState).addBudget(budget);
    if (!current()) throw new Error('The session changed. Reload budgets to confirm the saved change.');
    const saved = (useStore.getState() as FinanceState).finance.budgets[budget.id];
    if (!saved?.updatedAt) throw new Error('The server did not acknowledge the saved budget. Refresh before retrying.');
    return;
  }
  const { id, ...changes } = budget;
  const response: unknown = await apiSync(`/budgets/${encodeURIComponent(id)}`, 'PATCH', mutationPayload(budget, changes));
  const acknowledged = mutationAck.parse(response);
  if (!current()) throw new Error('The session changed. Reload budgets to confirm the saved change.');
  useStore.setState((state: FinanceState) => ({ finance: { ...state.finance, budgets: { ...Object.fromEntries(Object.values(state.finance.budgets).map(row => [row.id, row])), [id]: { ...budget, ...(acknowledged.updatedAt ? { updatedAt: acknowledged.updatedAt } : {}) } } } }));
}

export async function deleteFinanceTransaction(id: string): Promise<void> {
  const current = captureSession(useStore.getState);
  const previous = (useStore.getState() as FinanceState).finance.transactions[id];
  const response: unknown = await apiSync(`/finance/${encodeURIComponent(id)}`, 'DELETE', mutationPayload(previous));
  mutationAck.parse(response);
  if (!current()) throw new Error('The session changed. Reload the ledger to confirm deletion.');
  useStore.setState((state: FinanceState) => ({ finance: { ...state.finance, transactions: Object.fromEntries(Object.entries(state.finance.transactions).filter(([key]) => key !== id)) } }));
}

export async function deleteFinanceBudget(id: string): Promise<void> {
  const current = captureSession(useStore.getState);
  const previous = Object.values((useStore.getState() as FinanceState).finance.budgets).find(row => row.id === id);
  const response: unknown = await apiSync(`/budgets/${encodeURIComponent(id)}`, 'DELETE', mutationPayload(previous));
  mutationAck.parse(response);
  if (!current()) throw new Error('The session changed. Reload budgets to confirm deletion.');
  useStore.setState((state: FinanceState) => ({ finance: { ...state.finance, budgets: Object.fromEntries(Object.values(state.finance.budgets).filter(row => row.id !== id).map(row => [row.id, row])) } }));
}

export async function refreshFinanceTransactions(): Promise<void> {
  const current = captureSession(useStore.getState);
  const response: unknown = await apiSync('/finance', 'GET');
  if (!Array.isArray(response)) throw new Error('The ledger response is invalid.');
  const parsed = readFinanceTransactions(response);
  if (parsed.invalid) throw new Error('The ledger contains invalid records. Refresh the account to review them.');
  const rows = parsed.rows;
  if (!current()) throw new Error('The session changed. Reload finance records.');
  useStore.setState((state: FinanceState) => ({ finance: { ...state.finance, transactions: Object.fromEntries(rows.map(row => [row.id, row])) } }));
}
