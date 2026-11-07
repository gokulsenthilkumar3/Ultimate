import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Field } from '../native/ModuleUI';
import MemberPicker from './MemberPicker';
const TYPES = ['photo','birth_certificate','marriage_certificate','passport','property_deed','other'];
export default function FamilyUploadFields({ account, treeId, people, photo = false, person = null }) {
  const input = useRef(null), [file,setFile] = useState(null), [error,setError] = useState('');
  const validate = selected => {
    const message = selected?.size > 10 * 1024 * 1024 ? 'Choose a file smaller than 10 MB.' : '';
    input.current?.setCustomValidity(message); setFile(selected); setError(message);
  };
  return <>
    <label className="family-dropzone" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (event.dataTransfer.files.length !== 1) { setError('Drop one file at a time.'); return; } input.current.files = event.dataTransfer.files; validate(event.dataTransfer.files[0]); }}>
      <Upload size={24} aria-hidden="true" /><strong>{file ? file.name : 'Drop a file here, or choose a file'}</strong><span>Up to 10 MB · review details before saving</span>
      <input ref={input} type="file" name="file" aria-label="File · up to 10 MB" accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.doc,.docx" required onChange={event => validate(event.target.files[0])} />
    </label>
    {error && <p role="alert" className="native-form-error">{error}</p>}
    <Field label="Document type"><select name="type" defaultValue={photo ? 'photo' : 'other'}>{TYPES.map(type => <option key={type} value={type}>{type.replaceAll('_',' ')}</option>)}</select></Field>
    <MemberPicker name="memberId" label="Person (optional)" account={account} treeId={treeId} initial={people} defaultPerson={person} emptyLabel="Entire family" />
    <p className="family-inline-help">Tree-level access: everyone authorized for this tree can read this file. Document-specific sharing and file encryption are not yet available.</p>
  </>;
}
