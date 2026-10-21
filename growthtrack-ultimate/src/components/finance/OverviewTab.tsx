import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';
import type { Budget, Transaction } from '../../schemas';
import { featurePath } from '../../config/featureRegistry';
import type { FinanceUser, MoneyFormatter, Subscription } from '../../utils/financeModel';
import { CHART_COLORS, financeBreakdown, financeBudget, financeSummary, sortLedger, totalMoney } from '../../utils/financeModel';
import { formatDate } from '../../utils/userFormatters';
import StatCard from '../ui/StatCard';
import EmptyState from '../ui/EmptyState';
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
  const offset = new Date(year, monthNumber - 1, 1).getDay();
  const days = Array.from({ length: new Date(year, monthNumber, 0).getDate() }, (_, index) => {
    const date = month + '-' + String(index + 1).padStart(2, '0');
    return { date, day: index + 1, amount: totalMoney(transactions.filter(row => row.type === 'Expense' && row.date === date).map(row => row.amount)) };
  });
  const maximum = Math.max(1, ...days.map(row => row.amount));
  const cards = [
    { label: 'Net monthly balance', value: formatMoney(summary.balance), icon: Wallet, color: summary.balance >= 0 ? 'var(--success)' : 'var(--danger)' },
    { label: 'Total income', value: formatMoney(summary.income), icon: ArrowUpRight, color: 'var(--success)' },
    { label: 'Total expenses', value: formatMoney(summary.expenses), icon: ArrowDownRight, color: 'var(--danger)' },
    { label: 'Invested / saved', value: formatMoney(summary.investments), icon: TrendingUp, color: 'var(--info)' },
  ];
  return <>
    <div className="finance-controls finance-overview-actions"><button type="button" className="btn-primary" onClick={() => setShowEntry(true)}>Add a transaction</button><Link to={featurePath('transactions')}>Open Transactions</Link></div>
    {showEntry && <TransactionEditor {...{ today, currencySymbol, formatMoney, onSave }} onSaved={() => setShowEntry(false)} onCancel={() => setShowEntry(false)} />}
    <div className="stats-grid finance-kpi-grid">{cards.map(card => <StatCard key={card.label} {...card} />)}</div>
    <p className="finance-note">{summary.savingsRate === null ? 'Savings rate needs recorded income.' : 'Savings rate: ' + summary.savingsRate.toFixed(1) + '% of income after expenses.'} Totals use recorded transactions for {month}.</p>
    <div className="finance-card-grid">
      <section className="glass-card"><div className="finance-card-heading"><h2>Spending by method</h2></div>
        {methods.length ? methods.map((row, index) => <div key={row.name} className="finance-overview-spending-list"><div className="finance-overview-spending-item-header"><span>{row.name}</span><strong>{formatMoney(row.value)}</strong></div><div className="finance-overview-spending-bar-container"><div className="finance-overview-spending-bar" style={{ width: (summary.expenses > 0 ? row.value / summary.expenses * 100 : 0) + '%', background: CHART_COLORS[index % CHART_COLORS.length] }} /></div></div>) : <EmptyState icon="DollarSign" title="No spending recorded" description="Add an expense to see spending by payment method." />}
      </section>
      <section className="glass-card"><div className="finance-card-heading"><h2>Budget status</h2><Link to={featurePath('budgeting')}>Manage budgets</Link></div>
        {budgets.length ? budgets.map(budget => {
          const actual = categories.find(row => row.name === budget.category)?.value || 0;
          const status = financeBudget(actual, budget.limit_amount);
          return <div key={budget.id} className="finance-budget-row"><div className="finance-budget-header"><strong>{budget.category}</strong><span>{formatMoney(actual)} / {formatMoney(budget.limit_amount)}</span></div><p className={status.over ? 'finance-text-expense' : 'finance-note'}>{status.over ? formatMoney(-status.remaining) + ' over limit' : formatMoney(status.remaining) + ' remaining'}</p></div>;
        }) : <p className="finance-note">No category budgets for this month.</p>}
      </section>
      <section className="glass-card"><div className="finance-card-heading"><h2>Recent activity</h2><Link to={featurePath('transactions')}>View all transactions</Link></div>
        {recent.length ? <ul className="item-list">{recent.map(row => <li key={row.id}><strong>{row.category} · {formatMoney(row.amount)}</strong><p className="finance-note">{row.type} · {formatDate(row.date, user)}{row.note ? ' · ' + row.note : ''}</p></li>)}</ul> : <p className="finance-note">No transactions recorded for {month}.</p>}
      </section>
      <section className="glass-card"><div className="finance-card-heading"><h2>Upcoming commitments</h2><Link to={featurePath('subscriptions')}>Manage subscriptions</Link></div>
        {upcoming.length ? <ul className="item-list">{upcoming.map(row => <li key={row.id}><strong>{row.name} · {formatMoney(row.cost)}</strong><p className="finance-note">{formatDate(row.next_date || row.nextDate || '', user)} · {(row.next_date || row.nextDate || '') < today ? 'Renewal date has passed; review this bill.' : 'Next recorded renewal'}</p></li>)}</ul> : <p className="finance-note">No renewal dates recorded.</p>}
      </section>
    </div>
    <section className="glass-card"><div className="finance-card-heading"><h2>Spending calendar · {month}</h2></div><p className="finance-note">Daily expenses from recorded transactions. Darker days have higher spending.</p>
      <div className="finance-calendar-weekdays" aria-hidden="true">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <span key={day}>{day}</span>)}</div>
      <div className="finance-overview-heatmap-grid" role="list" aria-label={'Daily spending for ' + month}>
        {Array.from({ length: offset }, (_, index) => <span key={'blank-' + index} className="finance-calendar-blank" aria-hidden="true" />)}
        {days.map(row => <div key={row.date} role="listitem" className="finance-overview-heatmap-cell" aria-label={row.date + ': ' + formatMoney(row.amount)} title={row.date + ': ' + formatMoney(row.amount)} style={{ background: row.amount ? 'rgba(244,63,94,' + (0.15 + row.amount / maximum * 0.75) + ')' : 'var(--bg-elevated)' }}><strong>{row.day}</strong>{row.amount > 0 && <small>{formatMoney(row.amount)}</small>}</div>)}
      </div>
    </section>
  </>;
}
