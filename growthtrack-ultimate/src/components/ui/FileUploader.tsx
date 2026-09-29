import React, { useId, useRef, useState } from 'react';
import FormError from './FormError';

export interface FileUploaderProps {
  label?: string; hint?: string; accept?: string; multiple?: boolean; maxFiles?: number; maxSizeBytes?: number;
  disabled?: boolean; onFilesSelected: (files: File[]) => void | Promise<void>;
}
function accepted(file: File, accept: string) {
  const rules = accept.split(',').map(rule => rule.trim().toLowerCase()).filter(Boolean);
  return !rules.length || rules.some(rule => rule.startsWith('.') ? file.name.toLowerCase().endsWith(rule) : rule.endsWith('/*') ? file.type.toLowerCase().startsWith(rule.slice(0, -1)) : file.type.toLowerCase() === rule);
}
/** Validated local file selection. The caller performs uploads and owns remote status. */
export default function FileUploader({ label = 'Choose files', hint, accept = '', multiple = false, maxFiles = multiple ? 10 : 1, maxSizeBytes = 20 * 1024 * 1024, disabled = false, onFilesSelected }: FileUploaderProps) {
  const id = useId();
  const [selected, setSelected] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const choose = async (files: File[]) => {
    if (disabled || busy.current || !files.length) return;
    let validation = '';
    if (files.length > maxFiles || (!multiple && files.length > 1)) validation = `Choose at most ${multiple ? maxFiles : 1} file${multiple && maxFiles !== 1 ? 's' : ''}.`;
    else if (files.some(file => !accepted(file, accept))) validation = `Choose a supported file type: ${accept}.`;
    else if (files.some(file => file.size > maxSizeBytes)) validation = `Each file must be ${Math.ceil(maxSizeBytes / 1024)} KB or smaller.`;
    setError(validation);
    if (validation) return;
    busy.current = true; setPending(true);
    try { await onFilesSelected(files); setSelected(files); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'These files could not be processed. Try again.'); }
    finally { busy.current = false; setPending(false); }
  };
  return <section className="gt-file-uploader" data-responsive-foundation aria-busy={pending}
    onDragOver={event => { event.preventDefault(); }} onDrop={event => { event.preventDefault(); void choose(Array.from(event.dataTransfer.files)); }}>
    <label htmlFor={id}>{label}</label>
    <p id={`${id}-hint`}>{hint || 'Select files or drop them here.'} {Math.ceil(maxSizeBytes / 1024)} KB maximum per file.</p>
    <input id={id} type="file" accept={accept || undefined} multiple={multiple} disabled={disabled || pending} aria-invalid={Boolean(error)}
      aria-describedby={[`${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ')} onChange={event => { const files = Array.from(event.target.files || []); event.target.value = ''; void choose(files); }} />
    <FormError id={`${id}-error`}>{error}</FormError>
    <div role="status" aria-live="polite">{pending ? 'Processing selected files…' : selected.length ? `${selected.length} file${selected.length === 1 ? '' : 's'} selected` : 'No files selected'}</div>
    {selected.length > 0 && <ul>{selected.map((file, index) => <li key={`${file.name}-${index}`}>{file.name}</li>)}</ul>}
  </section>;
}
