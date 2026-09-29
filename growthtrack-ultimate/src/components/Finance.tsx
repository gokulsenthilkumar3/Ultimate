import { Suspense, lazy, useCallback, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import useStore from '../store/useStore';
import { useToast } from '../hooks/useToast';
import type { FinanceBudget as Budget, FinanceTransaction as Transaction, FinanceState, Subscription } from '../utils/financeModel';
import { FinanceBudgetSchema, financeBudget, financeBreakdown, financeError, financeModule, financeMonths, financeToday, readFinanceTransactions, validFinanceDate } from '../utils/financeModel';
import { saveFinanceBudget, saveFinanceSubscription, saveFinanceTransaction, deleteFinanceBudget, deleteFinanceSubscription, deleteFinanceTransaction } from '../utils/financeApi';
import { fmtINR } from '../utils/finance';
import { getCurrencySymbol } from '../utils/userFormatters';
import OverviewTab from './finance/OverviewTab';
import TransactionsTab from './finance/TransactionsTab';
import BudgetingTab from './finance/BudgetingTab';
import SubscriptionsTab from './finance/SubscriptionsTab';
import SyncTab from './finance/SyncTab';
import LoadingSkeleton from './ui/LoadingSkeleton';
import '../styles/finance.css';
import './finance/finance.css';

const AnalyticsTab = lazy(() => import('./finance/AnalyticsTab'));
const TrendsTab = lazy(() => import('./finance/TrendsTab'));

export interface FinanceProps { initialTab?: string }
/** Shell owns module links and the page heading. Finance renders only its active module. */
export default function Finance({ initialTab }: FinanceProps) {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const activeTab = financeModule(initialTab, location.pathname);
  const finance = useStore((state: FinanceState) => state.finance);
  const user = useStore((state: FinanceState) => state.user) || {};
  const subscriptions = useStore((state: FinanceState) => state.subscriptions) || [];
  const isLoading = useStore((state: FinanceState) => state.isLoading);
  const loadError = useStore((state: FinanceState) => state.initialLoadError);
  const fetchInitialData = useStore((state: FinanceState) => state.fetchInitialData);
  const toast = useToast();
  const formatMoney = useCallback((amount: number) => fmtINR(amount, user), [user]);
  const currencySymbol = getCurrencySymbol(user);
  const today = financeToday(user);
  const currentMonth = today.slice(0, 7);
  const rawMonth = params.get('month') || currentMonth;
  const month = validFinanceDate(rawMonth + '-01') ? rawMonth : currentMonth;
  const category = activeTab === 'Analytics' ? params.get('category') || '' : '';
  const method = activeTab === 'Analytics' ? params.get('method') || '' : '';
  const parsedTransactions = useMemo(() => readFinanceTransactions(Object.values(finance?.transactions || {})), [finance?.transactions]);
  const transactions = parsedTransactions.rows;
  const budgets = useMemo(() => Object.values(finance?.budgets || {}).flatMap(value => {
    const raw = value as Budget;
    const parsed = FinanceBudgetSchema.safeParse({ ...raw, month: raw.month || undefined });
    return parsed.success && Number.isFinite(parsed.data.limit_amount) && parsed.data.limit_amount >= 0 ? [parsed.data] : [];
  }), [finance?.budgets]);
  const monthRows = transactions.filter(row => row.date.startsWith(month + '-') && (!category || row.category === category) && (!method || row.method === method));
  const activeBudgets = budgets.filter(row => !row.month || row.month === month);
  const previousMonth = financeMonths(2, month + '-01')[0];
  const previousRows = transactions.filter(row => row.date.startsWith(previousMonth + '-') && (!category || row.category === category) && (!method || row.method === method));
  const expenseCategories = financeBreakdown(monthRows, 'category');
  const alerts = activeBudgets.flatMap(budget => {
    const actual = expenseCategories.find(row => row.name === budget.category)?.value || 0;
    const status = financeBudget(actual, budget.limit_amount);
    return status.over || status.near ? [{ ...budget, actual, status }] : [];
  });
  const knownMonths = [...new Set([...financeMonths(12, today), ...transactions.map(row => row.date.slice(0, 7)), ...budgets.map(row => row.month || '').filter(Boolean), month])].sort().reverse();
  const subs: Subscription[] = subscriptions.filter(row => row && typeof row.name === 'string' && Number.isFinite(row.cost) && row.cost >= 0);
  const invalidRecords = parsedTransactions.invalid + Object.values(finance?.budgets || {}).length - budgets.length + subscriptions.length - subs.length;
  const periodModule = ['Overview', 'Analytics', 'Budgeting'].includes(activeTab);

  async function saveTransaction(transaction: Transaction, editing: boolean) {
    await saveFinanceTransaction(transaction, editing);
    toast.success(editing ? 'Transaction changes saved.' : 'Transaction saved.');
  }
  async function saveBudget(budget: Budget, editing: boolean) {
    await saveFinanceBudget(budget, editing);
    toast.success(editing ? 'Budget changes saved.' : 'Budget saved.');
  }
  async function removeBudget(id: string) { await deleteFinanceBudget(id); toast.info('Budget deleted.'); }
  async function removeTransaction(id: string) { await deleteFinanceTransaction(id); }
  async function saveSubscription(subscription: Omit<Subscription, 'id'> & { id?: string }, editing = Boolean(subscription.id)) {
    await saveFinanceSubscription(subscription, editing);
    toast.success('Subscription saved.');
  }
  async function removeSubscription(id: string) { await deleteFinanceSubscription(id); toast.info('Subscription deleted.'); }
  function query(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  }
  if (isLoading) return <LoadingSkeleton variant="finance" />;
  if (loadError) return <div className="finance-workspace"><div role="alert" className="finance-error"><p>Finance records could not be loaded. {financeError(loadError)}</p><button type="button" className="btn-primary" onClick={() => void fetchInitialData?.().catch(error => toast.error(financeError(error)))}>Retry loading records</button></div></div>;

  return <div className="module-page finance-container finance-workspace" data-finance-module={activeTab}>
    {invalidRecords > 0 && <p role="alert" className="finance-error">{invalidRecords} finance records have invalid fields and are excluded from calculations. Review the source records before relying on totals.</p>}
    {periodModule && <div className="finance-controls">
      <label className="finance-field">Month<select className="form-input" value={month} onChange={event => query('month', event.target.value)}>{knownMonths.map(value => <option key={value}>{value}</option>)}</select></label>
      {activeTab === 'Analytics' && <>
        <label className="finance-field">Analysis category<select className="form-input" value={category} onChange={event => query('category', event.target.value)}><option value="">All categories</option>{[...new Set(transactions.map(row => row.category))].sort().map(value => <option key={value}>{value}</option>)}</select></label>
        <label className="finance-field">Analysis payment method<select className="form-input" value={method} onChange={event => query('method', event.target.value)}><option value="">All methods</option>{[...new Set(transactions.map(row => row.method).filter((value): value is string => Boolean(value)))].sort().map(value => <option key={value}>{value}</option>)}</select></label>
      </>}
    </div>}
    {(activeTab === 'Overview' || activeTab === 'Budgeting') && alerts.length > 0 && <div className="finance-alerts-container">{alerts.map(budget => <p key={budget.id} role="status" className={'finance-alert ' + (budget.status.over ? 'finance-alert-danger' : 'finance-alert-warning')}><AlertTriangle size={18} aria-hidden="true" /><span>{budget.category}: {formatMoney(budget.actual)} / {formatMoney(budget.limit_amount)} · {budget.status.zero ? 'Zero limit exceeded' : budget.status.over ? 'Budget exceeded' : 'Near the limit'}</span></p>)}</div>}
    {activeTab === 'Overview' && <OverviewTab transactions={monthRows} budgets={activeBudgets} subscriptions={subs} {...{ month, today, user, currencySymbol, formatMoney }} onSave={saveTransaction} />}
    {activeTab === 'Transactions' && <TransactionsTab {...{ transactions, today, user, currencySymbol, formatMoney }} onSave={saveTransaction} onDelete={removeTransaction} />}
    <Suspense fallback={<LoadingSkeleton variant="finance" />}>
      {activeTab === 'Analytics' && <AnalyticsTab transactions={monthRows} previousTransactions={previousRows} {...{ month, previousMonth, today, method, formatMoney }} />}
      {activeTab === 'Trends' && <TrendsTab {...{ transactions, today, formatMoney }} />}
    </Suspense>
    {activeTab === 'Budgeting' && <BudgetingTab {...{ budgets, transactions, month, currencySymbol, formatMoney }} onSave={saveBudget} onDelete={removeBudget} />}
    {activeTab === 'Subscriptions' && <SubscriptionsTab subs={subs} {...{ transactions, today, user, currencySymbol, formatMoney }} onSave={saveSubscription} onDelete={removeSubscription} />}
    {activeTab === 'Sync' && <SyncTab formatMoney={formatMoney} />}
  </div>;
}
