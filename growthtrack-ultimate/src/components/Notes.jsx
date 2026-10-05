import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, Edit3, Search, Star, Pin, Copy, Check, FileText, Download, Upload } from 'lucide-react';
import useStore from '../store/useStore';
import { useToast } from '../hooks/useToast';
import Modal from './ui/Modal';
import Button from './ui/Button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import '../styles/notes.css';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#8b5cf6', '#ec4899', '#6b7280'];
const EMPTY_NOTES = Object.freeze([]);

function NoteCard({ note, onEdit, onDelete, onToggleStar, onTogglePin, onCopy, isActive, onClick }) {
  const tags = note.tags || [];
  const preview = (note.content || '').slice(0, 160).replace(/[#*`_~[\]]/g, '');
  const wordCount = (note.content || '').split(/\s+/).filter(Boolean).length;

  return (
    <article className={`note-card ${isActive ? 'active' : ''}`} style={{ '--card-accent-color': note.color }}>
      <button type="button" onClick={onClick} aria-pressed={isActive}
        aria-label={`Open note: ${note.title || 'Untitled'}`} className="note-card-open">
        <div className="note-card-title-row">
          <p className="note-card-title">{note.title || 'Untitled'}</p>
          <div className="note-card-indicators">
            {note.pinned && <Pin size={11} className="pin-active" />}
            {note.starred && <Star size={11} className="star-active" fill="currentColor" />}
          </div>
        </div>
        {preview && <p className="note-card-preview">{preview}</p>}
        {tags.length > 0 && (
          <div className="note-card-tags">
            {tags.slice(0, 4).map((tag, i) => (
              <span key={i} className="note-card-tag">{tag}</span>
            ))}
          </div>
        )}
      </button>
      <div className="note-card-footer">
        <span className="note-card-meta">{wordCount}w · {note.updatedAt?.slice(0, 10) || '—'}</span>
        <div className="note-card-actions">
          <button onClick={() => onTogglePin(note.id)} className={`note-card-action-btn ${note.pinned ? 'pin-active' : ''}`} title={note.pinned ? 'Unpin' : 'Pin'} aria-label={`${note.pinned ? 'Unpin' : 'Pin'} ${note.title || 'note'}`}><Pin size={12} /></button>
          <button onClick={() => onToggleStar(note.id)} className={`note-card-action-btn ${note.starred ? 'star-active' : ''}`} title={note.starred ? 'Unstar' : 'Star'} aria-label={`${note.starred ? 'Unstar' : 'Star'} ${note.title || 'note'}`}><Star size={12} fill={note.starred ? 'currentColor' : 'none'} /></button>
          <button onClick={() => onCopy(note)} className="note-card-action-btn" title="Copy" aria-label={`Copy ${note.title || 'note'}`}><Copy size={12} /></button>
          <button onClick={() => onEdit(note)} className="note-card-action-btn" title="Edit" aria-label={`Edit ${note.title || 'note'}`}><Edit3 size={12} /></button>
          <button onClick={() => onDelete(note.id)} className="note-card-action-btn delete-btn" title="Delete" aria-label={`Delete ${note.title || 'note'}`}><Trash2 size={12} /></button>
        </div>
      </div>
    </article>
  );
}

export default function Notes({ view, onViewChange, draftStore, fileTransfer }) {
  const toast = useToast();
  const notes      = useStore(s => s.notes ?? EMPTY_NOTES);
  const addNote    = useStore(s => s.addNote);
  const updateNote = useStore(s => s.updateNote);
  const deleteNote = useStore(s => s.deleteNote);
  const ownerId = useStore(s => s.user?.id);

  const [activeId,  setActiveId]  = useState(null);
  const [editMode,  setEditMode]  = useState(false);
  const [draft,     setDraft]     = useState({ title: '', content: '', tags: [], color: COLORS[0] });
  const [tagInput,  setTagInput]  = useState('');
  const [search,    setSearch]    = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [viewMode,  setViewMode]  = useState('preview');
  const [saveStatus, setSaveStatus] = useState('saved');
  const [creating, setCreating] = useState(false);
  const [localView, setLocalView] = useState('all');
  const [importPreview, setImportPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [recoveries, setRecoveries] = useState([]);
  const [recoveryReview, setRecoveryReview] = useState(null);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryPaused, setRecoveryPaused] = useState(false);
  const [localDraftReady, setLocalDraftReady] = useState(false);
  const [localDraftStatus, setLocalDraftStatus] = useState('Checking encrypted note draft storage…');
  const importInput = useRef(null);
  const selectedView = view || localView;
  const autoSaveTimer = useRef(null);
  const saveAttempt = useRef(0);
  const savedDraft = useRef(null);
  const baseVersion = useRef(null);
  const textRef = useRef(null);

  // Mind journal entries share the legacy Note table, but never belong in the
  // Workspace knowledge list or its search and tag facets.
  const workspaceNotes = useMemo(() => notes.filter(n => n.source !== 'mind-journal'), [notes]);
  const activeNote = useMemo(() => workspaceNotes.find(n => n.id === activeId), [workspaceNotes, activeId]);
  const visibleRecoveries = recoveries.filter(record => !(record.data.noteId === activeId && editMode) && !notes.some(note => note.id === record.data.noteId && note.source === 'mind-journal'));
  const recoveryServerNote = recoveryReview && workspaceNotes.find(note => note.id === recoveryReview.data.noteId);
  const canRecoverExisting = recoveryServerNote?.updatedAt && recoveryServerNote.updatedAt === recoveryReview?.data.baseUpdatedAt;

  useEffect(() => {
    let alive = true;
    setLocalDraftReady(false); setRecoveries([]); setRecoveryReview(null);
    if (!ownerId) { setLocalDraftStatus('Local recovery requires a signed-in owner.'); return undefined; }
    draftStore.list(ownerId).then(result => {
      if (!alive) return;
      setRecoveries(result.drafts);
      setLocalDraftStatus(result.unreadable ? `${result.unreadable} encrypted draft(s) could not be read. They have been kept on this device.` : 'Unfinished note edits can be recovered from encrypted storage on this device.');
      setLocalDraftReady(true);
    }).catch(() => {
      if (alive) { setLocalDraftReady(true); setLocalDraftStatus('Encrypted draft storage is unavailable. Export unsaved text before leaving this page.'); }
    });
    return () => { alive = false; };
  }, [ownerId, draftStore]);

  useEffect(() => {
    if (!ownerId || !localDraftReady || !activeId || !editMode || savedDraft.current?.key === JSON.stringify(draft)) return undefined;
    let alive = true;
    const data = { ...draft, noteId: activeId, baseUpdatedAt: baseVersion.current };
    draftStore.save(ownerId, data)
      .then(() => {
        if (!alive) return;
        setLocalDraftStatus('Encrypted draft saved on this device. Server save status is shown separately.');
        setRecoveries(rows => [{ updatedAt: new Date().toISOString(), data }, ...rows.filter(row => row.data.noteId !== activeId)]);
      })
      .catch(() => { if (alive) setLocalDraftStatus('The local draft could not be saved. Export your text before leaving this page.'); });
    return () => { alive = false; };
  }, [ownerId, localDraftReady, activeId, draft, editMode, draftStore]);

  useEffect(() => {
    if (!editMode || saveStatus === 'saved') return undefined;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [editMode, saveStatus]);

  const clearLocalDraft = useCallback(async noteId => {
    if (!ownerId) return;
    try { await draftStore.remove(ownerId, noteId); setRecoveries(rows => rows.filter(row => row.data.noteId !== noteId)); }
    catch { setLocalDraftStatus('The note was saved, but its local draft could not be removed. Review it before recovering another copy.'); }
  }, [ownerId, draftStore]);

  useEffect(() => {
    if (selectedView === 'editor' && activeId) { setEditMode(true); setViewMode('edit'); }
  }, [selectedView, activeId]);

  // Auto-save on content change
  useEffect(() => {
    if (!editMode || !activeId) return;
    const draftKey = JSON.stringify(draft);
    if (savedDraft.current?.id === activeId && savedDraft.current.key === draftKey) return;
    const attempt = ++saveAttempt.current;
    setSaveStatus(current => recoveryPaused && current === 'conflicting' ? current : 'unsaved');
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    if (recoveryPaused) return undefined;
    autoSaveTimer.current = setTimeout(() => {
      if (typeof updateNote === 'function') {
        setSaveStatus('saving');
        Promise.resolve(updateNote(activeId, { ...draft, title: draft.title.trim() || 'Untitled Note' }, baseVersion.current ? { expectedUpdatedAt: baseVersion.current } : undefined))
          .then(saved => {
            if (saveAttempt.current === attempt) {
              baseVersion.current = saved?.updatedAt || baseVersion.current;
              savedDraft.current = { id: activeId, key: draftKey };
              setSaveStatus('saved');
              void clearLocalDraft(activeId);
            }
          })
          .catch(error => {
            if (saveAttempt.current === attempt) {
              setSaveStatus(error?.status === 409 ? 'conflicting' : 'failed');
              if (error?.status === 409) setRecoveryPaused(true);
              toast.error('Note could not be saved. Your edits are still in the editor.');
            }
          });
      }
    }, 1200);
    return () => clearTimeout(autoSaveTimer.current);
  }, [activeId, draft, editMode, updateNote, toast, recoveryPaused, clearLocalDraft]);

  const allTags = useMemo(() => {
    const tags = new Set();
    workspaceNotes.forEach(n => (n.tags || []).forEach(t => tags.add(t)));
    return [...tags];
  }, [workspaceNotes]);

  const filtered = useMemo(() => {
    let list = [...workspaceNotes];
    if (selectedView === 'pinned') list = list.filter(n => n.pinned);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(n =>
        (n.title || '').toLowerCase().includes(q) ||
        (n.content || '').toLowerCase().includes(q) ||
        (n.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }
    if (tagFilter) list = list.filter(n => (n.tags || []).includes(tagFilter));
    return list.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      if (a.starred && !b.starred) return -1;
      if (!a.starred && b.starred) return 1;
      return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    });
  }, [workspaceNotes, search, tagFilter, selectedView]);

  const newNote = async () => {
    if (creating) return;
    if (editMode && activeId && saveStatus !== 'saved' && !await saveNote()) return;
    setCreating(true);
    const note = {
      id: crypto.randomUUID(),
      title: 'Untitled Note',
      content: '',
      tags: [],
      color: COLORS[0],
      pinned: false,
      starred: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      if (typeof addNote !== 'function') throw new Error('Notes are unavailable.');
      const saved = await addNote(note);
      const initialDraft = { title: saved.title || note.title, content: saved.content || '', tags: saved.tags || [], color: saved.color || COLORS[0] };
      saveAttempt.current++;
      setActiveId(saved.id);
      savedDraft.current = { id: saved.id, key: JSON.stringify(initialDraft) };
      baseVersion.current = saved.updatedAt || null;
      setRecoveryPaused(false);
      setDraft(initialDraft);
      setSaveStatus('saved');
      setEditMode(true);
      setViewMode('edit');
      setTimeout(() => textRef.current?.focus(), 100);
    } catch {
      toast.error('Note could not be created. Try again.');
    } finally {
      setCreating(false);
    }
  };

  const selectNote = (note, edit) => {
    const initialDraft = { title: note.title || '', content: note.content || '', tags: note.tags || [], color: note.color || COLORS[0] };
    saveAttempt.current++;
    setActiveId(note.id);
    savedDraft.current = { id: note.id, key: JSON.stringify(initialDraft) };
    baseVersion.current = note.updatedAt || null;
    setRecoveryPaused(false);
    setDraft(initialDraft);
    setEditMode(edit);
    setViewMode(edit ? 'edit' : 'preview');
    setSaveStatus('saved');
  };

  const openNote = async (note, edit = selectedView === 'editor') => {
    if (activeId === note.id) {
      if (edit) { setEditMode(true); setViewMode('edit'); }
      return true;
    }
    if (editMode && activeId && activeId !== note.id && saveStatus !== 'saved') {
      if (!await saveNote()) return false;
    }
    selectNote(note, edit);
    return true;
  };

  const saveNote = async () => {
    if (!activeId) return false;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    const attempt = ++saveAttempt.current;
    const title = draft.title.trim() || 'Untitled Note';
    const updatedDraft = { ...draft, title };
    setSaveStatus('saving');
    try {
      if (typeof updateNote !== 'function') throw new Error('Notes are unavailable.');
      const saved = await updateNote(activeId, updatedDraft, baseVersion.current ? { expectedUpdatedAt: baseVersion.current } : undefined);
      if (saveAttempt.current !== attempt) return false;
      savedDraft.current = { id: activeId, key: JSON.stringify(updatedDraft) };
      baseVersion.current = saved?.updatedAt || baseVersion.current;
      setRecoveryPaused(false);
      setDraft(updatedDraft);
      setSaveStatus('saved');
      setEditMode(false);
      await clearLocalDraft(activeId);
      toast.success('Note saved successfully');
      return true;
    } catch (error) {
      if (saveAttempt.current !== attempt) return false;
      setSaveStatus(error?.status === 409 ? 'conflicting' : 'failed');
      if (error?.status === 409) setRecoveryPaused(true);
      toast.error('Note could not be saved. Your edits are still in the editor.');
      return false;
    }
  };

  const handleDelete = async (id) => {
    const n = workspaceNotes.find(x => x.id === id);
    try {
      if (typeof deleteNote !== 'function') throw new Error('Notes are unavailable.');
      await deleteNote(id);
      if (activeId === id) { clearTimeout(autoSaveTimer.current); saveAttempt.current++; setActiveId(null); setEditMode(false); }
      toast.info('Note deleted', 5000, { action: { label: 'Undo', onClick: () => { if (n && typeof addNote === 'function') addNote(n).catch(() => toast.error('Note could not be restored.')); } } });
    } catch { toast.error('Note could not be deleted. Try again.'); }
  };

  const toggleStar = (id) => {
    const n = workspaceNotes.find(x => x.id === id);
    if (n && typeof updateNote === 'function') updateNote(id, { starred: !n.starred }).catch(() => toast.error('Star could not be changed.'));
  };

  const togglePin = (id) => {
    const n = workspaceNotes.find(x => x.id === id);
    if (n && typeof updateNote === 'function') updateNote(id, { pinned: !n.pinned }).catch(() => toast.error('Pin could not be changed.'));
  };

  const copyNote = (note) => {
    navigator.clipboard.writeText(`# ${note.title}\n\n${note.content}`).then(() => {
      toast.success('Copied to clipboard');
    }).catch(() => toast.error('Note could not be copied.'));
  };

  const changeView = async next => {
    if (editMode && activeId && saveStatus !== 'saved' && !await saveNote()) return;
    if (onViewChange) onViewChange(next); else setLocalView(next);
    if (next === 'editor' && activeNote) { setEditMode(true); setViewMode('edit'); }
  };

  const previewImport = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try { setImportPreview({ ...await fileTransfer.read({ name: file.name, size: file.size, readText: () => file.text() }), filename: file.name }); }
    catch (error) { toast.error(error.message || 'Markdown file could not be read.'); }
  };

  const commitImport = async () => {
    if (!importPreview || importing) return;
    if (editMode && activeId && saveStatus !== 'saved' && !await saveNote()) return;
    setImporting(true);
    try {
      if (typeof addNote !== 'function') throw new Error('Notes are unavailable.');
      const saved = await addNote({ id: crypto.randomUUID(), title: importPreview.title, content: importPreview.content,
        tags: [], color: COLORS[0], pinned: false, starred: false });
      if (!saved?.id) throw new Error('The server did not acknowledge the imported note.');
      selectNote(saved, true);
      setImportPreview(null);
      toast.success('Markdown imported as a new note.');
    } catch { toast.error('The note could not be imported. Your preview is still available to retry.'); }
    finally { setImporting(false); }
  };

  const exportNote = () => {
    try {
      fileTransfer.download(editMode ? draft : activeNote);
      toast.success('Downloaded the current note text.');
    } catch { toast.error('The note could not be downloaded. Try again.'); }
  };

  const restoreExistingDraft = () => {
    if (!canRecoverExisting || !recoveryServerNote) return;
    if (editMode && saveStatus !== 'saved') { toast.warning('Save or export the current editor text before opening another draft.'); return; }
    const recovered = recoveryReview.data;
    selectNote(recoveryServerNote, true);
    setDraft({ title: recovered.title, content: recovered.content, tags: recovered.tags, color: recovered.color });
    setRecoveryPaused(true);
    setSaveStatus('unsaved');
    setRecoveryReview(null);
    toast.info('Draft recovered for review. Autosave is paused until you choose Save.');
  };

  const createRecoveredCopy = async recovered => {
    if (recoveryBusy) return;
    if (editMode && saveStatus !== 'saved' && activeId !== recovered.noteId) { toast.warning('Save or export the current editor text before opening another draft.'); return; }
    setRecoveryBusy(true);
    try {
      if (typeof addNote !== 'function') throw new Error('Notes are unavailable.');
      const saved = await addNote({ id: crypto.randomUUID(), title: `${recovered.title || 'Untitled Note'} (recovered)`,
        content: recovered.content, tags: recovered.tags, color: recovered.color, pinned: false, starred: false });
      if (!saved?.id) throw new Error('The server did not acknowledge the recovered note.');
      selectNote(saved, true);
      await clearLocalDraft(recovered.noteId);
      setRecoveryReview(null);
      toast.success('Saved a recovered copy. The original server note was preserved.');
    } catch { toast.error('The recovered copy could not be saved. Your draft has been kept.'); }
    finally { setRecoveryBusy(false); }
  };

  const addTag = () => {
    const tag = tagInput.trim().replace(/[^a-zA-Z0-9_-\s]/g, '');
    if (!tag) return;
    if (tag.length > 15) return toast.warning('Tags must be 15 characters or less');
    if (draft.tags.includes(tag)) return toast.warning('Tag already exists');
    if (draft.tags.length >= 6) return toast.warning('Maximum 6 tags allowed per note');
    setDraft(d => ({ ...d, tags: [...d.tags, tag] }));
    setTagInput('');
  };

  const insertMarkdown = (syntax) => {
    if (!textRef.current) return;
    const el    = textRef.current;
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const sel   = el.value.slice(start, end);
    const [open, close] = syntax === 'bold' ? ['**', '**'] : syntax === 'italic' ? ['*', '*'] : syntax === 'code' ? ['`', '`'] : syntax === 'link' ? ['[', '](url)'] : syntax === 'check' ? ['- [ ] ', ''] : syntax === 'h3' ? ['### ', ''] : ['', ''];
    const newVal = el.value.slice(0, start) + open + sel + close + el.value.slice(end);
    setDraft(d => ({ ...d, content: newVal }));
    setTimeout(() => { el.focus(); el.setSelectionRange(start + open.length, end + open.length); }, 0);
  };

  const wordCount = (draft.content || '').split(/\s+/).filter(Boolean).length;

  return (
    <div className="notes-container">
      <Modal open={Boolean(recoveryReview)} title="Review unfinished note" onClose={() => { if (!recoveryBusy) setRecoveryReview(null); }} actions={<>
        <Button variant="secondary" disabled={recoveryBusy} onClick={() => setRecoveryReview(null)}>Keep for later</Button>
        <Button variant="secondary" disabled={recoveryBusy} onClick={() => {
          try { fileTransfer.download(recoveryReview.data); } catch { toast.error('Draft could not be exported.'); }
        }}>Export draft</Button>
        <Button variant="secondary" disabled={!canRecoverExisting || recoveryBusy} onClick={restoreExistingDraft}>Open recovered editor</Button>
        <Button loading={recoveryBusy} loadingLabel="Saving copy…" onClick={() => createRecoveredCopy(recoveryReview.data)}>Save recovered copy</Button>
      </>}>
        <p>{canRecoverExisting ? 'The server note still matches the version used by this draft. Opening it pauses autosave until you choose Save.' : 'The original note changed or is no longer available. Save a separate copy to preserve both versions.'}</p>
        <h3>Draft on this device: {recoveryReview?.data.title}</h3>
        <pre className="notes-import-preview">{recoveryReview?.data.content}</pre>
        {recoveryServerNote && <><h3>Current server note: {recoveryServerNote.title}</h3><pre className="notes-import-preview">{recoveryServerNote.content}</pre></>}
      </Modal>
      <Modal open={Boolean(importPreview)} title="Preview Markdown import" onClose={() => { if (!importing) setImportPreview(null); }} actions={<>
        <Button variant="secondary" disabled={importing} onClick={() => setImportPreview(null)}>Cancel</Button>
        <Button loading={importing} loadingLabel="Importing…" onClick={commitImport}>Create new note</Button>
      </>}>
        <p>Import creates a new note. Review the title and content before saving.</p>
        <h3>{importPreview?.title}</h3>
        <p>{importPreview?.filename}</p>
        <pre className="notes-import-preview">{importPreview?.content}</pre>
      </Modal>
      {/* Sidebar */}
      <div className="notes-sidebar">
        {/* Header */}
        <div className="notes-sidebar-header">
          <div>
            <p className="label-caps" style={{ color: 'var(--accent)', fontSize: '0.58rem' }}>Notes</p>
            <h1 className="notes-sidebar-title">My Notes</h1>
          </div>
          <Button onClick={newNote} loading={creating} loadingLabel="Creating…" icon={<Plus size={16} />}>New</Button>
        </div>

        <nav className="notes-view-controls" aria-label="Note views">
          {[['all', 'All'], ['pinned', 'Pinned'], ['tags', 'Tags'], ['editor', 'Editor']].map(([id, label]) =>
            <button key={id} type="button" aria-pressed={selectedView === id} onClick={() => changeView(id)}>{label}</button>)}
        </nav>
        <div className="notes-file-actions">
          <input ref={importInput} type="file" accept=".md,.markdown,text/markdown" aria-label="Choose Markdown file" hidden onChange={previewImport} />
          <Button variant="secondary" disabled={importing || creating} onClick={() => importInput.current?.click()} icon={<Upload size={16} />}>Import Markdown</Button>
        </div>
        <p className="notes-local-status" aria-live="polite">{localDraftStatus}</p>
        {visibleRecoveries.length > 0 && <aside className="notes-recoveries" aria-label="Unfinished notes on this device">
          <strong>Unfinished notes on this device</strong>
          {visibleRecoveries.map(record => <Button key={record.data.noteId} variant="secondary" onClick={() => setRecoveryReview(record)}>Review draft: {record.data.title || 'Untitled Note'}</Button>)}
        </aside>}

        {/* Search */}
        <div className="notes-search-wrapper">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes…" aria-label="Search notes" className="notes-search-input" />
          <Search size={12} className="notes-search-icon" />
        </div>

        {/* Tag filter */}
        {allTags.length > 0 && (
          <div className="notes-tag-filters">
            {allTags.map((t) => (
              <button key={t} onClick={() => setTagFilter(tagFilter === t ? '' : t)}
                aria-pressed={tagFilter === t}
                className="notes-tag-btn"
                style={{
                  background: tagFilter === t ? 'var(--accent)' : 'var(--bg-input)',
                  color: tagFilter === t ? 'var(--gt-on-action)' : 'var(--text-2)',
                  borderColor: tagFilter === t ? 'var(--accent)' : 'var(--border)',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        )}
        {selectedView === 'tags' && allTags.length === 0 && <p>No tags yet. Add a tag while editing a note.</p>}

        {/* Stats */}
        <p style={{ fontSize: '0.62rem', color: 'var(--text-3)' }}>{filtered.length} note{filtered.length !== 1 ? 's' : ''}</p>

        {/* Note list */}
        {filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 0', color: 'var(--text-3)', textAlign: 'center', gap: '0.5rem' }}>
            <FileText size={28} style={{ opacity: 0.25 }} />
            <p style={{ fontSize: '0.78rem' }}>{workspaceNotes.length === 0 ? 'Create your first note' : selectedView === 'pinned' && !search && !tagFilter ? 'No pinned notes yet' : 'No notes match'}</p>
          </div>
        ) : (
          <div className="notes-list-scroll">
            <ul className="notes-record-list" aria-label="Workspace notes">
              {filtered.map(n => (
                  <li key={n.id}>
                    <NoteCard note={n} isActive={activeId === n.id}
                      onClick={() => openNote(n)}
                      onEdit={n => openNote(n, true)}
                      onDelete={handleDelete}
                      onToggleStar={toggleStar}
                      onTogglePin={togglePin}
                      onCopy={copyNote} />
                  </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Editor / Viewer */}
      <div className={`notes-detail-pane ${!activeNote && !editMode ? 'empty-state' : ''}`} style={{ '--card-accent-color': activeNote?.color || draft.color }}>
        {!activeNote && !editMode ? (
          <>
            <FileText size={40} className="notes-empty-icon" />
            <p style={{ fontSize: '0.88rem', fontWeight: 700 }}>Select a note or create a new one</p>
            <Button onClick={newNote} loading={creating} loadingLabel="Creating…" icon={<Plus size={16} />}>New Note</Button>
          </>
        ) : (
          <>
            {recoveryPaused && <div className="notes-recovery-notice">
              <p>{saveStatus === 'conflicting' ? 'The server note changed. Your draft has been kept; export it or save a separate copy.' : 'Recovered draft: autosave is paused. Review the text, then choose Save to submit it.'}</p>
              <Button variant="secondary" loading={recoveryBusy} loadingLabel="Saving copy…" onClick={() => createRecoveredCopy({ ...draft, noteId: activeId, baseUpdatedAt: baseVersion.current })}>Save a separate copy</Button>
            </div>}
            {/* Toolbar */}
            <div className="notes-toolbar">
              <div className="notes-toolbar-left">
                <div className="notes-mode-toggles">
                  {['preview', 'edit'].map(m => (
                    <button key={m} onClick={() => setViewMode(m)} aria-pressed={viewMode === m} className={`notes-mode-btn ${viewMode === m ? 'active' : ''}`}>{m}</button>
                  ))}
                </div>
                {viewMode === 'edit' && (
                  <div className="notes-formatting-bar">
                    {[
                      { l: 'B', s: 'bold', title: 'Bold' }, { l: 'I', s: 'italic', title: 'Italic' },
                      { l: '`', s: 'code', title: 'Inline code' }, { l: 'H3', s: 'h3', title: 'Heading' },
                      { l: '☐', s: 'check', title: 'Task checkbox' }, { l: '🔗', s: 'link', title: 'Link' },
                    ].map(b => (
                      <button key={b.s} onClick={() => insertMarkdown(b.s)} className="notes-fmt-btn" title={b.title} aria-label={b.title}>{b.l}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="notes-toolbar-right">
                <Button variant="secondary" onClick={exportNote} icon={<Download size={16} />}>Export Markdown</Button>
                {viewMode === 'edit' && (
                  <div className="notes-autosave-indicator">
                    <span className="notes-autosave-dot" />
                    <span role="status" aria-live="polite">{wordCount}w · {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'conflicting' ? 'Save conflict' : saveStatus === 'failed' ? 'Save failed' : saveStatus === 'unsaved' ? 'Unsaved changes' : 'Saved'}</span>
                  </div>
                )}
                <Button onClick={() => { if (editMode) saveNote(); else { setEditMode(true); setViewMode('edit'); } }}
                  variant={editMode ? 'primary' : 'secondary'} loading={saveStatus === 'saving'} loadingLabel="Saving…"
                  icon={editMode ? <Check size={16} /> : <Edit3 size={16} />}>
                  {editMode ? 'Save' : 'Edit'}
                </Button>
              </div>
            </div>

            {/* Title */}
            <div className="notes-title-section">
              {editMode ? (
                <input value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                  aria-label="Note title"
                  placeholder="Note title…"
                  className="notes-title-input" />
              ) : (
                <h2 className="notes-title-display">{activeNote?.title || draft.title || 'Untitled'}</h2>
              )}
            </div>

            {/* Tags editor */}
            {editMode ? (
              <div className="notes-tags-section">
                {draft.tags.map(t => (
                  <button key={t} type="button" className="notes-tag-badge"
                    aria-label={`Remove tag ${t}`}
                    onClick={() => setDraft(d => ({ ...d, tags: d.tags.filter(x => x !== t) }))}>
                    {t} ×
                  </button>
                ))}
                <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }}
                  placeholder="+ tag"
                  aria-label="Add a tag"
                  className="notes-tag-input" />
              </div>
            ) : (
              (activeNote?.tags || []).length > 0 && (
                <div className="notes-tags-section" style={{ borderBottom: 'none' }}>
                  {(activeNote?.tags || []).map(t => (
                    <span key={t} className="notes-tag-badge" style={{ cursor: 'default' }}>{t}</span>
                  ))}
                </div>
              )
            )}

            {/* Content */}
            <div className="notes-content-body">
              {editMode && viewMode === 'edit' ? (
                <textarea
                  ref={textRef}
                  value={draft.content}
                  onChange={e => setDraft(d => ({ ...d, content: e.target.value }))}
                  aria-label="Note content"
                  placeholder="Start writing… Markdown supported.&#10;&#10;# Headings&#10;**bold** *italic* `code`&#10;- [ ] Todo items&#10;> Blockquotes"
                  className="notes-textarea"
                />
              ) : (
                <div className="notes-markdown-preview">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: props => <a href={props.href} title={props.title} target="_blank" rel="noreferrer">{props.children}</a>,
                      blockquote: props => <blockquote>{props.children}</blockquote>,
                    }}
                  >
                    {editMode ? draft.content : (activeNote?.content || '')}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            {/* Color picker + meta */}
            {editMode && (
              <div className="notes-footer-picker">
                <span className="notes-footer-picker-title">Color Theme</span>
                <div className="notes-color-dots">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setDraft(d => ({ ...d, color: c }))}
                      className={`notes-color-dot ${draft.color === c ? 'active' : ''}`}
                      aria-label={`Use ${c} note color`}
                      aria-pressed={draft.color === c}
                      style={{ background: c, '--card-accent-color': c }} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
