import React, { useState, useMemo, useCallback } from 'react';
import { Film, Tv, Star, Plus, Trash2, Search } from 'lucide-react';
import useStore, {
  selectEntertainment,
  selectAddMediaItem,
  selectDeleteMediaItem,
  selectUpdateMediaProgress,
} from '../store/useStore';
import { useToast } from '../hooks/useToast';
import StatCard from './ui/StatCard';
import PageHeader from './ui/PageHeader';

const TYPES    = ['Anime', 'Series', 'Movie', 'Documentary'];
const STATUSES = ['Watching', 'Plan to Watch', 'Completed', 'Dropped'];
const STATUS_COLOR = { Watching: 'var(--info)', Completed: 'var(--success)', Dropped: 'var(--danger)', 'Plan to Watch': 'var(--warning)' };
const TYPE_COLOR   = { Anime: '#ec4899', Series: '#0ea5e9', Movie: '#e5a50a', Documentary: '#10b981' };
const EMPTY_FORM = { title: '', type: 'Anime', season: 1, episode: 1, rating: 4.0, status: 'Watching' };

export default function Entertainment() {
  // ── Zustand (persisted — no more data loss)
  const { media }         = useStore(selectEntertainment);
  const addMediaItem      = useStore(selectAddMediaItem);
  const deleteMediaItem   = useStore(selectDeleteMediaItem);
  const updateMediaProgress = useStore(selectUpdateMediaProgress);
  const toast = useToast();

  const [form, setForm]           = useState(EMPTY_FORM);
  const [searchTerm, setSearchTerm] = useState('');

  // ── #9 useMemo: filter + stats
  const filteredMedia = useMemo(() =>
    media.filter((m) =>
      m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.type.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [media, searchTerm]
  );

  const stats = useMemo(() => ({
    total:     media.length,
    watching:  media.filter((m) => m.status === 'Watching').length,
    completed: media.filter((m) => m.status === 'Completed').length,
  }), [media]);

  // ── #2 Validated add with toast
  const handleAdd = useCallback(() => {
    if (!form.title.trim()) {
      toast.error('Title name cannot be empty.');
      return;
    }
    addMediaItem(form);
    setForm(EMPTY_FORM);
    toast.success(`"${form.title}" added to your library.`);
  }, [form, addMediaItem, toast]);

  const handleDelete = useCallback((id, title) => {
    deleteMediaItem(id);
    toast.info(`"${title}" removed from library.`);
  }, [deleteMediaItem, toast]);

  const handleProgress = useCallback((id, field, value) => {
    updateMediaProgress(id, field, value);
  }, [updateMediaProgress]);

  const statCards = useMemo(() => [
    { label: 'Total Titles', value: stats.total,     icon: Film, color: 'var(--accent)' },
    { label: 'Watching',     value: stats.watching,  icon: Tv,   color: 'var(--info)' },
    { label: 'Completed',    value: stats.completed, icon: Star, color: 'var(--success)' },
  ], [stats]);

  return (
    <div className="fade-in module-page">
      <PageHeader
        accent="Entertainment"
        icon={<Film size={24} />}
        title="Entertainment Tracker"
        subtitle="Track your favourite Anime, Series, and Movies"
      />

      {/* Stats */}
      <div className="stats-grid mb-lg">
        {statCards.map((c) => (
          <StatCard key={c.label} icon={c.icon} label={c.label} value={c.value} color={c.color} />
        ))}
      </div>

      {/* Add & Search */}
      <div className="dual-grid mb-lg">
        <div className="glass-card">
          <span className="card-title">Add New Title</span>
          <div className="form-stack mt-sm">
            <input
              type="text"
              placeholder="Title name"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="form-input"
            />
            <div className="flex-row gap-sm">
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="form-input">
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="form-input">
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <button onClick={handleAdd} className="btn-primary btn-full">
              <Plus size={16} /> Add to Library
            </button>
          </div>
        </div>

        <div className="glass-card flex-center-col">
          <span className="card-title">Search Library</span>
          <div style={{ position: 'relative', marginTop: '0.5rem' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
            <input
              type="text"
              placeholder="Search by title or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '40px' }}
            />
          </div>
        </div>
      </div>

      {/* Media Grid */}
      <div className="media-grid">
        {filteredMedia.map((item) => (
          <div key={item.id} className="glass-card media-card">
            <div className="media-card__body">
              <div className="media-card__header">
                <div>
                  <span
                    className="type-badge"
                    style={{ color: TYPE_COLOR[item.type], background: `${TYPE_COLOR[item.type]}18` }}
                  >
                    {item.type}
                  </span>
                  <h4 className="media-card__title">{item.title}</h4>
                </div>
                <button
                  onClick={() => handleDelete(item.id, item.title)}
                  className="btn-icon btn-icon--ghost"
                  aria-label="Delete title"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="flex-row gap-sm mb-sm">
                {[{ label: 'Season', field: 'season' }, { label: 'Episode', field: 'episode' }].map(({ label, field }) => (
                  <div key={field} style={{ flex: 1 }}>
                    <p className="label-caps" style={{ marginBottom: '4px' }}>{label}</p>
                    <input
                      type="number"
                      value={item[field]}
                      onChange={(e) => handleProgress(item.id, field, parseInt(e.target.value) || 1)}
                      className="form-input"
                      style={{ padding: '0.4rem', fontSize: '0.82rem' }}
                      min="1"
                    />
                  </div>
                ))}
              </div>

              <div className="media-card__footer">
                <div className="rating-display">
                  <Star size={14} color="#e5a50a" fill="#e5a50a" />
                  <span>{item.rating}</span>
                </div>
                <select
                  value={item.status}
                  onChange={(e) => handleProgress(item.id, 'status', e.target.value)}
                  className="form-input"
                  style={{ width: 'auto', padding: '4px 8px', fontSize: '0.72rem' }}
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Progress bar at bottom of card */}
            <div className="media-card__progress-track">
              <div
                className="media-card__progress-fill"
                style={{
                  width: item.status === 'Completed' ? '100%' : '40%',
                  background: `linear-gradient(90deg, ${STATUS_COLOR[item.status]}, ${TYPE_COLOR[item.type]})`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {filteredMedia.length === 0 && (
        <div className="empty-state">
          <Tv size={56} className="empty-state__icon" />
          <p className="empty-state__text">No titles found in your library</p>
        </div>
      )}
    </div>
  );
}
