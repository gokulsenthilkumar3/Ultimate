import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import useDialogFocus from '../hooks/useDialogFocus';
import { previewFile } from '../api/files';
import { Z_INDEX } from '../constants';

export default function FileVaultPreview({ file, onClose }) {
  const dialogRef = useDialogFocus(true, onClose);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    let imageUrl;
    let active = true;
    previewFile(file, controller.signal).then(result => {
      imageUrl = result.url;
      if (active) setPreview(result);
      else if (imageUrl) URL.revokeObjectURL(imageUrl);
    }).catch(failure => { if (active && failure.name !== 'AbortError') setError(failure.message); });
    return () => { active = false; controller.abort(); if (imageUrl) URL.revokeObjectURL(imageUrl); };
  }, [file]);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: Z_INDEX.OVERLAY, background: 'rgba(0,0,0,0.75)', display: 'grid', placeItems: 'center', padding: '1rem' }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={`Preview ${file.name}`} tabIndex={-1} className="glass-card" style={{ maxWidth: '850px', width: '100%', maxHeight: '85vh', overflow: 'auto', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <h3>{file.name}</h3>
          <button type="button" className="btn-icon" aria-label="Close preview" onClick={onClose}><X size={20} /></button>
        </div>
        {error ? <p role="alert">{error}</p> : !preview ? <p role="status">Loading preview…</p> : preview.kind === 'image'
          ? <img src={preview.url} alt={file.name} style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain' }} />
          : <><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{preview.text}</pre>{preview.truncated && <p>Preview shortened to 128 KB. Download for the full file.</p>}</>}
      </div>
    </div>
  );
}
