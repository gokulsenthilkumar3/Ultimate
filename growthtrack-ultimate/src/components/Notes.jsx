import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit3, Tag, Search, Star, StarOff, Pin, PinOff, Copy, Check, FileText } from 'lucide-react';
import useStore from '../store/useStore';
import { useToast } from '../hooks/useToast';
import EmptyState from './ui/EmptyState';
import { FixedSizeList as List } from 'react-window';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#8b5cf6', '#ec4899', '#6b7280'];

// ── Markdown parser (no deps) ──────────────────────────────────────────────
function renderMarkdown(text = '') {
  return text
    .replace(/^######\s(.+)$/gm, '<h6 style="font-size:0.72rem;font-weight:700;color:var(--text-2);margin:0.5em 0 0.2em">$1</h6>')
    .replace(/^#####\s(.+)$/gm, '<h5 style="font-size:0.78rem;font-weight:700;color:var(--text-2);margin:0.5em 0 0.2em">$1</h5>')
    .replace(/^####\s(.+)$/gm, '<h4 style="font-size:0.85rem;font-weight:700;margin:0.6em 0 0.25em">$1</h4>')
    .replace(/^###\s(.+)$/gm, '<h3 style="font-size:0.95rem;font-weight:800;margin:0.7em 0 0.3em;color:var(--accent)">$1</h3>')
    .replace(/^##\s(.+)$/gm, '<h2 style="font-size:1.1rem;font-weight:800;margin:0.75em 0 0.3em">$1</h2>')
    .replace(/^#\s(.+)$/gm, '<h1 style="font-size:1.3rem;font-weight:900;margin:0.8em 0 0.35em">$1</h1>')
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/~~(.*?)~~/g, '<del>$1</del>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.12);padding:1px 5px;border-radius:4px;font-family:monospace;font-size:0.88em">$1</code>')
    .replace(/^\s*[-*+]\s+\[x\]\s+(.+)$/gm, '<div style="display:flex;gap:6px;align-items:center"><span style="color:#10b981">☑</span><span style="text-decoration:line-through;color:var(--text-3)">$1</span></div>')
    .replace(/^\s*[-*+]\s+\[ \]\s+(.+)$/gm, '<div style="display:flex;gap:6px;align-items:center"><span style="color:var(--text-3)">☐</span>$1</div>')
    .replace(/^\s*[-*+]\s+(.+)$/gm, '<div style="display:flex;gap:6px;align-items:flex-start"><span style="color:var(--accent);margin-top:3px">•</span>$1</div>')
    .replace(/^\d+\.\s+(.+)$/gm, '<div style="margin-left:1em">$1</div>')
    .replace(/^>\s+(.+)$/gm, '<blockquote style="border-left:3px solid var(--accent);margin:0.5em 0;padding:0.35em 0.75em;color:var(--text-2);font-style:italic;background:rgba(99,102,241,0.06);border-radius:0 8px 8px 0">$1</blockquote>')
    .replace(/^---+$/gm, '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:0.75em 0"/>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:var(--accent);text-decoration:underline">$1</a>')
    .replace(/\n/g, '<br/>');
}

const TAG_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#8b5cf6', '#ec4899'];

function NoteCard({ note, onEdit, onDelete, onToggleStar, onTogglePin, onCopy, isActive, onClick }) {
  const tags = note.tags || [];
  const preview = (note.content || '').slice(0, 160).replace(/[#*`_~\[\]]/g, '');
  const wordCount = (note.content || '').split(/\s+/).filter(Boolean).length;

  return (
    <div onClick={onClick} style={{
      borderRadius: '14px', padding: '0.75rem 1rem', cursor: 'pointer',
      background: isActive ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${isActive ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.07)'}`,
      borderLeft: `3px solid ${note.color || 'var(--accent)'}`,
      transition: 'all 0.15s',
      height: '115px',
      display: 'flex', flexDirection: 'column'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
        <p style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-1)', flex: 1, marginRight: '0.5rem', lineHeight: 1.3 }}>{note.title || 'Untitled'}</p>
        <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
          {note.pinned && <Pin size={11} color="#f59e0b" />}
          {note.starred && <Star size={11} color="#f59e0b" fill="#f59e0b" />}
        </div>
      </div>
      {preview && <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', lineHeight: 1.45, marginBottom: '0.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{preview}</p>}
      {tags.length > 0 && (
        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
          {tags.slice(0, 4).map((tag, i) => (
            <span key={i} style={{ padding: '1px 7px', borderRadius: '99px', fontSize: '0.58rem', fontWeight: 700, background: `${TAG_COLORS[i % TAG_COLORS.length]}22`, color: TAG_COLORS[i % TAG_COLORS.length], border: `1px solid ${TAG_COLORS[i % TAG_COLORS.length]}44` }}>{tag}</span>
          ))}
        </div>
      )}
      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.58rem', color: 'var(--text-3)' }}>{wordCount}w · {note.updatedAt?.slice(0, 10) || '—'}</span>
        <div style={{ display: 'flex', gap: '2px' }} onClick={e => e.stopPropagation()}>
          <button onClick={() => onTogglePin(note.id)} title={note.pinned ? 'Unpin' : 'Pin'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: note.pinned ? '#f59e0b' : 'rgba(255,255,255,0.2)', padding: '2px' }}><Pin size={12} /></button>
          <button onClick={() => onToggleStar(note.id)} title={note.starred ? 'Unstar' : 'Star'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: note.starred ? '#f59e0b' : 'rgba(255,255,255,0.2)', padding: '2px' }}><Star size={12} /></button>
          <button onClick={() => onCopy(note)} title="Copy" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', padding: '2px' }}><Copy size={12} /></button>
          <button onClick={() => onEdit(note)} title="Edit" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', padding: '2px' }}><Edit3 size={12} /></button>
          <button onClick={() => onDelete(note.id)} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(248,113,113,0.4)', padding: '2px' }}><Trash2 size={12} /></button>
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
  const [copied,    setCopied]    = useState(false);
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
    if (typeof updateNote === 'function') updateNote(activeId, { ...draft, updatedAt: new Date().toISOString() });
    setEditMode(false);
    toast.success('Note saved');
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
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const addTag = () => {
    const tag = tagInput.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    if (!tag || draft.tags.includes(tag)) return;
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
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1rem', height: 'calc(100vh - 160px)', minHeight: '500px', padding: '0.5rem 0' }}>
      {/* Sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
          <div>
            <p className="label-caps" style={{ color: 'var(--accent)', fontSize: '0.58rem' }}>Notes</p>
            <h3 style={{ fontWeight: 900, fontSize: '1.1rem', margin: 0 }}>My Notes</h3>
          </div>
          <button onClick={newNote} className="btn-primary" style={{ padding: '5px 10px', fontSize: '0.72rem' }}><Plus size={12} /> New</button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes…" className="form-input" style={{ paddingLeft: '26px', fontSize: '0.78rem' }} />
        </div>

        {/* Tag filter */}
        {allTags.length > 0 && (
          <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
            {allTags.map((t, i) => (
              <button key={t} onClick={() => setTagFilter(tagFilter === t ? '' : t)} style={{
                padding: '2px 8px', borderRadius: '99px', fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer',
                background: tagFilter === t ? TAG_COLORS[i % TAG_COLORS.length] : `${TAG_COLORS[i % TAG_COLORS.length]}18`,
                color: tagFilter === t ? '#fff' : TAG_COLORS[i % TAG_COLORS.length],
                border: `1px solid ${TAG_COLORS[i % TAG_COLORS.length]}55`,
              }}>{t}</button>
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
          <div style={{ flex: 1, minHeight: 0 }}>
            <List
              height={500}
              itemCount={filtered.length}
              itemSize={130}
              width="100%"
              itemData={filtered}
            >
              {({ index, style, data }) => {
                const n = data[index];
                return (
                  <div style={{ ...style, paddingBottom: '0.4rem' }}>
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
      <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden', minWidth: 0 }}>
        {!activeNote && !editMode ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: 'var(--text-3)' }}>
            <FileText size={40} style={{ opacity: 0.15 }} />
            <p style={{ fontSize: '0.88rem' }}>Select a note or create a new one</p>
            <button onClick={newNote} className="btn-primary"><Plus size={14} /> New Note</button>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.07)', flexWrap: 'wrap', gap: '0.4rem' }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                {['preview', 'edit'].map(m => (
                  <button key={m} onClick={() => setViewMode(m)} style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', background: viewMode === m ? 'var(--accent)' : 'rgba(255,255,255,0.05)', color: viewMode === m ? '#000' : 'var(--text-3)', border: 'none', textTransform: 'capitalize' }}>{m}</button>
                ))}
              </div>
              {viewMode === 'edit' && (
                <div style={{ display: 'flex', gap: '3px', marginLeft: '4px' }}>
                  {[
                    { l: 'B', s: 'bold', title: 'Bold' }, { l: 'I', s: 'italic', title: 'Italic' },
                    { l: '`', s: 'code', title: 'Inline code' }, { l: 'H3', s: 'h3', title: 'Heading' },
                    { l: '☐', s: 'check', title: 'Task checkbox' }, { l: '🔗', s: 'link', title: 'Link' },
                  ].map(b => (
                    <button key={b.s} onClick={() => insertMarkdown(b.s)} title={b.title} style={{ width: '24px', height: '24px', borderRadius: '5px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-2)', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 800, fontStyle: b.s === 'italic' ? 'italic' : 'normal' }}>{b.l}</button>
                  ))}
                </div>
              )}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                {viewMode === 'edit' && <span style={{ fontSize: '0.6rem', color: 'var(--text-3)' }}>{wordCount}w · auto-save</span>}
                <button onClick={() => { if (editMode) saveNote(); else setEditMode(true); }}
                  className={editMode ? 'btn-primary' : 'btn-ghost'}
                  style={{ padding: '4px 12px', fontSize: '0.72rem' }}>
                  {editMode ? <><Check size={12} /> Save</> : <><Edit3 size={12} /> Edit</>}
                </button>
              </div>
            </div>

            {/* Title */}
            <div style={{ padding: '1rem 1.25rem 0' }}>
              {editMode ? (
                <input value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                  placeholder="Note title…"
                  style={{ width: '100%', background: 'none', border: 'none', outline: 'none', fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-1)', fontFamily: 'var(--font-display, system-ui)' }} />
              ) : (
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-1)', marginBottom: 0 }}>{activeNote?.title || draft.title || 'Untitled'}</h2>
              )}
            </div>

            {/* Tags editor */}
            {editMode && (
              <div style={{ padding: '0.5rem 1.25rem', display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                {draft.tags.map(t => (
                  <span key={t} style={{ padding: '2px 8px', borderRadius: '99px', fontSize: '0.65rem', fontWeight: 700, background: 'rgba(99,102,241,0.15)', color: '#818cf8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                    onClick={() => setDraft(d => ({ ...d, tags: d.tags.filter(x => x !== t) }))}>
                    {t} ×
                  </span>
                ))}
                <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }}
                  placeholder="+ tag"
                  style={{ fontSize: '0.68rem', background: 'none', border: 'none', outline: 'none', color: 'var(--text-3)', width: '60px' }} />
              </div>
            )}

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 1.25rem 1.25rem' }}>
              {editMode && viewMode === 'edit' ? (
                <textarea
                  ref={textRef}
                  value={draft.content}
                  onChange={e => setDraft(d => ({ ...d, content: e.target.value }))}
                  placeholder="Start writing… Markdown supported.&#10;&#10;# Headings&#10;**bold** *italic* `code`&#10;- [ ] Todo items&#10;> Blockquotes"
                  style={{
                    width: '100%', height: '100%', minHeight: '300px', background: 'none',
                    border: 'none', outline: 'none', color: 'var(--text-1)', fontSize: '0.88rem',
                    lineHeight: 1.7, resize: 'none', fontFamily: 'var(--font-mono, monospace)',
                  }}
                />
              ) : (
                <div style={{ fontSize: '0.88rem', color: 'var(--text-1)', lineHeight: 1.75 }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(editMode ? draft.content : (activeNote?.content || '')) }} />
              )}
            </div>

            {/* Color picker + meta */}
            {editMode && (
              <div style={{ padding: '0.5rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-3)' }}>Color:</span>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setDraft(d => ({ ...d, color: c }))} style={{ width: '16px', height: '16px', borderRadius: '50%', background: c, border: draft.color === c ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer', padding: 0 }} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
