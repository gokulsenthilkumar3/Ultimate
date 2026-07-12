import { Z_INDEX } from '../constants';
import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  FileText, Cloud, HardDrive, UploadCloud, Folder, Trash2, Shield,
  Search, X, Lock, Globe, FileImage, FileVideo, FileAudio, Archive,
  FileSpreadsheet, Download, CheckSquare, Square, SortAsc, SortDesc,
  Filter, Eye
} from 'lucide-react';
import { useToast } from '../hooks/useToast';
import ConfirmDialog from './ui/ConfirmDialog';
import useStore, { selectDocuments, selectAddDocument, selectDeleteDocument } from '../store/useStore';

// ── File type utilities ────────────────────────────────────────────────────────
const FILE_TYPES = {
  pdf:   { icon: FileText,        className: 'file-icon--pdf',   label: 'PDF' },
  jpg:   { icon: FileImage,       className: 'file-icon--image', label: 'Image' },
  jpeg:  { icon: FileImage,       className: 'file-icon--image', label: 'Image' },
  png:   { icon: FileImage,       className: 'file-icon--image', label: 'Image' },
  gif:   { icon: FileImage,       className: 'file-icon--image', label: 'Image' },
  webp:  { icon: FileImage,       className: 'file-icon--image', label: 'Image' },
  mp4:   { icon: FileVideo,       className: 'file-icon--video', label: 'Video' },
  mov:   { icon: FileVideo,       className: 'file-icon--video', label: 'Video' },
  avi:   { icon: FileVideo,       className: 'file-icon--video', label: 'Video' },
  mp3:   { icon: FileAudio,       className: 'file-icon--audio', label: 'Audio' },
  wav:   { icon: FileAudio,       className: 'file-icon--audio', label: 'Audio' },
  zip:   { icon: Archive,         className: 'file-icon--zip',   label: 'Archive' },
  rar:   { icon: Archive,         className: 'file-icon--zip',   label: 'Archive' },
  xlsx:  { icon: FileSpreadsheet, className: 'file-icon--sheet', label: 'Spreadsheet' },
  csv:   { icon: FileSpreadsheet, className: 'file-icon--sheet', label: 'Spreadsheet' },
  doc:   { icon: FileText,        className: 'file-icon--doc',   label: 'Document' },
  docx:  { icon: FileText,        className: 'file-icon--doc',   label: 'Document' },
};

function getFileInfo(name = '') {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return FILE_TYPES[ext] || { icon: FileText, className: 'file-icon--other', label: 'File' };
}

// ── Drag-and-Drop Upload Modal ─────────────────────────────────────────────────
function UploadModal({ onUpload, onClose }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileType, setFileType] = useState('Private');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef();

  const handleFileSelect = (file) => {
    if (!file) return;
    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert('File too large. Maximum size is 50MB.');
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleConfirm = () => {
    if (!selectedFile) return;
    setUploading(true);
    let current = 0;
    const interval = setInterval(() => {
      current += Math.random() * 18 + 5; // More realistic increments
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
        setProgress(Math.min(current, 99));
      }
    }, 150);
  };

  const { icon: FileIcon, className: fileIconClass } = selectedFile ? getFileInfo(selectedFile.name) : { icon: UploadCloud, className: '' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: Z_INDEX.OVERLAY, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="glass-card slide-in-bottom" style={{ width: '100%', maxWidth: '460px', padding: '2rem', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', transition: 'color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-1)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
        ><X size={18} /></button>

        <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>Digital Vault</p>
        <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1.5rem' }}>Upload File</h3>

        {/* Drag-and-drop zone */}
        <div
          className={`dropzone${isDragging ? ' dropzone--active' : ''}`}
          onClick={() => fileRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          style={{ marginBottom: '1.25rem' }}
        >
          <div className="dropzone__icon">
            <FileIcon size={36} className={selectedFile ? fileIconClass : ''} color={selectedFile ? undefined : 'var(--accent)'} style={{ margin: '0 auto' }} />
          </div>
          {selectedFile ? (
            <>
              <p style={{ fontWeight: 700, color: 'var(--text-1)', marginBottom: '4px' }}>{selectedFile.name}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </>
          ) : (
            <>
              <p style={{ fontWeight: 600, color: 'var(--text-2)' }}>Drop file here or click to browse</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '4px' }}>Max 50MB · Any format</p>
            </>
          )}
          <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => handleFileSelect(e.target.files[0])} />
        </div>

        <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Visibility</label>
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {['Private', 'Public'].map(t => (
            <button key={t} onClick={() => setFileType(t)}
              style={{ flex: 1, padding: '10px', borderRadius: '10px', border: `2px solid ${fileType === t ? 'var(--accent)' : 'var(--border)'}`, background: fileType === t ? 'var(--accent-soft)' : 'transparent', color: fileType === t ? 'var(--accent)' : 'var(--text-2)', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
            >
              {t === 'Private' ? <Lock size={14} /> : <Globe size={14} />} {t}
            </button>
          ))}
        </div>

        <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', position: 'relative', overflow: 'hidden' }} onClick={handleConfirm} disabled={!selectedFile || uploading}>
          {uploading && (
            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${progress}%`, background: 'rgba(255,255,255,0.2)', transition: 'width 0.15s ease' }} />
          )}
          <UploadCloud size={16} style={{ position: 'relative', zIndex: 1 }} />
          <span style={{ position: 'relative', zIndex: 1 }}>{uploading ? `Uploading… ${Math.round(progress)}%` : 'Upload to Vault'}</span>
        </button>
      </div>
    </div>
  );
}

// ── Main Documents Component ────────────────────────────────────────────────────
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
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [filterType, setFilterType] = useState('All');

  const toggleSync = (provider) => {
    if (syncedProviders.includes(provider)) {
      setSyncedProviders(p => p.filter(x => x !== provider));
      toast.success(`${provider} unlinked successfully.`);
    } else {
      toast.info(`Authenticating ${provider}…`);
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

  const handleDelete = (id) => setConfirmDelete(id);

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteDocument(confirmDelete);
      toast.success('File deleted.');
      setSelectedIds(prev => { const n = new Set(prev); n.delete(confirmDelete); return n; });
    } catch {
      toast.error('Delete failed');
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      for (const id of selectedIds) await deleteDocument(id);
      toast.success(`${selectedIds.size} file(s) deleted.`);
      setSelectedIds(new Set());
    } catch {
      toast.error('Bulk delete failed');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(f => f.id)));
    }
  };

  const cycleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    let list = (documents || []).filter(f => {
      const matchSearch = f.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = filterType === 'All' || f.type === filterType;
      return matchSearch && matchType;
    });
    list = [...list].sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';
      const cmp = valA.localeCompare(valB);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [documents, searchTerm, filterType, sortField, sortDir]);

  const privateCount = (documents || []).filter(f => f.type === 'Private').length;
  const publicCount = (documents || []).filter(f => f.type === 'Public').length;
  const storagePercent = Math.min(100, Math.round(((documents || []).length / 100) * 100));

  const SortIcon = sortDir === 'asc' ? SortAsc : SortDesc;

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

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>Digital Vault</p>
          <h2 className="text-display" style={{ fontSize: '2.2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Folder size={30} color="var(--accent)" /> Documents
          </h2>
          <p className="text-secondary">{(documents || []).length} items synced · {storagePercent}% storage used</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {[['Google Drive', '🌐'], ['OneDrive', '☁️']].map(([provider, emoji]) => (
            <button key={provider} className={`btn-${syncedProviders.includes(provider) ? 'primary' : 'ghost'}`} onClick={() => toggleSync(provider)} title={`Sync ${provider}`}>
              <Cloud size={16} /> {syncedProviders.includes(provider) ? `${emoji} Linked` : `Link ${provider.split(' ')[0]}`}
            </button>
          ))}
          <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
          <button className="btn-primary" onClick={() => setShowUploadModal(true)}>
            <UploadCloud size={16} /> Upload File
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-card card-shine-wrap" style={{ padding: '1.5rem', borderLeft: '4px solid #10b981' }}>
          <h3 className="card-title"><HardDrive size={16} color="#10b981" style={{ display: 'inline', marginRight: '6px' }} />Local Vault Storage</h3>
          <p style={{ color: 'var(--text-3)', fontSize: '0.82rem', marginBottom: '1rem' }}>Encrypted storage for sensitive documents.</p>
          <div style={{ background: 'var(--bg-elevated)', height: '8px', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
            <div style={{ width: `${storagePercent}%`, height: '100%', background: storagePercent > 80 ? 'var(--danger)' : storagePercent > 60 ? 'var(--warning)' : '#10b981', transition: 'width 0.6s ease', borderRadius: '4px' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-3)' }}>
            <span>{(documents || []).length} / 100 files</span>
            <span style={{ color: storagePercent > 80 ? 'var(--danger)' : 'var(--text-3)' }}>{storagePercent}% used</span>
          </div>
        </div>

        <div className="glass-card card-shine-wrap" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent)' }}>
          <h3 className="card-title"><Shield size={16} color="var(--accent)" style={{ display: 'inline', marginRight: '6px' }} />Security Profile</h3>
          <div style={{ display: 'flex', gap: '2rem', marginTop: '0.75rem' }}>
            {[
              { label: 'Private', count: privateCount, color: 'var(--warning)', icon: Lock },
              { label: 'Public', count: publicCount, color: 'var(--text-3)', icon: Globe },
            ].map(({ label, count, color, icon: Icon }) => (
              <div key={label}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <Icon size={12} color={color} />
                  <span className="label-caps" style={{ fontSize: '0.6rem' }}>{label}</span>
                </div>
                <p style={{ fontSize: '1.8rem', fontWeight: 900, color, lineHeight: 1 }}>{count}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* File table */}
      <div className="glass-card" style={{ padding: 0 }}>
        {/* Toolbar */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flex: 1, flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-elevated)', padding: '6px 12px', borderRadius: '10px', minWidth: '200px', flex: 1, maxWidth: '320px' }}>
              <Search size={14} color="var(--text-3)" />
              <input
                type="text" placeholder="Search vault…" value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-1)', fontSize: '0.85rem', outline: 'none', width: '100%' }}
              />
              {searchTerm && <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex' }}><X size={12} /></button>}
            </div>

            {/* Filter by type */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {['All', 'Private', 'Public'].map(t => (
                <button key={t} onClick={() => setFilterType(t)}
                  className={`btn-sm${filterType === t ? ' active' : ''}`}
                  style={{ padding: '4px 10px' }}
                >
                  <Filter size={10} style={{ display: 'inline', marginRight: '4px' }} />{t}
                </button>
              ))}
            </div>
          </div>

          <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
            {filtered.length} file{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-3)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <th style={{ padding: '0.85rem 1rem 0.85rem 1.5rem', width: '40px' }}>
                  <button onClick={toggleSelectAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: selectedIds.size === filtered.length && filtered.length > 0 ? 'var(--accent)' : 'var(--text-3)', display: 'flex' }}>
                    {selectedIds.size === filtered.length && filtered.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                </th>
                <th style={{ padding: '0.85rem 1rem', cursor: 'pointer' }} onClick={() => cycleSort('name')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Name {sortField === 'name' && <SortIcon size={12} />}
                  </span>
                </th>
                <th style={{ padding: '0.85rem 1rem', cursor: 'pointer' }} onClick={() => cycleSort('size')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Size {sortField === 'size' && <SortIcon size={12} />}
                  </span>
                </th>
                <th style={{ padding: '0.85rem 1rem', cursor: 'pointer' }} onClick={() => cycleSort('date')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Date {sortField === 'date' && <SortIcon size={12} />}
                  </span>
                </th>
                <th style={{ padding: '0.85rem 1rem' }}>Type</th>
                <th style={{ padding: '0.85rem 1.5rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="6" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-3)' }}>Syncing vault…</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-3)' }}>
                      <Folder size={48} style={{ margin: '0 auto 1rem', opacity: 0.2, display: 'block' }} />
                      <p style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px', color: 'var(--text-2)' }}>
                        {searchTerm ? 'No files matched your search' : 'Your vault is empty'}
                      </p>
                      <p style={{ fontSize: '0.8rem' }}>
                        {searchTerm ? `Try a different search term` : 'Upload your first file to get started'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((file, i) => {
                  const { icon: FileIcon, className: fileIconClass } = getFileInfo(file.name);
                  const isSelected = selectedIds.has(file.id);
                  return (
                    <tr
                      key={file.id}
                      onClick={() => toggleSelect(file.id)}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.15s ease',
                        background: isSelected ? 'var(--accent-soft)' : 'transparent',
                        cursor: 'pointer',
                        animationDelay: `${i * 0.03}s`,
                      }}
                      className="hover-bg-subtle"
                    >
                      <td style={{ padding: '0.85rem 1rem 0.85rem 1.5rem' }}>
                        <div style={{ color: isSelected ? 'var(--accent)' : 'var(--text-3)', display: 'flex' }}
                          onClick={e => { e.stopPropagation(); toggleSelect(file.id); }}>
                          {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <FileIcon size={18} className={fileIconClass} />
                          <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-1)' }}>{file.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: 'var(--text-3)', fontFamily: 'monospace' }}>{file.size}</td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: 'var(--text-3)' }}>{file.date}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          fontSize: '0.62rem', padding: '3px 8px', borderRadius: '6px',
                          background: file.type === 'Private' ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.05)',
                          color: file.type === 'Private' ? 'var(--warning)' : 'var(--text-3)', fontWeight: 800,
                          border: `1px solid ${file.type === 'Private' ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`,
                          display: 'inline-flex', alignItems: 'center', gap: '4px'
                        }}>
                          {file.type === 'Private' ? <Lock size={8} /> : <Globe size={8} />}
                          {file.type.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1.5rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            className="btn-icon"
                            onClick={e => { e.stopPropagation(); toast.info('Preview not available in simulation.'); }}
                            title="Preview"
                          ><Eye size={13} /></button>
                          <button
                            className="btn-icon"
                            onClick={e => { e.stopPropagation(); toast.info('Download started.'); }}
                            title="Download"
                          ><Download size={13} /></button>
                          <button
                            className="btn-icon"
                            onClick={e => { e.stopPropagation(); handleDelete(file.id); }}
                            style={{ color: 'var(--danger)' }}
                            title="Delete"
                          ><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bulk-action toolbar — appears when items are selected */}
        {selectedIds.size > 0 && (
          <div className="selection-toolbar">
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-1)' }}>
              {selectedIds.size} file{selectedIds.size !== 1 ? 's' : ''} selected
            </span>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-ghost" onClick={() => setSelectedIds(new Set())} style={{ padding: '6px 14px', fontSize: '0.75rem' }}>
                Deselect All
              </button>
              <button
                onClick={handleBulkDelete}
                style={{ padding: '6px 14px', fontSize: '0.75rem', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Trash2 size={14} /> Delete Selected
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
