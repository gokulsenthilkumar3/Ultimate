import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Transaction } from '../../schemas';
import type { FinanceUser, MoneyFormatter, Subscription } from '../../utils/financeModel';
import { financeAmount, financeError, financeMinor, validFinanceDate } from '../../utils/financeModel';
import { formatDate } from '../../utils/userFormatters';
import EmptyState from '../ui/EmptyState';

interface Props {
  subs: Subscription[]; transactions: Transaction[]; today: string; user: FinanceUser; currencySymbol: string; formatMoney: MoneyFormatter;
  onSave: (subscription: Omit<Subscription, 'id'> & { id?: string }, editing?: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}
const blank = { name: '', cost: '', category: 'OTT', next_date: '', icon: '🍿', auto_renew: 1, cycle: 'monthly' as const };
type SubForm = Omit<typeof blank, 'cycle'> & { cycle: 'monthly' | 'yearly' };
export default function SubscriptionsTab({ subs, transactions, today, user, currencySymbol, formatMoney, onSave, onDelete }: Props) {
  const [params, setParams] = useSearchParams();
  const requested = params.get('view');
  const view = requested && ['active', 'upcoming', 'archived'].includes(requested) ? requested : 'active';
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [form, setForm] = useState<SubForm>(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<{ row: Subscription; action: 'archive' | 'delete' } | null>(null);
  const pending = useRef(false);
  const draftId = useRef(crypto.randomUUID());
  const visible = subs.filter(row => view === 'archived' ? row.active === 0 : view === 'upcoming' ? row.active !== 0 && Boolean(row.next_date || row.nextDate) : row.active !== 0).sort((a, b) => (a.next_date || a.nextDate || '9999').localeCompare(b.next_date || b.nextDate || '9999'));
  const suggestions = useMemo(() => {
    const groups = new Map<string, Transaction[]>();
    for (const row of transactions.filter(tx => tx.type === 'Expense')) {
      const key = (row.note || row.category).trim().toLowerCase();
      if (key) groups.set(key, [...(groups.get(key) || []), row]);
    }
    return [...groups].flatMap(([key, rows]) => {
      const dates = [...new Set(rows.map(row => row.date))].sort();
      const cost = Math.round(rows.reduce((sum, row) => sum + financeMinor(row.amount), 0) / rows.length) / 100;
      const span = dates.length > 1 ? (Date.parse(dates.at(-1) + 'T12:00:00Z') - Date.parse(dates[0] + 'T12:00:00Z')) / 86400000 : 0;
      return rows.length >= 2 && span >= 21 && !subs.some(row => row.name.toLowerCase() === key) && cost > 0 && rows.every(row => Math.abs(financeMinor(row.amount) - financeMinor(cost)) / financeMinor(cost) <= 0.2) ? [{ name: rows[0].note || rows[0].category, cost, category: rows[0].category, occurrences: dates.length }] : [];
    }).slice(0, 6);
  }, [subs, transactions]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    setError('');
    try {
      if (!form.name.trim()) throw new Error('Enter a subscription name.');
      const cost = financeAmount(form.cost);
      if (form.next_date && !validFinanceDate(form.next_date)) throw new Error('Enter a valid renewal date.');
      pending.current = true; setSaving(true);
      await onSave({ ...(editing || {}), ...form, id: editing?.id || draftId.current, name: form.name.trim(), cost, active: editing?.active ?? 1 }, Boolean(editing));
      draftId.current = crypto.randomUUID();
      setShowEditor(false); setEditing(null); setForm(blank);
    } catch (failure) { setError(financeError(failure) + ' Your subscription entries are still available.'); }
    finally { pending.current = false; setSaving(false); }
  }
  async function confirm() {
    if (!confirmation || pending.current) return;
    pending.current = true; setSaving(true); setError('');
    try {
      if (confirmation.action === 'delete') await onDelete(confirmation.row.id);
      else await onSave({ ...confirmation.row, active: 0, auto_renew: 0, cancelled_date: today });
      setConfirmation(null);
    } catch (failure) { setError(financeError(failure)); }
    finally { pending.current = false; setSaving(false); }
  }
  return <>
    <div className="finance-controls"><label className="finance-field">Subscription view<select className="form-input" value={view} disabled={saving} onChange={event => { const next = new URLSearchParams(params); next.set('view', event.target.value); setParams(next); }}><option value="active">Active</option><option value="upcoming">Upcoming renewals</option><option value="archived">Archived</option></select></label><button type="button" className="btn-primary" disabled={saving} onClick={() => { setEditing(null); setForm(blank); setShowEditor(true); setError(''); }}>Add subscription</button></div>
    {error && <p role="alert" className="finance-error">{error}</p>}
    {showEditor && <section className="glass-card"><div className="finance-card-heading"><h2>{editing ? 'Edit subscription' : 'New subscription'}</h2><button type="button" className="btn-sm" disabled={saving} onClick={() => setShowEditor(false)}>Cancel</button></div>
      <form onSubmit={submit}><fieldset disabled={saving} style={{ border: 0, margin: 0, padding: 0 }}><div className="finance-fields">
        <label>Name<input className="form-input" required maxLength={120} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
        <label>Cost ({currencySymbol})<input className="form-input" required type="number" min="0.01" step="0.01" value={form.cost} onChange={event => setForm({ ...form, cost: event.target.value })} /></label>
        <label>Billing cycle<select className="form-input" value={form.cycle} onChange={event => setForm({ ...form, cycle: event.target.value === 'yearly' ? 'yearly' : 'monthly' })}><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></label>
        <label>Category<input className="form-input" value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} /></label>
        <label>Next bill date<input className="form-input" type="date" value={form.next_date} onChange={event => setForm({ ...form, next_date: event.target.value })} /></label>
        <label>Icon<input className="form-input" maxLength={8} value={form.icon} onChange={event => setForm({ ...form, icon: event.target.value })} /></label>
        <label><span>Auto renew</span><input type="checkbox" checked={Boolean(form.auto_renew)} onChange={event => setForm({ ...form, auto_renew: event.target.checked ? 1 : 0 })} /></label>
      </div><button type="submit" className="btn-primary mt-sm">{saving ? 'Saving…' : 'Save subscription'}</button></fieldset></form>
    </section>}
    {confirmation && <div role="group" aria-label="Confirm subscription change" className="finance-error"><p>{confirmation.action === 'archive' ? 'Mark ' + confirmation.row.name + ' cancelled and archive it? This records cancellation in GrowthTrack; contact the provider to cancel billing.' : 'Delete ' + confirmation.row.name + '?'}</p><button type="button" className="btn-sm" disabled={saving} onClick={() => void confirm()}>{saving ? 'Saving…' : 'Confirm ' + confirmation.action}</button> <button type="button" className="btn-sm" disabled={saving} onClick={() => setConfirmation(null)}>Cancel change</button></div>}
    {view !== 'archived' && <section className="subscription-detection"><strong>Recurring-payment suggestions</strong><p className="finance-note">Similar expenses on distinct dates at least three weeks apart. Review the billing cycle and renewal date before saving.</p>
      {suggestions.length ? <div className="subscription-suggestions">{suggestions.map(suggestion => <article key={suggestion.name}><span><strong>{suggestion.name}</strong><small>{suggestion.occurrences} dates · about {formatMoney(suggestion.cost)}</small></span><button type="button" disabled={saving} onClick={() => { setEditing(null); setForm({ ...blank, name: suggestion.name, cost: String(suggestion.cost), category: suggestion.category }); setShowEditor(true); }}>Review suggestion</button></article>)}</div> : <p className="finance-note">No recurring pattern detected from available records.</p>}
    </section>}
    {!visible.length ? <EmptyState icon="DollarSign" title="No subscriptions in this view" description="Add a subscription and its next renewal date to track upcoming bills." /> : <div className="finance-card-grid">{visible.map(row => {
      const minor = financeMinor(row.cost), yearly = row.cycle === 'yearly';
      const monthly = (yearly ? Math.round(minor / 12) : minor) / 100;
      const annual = (yearly ? minor : minor * 12) / 100;
      const date = row.next_date || row.nextDate || '';
      return <article key={row.id} className="glass-card"><div className="finance-card-heading"><h2>{row.name}</h2><strong>{formatMoney(row.cost)} / {yearly ? 'year' : 'month'}</strong></div><p className="finance-note">{row.category || 'Other'} · {formatMoney(monthly)} monthly equivalent · {formatMoney(annual)} yearly equivalent</p>
        {!row.cycle && <p className="finance-note">Billing cycle is not recorded; equivalents assume monthly. Edit to confirm.</p>}
        <p>{date ? 'Next bill: ' + formatDate(date, user) : 'Renewal date not set'}{row.active !== 0 && date && date <= today ? ' · Due for review' : ''}</p><p className="finance-note">{row.active === 0 ? 'Archived' + (row.cancelled_date ? ' · Cancelled ' + formatDate(row.cancelled_date, user) : '') : row.auto_renew ? 'Auto renew recorded' : 'Manual renewal recorded'}</p>
        <div className="finance-controls"><button type="button" className="btn-sm" disabled={saving} onClick={() => { setEditing(row); setForm({ name: row.name, cost: String(row.cost), category: row.category || 'Other', next_date: date, icon: row.icon || '🍿', auto_renew: row.auto_renew ?? 1, cycle: row.cycle || 'monthly' }); setShowEditor(true); setError(''); }}>Edit {row.name}</button>{row.active !== 0 && <button type="button" className="btn-sm" disabled={saving} onClick={() => setConfirmation({ row, action: 'archive' })}>Record cancellation</button>}<button type="button" className="btn-sm" disabled={saving} onClick={() => setConfirmation({ row, action: 'delete' })}>Delete {row.name}</button></div>
      </article>;
    })}</div>}
  </>;
}
