import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Film, Tv, Star, Plus, Trash2, Search, ChevronLeft, ChevronRight,
  X, Filter, BarChart2, Clock, Trophy, SortAsc, SortDesc, Eye
} from 'lucide-react';
import useStore, {
  selectEntertainment,
  selectAddMediaItem,
  selectDeleteMediaItem,
  selectUpdateMediaProgress,
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
const EMPTY_FORM = { title: '', type: 'Anime', season: 1, episode: 1, total_episodes: '', rating: 7.0, status: 'Watching' };

// ── RatingDisplay ─────────────────────────────────────────────────────────────
function RatingDisplay({ value }) {
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
            <button onClick={() => onDelete(item.id, item.title)} className="btn-icon hover-text-danger" style={{ color: 'var(--text-3)', flexShrink: 0 }} aria-label="Delete">
              <Trash2 size={14} />
            </button>
          </div>

          {/* Season/Ep/Total */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {[{ label: 'S', field: 'season' }, { label: 'Ep', field: 'episode' }].map(({ label, field }) => (
              <div key={field} style={{ flex: 1 }}>
                <p className="label-caps" style={{ marginBottom: '3px', fontSize: '0.6rem' }}>{label}</p>
                <input type="number" value={item[field]}
                  onChange={e => { const v = parseInt(e.target.value); if (v >= 1) onProgress(item.id, field, v); }}
                  className="form-input" style={{ padding: '0.35rem', fontSize: '0.85rem', textAlign: 'center' }} min="1" />
              </div>
            ))}
            <div style={{ flex: 1 }}>
              <p className="label-caps" style={{ marginBottom: '3px', fontSize: '0.6rem' }}>Total</p>
              <input type="number" value={item.total_episodes || ''}
                onChange={e => onProgress(item.id, 'total_episodes', parseInt(e.target.value) || 0)}
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
              <RatingDisplay value={parseFloat(item.rating) || 0} />
            </div>
            <input type="range" min="0" max="10" step="0.5"
              value={parseFloat(item.rating) || 0}
              onChange={e => onProgress(item.id, 'rating', parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#e5a50a', cursor: 'pointer' }} />
          </div>

          {/* Status selector */}
          <div className="media-card__footer">
            <select value={item.status}
              onChange={e => onProgress(item.id, 'status', e.target.value)}
              className="form-input"
              style={{ width: '100%', padding: '5px 8px', fontSize: '0.75rem', borderColor: STATUS_COLOR[item.status], color: STATUS_COLOR[item.status], fontWeight: 700, background: `${STATUS_COLOR[item.status]}10` }}>
              {STATUSES.map(s => <option key={s} value={s} style={{ color: 'var(--text-1)', background: 'var(--bg-surface)', fontWeight: 500 }}>{s}</option>)}
            </select>
          </div>
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
  const updateMediaProgress = useStore(selectUpdateMediaProgress);
  const entertainmentSync   = useStore(s => s.entertainmentSync) || { otts: ['Netflix'] };
  const setEntertainmentSync = useStore(s => s.setEntertainmentSync);
  const toast = useToast();

  const [form, setForm]             = useState(EMPTY_FORM);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab]   = useState('Library');
  const [sortBy, setSortBy]         = useState('added');
  const [sortDir, setSortDir]       = useState('desc');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterType, setFilterType]     = useState('All');
  const syncedOTTs = entertainmentSync.otts || ['Netflix'];

  const toggleSync = (provider) => {
    const next = syncedOTTs.includes(provider)
      ? syncedOTTs.filter(x => x !== provider)
      : [...syncedOTTs, provider];
    setEntertainmentSync({ otts: next });
    toast.success(syncedOTTs.includes(provider) ? `${provider} unlinked.` : `${provider} linked.`);
  };

  const handleAdd = useCallback(() => {
    if (!form.title.trim()) { toast.error('Title cannot be empty'); return; }
    addMediaItem({ ...form, total_episodes: parseInt(form.total_episodes) || 0 });
    setForm(EMPTY_FORM);
    toast.success(`"${form.title}" added to library 🎬`);
  }, [form, addMediaItem, toast]);

  const handleDelete = useCallback((id, title) => {
    deleteMediaItem(id);
    toast.info(`"${title}" removed`);
  }, [deleteMediaItem, toast]);

  const handleProgress = useCallback((id, field, value) => {
    updateMediaProgress(id, field, value);
  }, [updateMediaProgress]);

  const cycleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    let list = media.filter(m => {
      const matchSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase()) || m.type.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'All' || m.status === filterStatus;
      const matchType   = filterType === 'All' || m.type === filterType;
      return matchSearch && matchStatus && matchType;
    });
    list = [...list].sort((a, b) => {
      let va, vb;
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
    avgRating: media.length ? (media.reduce((s, m) => s + (parseFloat(m.rating) || 0), 0) / media.length).toFixed(1) : '—',
    backlog: media.filter(m => m.status === 'Plan to Watch').length,
  }), [media]);

  const SortIcon = sortDir === 'asc' ? SortAsc : SortDesc;
  const TABS = ['Library', 'Stats', 'Sync'];

  return (
    <div className="fade-in module-page">
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.35rem' }}>Entertainment</p>
        <h2 className="text-display" style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.4rem' }}>
          <Film size={24} color="var(--accent)" /> Entertainment Tracker
        </h2>
        <p className="text-secondary">Track your Anime, Series, Movies and Documentaries.</p>
      </div>

      {/* KPI row */}
      <div className="stagger-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.85rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total', value: stats.total, icon: Film, color: 'var(--accent)' },
          { label: 'Watching', value: stats.watching, icon: Eye, color: 'var(--info)' },
          { label: 'Completed', value: stats.completed, icon: Trophy, color: 'var(--success)' },
          { label: 'Backlog', value: stats.backlog, icon: Clock, color: 'var(--warning)' },
          { label: 'Avg Rating', value: stats.avgRating, icon: Star, color: '#e5a50a' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-card card-shine-wrap" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span className="label-caps">{label}</span>
              <Icon size={15} color={color} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color, fontFamily: 'var(--font-display)', lineHeight: 1, marginTop: '0.3rem' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button key={tab} className={`btn-sm${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
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
                    <p className="label-caps" style={{ marginBottom: '4px' }}>Rating: {form.rating.toFixed(1)}</p>
                    <input type="range" min="0" max="10" step="0.5" value={form.rating}
                      onChange={e => setForm({ ...form, rating: parseFloat(e.target.value) })}
                      style={{ width: '100%', accentColor: '#e5a50a' }} />
                  </div>
                </div>
                <button onClick={handleAdd} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
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
                        className={`btn-sm${filterStatus === s ? ' active' : ''}`}
                        style={{ fontSize: '0.65rem', padding: '3px 8px' }}>
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
                        className={`btn-sm${filterType === t ? ' active' : ''}`}
                        style={{ fontSize: '0.65rem', padding: '3px 8px', color: filterType === t ? TYPE_COLOR[t] : undefined, borderColor: filterType === t ? TYPE_COLOR[t] : undefined }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="label-caps" style={{ marginBottom: '6px' }}>Sort By</p>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[['title', 'Title'], ['rating', 'Rating'], ['progress', 'Progress']].map(([field, label]) => (
                      <button key={field} onClick={() => cycleSort(field)}
                        className={`btn-sm${sortBy === field ? ' active' : ''}`}
                        style={{ fontSize: '0.65rem', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        {label} {sortBy === field && <SortIcon size={10} />}
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
                {[...media].sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0)).slice(0, 8).map((m, i) => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem', borderRadius: '10px', background: 'var(--bg-elevated)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 900, color: i < 3 ? '#e5a50a' : 'var(--text-3)', minWidth: '20px', textAlign: 'center' }}>#{i + 1}</span>
                    <span style={{ fontSize: '1rem' }}>{TYPE_ICON[m.type]}</span>
                    <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-1)' }}>{m.title}</span>
                    <RatingDisplay value={parseFloat(m.rating) || 0} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SYNC TAB */}
      {activeTab === 'Sync' && (
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h3 className="card-title" style={{ marginBottom: '0.5rem' }}>OTT Provider Sync</h3>
          <p className="text-secondary" style={{ marginBottom: '2rem', fontSize: '0.82rem' }}>Connect your streaming accounts to pull watch history into your library automatically.</p>
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
                      ✓ CONNECTED
                    </span>
                  )}
                  <button
                    className="btn-ghost"
                    style={{ width: '100%', borderColor: provider.color, color: isConnected ? 'var(--text-1)' : provider.color, background: isConnected ? `${provider.color}33` : 'transparent', fontWeight: 800, fontSize: '0.8rem' }}
                    onClick={() => toggleSync(provider.name)}>
                    {isConnected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
