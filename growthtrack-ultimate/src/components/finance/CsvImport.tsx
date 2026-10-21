import { useRef, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { financeError } from '../../utils/financeModel';
import type { MoneyFormatter } from '../../utils/financeModel';
import { IMPORT_FIELDS, MAX_FINANCE_CSV_BYTES, commitFinanceCsv, mappedFinanceCsv, previewFinanceCsv, readFinanceCsv, suggestFinanceMapping } from '../../utils/financeImport';
import type { CsvSource, FinanceCommit, FinancePreview, ImportMapping } from '../../utils/financeImport';
import { refreshFinanceTransactions } from '../../utils/financeApi';

export default function CsvImport({ formatMoney }: { formatMoney: MoneyFormatter }) {
  const toast = useToast();
  const [source, setSource] = useState<CsvSource | null>(null);
  const [filename, setFilename] = useState('');
  const [mapping, setMapping] = useState<ImportMapping>({ amount: '', type: '', category: '', method: '', date: '', note: '' });
  const [preview, setPreview] = useState<FinancePreview | null>(null);
  const [result, setResult] = useState<FinanceCommit | null>(null);
  const [confirmation, setConfirmation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [refreshError, setRefreshError] = useState('');
  const [page, setPage] = useState(1);
  const pending = useRef(false);

  async function choose(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget, file = input.files?.[0];
    input.value = '';
    if (!file || pending.current) return;
    setError(''); setPreview(null); setResult(null); setConfirmation(false); setSource(null); setRefreshError('');
    try {
      if (!file.name.toLowerCase().endsWith('.csv')) throw new Error('Choose a .csv file.');
      if (file.size === 0 || file.size > MAX_FINANCE_CSV_BYTES) throw new Error('CSV must be between 1 byte and 2 MB.');
      pending.current = true; setBusy(true);
      const parsed = readFinanceCsv(await file.text());
      setSource(parsed); setFilename(file.name); setMapping(suggestFinanceMapping(parsed.headers));
    } catch (failure) { setError(financeError(failure)); }
    finally { pending.current = false; setBusy(false); }
  }
  async function requestPreview() {
    if (!source || pending.current) return;
    setError(''); setPreview(null); setResult(null); setConfirmation(false); setPage(1);
    try {
      const content = mappedFinanceCsv(source, mapping);
      if (new TextEncoder().encode(content).length > MAX_FINANCE_CSV_BYTES) throw new Error('Mapped CSV exceeds 2 MB. Choose a smaller statement.');
      pending.current = true; setBusy(true);
      setPreview(await previewFinanceCsv(content));
    } catch (failure) { setError(financeError(failure)); }
    finally { pending.current = false; setBusy(false); }
  }
  async function refresh() {
    setRefreshError('');
    try { await refreshFinanceTransactions(); }
    catch { setRefreshError('Import was acknowledged, but the ledger could not be refreshed. Retry loading the ledger.'); }
  }
  async function commit() {
    if (!preview?.canCommit || !preview.previewId || !confirmation || pending.current || result) return;
    pending.current = true; setBusy(true); setError('');
    try {
      const acknowledged = await commitFinanceCsv(preview.previewId);
      setResult(acknowledged); setConfirmation(false);
      toast.success(acknowledged.imported + ' transactions imported; ' + acknowledged.duplicates + ' duplicates skipped.');
      await refresh();
    } catch (failure) { setError(financeError(failure) + ' Retry this preview to reconcile an interrupted acknowledgment, or preview again if it expired.'); }
    finally { pending.current = false; setBusy(false); }
  }
  const rows = preview?.rows.slice((page - 1) * 25, page * 25) || [];
  const pageCount = Math.max(1, Math.ceil((preview?.rows.length || 0) / 25));
  return <section className="glass-card" aria-label="CSV statement import">
    <div className="finance-card-heading"><h2>Import a CSV statement</h2></div><p className="finance-note">CSV up to 2 MB and 5,000 rows. Map columns, review errors and duplicates, then confirm import. Dates must be YYYY-MM-DD; type must be Income, Expense, or Investment. Amounts are positive.</p>
    <label className="finance-field">CSV statement<input type="file" accept=".csv,text/csv" disabled={busy} onChange={event => void choose(event)} /></label>
    {error && <p role="alert" className="finance-error">{error}</p>}
    {busy && <p role="status">Waiting for the statement operation to finish…</p>}
    {source && <>
      <p>{filename} · {source.rows.length} source rows</p>
      <fieldset disabled={busy || Boolean(result)} style={{ border: 0, padding: 0, margin: 0 }}><legend>Map statement columns</legend><div className="finance-fields">{IMPORT_FIELDS.map(field => <label key={field}>{field}<select className="form-input" value={mapping[field]} onChange={event => { setMapping({ ...mapping, [field]: event.target.value }); setPreview(null); setConfirmation(false); }}><option value="">{['amount', 'type', 'date'].includes(field) ? 'Select required column' : 'Not mapped'}</option>{source.headers.map((header, index) => <option key={index} value={index}>{header || 'Unnamed column'} (column {index + 1})</option>)}</select></label>)}</div><button className="btn-primary mt-sm" type="button" onClick={() => void requestPreview()}>Preview mapped rows</button></fieldset>
      <details className="finance-chart-table"><summary>View source sample</summary><div className="finance-table-scroll"><table className="finance-record-table"><thead><tr>{source.headers.map((header, index) => <th key={index}>{header || 'Column ' + (index + 1)}</th>)}</tr></thead><tbody>{source.rows.slice(0, 3).map((row, index) => <tr key={index}>{row.map((cell, column) => <td key={column}>{cell}</td>)}</tr>)}</tbody></table></div></details>
    </>}
    {preview && <>
      <p role="status">{preview.summary.importable} new rows · {preview.summary.duplicates} duplicates · {preview.summary.invalid} invalid rows</p>
      {preview.summary.invalid > 0 && <p className="finance-error">Correct all invalid rows in the source file, choose it again, and preview before committing.</p>}
      <p className="finance-note">Duplicates match all transaction fields and will be skipped. Review the full statement. {preview.expiresAt ? 'Preview expires ' + new Date(preview.expiresAt).toLocaleString() + '.' : 'A new preview is needed after correcting invalid rows.'}</p>
      <div className="finance-table-scroll" tabIndex={0} role="region" aria-label="Import preview rows"><table className="finance-record-table"><caption>Server-validated rows · page {page} of {pageCount}</caption><thead><tr><th>Row</th><th>Status</th><th>Date</th><th>Type</th><th>Category</th><th>Amount</th><th>Description / errors</th></tr></thead><tbody>{rows.map(row => <tr key={row.row}><th scope="row">{row.row}</th><td>{row.status === 'duplicate' ? 'Duplicate · skip' : row.status}</td><td>{row.transaction.date}</td><td>{row.transaction.type}</td><td>{row.transaction.category || 'Other'}</td><td>{row.transaction.amount === null ? 'Invalid amount' : formatMoney(row.transaction.amount)}</td><td>{row.transaction.note}{row.errors.map((issue, index) => <p key={index} className="finance-text-expense">{issue.field}: {issue.message}</p>)}</td></tr>)}</tbody></table></div>
      <div className="finance-pagination"><button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous preview page</button><span>Page {page} of {pageCount}</span><button type="button" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>Next preview page</button></div>
      {preview.canCommit && !result && <div className="finance-controls"><label><input type="checkbox" disabled={busy} checked={confirmation} onChange={event => setConfirmation(event.target.checked)} /> I reviewed the rows and duplicates. Import the {preview.summary.importable} new transactions.</label><button type="button" className="btn-primary" disabled={busy || !confirmation || preview.summary.importable === 0} onClick={() => void commit()}>Confirm import</button></div>}
    </>}
    {result && <p role="status">Import acknowledged: {result.imported} imported, {result.duplicates} duplicates skipped{result.replayed ? ' · previous commit reconciled' : ''}.</p>}
    {refreshError && <div role="alert" className="finance-error"><p>{refreshError}</p><button type="button" className="btn-sm" disabled={busy} onClick={() => void refresh()}>Refresh ledger</button></div>}
  </section>;
}
