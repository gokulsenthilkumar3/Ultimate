import React, { useId, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Download, Upload } from 'lucide-react';
import { Card } from '../native/ModuleUI';
import { familyRequest } from './familyClient';
import { decodeGedcom, MAX_GEDCOM_BYTES, saveText } from './gedcomFile';

const human = value => value.replaceAll('_', ' ');
// One key per review: pressing Import again after a timeout or a refusal asks the server for the same result instead of importing twice.
const newKey = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `k${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, '');
const plural = (count, one, many = `${one}s`) => `${count.toLocaleString('en')} ${count === 1 ? one : many}`;

/** Open-standard GEDCOM 5.5.1 exchange with Gramps, FamilySearch, MyHeritage and similar tools. Files go only to the user's own Family service. */
export default function FamilyInterchange({ account, treeId, edit }) {
  const client = useQueryClient(), input = useRef(null), headingId = useId();
  const [busy, setBusy] = useState(''), [status, setStatus] = useState(''), [error, setError] = useState(''), [review, setReview] = useState(null), [allow, setAllow] = useState(false);
  const base = `/trees/${encodeURIComponent(treeId)}`;

  async function exportFile() {
    setBusy('export'); setStatus(''); setError('');
    try {
      const result = await familyRequest(`${base}/export/gedcom`, { connection: account });
      saveText(result.filename, result.gedcom, result.mediaType);
      const { mixed_pedigree: mixed = 0, ...omitted } = result.summary.omitted || {};
      const left = Object.entries(omitted), skipped = left.reduce((total, [, count]) => total + count, 0);
      setStatus(`Exported ${plural(result.summary.people, 'person', 'people')} as GEDCOM.${skipped ? ` ${plural(skipped, 'connection')} that GEDCOM cannot express (${left.map(([type, count]) => `${human(type)} ${count}`).join(', ')}) ${skipped === 1 ? 'was' : 'were'} left out.` : ''}${mixed ? ` ${plural(mixed, 'child', 'children')} had parents with different adoption status; GEDCOM records that per child, so it was not exported.` : ''}`);
    } catch (failure) { setError(failure.message); } finally { setBusy(''); }
  }

  async function chooseFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setStatus(''); setError(''); setReview(null); setAllow(false);
    if (!/\.(ged|gedcom)$/i.test(file.name) || file.size > MAX_GEDCOM_BYTES) { setError('Choose a .ged file up to 1 MB. Remove embedded photos in the other app first.'); return; }
    setBusy('preview');
    try {
      const text = decodeGedcom(await file.arrayBuffer());
      const data = await familyRequest(`${base}/import/gedcom/preview`, { connection: account, method: 'POST', body: { text } });
      setReview({ name: file.name, text, data, key: newKey() });
    } catch (failure) { setError(failure.message); } finally { setBusy(''); }
  }

  async function importFile() {
    if (!review || busy) return;
    setBusy('import'); setError('');
    try {
      const result = await familyRequest(`${base}/import/gedcom`, { connection: account, method: 'POST', body: { text: review.text, idempotencyKey: review.key, ...(allow ? { allowDuplicates: true } : {}) } });
      setReview(null); setAllow(false);
      setStatus(`${result.replayed ? 'This import had already finished, so nothing was added twice. ' : ''}Imported ${plural(result.imported.people, 'person', 'people')} and ${plural(result.imported.relationships, 'connection')}.${result.warningCount ? ` ${plural(result.warningCount, 'note')} to review.` : ''} Existing people were not changed.`);
      await client.invalidateQueries({ queryKey: ['native-family', account.owner, account.user.id] });
    } catch (failure) { setError(failure.message); } finally { setBusy(''); }
  }

  const data = review?.data, duplicates = data?.duplicates?.count || 0, ignored = Object.entries(data?.ignored || {});
  return <Card title="Share and back up" description="Move people between Family Connect and other genealogy apps using the open GEDCOM format.">
    <div className="native-card__body" role="region" aria-labelledby={headingId}>
      <h3 id={headingId} className="family-inline-help">GEDCOM 5.5.1 · stays between your browser and your Family service</h3>
      <div className="native-actions">
        <button type="button" className="native-button native-button--quiet" onClick={exportFile} disabled={Boolean(busy)}><Download size={16} />{busy === 'export' ? 'Preparing…' : 'Export GEDCOM'}</button>
        {edit && <button type="button" className="native-button native-button--quiet" onClick={() => input.current?.click()} disabled={Boolean(busy)}><Upload size={16} />{busy === 'preview' ? 'Reviewing…' : 'Import GEDCOM'}</button>}
        <input ref={input} type="file" accept=".ged,.gedcom" aria-label="GEDCOM file · up to 1 MB" hidden onChange={chooseFile} />
      </div>
      {!edit && <p className="family-inline-help family-card-note">Editors and family heads can import. Anyone in this tree can export what they can already read.</p>}
      <p className="family-inline-help family-card-note">Photos and documents are never read from a GEDCOM file. Imports add new people and connections only; existing records are not changed. Day, month-only, year-only and approximate dates keep their certainty; ranges and other calendars are kept as text at the start of the person’s notes.</p>
      <div aria-live="polite">{status && <p className="family-inline-status" role="status">{status}</p>}</div>
      {error && <p className="native-form-error" role="alert">{error}</p>}
      {data && <section aria-label={`Review ${review.name}`}>
        <h3>Review {review.name}</h3>
        {data.errors.length > 0 && <ul className="native-form-error" role="alert">{data.errors.map(message => <li key={message}>{message}</li>)}</ul>}
        <p>Found {plural(data.stats.people, 'person', 'people')} and {plural(data.stats.relationships, 'connection')}{data.sample.length ? <> — starting with {data.sample.slice(0, 5).map(person => person.name).join(', ')}.</> : '.'}</p>
        {data.warningCount > 0 && <details><summary>{plural(data.warningCount, 'note')} to review</summary><ul>{data.warnings.slice(0, 8).map(message => <li key={message}>{message}</li>)}{data.warningCount > 8 && <li>…and {data.warningCount - 8} more.</li>}</ul></details>}
        {ignored.length > 0 && <p className="family-inline-help">Not imported: {ignored.map(([type, count]) => `${type} ×${count}`).join(', ')}.</p>}
        {duplicates > 0 && <>
          <p className="native-form-error" role="alert">{plural(duplicates, 'person looks', 'people look')} like someone already in this tree: {data.duplicates.rows.slice(0, 5).map(row => row.name).join(', ')}{duplicates > 5 ? '…' : ''}</p>
          <label className="family-inline-help"><input type="checkbox" checked={allow} onChange={event => setAllow(event.target.checked)} /> Import them anyway as new people</label>
        </>}
        <div className="native-actions">
          <button type="button" className="native-button" onClick={importFile} disabled={!data.canImport || Boolean(busy) || (duplicates > 0 && !allow)}>{busy === 'import' ? 'Importing…' : `Import ${plural(data.stats.people, 'person', 'people')}`}</button>
          <button type="button" className="native-button native-button--quiet" onClick={() => { setReview(null); setAllow(false); }} disabled={busy === 'import'}>Cancel</button>
        </div>
      </section>}
    </div>
  </Card>;
}
