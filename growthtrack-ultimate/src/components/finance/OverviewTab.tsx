import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, ArrowUpRight, ArrowDownRight, TrendingUp, Plus, ArrowRight, CreditCard, Target, ReceiptText, CalendarClock, CalendarDays } from 'lucide-react';
import type { Budget, Transaction } from '../../schemas';
import { featurePath } from '../../config/featureRegistry';
import type { FinanceUser, MoneyFormatter, Subscription } from '../../utils/financeModel';
import { financeBreakdown, financeBudget, financeSummary, sortLedger, totalMoney } from '../../utils/financeModel';
import { formatDate } from '../../utils/userFormatters';
import StatCard from '../ui/StatCard';
import TransactionEditor from './TransactionEditor';

interface Props {
  transactions: Transaction[]; budgets: Budget[]; subscriptions: Subscription[];
  month: string; today: string; user: FinanceUser; currencySymbol: string; formatMoney: MoneyFormatter;
  onSave: (transaction: Transaction, editing: boolean) => Promise<void>;
}
export default function OverviewTab({ transactions, budgets, subscriptions, month, today, user, currencySymbol, formatMoney, onSave }: Props) {
  const [showEntry, setShowEntry] = useState(false);
  const summary = financeSummary(transactions);
  const methods = financeBreakdown(transactions, 'method'), categories = financeBreakdown(transactions, 'category');
  const recent = sortLedger(transactions, 'date-desc').slice(0, 5);
  const upcoming = subscriptions.filter(row => row.active !== 0 && (row.next_date || row.nextDate)).sort((a, b) => (a.next_date || a.nextDate || '').localeCompare(b.next_date || b.nextDate || '')).slice(0, 5);
  const [year, monthNumber] = month.split('-').map(Number);
  const periodLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(year, monthNumber - 1, 1));
  const offset = new Date(year, monthNumber - 1, 1).getDay();
  const days = Array.from({ length: new Date(year, monthNumber, 0).getDate() }, (_, index) => {
    const date = month + '-' + String(index + 1).padStart(2, '0');
    return { date, day: index + 1, amount: totalMoney(transactions.filter(row => row.type === 'Expense' && row.date === date).map(row => row.amount)) };
  });
  const maximum = Math.max(1, ...days.map(row => row.amount));
  const spendingDays = days.filter(row => row.amount > 0).length;
  const cards = [
    { label: 'Total income', value: formatMoney(summary.income), icon: ArrowUpRight, color: 'var(--gt-success)', hint: 'Recorded inflow' },
    { label: 'Total expenses', value: formatMoney(summary.expenses), icon: ArrowDownRight, color: 'var(--gt-danger)', hint: 'Recorded spending' },
    { label: 'Invested / saved', value: formatMoney(summary.investments), icon: TrendingUp, color: 'var(--gt-info)', hint: 'Investment entries' },
  ];
  return <>
    <section className="finance-snapshot" aria-labelledby="finance-snapshot-title" data-area-motion="lead">
      <div className="finance-snapshot-heading"><h2 id="finance-snapshot-title">Monthly snapshot</h2><span className="finance-record-count"><ReceiptText size={14} aria-hidden="true" />{transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'}</span></div>
      <div className="finance-snapshot-body">
        <div className="finance-balance">
          <span className="finance-ledger-stamp" aria-hidden="true"><Wallet size={24} strokeWidth={1.5} /></span>
          <p className="finance-balance-label">Net monthly balance</p>
          <p className="finance-balance-value" data-negative={summary.balance < 0}>{formatMoney(summary.balance)}</p>
          <p className="finance-note">Income less expenses and investments. Based on {periodLabel} entries.</p>
          {!transactions.length && <p className="finance-snapshot-empty">No transactions recorded for this month. Start with an income or expense entry.</p>}
          <div className="finance-controls finance-overview-actions"><button type="button" className="btn-primary" onClick={() => setShowEntry(true)}><Plus size={16} aria-hidden="true" />Add a transaction</button><Link to={featurePath('transactions')}>Open Transactions<ArrowRight size={15} aria-hidden="true" /></Link></div>
        </div>
        <div className="stats-grid finance-kpi-grid finance-snapshot-metrics">{cards.map(card => <StatCard key={card.label} {...card} />)}</div>
      </div>
      <div className="finance-snapshot-footer"><span className="finance-savings-note"><span className="finance-savings-dot" aria-hidden="true" />{summary.savingsRate === null ? 'Savings rate needs recorded income.' : <><strong>{summary.savingsRate.toFixed(1)}%</strong> savings rate · after expenses, before investments</>}</span><span>Recorded cash flow · account balances may differ</span></div>
    </section>
    {showEntry && <TransactionEditor {...{ today, currencySymbol, formatMoney, onSave }} onSaved={() => setShowEntry(false)} onCancel={() => setShowEntry(false)} />}
    <div className="finance-card-grid finance-overview-grid">
      <section className="glass-card finance-overview-card" aria-labelledby="finance-methods-title" data-area-motion="surface"><div className="finance-card-heading"><div className="finance-section-title"><CreditCard size={18} aria-hidden="true" /><h2 id="finance-methods-title">Spending by method</h2></div><span className="finance-card-meta">{methods.length} {methods.length === 1 ? 'method' : 'methods'}</span></div>
        {methods.length ? <><div className="finance-spending-total"><strong>{formatMoney(summary.expenses)}</strong><span>Total expenses this period</span></div><div className="finance-method-list">{methods.map(row => <div key={row.name} className="finance-overview-spending-list"><div className="finance-overview-spending-item-header"><span>{row.name}</span><strong>{formatMoney(row.value)}</strong><small>{(summary.expenses > 0 ? row.value / summary.expenses * 100 : 0).toFixed(0)}%</small></div><div className="finance-overview-spending-bar-container" aria-hidden="true"><div className="finance-overview-spending-bar" style={{ width: (summary.expenses > 0 ? row.value / summary.expenses * 100 : 0) + '%' }} /></div></div>)}</div></> : <div className="finance-card-empty"><CreditCard size={28} strokeWidth={1.4} aria-hidden="true" /><h3>No spending recorded</h3><p>Add an expense to see how you paid and where your spending sits.</p></div>}
      </section>
      <section className="glass-card finance-overview-card" aria-labelledby="finance-budgets-title" data-area-motion="surface"><div className="finance-card-heading"><div className="finance-section-title"><Target size={18} aria-hidden="true" /><h2 id="finance-budgets-title">Budget status</h2></div><Link to={featurePath('budgeting') + '?month=' + month}>Manage budgets<ArrowRight size={14} aria-hidden="true" /></Link></div>
        {budgets.length ? <div className="finance-budget-list">{budgets.map(budget => {
          const actual = categories.find(row => row.name === budget.category)?.value || 0;
          const status = financeBudget(actual, budget.limit_amount);
          return <div key={budget.id} className="finance-budget-row"><div className="finance-budget-header"><strong>{budget.category}</strong><span>{formatMoney(actual)} <span className="finance-card-meta">/ {formatMoney(budget.limit_amount)}</span></span></div><div className={'finance-overview-budget-track' + (status.over ? ' is-over' : status.near ? ' is-near' : '')} role="progressbar" aria-label={budget.category + ' budget used'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(status.bar)} aria-valuetext={status.zero ? actual > 0 ? 'Zero budget exceeded' : 'Zero budget, no spending' : Math.round(status.pct) + '% used'}><span style={{ width: status.bar + '%' }} /></div><p className={status.over ? 'finance-text-expense' : 'finance-note'}>{status.over ? formatMoney(-status.remaining) + ' over limit' : formatMoney(status.remaining) + ' remaining'}{status.zero ? ' · zero limit' : ''}</p></div>;
        })}</div> : <div className="finance-card-empty"><Target size={28} strokeWidth={1.4} aria-hidden="true" /><h3>Give your categories a plan</h3><p>No category budgets for this month. Set a limit to see spending and remaining amounts together.</p><Link to={featurePath('budgeting') + '?month=' + month}>Create a budget<ArrowRight size={14} aria-hidden="true" /></Link></div>}
      </section>
      <section className="glass-card finance-overview-card" aria-labelledby="finance-activity-title" data-area-motion="surface"><div className="finance-card-heading"><div className="finance-section-title"><ReceiptText size={18} aria-hidden="true" /><h2 id="finance-activity-title">Recent activity</h2></div><Link to={featurePath('transactions')}>View all transactions<ArrowRight size={14} aria-hidden="true" /></Link></div>
        {recent.length ? <ul className="finance-activity-list">{recent.map(row => {
          const Icon = row.type === 'Income' ? ArrowUpRight : row.type === 'Investment' ? TrendingUp : ArrowDownRight;
          return <li key={row.id}><span className="finance-activity-icon" data-type={row.type} aria-hidden="true"><Icon size={17} /></span><div className="finance-activity-detail"><strong>{row.category}</strong><span>{row.type} · {formatDate(row.date, user)}</span>{row.note && <p>{row.note}</p>}</div><strong className="finance-activity-amount" data-type={row.type}>{row.type === 'Income' ? '+' : '−'}{formatMoney(row.amount)}</strong></li>;
        })}</ul> : <div className="finance-card-empty"><ReceiptText size={28} strokeWidth={1.4} aria-hidden="true" /><h3>Your activity will appear here</h3><p>No transactions recorded for {periodLabel}. New entries appear here after they are saved.</p></div>}
      </section>
      <section className="glass-card finance-overview-card" aria-labelledby="finance-commitments-title" data-area-motion="surface"><div className="finance-card-heading"><div className="finance-section-title"><CalendarClock size={18} aria-hidden="true" /><h2 id="finance-commitments-title">Upcoming commitments</h2></div><Link to={featurePath('subscriptions')}>Manage subscriptions<ArrowRight size={14} aria-hidden="true" /></Link></div>
        <p className="finance-card-intro">Next recorded renewals across all periods.</p>
        {upcoming.length ? <ul className="finance-activity-list finance-renewal-list">{upcoming.map(row => {
          const overdue = (row.next_date || row.nextDate || '') < today;
          return <li key={row.id}><span className="finance-activity-icon" aria-hidden="true"><CalendarClock size={17} /></span><div className="finance-activity-detail"><strong>{row.name}</strong><span>{formatDate(row.next_date || row.nextDate || '', user)}</span><p className={overdue ? 'finance-renewal-overdue' : ''}>{overdue ? 'Renewal date has passed; review this bill.' : 'Next recorded renewal'}</p></div><strong className="finance-activity-amount">{formatMoney(row.cost)}</strong></li>;
        })}</ul> : <div className="finance-card-empty"><CalendarClock size={28} strokeWidth={1.4} aria-hidden="true" /><h3>No renewal dates recorded</h3><p>Add a subscription and its next renewal date to keep recurring costs in view.</p><Link to={featurePath('subscriptions')}>Add a subscription<ArrowRight size={14} aria-hidden="true" /></Link></div>}
      </section>
    </div>
    <section className="glass-card finance-calendar" aria-labelledby="finance-calendar-title" data-area-motion="surface"><div className="finance-card-heading"><div className="finance-section-title"><CalendarDays size={18} aria-hidden="true" /><h2 id="finance-calendar-title">Spending calendar</h2></div><span className="finance-card-meta">{periodLabel} · {spendingDays} {spendingDays === 1 ? 'day' : 'days'} with expenses</span></div><div className="finance-calendar-caption"><p className="finance-note">Daily expenses from recorded transactions. Darker days have higher spending.</p><span className="finance-calendar-legend" aria-hidden="true">Less<i /><i /><i /><i />More</span></div>
      <div className="finance-calendar-weekdays" aria-hidden="true">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <span key={day}>{day}</span>)}</div>
      <div className="finance-overview-heatmap-grid" role="list" aria-label={'Daily spending for ' + month}>
        {Array.from({ length: offset }, (_, index) => <span key={'blank-' + index} className="finance-calendar-blank" aria-hidden="true" />)}
        {days.map(row => <div key={row.date} role="listitem" className="finance-overview-heatmap-cell" data-level={row.amount > 0 ? Math.max(1, Math.ceil(row.amount / maximum * 3)) : 0} data-today={row.date === today} aria-label={formatDate(row.date, user) + ': ' + formatMoney(row.amount) + (row.date === today ? ' · today' : '')} title={formatDate(row.date, user) + ': ' + formatMoney(row.amount)}><strong>{row.day}{row.date === today && <span className="finance-calendar-today-label">Today</span>}</strong>{row.amount > 0 && <small>{formatMoney(row.amount)}</small>}</div>)}
      </div>
    </section>
  </>;
}
