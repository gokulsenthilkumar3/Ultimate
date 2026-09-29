import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Transaction } from '../../schemas';
import type { FinanceBudget as Budget } from '../../utils/financeModel';
import type { MoneyFormatter } from '../../utils/financeModel';
import { CATEGORIES, financeAmount, financeBreakdown, financeBudget, financeError, totalMoney } from '../../utils/financeModel';
import EmptyState from '../ui/EmptyState';

interface Props {
  budgets: Budget[]; transactions: Transaction[]; month: string; currencySymbol: string; formatMoney: MoneyFormatter;
  onSave: (budget: Budget, editing: boolean) => Promise<void>; onDelete: (id: string) => Promise<void>;
}
export default function BudgetingTab({ budgets, transactions, month, currencySymbol, formatMoney, onSave, onDelete }: Props) {
  const [params, setParams] = useSearchParams();
  const history = params.get('view') === 'history';
  const [editing, setEditing] = useState<Budget | null>(null);
  const [form, setForm] = useState({ category: '', limit: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const draftId = useRef(crypto.randomUUID());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const visible = budgets.filter(row => history ? Boolean(row.month && row.month !== month) : !row.month || row.month === month);
  const expenseRows = transactions.filter(row => row.type === 'Expense' && row.date.startsWith(month + '-'));
  const breakdown = financeBreakdown(expenseRows, 'category');
  const totalLimits = totalMoney(visible.map(row => row.limit_amount));
  const budgetedSpend = totalMoney(expenseRows.filter(row => visible.some(budget => budget.category === row.category && (!budget.month || budget.month === month))).map(row => row.amount));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    setError('');
    try {
      if (!form.category) throw new Error('Select a category.');
      if (visible.some(row => row.category === form.category && row.id !== editing?.id)) throw new Error('This category already has a budget for this month. Edit it instead.');
      const limit_amount = financeAmount(form.limit, true);
      pending.current = true;
      setSaving(true);
      await onSave({ id: editing?.id || draftId.current, category: form.category, limit_amount, month: editing?.month || month, ...(editing?.updatedAt ? { updatedAt: editing.updatedAt } : {}) }, Boolean(editing));
      setForm({ category: '', limit: '' });
      setEditing(null);
      draftId.current = crypto.randomUUID();
    } catch (failure) { setError(financeError(failure) + ' Your budget entries are still available.'); }
    finally { pending.current = false; setSaving(false); }
  }
  async function remove() {
    if (!confirmDelete || pending.current) return;
    pending.current = true;
    setSaving(true);
    setError('');
    try { await onDelete(confirmDelete); setConfirmDelete(null); }
    catch (failure) { setError(financeError(failure)); }
    finally { pending.current = false; setSaving(false); }
  }
  return <>
    <div className="finance-controls"><label className="finance-field">Budget view<select className="form-input" value={history ? 'history' : 'current'} disabled={saving} onChange={event => { const next = new URLSearchParams(params); next.set('view', event.target.value); setParams(next); setEditing(null); setForm({ category: '', limit: '' }); }}><option value="current">Current budgets</option><option value="history">Budget history</option></select></label></div>
    {!history && <section className="glass-card"><div className="finance-card-heading"><h2>{editing ? 'Edit budget' : 'Create a category budget'}</h2></div><p className="finance-note">Limits apply to {month}. A zero limit allows no spending in that category.</p>
      <form onSubmit={submit}><fieldset disabled={saving} style={{ border: 0, margin: 0, padding: 0 }}><div className="finance-fields">
        <label>Budget category<select className="form-input" required value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}><option value="">Select category</option>{[...new Set([...CATEGORIES, ...budgets.map(row => row.category), ...transactions.map(row => row.category)])].map(category => <option key={category}>{category}</option>)}</select></label>
        <label>Limit ({currencySymbol})<input className="form-input" type="number" min="0" step="0.01" required value={form.limit} onChange={event => setForm({ ...form, limit: event.target.value })} /></label>
      </div><div className="finance-controls mt-sm"><button type="submit" className="btn-primary">{saving ? 'Saving…' : editing ? 'Save budget changes' : 'Add budget'}</button>{editing && <button className="btn-sm" type="button" onClick={() => { setEditing(null); setForm({ category: '', limit: '' }); }}>Cancel edit</button>}</div></fieldset></form>
    </section>}
    {error && <p role="alert" className="finance-error">{error}</p>}
    {confirmDelete && <div role="group" aria-label="Confirm budget deletion" className="finance-error"><p>Delete this category budget?</p><button type="button" className="btn-sm" disabled={saving} onClick={() => void remove()}>{saving ? 'Deleting…' : 'Confirm delete budget'}</button> <button type="button" className="btn-sm" disabled={saving} onClick={() => setConfirmDelete(null)}>Cancel deletion</button></div>}
    <section className="glass-card"><div className="finance-card-heading"><h2>{history ? 'Budget history' : 'Category budgets'}</h2></div>
      {!history && <dl className="finance-summary"><div><dt>Defined limits</dt><dd>{formatMoney(totalLimits)}</dd></div><div><dt>Spending in budgeted categories</dt><dd>{formatMoney(budgetedSpend)}</dd></div><div><dt>Remaining in budgeted categories</dt><dd>{formatMoney(financeBudget(budgetedSpend, totalLimits).remaining)}</dd></div></dl>}
      {!visible.length ? <EmptyState icon="DollarSign" title="No budgets found" description={history ? 'Budgets from other months will appear here.' : 'Choose a category and limit to start tracking.'} /> : visible.map(row => {
        const actual = history ? totalMoney(transactions.filter(tx => tx.type === 'Expense' && tx.category === row.category && tx.date.startsWith((row.month || month) + '-')).map(tx => tx.amount)) : breakdown.find(item => item.name === row.category)?.value || 0;
        const status = financeBudget(actual, row.limit_amount);
        return <article key={row.id} className="finance-budget-row"><div className="finance-budget-header"><strong>{row.category}{history ? ' · ' + row.month : ''}</strong><span>{formatMoney(actual)} / {formatMoney(row.limit_amount)}</span></div>
          <div className="finance-budget-bar-container" role="progressbar" aria-label={row.category + ' budget used'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(status.bar)} aria-valuetext={status.zero ? actual > 0 ? 'Zero budget exceeded' : 'Zero budget, no spending' : Math.round(status.pct) + '% used'}><div className={'finance-budget-bar ' + (status.over ? 'finance-budget-bar-danger' : status.near ? 'finance-budget-bar-warning' : 'finance-budget-bar-success')} style={{ width: status.bar + '%' }} /></div>
          <p className={status.over ? 'finance-text-expense' : 'finance-note'}>{status.zero ? 'Zero limit · ' : ''}{status.over ? formatMoney(-status.remaining) + ' over budget' : formatMoney(status.remaining) + ' remaining'}</p>
          <div className="finance-controls">{!history && <button type="button" className="btn-sm" disabled={saving} onClick={() => { setEditing(row); setForm({ category: row.category, limit: String(row.limit_amount) }); setError(''); }}>Edit {row.category} budget</button>}<button type="button" className="btn-sm" disabled={saving} onClick={() => setConfirmDelete(row.id)}>Delete {row.category} budget</button></div>
        </article>;
      })}
    </section>
  </>;
}
