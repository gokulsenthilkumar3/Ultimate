import { z } from 'zod';
import { BudgetSchema, TransactionSchema } from '../schemas';
import type { Budget, Transaction } from '../schemas';

export type MoneyFormatter = (value: number) => string;
export type FinanceTransaction = Transaction & { updatedAt?: string };
export type FinanceBudget = Budget & { updatedAt?: string };
export const FinanceBudgetSchema = BudgetSchema.extend({ updatedAt: z.string().optional() });
const FinanceTransactionSchema = TransactionSchema.extend({ updatedAt: z.string().optional() });
export type FinanceModule = 'Overview' | 'Transactions' | 'Analytics' | 'Trends' | 'Budgeting' | 'Subscriptions' | 'Portfolio' | 'SIP' | 'Shopping' | 'Sync';
export interface FinanceUser {
  currency?: string;
  timezone?: string;
  timeZone?: string;
  [key: string]: unknown;
}
export interface Subscription {
  id: string;
  name: string;
  cost: number;
  category?: string;
  next_date?: string;
  nextDate?: string;
  icon?: string;
  auto_renew?: number;
  active?: number;
  cycle?: 'monthly' | 'yearly';
  cancelled_date?: string;
  updatedAt?: string;
}
export interface FinanceState {
  finance: { transactions: Record<string, FinanceTransaction>; budgets: Record<string, FinanceBudget> };
  user: FinanceUser;
  subscriptions: Subscription[];
  addTransaction: (transaction: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addBudget: (budget: Partial<Budget>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  isLoading?: boolean;
  loadError?: string | null;
  initialLoadError?: unknown;
  fetchInitialData?: () => Promise<void>;
  _sessionVersion?: number;
  _dataRevision?: number;
}
export interface LedgerFilters {
  query: string;
  type: string;
  category: string;
  method: string;
  from: string;
  to: string;
}
export type LedgerSort = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'category-asc';
export interface Breakdown { name: string; value: number }
export interface TrendPoint {
  month: string;
  income: number | null;
  expenses: number | null;
  investments: number | null;
  savings: number | null;
  rate: number | null;
  count: number;
  partial: boolean;
}

export const CATEGORIES = ['Gym', 'Supplements', 'Food', 'Apparel', 'Equipment', 'Salary', 'Stocks', 'Crypto', 'Rent', 'Utilities', 'Transport', 'Medical', 'Entertainment', 'Learning', 'Other'];
export const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'UPI (GPay/PhonePe)', 'Slice Card', 'Axio', 'HDFC Credit', 'SBI Debit'];
export const CHART_COLORS = ['var(--gt-action)', 'var(--gt-danger)', 'var(--gt-success)', 'var(--gt-warning)', '#5E5CE6', '#BF5AF2', '#64D2FF', '#FF9F0A'];

export function financeModule(initialTab?: string, pathname = ''): FinanceModule {
  const raw = (initialTab || pathname.split('/').filter(Boolean).at(-1) || 'Overview').toLowerCase().replace(/[\s_-]+/g, '');
  const modules: Record<string, FinanceModule> = { overview: 'Overview', transactions: 'Transactions', analytics: 'Analytics', trends: 'Trends', budgeting: 'Budgeting', subscriptions: 'Subscriptions', portfolio: 'Portfolio', sip: 'SIP', sipcalculator: 'SIP', planning: 'SIP', shopping: 'Shopping', sync: 'Sync' };
  return modules[raw] || 'Overview';
}

/** Calendar dates stay in the profile timezone (or the device timezone). */
export function financeToday(user: FinanceUser = {}, now = new Date()): string {
  const timeZone = user.timezone || user.timeZone;
  try {
    const parts = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', ...(timeZone ? { timeZone } : {}) }).formatToParts(now);
    const value = (part: string) => parts.find(item => item.type === part)?.value || '';
    return `${value('year')}-${value('month')}-${value('day')}`;
  } catch {
    return financeToday({}, now);
  }
}

export function validFinanceDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const date = new Date(0);
  date.setUTCFullYear(year, month, 0);
  return day <= date.getUTCDate();
}

export function financeMonths(count: number, today: string): string[] {
  const [year, month] = today.split('-').map(Number);
  const anchor = year * 12 + month - 1;
  return Array.from({ length: count }, (_, index) => {
    const value = anchor - count + index + 1;
    return `${Math.floor(value / 12)}-${String(((value % 12) + 12) % 12 + 1).padStart(2, '0')}`;
  });
}

/** Compatibility amounts have two decimal places; all arithmetic uses integers. */
export function financeMinor(value: number | string): number {
  const raw = String(value).trim();
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(raw);
  if (!match) throw new Error('Enter a valid monetary amount.');
  const decimals = match[3] || '';
  const minor = Number(match[2]) * 100 + Number(decimals.slice(0, 2).padEnd(2, '0')) + (Number(decimals[2] || 0) >= 5 ? 1 : 0);
  if (!Number.isSafeInteger(minor)) throw new Error('This amount is too large.');
  return match[1] ? -minor : minor;
}

export function financeAmount(value: string, allowZero = false): number {
  const raw = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) throw new Error('Enter an amount with up to two decimal places.');
  const minor = financeMinor(raw);
  if (allowZero ? minor < 0 : minor <= 0) throw new Error(allowZero ? 'The limit cannot be negative.' : 'Amount must be greater than zero.');
  return minor / 100;
}

export function totalMoney(values: number[]): number {
  const minor = values.reduce((sum, value) => {
    const next = sum + financeMinor(value);
    if (!Number.isSafeInteger(next)) throw new Error('The total is too large.');
    return next;
  }, 0);
  return minor / 100;
}

export function financeSummary(transactions: Transaction[]) {
  const total = (type: Transaction['type']) => totalMoney(transactions.filter(row => row.type === type).map(row => row.amount));
  const income = total('Income'), expenses = total('Expense'), investments = total('Investment');
  const balance = (financeMinor(income) - financeMinor(expenses) - financeMinor(investments)) / 100;
  return { income, expenses, investments, balance, savingsRate: income > 0 ? (financeMinor(income) - financeMinor(expenses)) / financeMinor(income) * 100 : null };
}

export function financeBreakdown(transactions: Transaction[], field: 'category' | 'method', type: Transaction['type'] = 'Expense'): Breakdown[] {
  const groups = new Map<string, number[]>();
  for (const row of transactions.filter(item => item.type === type)) {
    const name = row[field] || 'Unknown';
    groups.set(name, [...(groups.get(name) || []), row.amount]);
  }
  return [...groups].map(([name, amounts]) => ({ name, value: totalMoney(amounts) })).sort((a, b) => b.value - a.value);
}

export function financeBudget(actual: number, limit: number) {
  const spent = financeMinor(actual), maximum = financeMinor(limit);
  const pct = maximum > 0 ? spent / maximum * 100 : spent > 0 ? 100 : 0;
  return { pct, bar: Math.min(100, Math.max(0, pct)), over: spent > maximum, near: maximum > 0 && spent >= maximum * 0.8, remaining: (maximum - spent) / 100, zero: maximum === 0 };
}

export function filterLedger(transactions: Transaction[], filters: LedgerFilters): Transaction[] {
  const query = filters.query.trim().toLowerCase();
  return transactions.filter(row => (!filters.type || row.type === filters.type)
    && (!filters.category || row.category === filters.category)
    && (!filters.method || row.method === filters.method)
    && (!filters.from || row.date >= filters.from) && (!filters.to || row.date <= filters.to)
    && (!query || [row.category, row.note, row.method, row.type, row.date].some(value => String(value || '').toLowerCase().includes(query))));
}

export function sortLedger(transactions: Transaction[], sort: LedgerSort): Transaction[] {
  return [...transactions].sort((a, b) => {
    const comparison = sort === 'amount-desc' ? financeMinor(b.amount) - financeMinor(a.amount)
      : sort === 'amount-asc' ? financeMinor(a.amount) - financeMinor(b.amount)
      : sort === 'category-asc' ? a.category.localeCompare(b.category)
      : sort === 'date-asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
    return comparison || a.id.localeCompare(b.id);
  });
}

export function ledgerCsv(transactions: Transaction[]): string {
  const headers = ['date', 'type', 'category', 'method', 'amount', 'note'] as const;
  const cell = (value: unknown) => {
    const raw = String(value ?? '');
    const safe = /^[\s\u0000-\u001f]*[=+\-@]/.test(raw) || /^[\t\r\n]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  return [headers.join(','), ...transactions.map(row => headers.map(header => cell(header === 'amount' ? (financeMinor(row.amount) / 100).toFixed(2) : row[header])).join(','))].join('\r\n');
}

export function downloadLedger(transactions: Transaction[]): void {
  const url = URL.createObjectURL(new Blob(['\uFEFF', ledgerCsv(transactions)], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'growthtrack-transactions.csv';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  globalThis.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function financeTrends(transactions: Transaction[], months: string[], today: string): TrendPoint[] {
  return months.map(month => {
    const rows = transactions.filter(row => row.date.startsWith(`${month}-`) && row.date <= today);
    const summary = financeSummary(rows);
    return { month, income: rows.length ? summary.income : null, expenses: rows.length ? summary.expenses : null, investments: rows.length ? summary.investments : null, savings: rows.length ? summary.balance : null, rate: rows.length ? summary.savingsRate : null, count: rows.length, partial: month === today.slice(0, 7) };
  });
}

export function financeError(error: unknown): string {
  return error instanceof Error ? error.message : 'The request failed. Please try again.';
}

export function readFinanceTransactions(values: unknown[]) {
  const rows: FinanceTransaction[] = [];
  let invalid = 0;
  for (const value of values) {
    if (!value || typeof value !== 'object') { invalid++; continue; }
    const raw = value as Record<string, unknown>;
    const parsed = FinanceTransactionSchema.safeParse({ ...raw, category: raw.category || 'Other', method: raw.method ?? undefined, note: raw.note ?? undefined });
    if (!parsed.success || !validFinanceDate(parsed.data.date) || !Number.isFinite(parsed.data.amount) || parsed.data.amount < 0) { invalid++; continue; }
    try { financeMinor(parsed.data.amount); rows.push(parsed.data); }
    catch { invalid++; }
  }
  return { rows, invalid };
}
