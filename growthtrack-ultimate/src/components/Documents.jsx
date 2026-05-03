import React, { useState } from 'react';
import { FileText, Cloud, HardDrive, UploadCloud, Folder, Trash2, Shield, Search, File } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import ConfirmDialog from './ui/ConfirmDialog';
import useStore, { selectDocuments, selectAddDocument, selectDeleteDocument } from '../store/useStore';

export default function Documents() {
  const documents = useStore(selectDocuments);
  const addDocument = useStore(selectAddDocument);
  const deleteDocument = useStore(selectDeleteDocument);
  const isLoading = useStore(s => s.isLoading);
  const toast = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleUpload = async () => {
    const filename = prompt("Enter filename to upload:");
    if (!filename) return;
    
    const size = `${(Math.random() * 10).toFixed(1)} MB`;
    const type = Math.random() > 0.5 ? 'Private' : 'Public';
    const date = new Date().toLocaleDateString();

    try {
      await addDocument({ name: filename, size, type, date });
      toast.success(`${filename} uploaded successfully.`);
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
          <button className="btn-ghost" onClick={() => toast.success('Connecting to Google Drive...')}>
            <Cloud size={16} style={{ marginRight: '8px' }} /> Sync G-Drive
          </button>
          <button className="btn-primary" onClick={handleUpload}>
            <UploadCloud size={16} style={{ marginRight: '8px' }} /> Upload File
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
         <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid #10b981' }}>
           <h3 className="card-title"><HardDrive size={18} color="#10b981" /> Local Vault</h3>
           <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginBottom: '1rem' }}>Encrypted storage for highly sensitive documents.</p>
           <div style={{ background: 'var(--bg-dark)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
             <div style={{ width: '45%', height: '100%', background: '#10b981' }} />
           </div>
           <p style={{ fontSize: '0.75rem', marginTop: '8px', textAlign: 'right' }}>45% Used (45GB / 100GB)</p>
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
                  <tr key={file.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
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
