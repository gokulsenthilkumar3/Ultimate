import { Link, useSearchParams } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { Transaction } from '../../schemas';
import { featurePath } from '../../config/featureRegistry';
import type { MoneyFormatter } from '../../utils/financeModel';
import { CHART_COLORS, financeBreakdown, financeMinor, financeSummary } from '../../utils/financeModel';
import EmptyState from '../ui/EmptyState';

interface Props { transactions: Transaction[]; previousTransactions: Transaction[]; month: string; previousMonth: string; today: string; method: string; formatMoney: MoneyFormatter }
export default function AnalyticsTab({ transactions, previousTransactions, month, previousMonth, today, method, formatMoney }: Props) {
  const [params, setParams] = useSearchParams();
  const requested = params.get('view');
  const view = requested && ['categories', 'income', 'comparisons'].includes(requested) ? requested : 'categories';
  const incomeView = view === 'income';
  const summary = financeSummary(transactions), previous = financeSummary(previousTransactions);
  const breakdown = financeBreakdown(transactions, 'category', incomeView ? 'Income' : 'Expense');
  const total = incomeView ? summary.income : summary.expenses;
  const change = (financeMinor(summary.expenses) - financeMinor(previous.expenses)) / 100;
  const tooltipStyle = { background: 'var(--gt-surface, var(--bg-card))', border: '1px solid var(--gt-border, var(--border))', borderRadius: 8 };
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = month + '-' + new Date(year, monthNumber, 0).getDate();
  return <>
    <div className="finance-controls"><label className="finance-field">Analysis<select className="form-input" value={view} onChange={event => { const next = new URLSearchParams(params); next.set('view', event.target.value); setParams(next); }}><option value="categories">Expense categories</option><option value="income">Income sources</option><option value="comparisons">Period comparisons</option></select></label></div>
    <dl className="finance-summary"><div><dt>Income</dt><dd>{formatMoney(summary.income)}</dd></div><div><dt>Expenses</dt><dd>{formatMoney(summary.expenses)}</dd></div><div><dt>Recorded transactions</dt><dd>{transactions.length}</dd></div></dl>
    {view === 'comparisons' ? <section className="glass-card"><div className="finance-card-heading"><h2>Compare recorded periods</h2></div>
      {!transactions.length || !previousTransactions.length ? <p className="finance-note">Both periods need records before a comparison can be calculated. Missing records do not establish zero spending.</p> : <p>Expenses changed by {formatMoney(change)}{previous.expenses > 0 ? ' (' + (change / previous.expenses * 100).toFixed(1) + '%)' : ''} from {previousMonth} to {month}.</p>}
      <div className="finance-table-scroll"><table className="finance-record-table"><caption>Identical category and payment-method filters apply to both periods. {month === today.slice(0, 7) ? 'The current month is partial.' : 'Totals cover recorded transactions only.'}</caption><thead><tr><th>Period</th><th>Records</th><th>Income</th><th>Expenses</th><th>Balance</th></tr></thead><tbody>{[{ month: previousMonth, summary: previous, count: previousTransactions.length }, { month, summary, count: transactions.length }].map(row => <tr key={row.month}><th scope="row">{row.month}</th><td>{row.count}</td><td>{row.count ? formatMoney(row.summary.income) : 'No records'}</td><td>{row.count ? formatMoney(row.summary.expenses) : 'No records'}</td><td>{row.count ? formatMoney(row.summary.balance) : 'No records'}</td></tr>)}</tbody></table></div>
    </section> : <div className="finance-card-grid">
      <section className="glass-card"><div className="finance-card-heading"><h2>{incomeView ? 'Income sources' : 'Category allocation'}</h2></div>
        {breakdown.length ? <>
          <div className="finance-chart"><ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 300, height: 300 }}><PieChart><Pie data={breakdown} innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value" nameKey="name" isAnimationActive={false}>{breakdown.map((row, index) => <Cell key={row.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}</Pie><Tooltip formatter={value => formatMoney(Number(value))} contentStyle={tooltipStyle} /></PieChart></ResponsiveContainer></div>
          <table className="finance-record-table"><caption>{incomeView ? 'Recorded income' : 'Recorded expenses'} by category</caption><thead><tr><th>Category</th><th>Amount</th><th>Share</th></tr></thead><tbody>{breakdown.map(row => <tr key={row.name}><td><Link to={featurePath('transactions') + '?' + new URLSearchParams({ category: row.name, type: incomeView ? 'Income' : 'Expense', from: month + '-01', to: lastDay, ...(method ? { method } : {}) })}>{row.name}</Link></td><td>{formatMoney(row.value)}</td><td>{total > 0 ? Math.round(row.value / total * 100) : 0}%</td></tr>)}</tbody></table>
        </> : <EmptyState icon="DollarSign" title={incomeView ? 'No income data' : 'No spending data'} description="Record transactions or change the period and filters to see a breakdown." />}
      </section>
      <section className="glass-card"><div className="finance-card-heading"><h2>{incomeView ? 'Income by source' : 'Spending by category'}</h2></div>
        {breakdown.length ? <div className="finance-chart"><ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 300, height: 300 }}><BarChart data={breakdown.slice(0, 8)}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tickFormatter={value => formatMoney(Number(value))} tick={{ fontSize: 10 }} /><Tooltip formatter={value => formatMoney(Number(value))} contentStyle={tooltipStyle} /><Bar dataKey="value" isAnimationActive={false}>{breakdown.slice(0, 8).map((row, index) => <Cell key={row.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer></div> : <p className="finance-note">No matching records to chart.</p>}
        <p className="finance-note">The chart shows the eight largest categories; the table contains every matching category. No currency conversion is applied.</p>
      </section>
    </div>}
  </>;
}
