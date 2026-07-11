import { Z_INDEX } from '../constants';
import React, { useState, useRef } from 'react';
import { FileText, Cloud, HardDrive, UploadCloud, Folder, Trash2, Shield, Search, File, X, Lock, Globe } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import ConfirmDialog from './ui/ConfirmDialog';
import useStore, { selectDocuments, selectAddDocument, selectDeleteDocument } from '../store/useStore';

function UploadModal({ onUpload, onClose }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileType, setFileType] = useState('Private');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef();

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) setSelectedFile(f);
  };

  const handleConfirm = () => {
    if (!selectedFile) return;
    setUploading(true);
    let current = 0;
    const interval = setInterval(() => {
      current += Math.random() * 20;
      if (current >= 100) {
        clearInterval(interval);
        setProgress(100);
        setTimeout(() => {
          const sizeKB = selectedFile.size / 1024;
          const size = sizeKB < 1024
            ? `${sizeKB.toFixed(1)} KB`
            : `${(sizeKB / 1024).toFixed(2)} MB`;
          onUpload({ name: selectedFile.name, size, type: fileType, date: new Date().toLocaleDateString() });
          onClose();
        }, 500);
      } else {
        setProgress(current);
      }
    }, 200);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: Z_INDEX.OVERLAY, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '420px', padding: '2rem', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}><X size={18} /></button>
        <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>Digital Vault</p>
        <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1.5rem' }}>Upload File</h3>

        <div
          onClick={() => fileRef.current?.click()}
          style={{ border: '2px dashed var(--border)', borderRadius: '12px', padding: '2rem', textAlign: 'center', cursor: 'pointer', marginBottom: '1.25rem', background: selectedFile ? 'var(--bg-elevated)' : 'transparent', transition: 'all 0.2s' }}
        >
          <UploadCloud size={32} color="var(--accent)" style={{ margin: '0 auto 0.75rem' }} />
          {selectedFile
            ? <p style={{ fontWeight: 700 }}>{selectedFile.name}</p>
            : <p style={{ color: 'var(--text-3)' }}>Click to select a file</p>
          }
          {selectedFile && <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '4px' }}>{(selectedFile.size / 1024).toFixed(1)} KB</p>}
          <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleFileChange} />
        </div>

        <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Visibility</label>
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {['Private', 'Public'].map(t => (
            <button key={t} onClick={() => setFileType(t)}
              style={{ flex: 1, padding: '10px', borderRadius: '10px', border: `2px solid ${fileType === t ? 'var(--accent)' : 'var(--border)'}`, background: fileType === t ? 'var(--accent-soft)' : 'transparent', color: fileType === t ? 'var(--accent)' : 'var(--text-2)', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              {t === 'Private' ? <Lock size={14} /> : <Globe size={14} />} {t}
            </button>
          ))}
        </div>

        <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', position: 'relative', overflow: 'hidden' }} onClick={handleConfirm} disabled={!selectedFile || uploading}>
          {uploading && (
            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${progress}%`, background: 'rgba(255,255,255,0.2)', transition: 'width 0.2s' }} />
          )}
          <UploadCloud size={16} style={{ position: 'relative', zIndex: 1 }} /> 
          <span style={{ position: 'relative', zIndex: 1 }}>{uploading ? `Uploading... ${Math.round(progress)}%` : 'Upload File'}</span>
        </button>
      </div>
    </div>
  );
}


export default function Documents() {
  const documents = useStore(selectDocuments);
  const addDocument = useStore(selectAddDocument);
  const deleteDocument = useStore(selectDeleteDocument);
  const isLoading = useStore(s => s.isLoading);
  const toast = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [syncedProviders, setSyncedProviders] = useState([]);

  const toggleSync = (provider) => {
    if (syncedProviders.includes(provider)) {
      setSyncedProviders(p => p.filter(x => x !== provider));
      toast.success(`${provider} unlinked successfully.`);
    } else {
      toast.success(`Authenticating ${provider}...`);
      setTimeout(() => {
        setSyncedProviders(p => [...p, provider]);
        toast.success(`${provider} linked successfully.`);
      }, 1000);
    }
  };

  const handleUpload = async (fileData) => {
    try {
      await addDocument(fileData);
      toast.success(`${fileData.name} uploaded successfully.`);
    } catch {
      toast.error('Upload failed');
    }
  };


  const handleDelete = (id) => {
    setConfirmDelete(id);
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteDocument(confirmDelete);
      toast.success("File deleted.");
    } catch {
      toast.error('Delete failed');
    } finally {
      setConfirmDelete(null);
    }
  };

  const filtered = (documents || []).filter(f => f.name?.toLowerCase().includes(searchTerm.toLowerCase()));
  const privateCount = documents.filter(f => f.type === 'Private').length;
  const publicCount = documents.filter(f => f.type === 'Public').length;

  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0' }}>
      {showUploadModal && <UploadModal onUpload={handleUpload} onClose={() => setShowUploadModal(false)} />}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Purge document?"
        description="This file will be permanently removed from the digital vault. This action is irreversible."
        confirmLabel="Purge File"
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(null)}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>Digital Vault</p>
          <h2 className="text-display" style={{ fontSize: '2.2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Folder size={30} color="var(--accent)" /> Documents
          </h2>
          <p className="text-secondary">{documents.length} items synced to cloud vault.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className={`btn-${syncedProviders.includes('Google Drive') ? 'primary' : 'ghost'}`} onClick={() => toggleSync('Google Drive')} title="Sync Google Drive">
            <Cloud size={16} /> {syncedProviders.includes('Google Drive') ? 'G-Drive Linked' : 'Link G-Drive'}
          </button>
          <button className={`btn-${syncedProviders.includes('OneDrive') ? 'primary' : 'ghost'}`} onClick={() => toggleSync('OneDrive')} title="Sync OneDrive">
            <Cloud size={16} /> {syncedProviders.includes('OneDrive') ? 'OneDrive Linked' : 'Link OneDrive'}
          </button>
          <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
          <button className="btn-primary" onClick={() => setShowUploadModal(true)}>
            <UploadCloud size={16} style={{ marginRight: '8px' }} /> Upload File
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
         <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid #10b981' }}>
           <h3 className="card-title"><HardDrive size={18} color="#10b981" /> Local Vault</h3>
           <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginBottom: '1rem' }}>Encrypted storage for highly sensitive documents.</p>
           <div style={{ background: 'var(--bg-dark)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
             <div style={{ width: `${Math.min(100, (documents.length / 100) * 100).toFixed(0)}%`, height: '100%', background: '#10b981' }} />
           </div>
           <p style={{ fontSize: '0.75rem', marginTop: '8px', textAlign: 'right' }}>{documents.length} / 100 files used</p>
         </div>
         
         <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent)' }}>
           <h3 className="card-title"><Shield size={18} color="var(--accent)" /> Security Profile</h3>
           <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
             <div>
               <p style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-1)' }}>{privateCount}</p>
               <p className="label-caps" style={{ fontSize: '0.6rem' }}>Private</p>
             </div>
             <div>
               <p style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-3)' }}>{publicCount}</p>
               <p className="label-caps" style={{ fontSize: '0.6rem' }}>Public</p>
             </div>
           </div>
         </div>
      </div>

      <div className="glass-card" style={{ padding: 0 }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-dark)', padding: '6px 12px', borderRadius: '10px', width: '300px' }}>
            <Search size={14} color="var(--text-3)" />
            <input 
              type="text" placeholder="Search vault..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-1)', fontSize: '0.85rem', outline: 'none', width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{filtered.length} files found</span>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-3)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '1rem 1.5rem' }}>Name</th>
                <th style={{ padding: '1rem' }}>Size</th>
                <th style={{ padding: '1rem' }}>Date Added</th>
                <th style={{ padding: '1rem' }}>Type</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="5" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-3)' }}>Syncing vault...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-3)' }}>No documents found.</td></tr>
              ) : (
                filtered.map((file) => (
                  <tr key={file.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} className="hover-bg-subtle">
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <FileText size={18} color={file.type === 'Private' ? 'var(--accent)' : 'var(--text-3)'} />
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{file.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-3)' }}>{file.size}</td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-3)' }}>{file.date}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ fontSize: '0.65rem', padding: '3px 8px', borderRadius: '6px', background: file.type === 'Private' ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.05)', color: file.type === 'Private' ? 'var(--warning)' : 'var(--text-3)', fontWeight: 800 }}>
                        {file.type.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button className="btn-icon" onClick={() => toast.info('Preview not available in simulation.')}><File size={14}/></button>
                        <button className="btn-icon" onClick={() => handleDelete(file.id)} style={{ color: 'var(--danger)' }}><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
