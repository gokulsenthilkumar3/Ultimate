import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Pencil, Trash2, Download } from 'lucide-react';
import type { FinanceTransaction as Transaction } from '../../utils/financeModel';
import type { FinanceUser, LedgerFilters, LedgerSort, MoneyFormatter } from '../../utils/financeModel';
import { downloadLedger, filterLedger, financeError, financeSummary, sortLedger, validFinanceDate } from '../../utils/financeModel';
import { formatDate } from '../../utils/userFormatters';
import EmptyState from '../ui/EmptyState';
import TransactionEditor from './TransactionEditor';

interface Props {
  transactions: Transaction[];
  today: string;
  user: FinanceUser;
  currencySymbol: string;
  formatMoney: MoneyFormatter;
  onSave: (transaction: Transaction, editing: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}
const SORTS: LedgerSort[] = ['date-desc', 'date-asc', 'amount-desc', 'amount-asc', 'category-asc'];
const SORT_LABELS = ['Newest first', 'Oldest first', 'Highest amount', 'Lowest amount', 'Category A–Z'];

export default function TransactionsTab({ transactions, today, user, currencySymbol, formatMoney, onSave, onDelete }: Props) {
  const [params, setParams] = useSearchParams();
  const view = params.get('view');
  const filters: LedgerFilters = { query: params.get('q') || '', type: params.get('type') || (view === 'income' ? 'Income' : view === 'expenses' ? 'Expense' : ''), category: params.get('category') || '', method: params.get('method') || '', from: params.get('from') || '', to: params.get('to') || '' };
  const rawSort = params.get('sort') as LedgerSort;
  const sort = SORTS.includes(rawSort) ? rawSort : 'date-desc';
  const requestedPage = Math.max(1, Number(params.get('page')) || 1);
  const [editor, setEditor] = useState<Transaction | 'new' | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const categories = useMemo(() => [...new Set(transactions.map(row => row.category))].sort(), [transactions]);
  const methods = useMemo(() => [...new Set(transactions.map(row => row.method).filter((value): value is string => Boolean(value)))].sort(), [transactions]);
  const invalidRange = Boolean(filters.from && filters.to && filters.from > filters.to);
  const invalidDate = Boolean(filters.from && !validFinanceDate(filters.from) || filters.to && !validFinanceDate(filters.to));
  const filtered = invalidRange || invalidDate ? [] : sortLedger(filterLedger(transactions, filters), sort);
  const summary = financeSummary(filtered);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 10));
  const page = Math.min(Math.floor(requestedPage), pageCount);
  const rows = filtered.slice((page - 1) * 10, page * 10);
  const selectedVisible = filtered.filter(row => selected.has(row.id));
  const allPageSelected = rows.length > 0 && rows.every(row => selected.has(row.id));

  function changeFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key === 'type') next.delete('view');
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: key !== 'page' });
    if (key !== 'page') { setSelected(new Set()); setConfirmDelete(null); }
  }
  function toggle(id: string) {
    setSelected(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }
  async function remove() {
    if (!confirmDelete || pending.current) return;
    pending.current = true;
    setDeleting(true);
    setError('');
    const failures: string[] = [];
    // Sequential requests avoid competing optimistic rollback snapshots in the legacy slice.
    for (const id of confirmDelete) {
      try { await onDelete(id); setSelected(previous => { const next = new Set(previous); next.delete(id); return next; }); }
      catch { failures.push(id); }
    }
    setConfirmDelete(failures.length ? failures : null);
    if (failures.length) setError(`${failures.length} transaction${failures.length === 1 ? '' : 's'} could not be deleted. Retry the remaining records.`);
    pending.current = false;
    setDeleting(false);
  }
  function exportFiltered() {
    try { downloadLedger(filtered); } catch (failure) { setError(financeError(failure)); }
  }

  return <>
    <div className="finance-controls">
      <button type="button" className="btn-primary" onClick={() => { setEditor('new'); setError(''); }} disabled={deleting}>New transaction</button>
      <button type="button" className="btn-sm" onClick={exportFiltered} disabled={!filtered.length}><Download size={16} aria-hidden="true" /> Export filtered CSV ({filtered.length})</button>
    </div>
    {editor && <TransactionEditor key={editor === 'new' ? 'new' : editor.id} {...{ today, currencySymbol, formatMoney, categories, methods, onSave }} transaction={editor === 'new' ? undefined : editor} onSaved={() => setEditor(null)} onCancel={() => setEditor(null)} />}
    <section className="glass-card" aria-label="Transaction ledger">
      <fieldset disabled={deleting} style={{ border: 0, margin: 0, padding: 0 }}><div className="finance-controls">
        <label className="finance-field">Search transactions<input type="search" className="form-input" value={filters.query} onChange={event => changeFilter('q', event.target.value)} placeholder="Category, description, method…" /></label>
        <label className="finance-field">Transaction type<select className="form-input" value={filters.type} onChange={event => changeFilter('type', event.target.value)}><option value="">All types</option>{['Income', 'Expense', 'Investment'].map(type => <option key={type}>{type}</option>)}</select></label>
        <label className="finance-field">Filter category<select className="form-input" value={filters.category} onChange={event => changeFilter('category', event.target.value)}><option value="">All categories</option>{[...new Set([...categories, filters.category].filter(Boolean))].map(category => <option key={category}>{category}</option>)}</select></label>
        <label className="finance-field">Filter payment method<select className="form-input" value={filters.method} onChange={event => changeFilter('method', event.target.value)}><option value="">All methods</option>{methods.map(method => <option key={method}>{method}</option>)}</select></label>
        <label className="finance-field">From date<input type="date" className="form-input" value={filters.from} onChange={event => changeFilter('from', event.target.value)} /></label>
        <label className="finance-field">To date<input type="date" className="form-input" value={filters.to} onChange={event => changeFilter('to', event.target.value)} /></label>
        <label className="finance-field">Sort transactions<select className="form-input" value={sort} onChange={event => changeFilter('sort', event.target.value)}>{SORTS.map((value, index) => <option key={value} value={value}>{SORT_LABELS[index]}</option>)}</select></label>
        <button type="button" className="btn-sm" onClick={() => { setParams({}); setSelected(new Set()); setConfirmDelete(null); }}>Clear filters</button>
      </div></fieldset>
      {invalidRange && <p role="alert" className="finance-error">From date must be on or before to date.</p>}
      {invalidDate && <p role="alert" className="finance-error">Date filters must use valid dates in YYYY-MM-DD format. Clear the filters to reset them.</p>}
      <dl className="finance-summary" aria-label="Filtered totals"><div><dt>Income</dt><dd>{formatMoney(summary.income)}</dd></div><div><dt>Expenses</dt><dd>{formatMoney(summary.expenses)}</dd></div><div><dt>Investments</dt><dd>{formatMoney(summary.investments)}</dd></div><div><dt>Balance</dt><dd>{formatMoney(summary.balance)}</dd></div></dl>
      {selectedVisible.length > 0 && <div className="finance-controls"><span>{selectedVisible.length} selected</span><button type="button" className="btn-sm" disabled={deleting} onClick={() => setConfirmDelete(selectedVisible.map(row => row.id))}>Delete selected</button><button type="button" className="btn-sm" disabled={deleting} onClick={() => setSelected(new Set())}>Clear selection</button></div>}
      {confirmDelete && <div role="group" aria-label="Confirm transaction deletion" className="finance-error"><p>Delete {confirmDelete.length} transaction{confirmDelete.length === 1 ? '' : 's'} from the ledger?</p><button type="button" className="btn-sm" disabled={deleting} onClick={() => void remove()}>{deleting ? 'Deleting…' : 'Confirm delete'}</button> <button type="button" className="btn-sm" disabled={deleting} onClick={() => setConfirmDelete(null)}>Cancel deletion</button></div>}
      {error && <p role="alert" className="finance-error">{error}</p>}
      {!filtered.length ? <EmptyState icon="DollarSign" title="No transactions found" description="Add a transaction or change the filters to see existing records." /> : <div className="finance-table-scroll" tabIndex={0} role="region" aria-label="Transactions table"><table className="finance-record-table">
        <caption>{filtered.length} matching transactions · page {page} of {pageCount}</caption>
        <thead><tr><th><input type="checkbox" className="finance-check" aria-label="Select this page" checked={allPageSelected} disabled={deleting} onChange={() => setSelected(previous => { const next = new Set(previous); for (const row of rows) { if (allPageSelected) next.delete(row.id); else next.add(row.id); } return next; })} /></th><th scope="col">Date</th><th scope="col">Transaction</th><th scope="col">Payment method</th><th scope="col">Amount</th><th scope="col">Actions</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.id}><td><input type="checkbox" className="finance-check" aria-label={`Select ${row.note || row.category} ${row.date}`} checked={selected.has(row.id)} disabled={deleting} onChange={() => toggle(row.id)} /></td><td>{formatDate(row.date, user)}</td><td><strong>{row.category}</strong><small>{row.type} · {row.note || 'No description'}</small></td><td>{row.method || 'Unknown'}</td><td className={`finance-money ${row.type === 'Income' ? 'finance-text-income' : 'finance-text-expense'}`}>{row.type === 'Income' ? '+' : '−'}{formatMoney(row.amount)}</td><td><div className="finance-row-actions"><button type="button" className="btn-sm" aria-label={`Edit ${row.note || row.category}`} disabled={deleting} onClick={() => setEditor(row)}><Pencil size={16} /></button><button type="button" className="btn-sm" aria-label={`Delete ${row.note || row.category}`} disabled={deleting} onClick={() => setConfirmDelete([row.id])}><Trash2 size={16} /></button></div></td></tr>)}</tbody>
      </table></div>}
      <div className="finance-pagination" aria-label="Transaction pages"><button type="button" disabled={page <= 1 || deleting} onClick={() => changeFilter('page', String(page - 1))}>Previous</button><span>Page {page} of {pageCount}</span><button type="button" disabled={page >= pageCount || deleting} onClick={() => changeFilter('page', String(page + 1))}>Next</button></div>
    </section>
  </>;
}
