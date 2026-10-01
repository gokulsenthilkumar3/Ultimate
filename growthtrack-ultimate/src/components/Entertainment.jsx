import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Film, Tv, Star, Plus, Trash2, Search, ChevronLeft, ChevronRight,
  X, Filter, BarChart2, Clock, Trophy, SortAsc, SortDesc, Eye
} from 'lucide-react';

import useStore, {
  selectEntertainment,
  selectAddMediaItem,
  selectDeleteMediaItem,
} from '../store/useStore';
import { useToast } from '../hooks/useToast';
import EmptyState from './ui/EmptyState';

const TYPES    = ['Anime', 'Series', 'Movie', 'Documentary'];
const STATUSES = ['Watching', 'Plan to Watch', 'Completed', 'Dropped'];
const STATUS_COLOR = {
  Watching: 'var(--info)', Completed: 'var(--success)',
  Dropped: 'var(--danger)', 'Plan to Watch': 'var(--warning)'
};
const TYPE_COLOR = {
  Anime: '#ec4899', Series: '#0ea5e9', Movie: '#e5a50a', Documentary: '#10b981'
};
const TYPE_ICON = { Anime: '⛩️', Series: '📺', Movie: '🎬', Documentary: '🎥' };
const OTT_PROVIDERS = [
  { name: 'Netflix',         color: '#E50914', icon: '🎬' },
  { name: 'Amazon Prime',    color: '#00A8E1', icon: '📦' },
  { name: 'Disney+ Hotstar', color: '#113CCF', icon: '⭐' },
  { name: 'Zee5',            color: '#8230C6', icon: '📡' },
  { name: 'Apple TV+',       color: '#f5f5f7', icon: '🍎' },
  { name: 'JioCinema',       color: '#003bce', icon: '🎭' },
];
const EMPTY_FORM = { title: '', type: 'Anime', season: 1, episode: 0, total_episodes: '', rating: '', status: 'Plan to Watch' };

// ── RatingDisplay ─────────────────────────────────────────────────────────────
function RatingDisplay({ value }) {
  if (value == null || value === '' || !Number.isFinite(Number(value))) return <span>Unrated</span>;
  const num = typeof value === 'number' && !isNaN(value) ? value : 0;
  const filled = Math.round(num);
  return (
    <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <span key={i} style={{ fontSize: '9px', color: i < filled ? '#e5a50a' : 'rgba(255,255,255,0.1)' }}>●</span>
      ))}
      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#e5a50a', marginLeft: '5px' }}>{num.toFixed(1)}</span>
    </div>
  );
}

// ── Horizontal carousel with scroll buttons ────────────────────────────────────
function HorizontalCarousel({ items, onDelete, onProgress }) {
  const trackRef = useRef(null);
  const [canLeft, setCanLeft]   = useState(false);
  const [canRight, setCanRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => { el.removeEventListener('scroll', checkScroll); window.removeEventListener('resize', checkScroll); };
  }, [checkScroll, items.length]);

  const scroll = (dir) => {
    if (!trackRef.current) return;
    trackRef.current.scrollBy({ left: dir * 320, behavior: 'smooth' });
  };

  if (!items.length) return null;

  return (
    <div style={{ position: 'relative' }}>
      {/* Scroll buttons */}
      {canLeft && (
        <button onClick={() => scroll(-1)}
          style={{ position: 'absolute', left: '-12px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-glass)', backdropFilter: 'blur(12px)', border: '1px solid var(--border-strong)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-1)', transition: 'all 0.2s' }}>
          <ChevronLeft size={18} />
        </button>
      )}
      {canRight && (
        <button onClick={() => scroll(1)}
          style={{ position: 'absolute', right: '-12px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-glass)', backdropFilter: 'blur(12px)', border: '1px solid var(--border-strong)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-1)', transition: 'all 0.2s' }}>
          <ChevronRight size={18} />
        </button>
      )}
      {/* Fades */}
      {canLeft  && <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '48px', background: 'linear-gradient(90deg, var(--bg-surface), transparent)', pointerEvents: 'none', zIndex: 5 }} />}
      {canRight && <div style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: '48px', background: 'linear-gradient(-90deg, var(--bg-surface), transparent)', pointerEvents: 'none', zIndex: 5 }} />}

      <div
        ref={trackRef}
        style={{ display: 'flex', gap: '1rem', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '0.5rem', paddingTop: '4px', scrollSnapType: 'x mandatory' }}
      >
        {items.map(item => (
          <MediaCard key={item.id} item={item} onDelete={onDelete} onProgress={onProgress} />
        ))}
      </div>
    </div>
  );
}

// ── Media Card ────────────────────────────────────────────────────────────────
function MediaCard({ item, onDelete, onProgress }) {
  const [draft, setDraft] = useState(() => ({ title: item.title || '', type: item.type || 'Series', season: item.season ?? 1, episode: item.episode ?? 0, total_episodes: item.total_episodes ?? '', rating: item.rating ?? '', status: item.status || 'Plan to Watch' }));
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (saving) return;
    setSaving(true);
    try { await onProgress(item.id, draft); } finally { setSaving(false); }
  };
  const totalEps   = parseInt(item.total_episodes) || 0;
  const curEp      = parseInt(item.episode) || 0;
  const epProgress = totalEps > 0 ? Math.min(100, Math.round((curEp / totalEps) * 100))
    : item.status === 'Completed' ? 100 : 0;

  return (
    <div
      style={{ flexShrink: 0, width: '280px', scrollSnapAlign: 'start' }}
    >
      <div className="glass-card media-card card-shine-wrap" style={{ width: '100%', height: '100%' }}>
        {/* Colorful top accent */}
        <div style={{ height: '4px', background: `linear-gradient(90deg, ${TYPE_COLOR[item.type] || 'var(--accent)'}, ${STATUS_COLOR[item.status] || 'var(--accent)'})` }} />

        <div className="media-card__body">
          {/* Header */}
          <div className="media-card__header">
            <div>
              <span className="type-badge" style={{ color: TYPE_COLOR[item.type], background: `${TYPE_COLOR[item.type]}18`, border: `1px solid ${TYPE_COLOR[item.type]}30` }}>
                {TYPE_ICON[item.type] || '📺'} {item.type}
              </span>
              <h4 className="media-card__title" style={{ marginTop: '6px', maxWidth: '190px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</h4>
            </div>
            <button disabled={saving} onClick={() => onDelete(item.id, item.title)} className="btn-icon hover-text-danger" style={{ color: 'var(--text-3)', flexShrink: 0 }} aria-label={`Delete ${item.title}`}>
              <Trash2 size={14} />
            </button>
          </div>

          <fieldset disabled={saving} style={{ border: 0, padding: 0, margin: 0 }}>
          <input aria-label={`Title for ${item.title}`} value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} className="form-input" />
          <select aria-label={`Type for ${item.title}`} value={draft.type} onChange={e => setDraft(d => ({ ...d, type: e.target.value }))} className="form-input">{TYPES.map(type => <option key={type}>{type}</option>)}</select>
          {/* Episodes watched, not an invented current-episode number. */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {[{ label: 'S', field: 'season' }, { label: 'Ep', field: 'episode' }].map(({ label, field }) => (
              <div key={field} style={{ flex: 1 }}>
                <p className="label-caps" style={{ marginBottom: '3px', fontSize: '0.6rem' }}>{label}</p>
                <input type="number" aria-label={`${field === 'episode' ? 'Episodes watched' : 'Season'} for ${item.title}`} value={draft[field]}
                  onChange={e => setDraft(d => ({ ...d, [field]: e.target.value }))}
                  className="form-input" style={{ padding: '0.35rem', fontSize: '0.85rem', textAlign: 'center' }} min={field === 'episode' ? 0 : 1} step="1" />
              </div>
            ))}
            <div style={{ flex: 1 }}>
              <p className="label-caps" style={{ marginBottom: '3px', fontSize: '0.6rem' }}>Total</p>
              <input type="number" aria-label={`Total episodes for ${item.title}`} value={draft.total_episodes}
                onChange={e => setDraft(d => ({ ...d, total_episodes: e.target.value }))}
                className="form-input" style={{ padding: '0.35rem', fontSize: '0.85rem', textAlign: 'center' }} min="0" placeholder="?" />
            </div>
          </div>

          {/* Episode progress bar */}
          {totalEps > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.65rem' }}>
                <span style={{ color: 'var(--text-3)' }}>Progress</span>
                <span style={{ fontWeight: 700, color: STATUS_COLOR[item.status] }}>{epProgress}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${epProgress}%`, background: `linear-gradient(90deg, ${STATUS_COLOR[item.status]}, ${TYPE_COLOR[item.type]})` }} />
              </div>
            </div>
          )}

          {/* Rating display + slider */}
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <p className="label-caps" style={{ fontSize: '0.6rem' }}>Rating</p>
              <RatingDisplay value={item.rating} />
            </div>
            <input type="number" aria-label={`Rating for ${item.title}`} min="0" max="10" step="0.5" placeholder="Unrated"
              value={draft.rating}
              onChange={e => setDraft(d => ({ ...d, rating: e.target.value }))}
              style={{ width: '100%', accentColor: '#e5a50a', cursor: 'pointer' }} />
          </div>

          {/* Status selector */}
          <div className="media-card__footer">
            <select aria-label={`Status for ${item.title}`} value={draft.status}
              onChange={e => setDraft(d => ({ ...d, status: e.target.value }))}
              className="form-input"
              style={{ width: '100%', padding: '5px 8px', fontSize: '0.75rem', borderColor: STATUS_COLOR[item.status], color: STATUS_COLOR[item.status], fontWeight: 700, background: `${STATUS_COLOR[item.status]}10` }}>
              {STATUSES.map(s => <option key={s} value={s} style={{ color: 'var(--text-1)', background: 'var(--bg-surface)', fontWeight: 500 }}>{s}</option>)}
            </select>
          </div>
          <button className="gt-button gt-button--primary" onClick={save} style={{ width: '100%', justifyContent: 'center' }}>{saving ? 'Saving…' : 'Save progress'}</button>
          </fieldset>
        </div>

        {/* Progress stripe at bottom */}
        <div className="media-card__progress-track">
          <div className="media-card__progress-fill"
            style={{ width: item.status === 'Completed' ? '100%' : `${epProgress}%`, background: `linear-gradient(90deg, ${STATUS_COLOR[item.status]}, ${TYPE_COLOR[item.type]})` }} />
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Entertainment() {
  const { media }           = useStore(selectEntertainment);
  const addMediaItem        = useStore(selectAddMediaItem);
  const deleteMediaItem     = useStore(selectDeleteMediaItem);
  const updateMediaItem = useStore(s => s.updateMediaItem);
  const entertainmentSync = useStore(s => s.wellnessData?.entertainment) || {};
  const setEntertainmentSync = useStore(s => s.setEntertainmentSync);
  const toast = useToast();

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const createId = useRef(null);
  const perform = async (operation) => {
    if (pending.current) return false;
    pending.current = true; setBusy(true); setError('');
    try { await operation(); return true; }
    catch (failure) { const message = failure.message || 'Save failed. Try again.'; setError(message); toast.error(message); return false; }
    finally { pending.current = false; setBusy(false); }
  };
  const [form, setForm]             = useState(EMPTY_FORM);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab]   = useState('Library');
  const [sortBy, setSortBy]         = useState('added');
  const [sortDir, setSortDir]       = useState('desc');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterType, setFilterType]     = useState('All');
  const syncedOTTs = entertainmentSync.otts || [];

  const toggleSync = async (provider) => {
    const next = syncedOTTs.includes(provider)
      ? syncedOTTs.filter(x => x !== provider)
      : [...syncedOTTs, provider];
    if (await perform(() => setEntertainmentSync({ otts: next }))) toast.success('Subscription indicator saved. No account was linked.');
  };

  const handleAdd = async () => {
    if (!form.title.trim()) { toast.error('Title cannot be empty'); return; }
    if (!createId.current) createId.current = crypto.randomUUID();
    if (await perform(() => addMediaItem({ ...form, id: createId.current }))) {
      createId.current = null; setForm(EMPTY_FORM); toast.success(`"${form.title}" added to library`);
    }
  };

  const handleDelete = async (id, title) => {
    const session = useStore.getState()._sessionVersion;
    await perform(async () => {
      const removed = await deleteMediaItem(id);
      toast.info(`"${title}" removed`, 8000, { action: { label: 'Undo', onClick: async () => {
        if (useStore.getState()._sessionVersion !== session) { toast.error('Sign in to the original account to restore this title.'); return; }
        if (await perform(() => addMediaItem(removed))) toast.success('Title restored.');
      } } });
    });
  };

  const handleProgress = async (id, draft) => {
    if (await perform(() => updateMediaItem(id, draft))) toast.success('Progress saved.');
  };

  const cycleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    let list = media.filter(m => {
      const matchSearch = String(m.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || String(m.type || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'All' || m.status === filterStatus;
      const matchType   = filterType === 'All' || m.type === filterType;
      return matchSearch && matchStatus && matchType;
    });
    list = [...list].sort((a, b) => {
      let va, vb;
      if (sortBy === 'added') return sortDir === 'asc' ? String(a.createdAt || '').localeCompare(String(b.createdAt || '')) : String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
      if (sortBy === 'rating') { va = parseFloat(a.rating) || 0; vb = parseFloat(b.rating) || 0; return sortDir === 'asc' ? va - vb : vb - va; }
      if (sortBy === 'progress') {
        const getPct = x => { const t = parseInt(x.total_episodes) || 0; return t > 0 ? (parseInt(x.episode) || 0) / t : (x.status === 'Completed' ? 1 : 0); };
        va = getPct(a); vb = getPct(b); return sortDir === 'asc' ? va - vb : vb - va;
      }
      va = a.title || ''; vb = b.title || '';
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    return list;
  }, [media, searchTerm, filterStatus, filterType, sortBy, sortDir]);

  // Group by type for carousel
  const byType = useMemo(() => {
    return TYPES.reduce((acc, type) => {
      const items = filtered.filter(m => m.type === type);
      if (items.length) acc[type] = items;
      return acc;
    }, {});
  }, [filtered]);

  const stats = useMemo(() => ({
    total: media.length,
    watching: media.filter(m => m.status === 'Watching').length,
    completed: media.filter(m => m.status === 'Completed').length,
    avgRating: (() => { const rated = media.filter(m => m.rating != null && m.rating !== '' && Number.isFinite(Number(m.rating))); return rated.length ? (rated.reduce((s, m) => s + Number(m.rating), 0) / rated.length).toFixed(1) : '—'; })(),
    backlog: media.filter(m => m.status === 'Plan to Watch').length,
  }), [media]);

  const SortIcon = sortDir === 'asc' ? SortAsc : SortDesc;
  const TABS = ['Library', 'Stats', 'Sync'];

  return (
    <div className="fade-in module-page">
      {error && <p role="alert">{error}</p>}
      {/* Header */}
      <header className="page-header-block gt-editorial-header">
        <div className="gt-editorial-header__intro">
          <p className="gt-editorial-header__eyebrow">Life / Entertainment</p>
          <h1 className="gt-editorial-header__title">
            <span className="gt-editorial-header__icon"><Film size={24} /></span>
            Entertainment Tracker
          </h1>
          <p className="gt-editorial-header__subtitle">Track your Anime, Series, Movies and Documentaries.</p>
        </div>
      </header>

      {/* KPI row */}
      <div className="stats-grid" style={{ marginBottom: '1.75rem' }}>
        {[
          { label: 'Total', value: stats.total, icon: Film, color: 'var(--accent)' },
          { label: 'Watching', value: stats.watching, icon: Eye, color: 'var(--info)' },
          { label: 'Completed', value: stats.completed, icon: Trophy, color: 'var(--success)' },
          { label: 'Backlog', value: stats.backlog, icon: Clock, color: 'var(--warning)' },
          { label: 'Avg Rating', value: stats.avgRating, icon: Star, color: '#e5a50a' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-card stat-card card-shine-wrap" style={{ '--stat-accent': color }}>
            <div className="stat-card__header">
              <Icon size={16} />
              <span className="label-caps">{label}</span>
            </div>
            <p className="stat-card__value">{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="gt-tabs" data-responsive-foundation style={{ marginBottom: '1.5rem' }}>
        <div role="tablist">
          {TABS.map(tab => (
            <button key={tab} role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* LIBRARY TAB */}
      {activeTab === 'Library' && (
        <>
          {/* Add form + search */}
          <div className="dual-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="glass-card" style={{ borderTop: '3px solid var(--accent)' }}>
              <span className="card-title">Add New Title</span>
              <div className="form-stack" style={{ marginTop: '0.75rem' }}>
                <input type="text" placeholder="Title name…" value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  className="form-input" />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="form-input" style={{ flex: 1 }}>
                    {TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="form-input" style={{ flex: 1 }}>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <p className="label-caps" style={{ marginBottom: '4px' }}>Total Episodes</p>
                    <input type="number" placeholder="e.g. 24" value={form.total_episodes}
                      onChange={e => setForm({ ...form, total_episodes: e.target.value })}
                      className="form-input" min="0" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p className="label-caps" style={{ marginBottom: '4px' }}>Rating (optional)</p>
                    <input aria-label="New title rating" type="number" placeholder="Unrated" min="0" max="10" step="0.5" value={form.rating}
                      onChange={e => setForm({ ...form, rating: e.target.value })}
                      style={{ width: '100%', accentColor: '#e5a50a' }} />
                  </div>
                </div>
                <button disabled={busy} onClick={handleAdd} className="gt-button gt-button--primary" style={{ width: '100%', justifyContent: 'center' }}>
                  <Plus size={16} /> Add to Library
                </button>
              </div>
            </div>

            <div className="glass-card">
              <span className="card-title">Filters & Sort</span>
              <div className="form-stack" style={{ marginTop: '0.75rem' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
                  <input type="text" placeholder="Search library…" value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="form-input" style={{ paddingLeft: '38px' }} />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex' }}>
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div>
                  <p className="label-caps" style={{ marginBottom: '6px' }}><Filter size={10} style={{ display: 'inline', marginRight: '4px' }} />Filter by Status</p>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {['All', ...STATUSES].map(s => (
                      <button key={s} onClick={() => setFilterStatus(s)}
                        className={`gt-button gt-button--sm ${filterStatus === s ? 'gt-button--primary' : 'gt-button--secondary'}`}
                        style={{ fontSize: '0.7rem' }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="label-caps" style={{ marginBottom: '6px' }}>Filter by Type</p>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {['All', ...TYPES].map(t => (
                      <button key={t} onClick={() => setFilterType(t)}
                        className={`gt-button gt-button--sm ${filterType === t ? 'gt-button--primary' : 'gt-button--secondary'}`}
                        style={{ fontSize: '0.7rem', color: filterType === t ? undefined : TYPE_COLOR[t] }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="label-caps" style={{ marginBottom: '6px' }}>Sort By</p>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[['added', 'Added'], ['title', 'Title'], ['rating', 'Rating'], ['progress', 'Progress']].map(([field, label]) => (
                      <button key={field} onClick={() => cycleSort(field)}
                        className={`gt-button gt-button--sm ${sortBy === field ? 'gt-button--primary' : 'gt-button--secondary'}`}
                        style={{ fontSize: '0.7rem' }}>
                        {label} {sortBy === field && <SortIcon size={12} />}
                      </button>
                    ))}
                  </div>
                </div>

                <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', textAlign: 'right' }}>{filtered.length} title{filtered.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          {/* Carousels grouped by type */}
          {Object.keys(byType).length === 0 ? (
            <EmptyState icon={Tv} title="No titles found" description="Add your first title using the form above." />
          ) : (
            Object.entries(byType).map(([type, items]) => (
              <div key={type} style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.85rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '1.2rem' }}>{TYPE_ICON[type]}</span>
                  <span style={{ fontWeight: 900, color: TYPE_COLOR[type], fontSize: '0.95rem', letterSpacing: '0.04em' }}>{type}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginLeft: '2px' }}>({items.length})</span>
                  <div style={{ flex: 1 }} />
                  {/* Quick filter: just watching */}
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>
                    {items.filter(m => m.status === 'Watching').length} watching
                    · {items.filter(m => m.status === 'Completed').length} done
                  </span>
                </div>
                <HorizontalCarousel items={items} onDelete={handleDelete} onProgress={handleProgress} />
              </div>
            ))
          )}
        </>
      )}

      {/* STATS TAB */}
      {activeTab === 'Stats' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card">
            <span className="card-title"><BarChart2 size={16} style={{ display: 'inline', marginRight: '6px' }} />Library Breakdown</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
              {/* By Type */}
              <div>
                <p className="label-caps" style={{ marginBottom: '0.75rem' }}>By Type</p>
                {TYPES.map(type => {
                  const count = media.filter(m => m.type === type).length;
                  const pct = media.length ? Math.round((count / media.length) * 100) : 0;
                  return (
                    <div key={type} style={{ marginBottom: '0.65rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ fontSize: '0.8rem', color: TYPE_COLOR[type], fontWeight: 700 }}>{TYPE_ICON[type]} {type}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{count} ({pct}%)</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: TYPE_COLOR[type], transition: 'width 0.8s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* By Status */}
              <div>
                <p className="label-caps" style={{ marginBottom: '0.75rem' }}>By Status</p>
                {STATUSES.map(status => {
                  const count = media.filter(m => m.status === status).length;
                  const pct = media.length ? Math.round((count / media.length) * 100) : 0;
                  return (
                    <div key={status} style={{ marginBottom: '0.65rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ fontSize: '0.8rem', color: STATUS_COLOR[status], fontWeight: 700 }}>{status}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{count} ({pct}%)</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: STATUS_COLOR[status], transition: 'width 0.8s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Top rated */}
          {media.length > 0 && (
            <div className="glass-card">
              <span className="card-title"><Trophy size={16} style={{ display: 'inline', marginRight: '6px' }} />Top Rated</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                {media.filter(m => m.rating != null && m.rating !== '').sort((a, b) => Number(b.rating) - Number(a.rating)).slice(0, 8).map((m, i) => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem', borderRadius: '10px', background: 'var(--bg-elevated)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 900, color: i < 3 ? '#e5a50a' : 'var(--text-3)', minWidth: '20px', textAlign: 'center' }}>#{i + 1}</span>
                    <span style={{ fontSize: '1rem' }}>{TYPE_ICON[m.type]}</span>
                    <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-1)' }}>{m.title}</span>
                    <RatingDisplay value={m.rating} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SYNC TAB */}
      {activeTab === 'Sync' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Trakt.tv Sync Card */}
          <div className="glass-card" style={{ borderTop: '3px solid #ed1c24', padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem' }}>📡</span>
              <div>
                <h3 style={{ fontWeight: 900, fontSize: '1.1rem', color: '#ed1c24', margin: 0 }}>Trakt.tv Sync</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '2px' }}>Setup required — authenticated watch-history import is not implemented.</p>
              </div>
            </div>
            <button className="btn-primary" disabled>Sync Watch History — setup required</button>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '1rem', lineHeight: 1.6 }}>
              TODO: server-managed Trakt authorization, connection status, paginated history import and acknowledged per-title deduplication. No credentials are collected and no watch history is changed here. Use manual library entry until this integration is available.
            </p>
          </div>

          {/* OTT Provider Sync */}
          <div className="glass-card" style={{ padding: '1.75rem' }}>
            <h3 className="card-title" style={{ marginBottom: '0.5rem' }}>OTT Provider Indicators</h3>
            <p className="text-secondary" style={{ marginBottom: '1.5rem', fontSize: '0.82rem' }}>Manually mark subscriptions for your account. These indicators are saved on the server; they do not connect to providers or sync history.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            {OTT_PROVIDERS.map(provider => {
              const isConnected = syncedOTTs.includes(provider.name);
              return (
                <div key={provider.name} className="card-shine-wrap"
                  style={{ border: `1px solid ${provider.color}${isConnected ? '99' : '44'}`, padding: '1.5rem', borderRadius: '14px', background: `linear-gradient(135deg, ${provider.color}${isConnected ? '22' : '0e'}, transparent)`, display: 'flex', flexDirection: 'column', gap: '0.85rem', alignItems: 'center', textAlign: 'center', transition: 'all 0.2s' }}>
                  <div style={{ fontSize: '2rem' }}>{provider.icon}</div>
                  <h4 style={{ fontWeight: 800, fontSize: '0.95rem', color: provider.color }}>{provider.name}</h4>
                  {isConnected && (
                    <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '99px', background: `${provider.color}22`, border: `1px solid ${provider.color}55`, color: provider.color, fontWeight: 700 }}>
                      ✓ SUBSCRIBED
                    </span>
                  )}
                  <button
                    disabled={busy}
                    className="btn-ghost"
                    style={{ width: '100%', borderColor: provider.color, color: isConnected ? 'var(--text-1)' : provider.color, background: isConnected ? `${provider.color}33` : 'transparent', fontWeight: 800, fontSize: '0.8rem' }}
                    onClick={() => toggleSync(provider.name)}>
                    {isConnected ? 'Unmark' : 'Mark as Subscribed'}
                  </button>
                </div>
              );
            })}
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
