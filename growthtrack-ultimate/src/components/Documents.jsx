import { EMPTY_LIST } from '../lib/emptyValues';
import { Z_INDEX } from '../constants';
import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  FileText, Cloud, HardDrive, UploadCloud, Folder, Trash2, Shield,
  Search, X, Lock, Globe, FileImage, FileVideo, FileAudio, Archive,
  FileSpreadsheet, Download, CheckSquare, Square, SortAsc, SortDesc,
  Filter, Eye
} from 'lucide-react';
import { useToast } from '../hooks/useToast';
import ConfirmDialog from './ui/ConfirmDialog';
import useDialogFocus from '../hooks/useDialogFocus';
import useStore from '../store/useStore';
import { formatDate } from '../utils/userFormatters';
import { listFiles, uploadFile, deleteFile, downloadFile, connectFileProvider } from '../api/files';
import FileVaultPreview from './FileVaultPreview';

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
export function UploadModal({ onUpload, onClose }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useDialogFocus(true, () => { if (!uploading) onClose(); });
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef();

  const handleFileSelect = (file) => {
    if (!file) return;
    if (!file.size || file.size > 25 * 1024 * 1024) {
      setError('Choose a non-empty file up to 25 MB, then try again.');
      setSelectedFile(null);
      return;
    }
    setError('');
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

  const handleConfirm = async () => {
    if (!selectedFile || uploading) return;
    setUploading(true);
    setError('');
    try {
      await onUpload(selectedFile);
      onClose();
    } catch (failure) { setError(failure.payload?.error || failure.message || 'Upload failed. Try again.'); }
    finally { setUploading(false); }
  };

  const { icon: FileIcon, className: fileIconClass } = selectedFile ? getFileInfo(selectedFile.name) : { icon: UploadCloud, className: '' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: Z_INDEX.OVERLAY, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Upload private file" tabIndex={-1} className="glass-card slide-in-bottom" style={{ width: '100%', maxWidth: '460px', padding: '2rem', position: 'relative' }}>
        <button type="button" aria-label="Close upload dialog" disabled={uploading} onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', transition: 'color 0.2s', minWidth: 44, minHeight: 44 }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-1)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
        ><X size={18} /></button>

        <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>Digital Vault</p>
        <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1.5rem' }}>Upload private file</h3>
        <p className="text-secondary">Upload the file to your private local vault. Downloads require your signed-in account.</p>
        {error && <p role="alert" className="gt-field__error">{error}</p>}

        {/* Drag-and-drop zone */}
        <div
          className={`dropzone${isDragging ? ' dropzone--active' : ''}`}
          role="button"
          tabIndex={uploading ? -1 : 0}
          aria-disabled={uploading}
          aria-label="Choose a file, maximum 25 MB"
          onKeyDown={event => { if (!uploading && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); fileRef.current?.click(); } }}
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
              <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '4px' }}>Max 25 MB · Any format</p>
            </>
          )}
          <input ref={fileRef} type="file" disabled={uploading} style={{ display: 'none' }} onChange={e => handleFileSelect(e.target.files[0])} />
        </div>

        <p style={{ marginBottom: '1.5rem' }}><Lock size={14} /> Private · Only your account can access this file.</p>

        <button type="button" className="gt-button gt-button--primary" aria-busy={uploading || undefined} style={{ width: '100%', justifyContent: 'center', position: 'relative', overflow: 'hidden' }} onClick={handleConfirm} disabled={!selectedFile || uploading}>
          <UploadCloud size={16} style={{ position: 'relative', zIndex: 1 }} />
          <span style={{ position: 'relative', zIndex: 1 }}>{uploading ? 'Uploading…' : 'Upload file'}</span>
        </button>
      </div>
    </div>
  );
}

// ── Main Documents Component ────────────────────────────────────────────────────
export default function Documents() {
  const user = useStore(s => s.user);
  const documentProviders = useStore(s => s.appConfig?.documentProviders ?? EMPTY_LIST);
  const [documents, setDocuments] = useState([]);
  const [usage, setUsage] = useState({ files: 0, bytes: 0 });
  const [limits, setLimits] = useState({ maxTotalBytes: 250 * 1024 * 1024, maxFiles: 100 });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const toast = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [preview, setPreview] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [filterType, setFilterType] = useState('All');

  const reloadFiles = async () => {
    const result = await listFiles();
    setDocuments(result.files);
    setUsage(result.usage);
    setLimits(result.limits);
  };
  useEffect(() => {
    let active = true;
    listFiles().then(result => {
      if (!active) return;
      setDocuments(result.files); setUsage(result.usage); setLimits(result.limits); setLoadError('');
    }).catch(error => { if (active) setLoadError(error.payload?.error || error.message); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [user?.id]);

  const toggleSync = async provider => {
    try { await connectFileProvider(provider); }
    catch (error) { toast.info(error.status === 501 ? `${provider} needs provider setup. No account was connected.` : error.message); }
  };

  const handleUpload = async file => {
    const saved = await uploadFile(file);
    setDocuments(previous => [saved, ...previous]);
    setUsage(previous => ({ files: previous.files + 1, bytes: previous.bytes + saved.sizeBytes }));
    await reloadFiles().catch(() => { toast.info('File uploaded. Refresh the vault to update its storage totals.'); });
    toast.success(`${file.name} uploaded to your private vault.`);
  };

  const handleDelete = (id) => setConfirmDelete(id);

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      const file = documents.find(item => item.id === confirmDelete);
      const result = await deleteFile(confirmDelete, file?.updatedAt);
      await reloadFiles();
      if (result.storageCleanupPending) toast.info('File access removed. Storage cleanup needs attention.');
      toast.success('File deleted.');
      setSelectedIds(prev => { const n = new Set(prev); n.delete(confirmDelete); return n; });
    } catch (error) {
      toast.error(error.payload?.error || error.message || 'Delete failed');
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      for (const id of selectedIds) await deleteFile(id, documents.find(file => file.id === id)?.updatedAt);
      await reloadFiles();
      toast.success(`${selectedIds.size} file(s) deleted.`);
      setSelectedIds(new Set());
    } catch (error) {
      await reloadFiles().catch(() => {});
      toast.error(error.payload?.error || error.message || 'Bulk delete failed');
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
      const cmp = sortField === 'size' ? (a.sizeBytes || 0) - (b.sizeBytes || 0) : String(valA).localeCompare(String(valB));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [documents, searchTerm, filterType, sortField, sortDir]);

  const privateCount = (documents || []).filter(f => f.type === 'Private').length;
  const legacyCount = documents.filter(file => file.metadataOnly).length;
  const storagePercent = Math.min(100, Math.round(usage.bytes / limits.maxTotalBytes * 100));

  const SortIcon = sortDir === 'asc' ? SortAsc : SortDesc;

  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0' }}>
      {loadError && <div role="alert"><p>{loadError}</p><button type="button" className="btn-ghost" onClick={() => reloadFiles().then(() => setLoadError('')).catch(error => setLoadError(error.message))}>Retry loading files</button></div>}
      {preview && <FileVaultPreview key={preview.id} file={preview} onClose={() => setPreview(null)} />}
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
          <p className="text-secondary">{usage.files} stored files · {storagePercent}% storage used{legacyCount ? ` · ${legacyCount} legacy records without file bytes` : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {documentProviders.filter(item => item.enabled !== false).map(item => (
            <button key={item.id} className="btn-ghost" onClick={() => toggleSync(item.label)} title={`Setup required for ${item.label}`}>
              <Cloud size={16} /> Setup {item.label}
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
          <p style={{ color: 'var(--text-3)', fontSize: '0.82rem', marginBottom: '1rem' }}>Private local files with authenticated access.</p>
          <div style={{ background: 'var(--bg-elevated)', height: '8px', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
            <div style={{ width: `${storagePercent}%`, height: '100%', background: storagePercent > 80 ? 'var(--danger)' : storagePercent > 60 ? 'var(--warning)' : '#10b981', transition: 'width 0.6s ease', borderRadius: '4px' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-3)' }}>
            <span>{(usage.bytes / 1024 / 1024).toFixed(1)} / {limits.maxTotalBytes / 1024 / 1024} MB · {usage.files} / {limits.maxFiles} files</span>
            <span style={{ color: storagePercent > 80 ? 'var(--danger)' : 'var(--text-3)' }}>{storagePercent}% used</span>
          </div>
        </div>

        <div className="glass-card card-shine-wrap" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent)' }}>
          <h3 className="card-title"><Shield size={16} color="var(--accent)" style={{ display: 'inline', marginRight: '6px' }} />Security Profile</h3>
          <div style={{ display: 'flex', gap: '2rem', marginTop: '0.75rem' }}>
            {[
              { label: 'Private', count: privateCount, color: 'var(--warning)', icon: Lock },
              { label: 'Legacy records', count: legacyCount, color: 'var(--text-3)', icon: FileText },
            ].map(({ label, count, color, icon: Icon }) => (
              <div key={label}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  {React.createElement(Icon, { size: 12, color })}
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
                type="search" aria-label="Search documents" placeholder="Search vault…" value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-1)', fontSize: '0.85rem', outline: 'none', width: '100%' }}
              />
              {searchTerm && <button type="button" aria-label="Clear document search" onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><X size={12} /></button>}
            </div>

            {/* Filter by type */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {['All', 'Private'].map(t => (
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
                          <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-1)' }}>{file.name}{file.metadataOnly && <small> · Original file needed</small>}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: 'var(--text-3)', fontFamily: 'monospace' }}>{file.size}</td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: 'var(--text-3)' }}>{formatDate(file.date, user)}</td>
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
                            disabled={!file.previewKind}
                            onClick={e => { e.stopPropagation(); setPreview(file); }}
                            aria-label={`Preview ${file.name}`}
                            title="Preview"
                          ><Eye size={13} /></button>
                          <button
                            className="btn-icon"
                            disabled={!file.available}
                            onClick={async e => { e.stopPropagation(); try { await downloadFile(file); } catch (error) { toast.error(error.message); } }}
                            aria-label={`Download ${file.name}`}
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
