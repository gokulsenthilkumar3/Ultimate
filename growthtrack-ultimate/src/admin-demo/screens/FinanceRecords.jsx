import React, { useState } from 'react';
import { filterRecords } from '../models/tableModel';
import { Badge, Button, Metrics, Panel, Progress, RecordsTable } from '../components';
import { addDays, formatDate } from '../models/calendarModel';
import { SAMPLE_DATE } from '../models/chartModel';
import { BUDGETS, SHOPPING, SUBSCRIPTIONS, TRANSACTIONS, financeTotals, money } from '../models/financeModel';
import { statusTone } from './screenHelpers';

const dateLabel = value => formatDate(value, { day: '2-digit', month: 'short', year: 'numeric' });
const statusColumn = { key: 'status', label: 'Status', render: row => <Badge tone={statusTone(row.status)}>{row.status}</Badge> };

export function TransactionRecords({ page, view, added = [], openRecord }) {
  const [query, setQuery] = useState(''), [category, setCategory] = useState('All'), [from, setFrom] = useState(''), [to, setTo] = useState('');
  const records = [...added].reverse().concat(TRANSACTIONS).map(row => ({ ...row, status: row.status || (row.direction === 'Income' ? 'Received' : 'Paid') })).sort((a, b) => b.date.localeCompare(a.date));
  const invalidRange = from && to && from > to;
  const filtered = records.filter(row => !invalidRange && (view !== 'income' || row.direction === 'Income') && (view !== 'expenses' || row.direction === 'Expense') && (category === 'All' || row.category === category) && (!from || row.date >= from) && (!to || row.date <= to));
  const matching = filterRecords(filtered, query), totals = financeTotals(matching);
  const expenses = matching.filter(row => row.direction === 'Expense');
  const categories = [...new Set(expenses.map(row => row.category))].map(name => ({ category: name, amount: expenses.filter(row => row.category === name).reduce((sum, row) => sum + row.amount, 0) }));
  const reset = () => { setQuery(''); setCategory('All'); setFrom(''); setTo(''); };
  return <>
    <Metrics items={[{ label: 'Net balance', value: money(totals.balance), detail: 'matching records in this view' }, { label: 'Income', value: money(totals.income), detail: 'matching records in this view' }, { label: 'Expenses', value: money(totals.expenses), detail: 'matching records in this view' }, { label: 'Savings rate', value: totals.savingsRate === null ? '—' : `${totals.savingsRate.toFixed(1)}%`, detail: totals.savingsRate === null ? 'needs income in this view' : 'of matching sample income' }]} />
    {['finance', 'financeAnalytics', 'financeTrends'].includes(page.id) && view !== 'income' && <Panel title="Spending by category" subtitle="Calculated from the matching sample records."><div className="support-body">{categories.length ? categories.map(row => <Progress key={row.category} label={`${row.category} · ${money(row.amount)}`} value={Math.round(row.amount / totals.expenses * 100)} />) : <p className="muted">No expenses match this view.</p>}</div></Panel>}
    <Panel title={page.id === 'finance' ? 'Recent transactions' : 'Transactions'} subtitle="Totals reflect all matching records, including other result pages.">
      <div className="typed-filters"><label>Category<select aria-label="Transaction category filter" value={category} onChange={event => setCategory(event.target.value)}><option value="All">All categories</option>{[...new Set(records.map(row => row.category))].sort().map(name => <option key={name}>{name}</option>)}</select></label><label>From<input aria-label="Transaction start date" type="date" value={from} onChange={event => setFrom(event.target.value)} /></label><label>To<input aria-label="Transaction end date" type="date" value={to} onChange={event => setTo(event.target.value)} /></label><Button onClick={reset}>Reset filters</Button></div>
      {invalidRange && <p className="form-error" role="alert">The start date must be on or before the end date.</p>}
      <RecordsTable rows={filtered} query={query} onQueryChange={setQuery} filterKey={`${view}:${category}:${from}:${to}`} onClearFilters={reset} columns={[{ key: 'date', label: 'Date', render: row => dateLabel(row.date) }, { key: 'title', label: 'Transaction' }, { key: 'category', label: 'Category' }, { key: 'direction', label: 'Direction' }, { key: 'amount', label: 'Amount', numeric: true, sortValue: row => row.direction === 'Income' ? row.amount : -row.amount, render: row => <span className={row.direction === 'Income' ? 'positive money' : 'negative money'}>{row.direction === 'Income' ? '+ ' : ''}{money(row.direction === 'Income' ? row.amount : -row.amount)}</span> }, statusColumn]} label="Transactions" onRow={row => openRecord({ ...row, type: 'Sample transaction' })} searchPlaceholder="Search transactions…" renderSummary={rows => { const summary = financeTotals(rows); return <><span>{rows.length} matching {rows.length === 1 ? 'record' : 'records'}</span><strong>Net in this view: {money(summary.balance)}</strong></>; }} />
    </Panel>
  </>;
}

export function BudgetRecords({ view, added = [], openRecord }) {
  const records = [...BUDGETS, ...added.map(row => ({ ...row, limit: row.amount, spent: 0 }))];
  const limit = records.reduce((sum, row) => sum + row.limit, 0);
  const spent = records.reduce((sum, row) => sum + row.spent, 0);
  return <><Metrics items={[{ label: 'Monthly budget', value: money(limit), detail: 'across budget categories' }, { label: 'Budgeted spending', value: money(spent), detail: 'sample month' }, { label: 'Remaining', value: money(limit - spent), detail: 'within this budget' }, { label: 'Categories', value: records.length, detail: 'in the current budget' }]} />
    {view === 'history' ? <Panel title="Budget history" subtitle="Current totals and a separate historical sample."><RecordsTable rows={[{ month: 'October 2026', limit, spent }, { month: 'September 2026', limit: 44000, spent: 27920 }]} columns={[{ key: 'month', label: 'Month' }, { key: 'limit', label: 'Budget', numeric: true, render: row => money(row.limit) }, { key: 'spent', label: 'Spent', numeric: true, render: row => money(row.spent) }, { key: 'remaining', label: 'Remaining', sortValue: row => row.limit - row.spent, render: row => money(row.limit - row.spent) }]} label="Budget history" /></Panel> : <div className="two-columns">{records.map(row => <Panel key={row.id} title={row.title} subtitle={`${money(row.spent)} / ${money(row.limit)}`}><div className="support-body"><Progress label="Budget used" value={Math.min(100, Math.round(row.spent / row.limit * 100))} /><Button onClick={() => openRecord({ ...row, type: 'Budget category' })}>Review category</Button></div></Panel>)}</div>}
  </>;
}

export function SubscriptionRecords({ view, added = [], openRecord }) {
  const records = [...SUBSCRIPTIONS, ...added];
  const active = records.filter(row => row.status === 'Active');
  const upcoming = active.filter(row => row.date >= SAMPLE_DATE && row.date <= addDays(SAMPLE_DATE, 30));
  const archived = records.filter(row => row.status === 'Archived');
  const visible = view === 'archived' ? archived : view === 'upcoming' ? upcoming : active;
  return <><Metrics items={[{ label: 'Monthly recurring', value: money(active.reduce((sum, row) => sum + row.amount, 0)), detail: 'active sample subscriptions' }, { label: 'Active plans', value: active.length, detail: 'in this sample workspace' }, { label: 'Upcoming renewals', value: upcoming.length, detail: 'over the next 30 days' }, { label: 'Archived plans', value: archived.length, detail: 'excluded from recurring cost' }]} />
    <Panel title="Subscriptions, in one place" subtitle="Each view uses its actual sample status and renewal date."><RecordsTable rows={visible} columns={[{ key: 'title', label: 'Subscription' }, { key: 'amount', label: 'Monthly cost', numeric: true, render: row => money(row.amount, 2) }, { key: 'date', label: view === 'archived' ? 'Last renewal' : 'Next renewal', render: row => dateLabel(row.date) }, statusColumn]} label="Subscriptions" onRow={row => openRecord({ ...row, type: 'Sample subscription' })} searchPlaceholder="Search subscriptions…" renderSummary={rows => <><span>Total monthly cost in this view</span><strong>{money(rows.reduce((sum, row) => sum + row.amount, 0))}</strong></>} /></Panel>
  </>;
}

export function ShoppingRecords({ view, added = [], openRecord }) {
  const records = [...SHOPPING, ...added];
  const planned = records.filter(row => row.status === 'Planned');
  const purchased = records.filter(row => row.status === 'Purchased');
  const visible = view === 'planned' ? planned : view === 'purchased' ? purchased : records;
  return <><Metrics items={[{ label: 'Items', value: records.length, detail: 'in your sample list' }, { label: 'Planned value', value: money(planned.reduce((sum, row) => sum + row.amount, 0)), detail: `${planned.length} planned items` }, { label: 'Purchased value', value: money(purchased.reduce((sum, row) => sum + row.amount, 0)), detail: `${purchased.length} purchased items` }, { label: 'Purchased items', value: purchased.length, detail: 'completed purchases' }]} />
    <Panel title="Your shopping list" subtitle="Planned and purchased items stay separate."><RecordsTable rows={visible} columns={[{ key: 'title', label: 'Item' }, { key: 'category', label: 'Category' }, { key: 'amount', label: 'Amount', numeric: true, render: row => money(row.amount, 2) }, statusColumn]} label="Shopping list" onRow={row => openRecord({ ...row, type: 'Shopping item' })} searchPlaceholder="Search shopping items…" renderSummary={rows => <><span>Total item value in this view</span><strong>{money(rows.reduce((sum, row) => sum + row.amount, 0))}</strong></>} /></Panel>
  </>;
}
