import React, { useState } from 'react';
import { FileText, Cloud, HardDrive, UploadCloud, Folder, Trash2 } from 'lucide-react';
import { useToast } from '../hooks/useToast';

export default function Documents() {
  const toast = useToast();
  const [files, setFiles] = useState([
    { id: 1, name: 'Tax_Returns_2025.pdf', size: '2.4 MB', date: 'Yesterday', type: 'Private' },
    { id: 2, name: 'Portfolio_Assets.zip', size: '45.1 MB', date: '3 days ago', type: 'Public' }
  ]);

  const handleUpload = () => {
    const filename = prompt("Enter simulated filename to upload:");
    if (!filename) return;
    const newFile = {
      id: Date.now(),
      name: filename,
      size: `${(Math.random() * 10).toFixed(1)} MB`,
      date: 'Just now',
      type: Math.random() > 0.5 ? 'Private' : 'Public'
    };
    setFiles([newFile, ...files]);
    toast.success(`${filename} uploaded successfully.`);
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this file?")) {
      setFiles(files.filter(f => f.id !== id));
      toast.success("File deleted.");
    }
  };

  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>Digital Vault</p>
          <h2 className="text-display" style={{ fontSize: '2.2rem' }}>Documents & Cloud Sync</h2>
          <p className="text-secondary">Securely manage public and private data across your connected drives.</p>
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
           <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginBottom: '1rem' }}>Encrypted local storage for highly sensitive documents.</p>
           <div style={{ background: 'var(--bg-dark)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
             <div style={{ width: '45%', height: '100%', background: '#10b981' }} />
           </div>
           <p style={{ fontSize: '0.75rem', marginTop: '8px', textAlign: 'right' }}>45% Used (45GB / 100GB)</p>
         </div>
         
         <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid #3b82f6' }}>
           <h3 className="card-title"><Cloud size={18} color="#3b82f6" /> Cloud Sync (Public)</h3>
           <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginBottom: '1rem' }}>Synchronized with your personal cloud provider.</p>
           <div style={{ background: 'var(--bg-dark)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
             <div style={{ width: '82%', height: '100%', background: '#3b82f6' }} />
           </div>
           <p style={{ fontSize: '0.75rem', marginTop: '8px', textAlign: 'right' }}>82% Used (1.6TB / 2.0TB)</p>
         </div>
      </div>

      <div className="glass-card">
         <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
           <Folder size={20} color="var(--accent)" />
           <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Recent Files</h3>
         </div>
         <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
           {files.length === 0 ? (
             <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>No documents uploaded yet.</p>
           ) : (
             files.map((file) => (
               <div key={file.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-dark)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <FileText size={20} color="var(--text-3)" />
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>{file.name}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{file.size} • Uploaded {file.date}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '0.7rem', padding: '4px 10px', background: file.type === 'Private' ? 'rgba(244, 63, 94, 0.2)' : 'var(--bg-elevated)', color: file.type === 'Private' ? '#f43f5e' : 'var(--text-2)', borderRadius: '12px', fontWeight: 800 }}>
                      {file.type}
                    </span>
                    <button onClick={() => handleDelete(file.id)} className="btn-icon" style={{ color: 'var(--text-3)' }} title="Delete File">
                      <Trash2 size={16} />
                    </button>
                  </div>
               </div>
             ))
           )}
         </div>
      </div>
    </div>
  );
}
