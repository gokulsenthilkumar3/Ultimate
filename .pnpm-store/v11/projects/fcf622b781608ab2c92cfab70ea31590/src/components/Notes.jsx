import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit3, Tag, Search, Star, StarOff, Pin, PinOff, Copy, Check, FileText } from 'lucide-react';
import useStore from '../store/useStore';
import { useToast } from '../hooks/useToast';
import EmptyState from './ui/EmptyState';
import { FixedSizeList as List } from '../lib/FixedSizeList';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import '../styles/notes.css';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#8b5cf6', '#ec4899', '#6b7280'];

// ── Markdown parser (no deps) ──────────────────────────────────────────────
const TAG_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#8b5cf6', '#ec4899'];

function NoteCard({ note, onEdit, onDelete, onToggleStar, onTogglePin, onCopy, isActive, onClick }) {
  const tags = note.tags || [];
  const preview = (note.content || '').slice(0, 160).replace(/[#*`_~\[\]]/g, '');
  const wordCount = (note.content || '').split(/\s+/).filter(Boolean).length;

  return (
    <div onClick={onClick} className={`note-card ${isActive ? 'active' : ''}`} style={{ '--card-accent-color': note.color }}>
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
            <span key={i} className="note-card-tag" style={{ background: `${TAG_COLORS[i % TAG_COLORS.length]}18`, color: TAG_COLORS[i % TAG_COLORS.length], borderColor: `${TAG_COLORS[i % TAG_COLORS.length]}33` }}>{tag}</span>
          ))}
        </div>
      )}
      <div className="note-card-footer">
        <span className="note-card-meta">{wordCount}w · {note.updatedAt?.slice(0, 10) || '—'}</span>
        <div className="note-card-actions" onClick={e => e.stopPropagation()}>
          <button onClick={() => onTogglePin(note.id)} className={`note-card-action-btn ${note.pinned ? 'pin-active' : ''}`} title={note.pinned ? 'Unpin' : 'Pin'}><Pin size={12} /></button>
          <button onClick={() => onToggleStar(note.id)} className={`note-card-action-btn ${note.starred ? 'star-active' : ''}`} title={note.starred ? 'Unstar' : 'Star'}><Star size={12} fill={note.starred ? 'currentColor' : 'none'} /></button>
          <button onClick={() => onCopy(note)} className="note-card-action-btn" title="Copy"><Copy size={12} /></button>
          <button onClick={() => onEdit(note)} className="note-card-action-btn" title="Edit"><Edit3 size={12} /></button>
          <button onClick={() => onDelete(note.id)} className="note-card-action-btn delete-btn" title="Delete"><Trash2 size={12} /></button>
        </div>
      </div>
    </div>
  );
}

export default function Notes() {
  const toast = useToast();
  const notes      = useStore(s => s.notes)      || [];
  const addNote    = useStore(s => s.addNote);
  const updateNote = useStore(s => s.updateNote);
  const deleteNote = useStore(s => s.deleteNote);

  const [activeId,  setActiveId]  = useState(null);
  const [editMode,  setEditMode]  = useState(false);
  const [draft,     setDraft]     = useState({ title: '', content: '', tags: [], color: COLORS[0] });
  const [tagInput,  setTagInput]  = useState('');
  const [search,    setSearch]    = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [viewMode,  setViewMode]  = useState('preview');
  const [autoSaveTimer, setAutoSaveTimer] = useState(null);
  const textRef = useRef(null);

  const activeNote = useMemo(() => notes.find(n => n.id === activeId), [notes, activeId]);

  // Auto-save on content change
  useEffect(() => {
    if (!editMode || !activeId) return;
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    const t = setTimeout(() => {
      if (typeof updateNote === 'function') {
        updateNote(activeId, { ...draft, updatedAt: new Date().toISOString() });
      }
    }, 1200);
    setAutoSaveTimer(t);
    return () => clearTimeout(t);
  }, [draft]);

  const allTags = useMemo(() => {
    const tags = new Set();
    notes.forEach(n => (n.tags || []).forEach(t => tags.add(t)));
    return [...tags];
  }, [notes]);

  const filtered = useMemo(() => {
    let list = notes;
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
  }, [notes, search, tagFilter]);

  const newNote = () => {
    const note = {
      id: Date.now(),
      title: 'Untitled Note',
      content: '',
      tags: [],
      color: COLORS[0],
      pinned: false,
      starred: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (typeof addNote === 'function') addNote(note);
    else if (typeof updateNote === 'function') updateNote(note.id, note);
    setActiveId(note.id);
    setDraft({ title: note.title, content: '', tags: [], color: COLORS[0] });
    setEditMode(true);
    setTimeout(() => textRef.current?.focus(), 100);
  };

  const openNote = (note) => {
    setActiveId(note.id);
    setDraft({ title: note.title || '', content: note.content || '', tags: note.tags || [], color: note.color || COLORS[0] });
    setEditMode(false);
  };

  const saveNote = () => {
    if (!activeId) return;
    const title = draft.title.trim() || 'Untitled Note';
    const updatedDraft = { ...draft, title };
    if (typeof updateNote === 'function') {
      updateNote(activeId, { ...updatedDraft, updatedAt: new Date().toISOString() });
    }
    setDraft(updatedDraft);
    setEditMode(false);
    toast.success('Note saved successfully');
  };

  const handleDelete = (id) => {
    const n = notes.find(x => x.id === id);
    if (typeof deleteNote === 'function') deleteNote(id);
    if (activeId === id) { setActiveId(null); setEditMode(false); }
    toast.info('Note deleted', 5000, { action: { label: 'Undo', onClick: () => { if (n && typeof addNote === 'function') addNote(n); } } });
  };

  const toggleStar = (id) => {
    const n = notes.find(x => x.id === id);
    if (n && typeof updateNote === 'function') updateNote(id, { starred: !n.starred, updatedAt: new Date().toISOString() });
  };

  const togglePin = (id) => {
    const n = notes.find(x => x.id === id);
    if (n && typeof updateNote === 'function') updateNote(id, { pinned: !n.pinned, updatedAt: new Date().toISOString() });
  };

  const copyNote = (note) => {
    navigator.clipboard.writeText(`# ${note.title}\n\n${note.content}`).then(() => {
      toast.success('Copied to clipboard');
    });
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
      {/* Sidebar */}
      <div className="notes-sidebar">
        {/* Header */}
        <div className="notes-sidebar-header">
          <div>
            <p className="label-caps" style={{ color: 'var(--accent)', fontSize: '0.58rem' }}>Notes</p>
            <h3 className="notes-sidebar-title">My Notes</h3>
          </div>
          <button onClick={newNote} className="btn-primary" style={{ padding: '5px 10px', fontSize: '0.72rem' }}><Plus size={12} /> New</button>
        </div>

        {/* Search */}
        <div className="notes-search-wrapper">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes…" className="notes-search-input" />
          <Search size={12} className="notes-search-icon" />
        </div>

        {/* Tag filter */}
        {allTags.length > 0 && (
          <div className="notes-tag-filters">
            {allTags.map((t, i) => (
              <button key={t} onClick={() => setTagFilter(tagFilter === t ? '' : t)}
                className="notes-tag-btn"
                style={{
                  background: tagFilter === t ? 'var(--accent)' : 'var(--bg-input)',
                  color: tagFilter === t ? '#000' : 'var(--text-2)',
                  borderColor: tagFilter === t ? 'var(--accent)' : 'var(--border)',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Stats */}
        <p style={{ fontSize: '0.62rem', color: 'var(--text-3)' }}>{filtered.length} note{filtered.length !== 1 ? 's' : ''}</p>

        {/* Note list */}
        {filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 0', color: 'var(--text-3)', textAlign: 'center', gap: '0.5rem' }}>
            <FileText size={28} style={{ opacity: 0.25 }} />
            <p style={{ fontSize: '0.78rem' }}>{notes.length === 0 ? 'Create your first note' : 'No notes match'}</p>
          </div>
        ) : (
          <div className="notes-list-scroll">
            <List
              height={480}
              itemCount={filtered.length}
              itemSize={135}
              width="100%"
              itemData={filtered}
            >
              {({ index, style, data }) => {
                const n = data[index];
                return (
                  <div style={{ ...style, paddingBottom: '0.5rem' }}>
                    <NoteCard note={n} isActive={activeId === n.id}
                      onClick={() => openNote(n)}
                      onEdit={n => { openNote(n); setEditMode(true); }}
                      onDelete={handleDelete}
                      onToggleStar={toggleStar}
                      onTogglePin={togglePin}
                      onCopy={copyNote} />
                  </div>
                );
              }}
            </List>
          </div>
        )}
      </div>

      {/* Editor / Viewer */}
      <div className={`notes-detail-pane ${!activeNote && !editMode ? 'empty-state' : ''}`} style={{ '--card-accent-color': activeNote?.color || draft.color }}>
        {!activeNote && !editMode ? (
          <>
            <FileText size={40} className="notes-empty-icon" />
            <p style={{ fontSize: '0.88rem', fontWeight: 700 }}>Select a note or create a new one</p>
            <button onClick={newNote} className="btn-primary"><Plus size={14} /> New Note</button>
          </>
        ) : (
          <>
            {/* Toolbar */}
            <div className="notes-toolbar">
              <div className="notes-toolbar-left">
                <div className="notes-mode-toggles">
                  {['preview', 'edit'].map(m => (
                    <button key={m} onClick={() => setViewMode(m)} className={`notes-mode-btn ${viewMode === m ? 'active' : ''}`}>{m}</button>
                  ))}
                </div>
                {viewMode === 'edit' && (
                  <div className="notes-formatting-bar">
                    {[
                      { l: 'B', s: 'bold', title: 'Bold' }, { l: 'I', s: 'italic', title: 'Italic' },
                      { l: '`', s: 'code', title: 'Inline code' }, { l: 'H3', s: 'h3', title: 'Heading' },
                      { l: '☐', s: 'check', title: 'Task checkbox' }, { l: '🔗', s: 'link', title: 'Link' },
                    ].map(b => (
                      <button key={b.s} onClick={() => insertMarkdown(b.s)} className="notes-fmt-btn" title={b.title}>{b.l}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="notes-toolbar-right">
                {viewMode === 'edit' && (
                  <div className="notes-autosave-indicator">
                    <span className="notes-autosave-dot" />
                    <span>{wordCount}w · Auto-saved</span>
                  </div>
                )}
                <button onClick={() => { if (editMode) saveNote(); else setEditMode(true); }}
                  className={editMode ? 'btn-primary' : 'btn-ghost'}
                  style={{ padding: '4px 12px', fontSize: '0.72rem' }}>
                  {editMode ? <><Check size={12} /> Save</> : <><Edit3 size={12} /> Edit</>}
                </button>
              </div>
            </div>

            {/* Title */}
            <div className="notes-title-section">
              {editMode ? (
                <input value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
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
                  <span key={t} className="notes-tag-badge"
                    onClick={() => setDraft(d => ({ ...d, tags: d.tags.filter(x => x !== t) }))}>
                    {t} ×
                  </span>
                ))}
                <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }}
                  placeholder="+ tag"
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
                  placeholder="Start writing… Markdown supported.&#10;&#10;# Headings&#10;**bold** *italic* `code`&#10;- [ ] Todo items&#10;> Blockquotes"
                  className="notes-textarea"
                />
              ) : (
                <div className="notes-markdown-preview">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ node, ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
                      blockquote: ({ node, ...props }) => <blockquote {...props} />,
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
                    <button key={c} onClick={() => {
                      setDraft(d => {
                        const next = { ...d, color: c };
                        if (typeof updateNote === 'function' && activeId) {
                          updateNote(activeId, { ...next, updatedAt: new Date().toISOString() });
                        }
                        return next;
                      });
                    }}
                      className={`notes-color-dot ${draft.color === c ? 'active' : ''}`}
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
