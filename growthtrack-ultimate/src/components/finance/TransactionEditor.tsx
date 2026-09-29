import { useRef, useState } from 'react';
import type { FinanceTransaction as Transaction } from '../../utils/financeModel';
import type { MoneyFormatter } from '../../utils/financeModel';
import { CATEGORIES, PAYMENT_METHODS, financeAmount, financeError, validFinanceDate } from '../../utils/financeModel';

interface Props {
  today: string;
  currencySymbol: string;
  formatMoney: MoneyFormatter;
  transaction?: Transaction;
  categories?: string[];
  methods?: string[];
  onSave: (transaction: Transaction, editing: boolean) => Promise<void>;
  onSaved?: () => void;
  onCancel?: () => void;
}

export default function TransactionEditor({ today, currencySymbol, transaction, categories = CATEGORIES, methods = PAYMENT_METHODS, onSave, onSaved, onCancel }: Props) {
  const [form, setForm] = useState({ type: transaction?.type || 'Expense', category: transaction?.category || '', method: transaction?.method || PAYMENT_METHODS[2], date: transaction?.date || today, amount: transaction ? String(transaction.amount) : '', note: transaction?.note || '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  // Retain a create ID for retries after an interrupted acknowledgment.
  const draftId = useRef(transaction?.id || crypto.randomUUID());
  const categoryOptions = [...new Set([...CATEGORIES, ...categories, form.category].filter(Boolean))];
  const methodOptions = [...new Set([...PAYMENT_METHODS, ...methods, form.method].filter(Boolean))];

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    setError('');
    try {
      if (!form.category.trim()) throw new Error('Select a category.');
      if (!form.method.trim()) throw new Error('Select a payment method.');
      if (!validFinanceDate(form.date)) throw new Error('Enter a valid date.');
      const amount = financeAmount(form.amount);
      pending.current = true;
      setSaving(true);
      await onSave({ ...form, id: draftId.current, amount, ...(transaction?.updatedAt ? { updatedAt: transaction.updatedAt } : {}) }, Boolean(transaction));
      if (!transaction) {
        setForm({ type: 'Expense', category: '', method: PAYMENT_METHODS[2], date: today, amount: '', note: '' });
        draftId.current = crypto.randomUUID();
      }
      onSaved?.();
    } catch (failure) {
      setError(`${financeError(failure)} Your entries are still available.`);
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  return <section className="glass-card" aria-label={transaction ? 'Edit transaction' : 'New transaction'}>
    <div className="finance-card-heading"><h2>{transaction ? 'Edit transaction' : 'New transaction'}</h2>{onCancel && <button type="button" className="btn-sm" disabled={saving} onClick={onCancel}>Cancel</button>}</div>
    <form onSubmit={submit}>
      <fieldset disabled={saving} style={{ border: 0, padding: 0, margin: 0 }}>
        <div className="finance-fields">
          <label>Type<select className="form-input" value={form.type} onChange={event => setForm({ ...form, type: event.target.value as Transaction['type'] })}>{['Expense', 'Income', 'Investment'].map(type => <option key={type}>{type}</option>)}</select></label>
          <label>Category<select className="form-input" value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}><option value="">Select category</option>{categoryOptions.map(category => <option key={category}>{category}</option>)}</select></label>
          <label>Payment method<select className="form-input" value={form.method} onChange={event => setForm({ ...form, method: event.target.value })}>{methodOptions.map(method => <option key={method}>{method}</option>)}</select></label>
          <label>Date<input className="form-input" type="date" required value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} /></label>
          <label>Amount ({currencySymbol})<input className="form-input" type="number" min="0.01" step="0.01" required value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} /></label>
          <label>Description<input className="form-input" maxLength={1000} value={form.note} onChange={event => setForm({ ...form, note: event.target.value })} /></label>
        </div>
        <button className="btn-primary mt-sm" type="submit">{saving ? 'Saving…' : transaction ? 'Save changes' : 'Add transaction'}</button>
      </fieldset>
      {error && <p role="alert" className="finance-error">{error}</p>}
      {saving && <p role="status" className="finance-note">Waiting for the server to save this transaction.</p>}
    </form>
  </section>;
}
