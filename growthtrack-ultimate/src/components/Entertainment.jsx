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
import EmptyState from './ui/EmptyState';

const TYPES    = ['Anime', 'Series', 'Movie', 'Documentary'];
const STATUSES = ['Watching', 'Plan to Watch', 'Completed', 'Dropped'];
const STATUS_COLOR = { Watching: 'var(--info)', Completed: 'var(--success)', Dropped: 'var(--danger)', 'Plan to Watch': 'var(--warning)' };
const TYPE_COLOR   = { Anime: '#ec4899', Series: '#0ea5e9', Movie: '#e5a50a', Documentary: '#10b981' };
const EMPTY_FORM   = { title: '', type: 'Anime', season: 1, episode: 1, total_episodes: '', rating: 7.0, status: 'Watching' };

/** Render 0–10 stars (filled/half/empty) for display only */
function StarDisplay({ rating }) {
  const pct = Math.round(rating * 10);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <Star size={12} color="#e5a50a" fill="#e5a50a" />
      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#e5a50a' }}>{rating.toFixed(1)}</span>
      <span style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>/10</span>
    </div>
  );
}

export default function Entertainment() {
  const { media }           = useStore(selectEntertainment);
  const addMediaItem        = useStore(selectAddMediaItem);
  const deleteMediaItem     = useStore(selectDeleteMediaItem);
  const updateMediaProgress = useStore(selectUpdateMediaProgress);
  const toast = useToast();

  const [form, setForm]             = useState(EMPTY_FORM);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab]   = useState('Library');

  const filteredMedia = useMemo(() =>
    media.filter(m =>
      m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.type.toLowerCase().includes(searchTerm.toLowerCase())
    ), [media, searchTerm]);

  const stats = useMemo(() => ({
    total:     media.length,
    watching:  media.filter(m => m.status === 'Watching').length,
    completed: media.filter(m => m.status === 'Completed').length,
  }), [media]);

  const handleAdd = useCallback(() => {
    if (!form.title.trim()) { toast.error('Title name cannot be empty.'); return; }
    addMediaItem({
      ...form,
      total_episodes: parseInt(form.total_episodes) || null,
      rating: parseFloat(form.rating) || 7.0,
    });
    setForm(EMPTY_FORM);
    toast.success(`"​${form.title}" added to your library.`);
  }, [form, addMediaItem, toast]);

  const handleDelete  = useCallback((id, title) => { deleteMediaItem(id); toast.info(`"​${title}" removed from library.`); }, [deleteMediaItem, toast]);
  const handleProgress = useCallback((id, field, value) => { updateMediaProgress(id, field, value); }, [updateMediaProgress]);

  const statCards = useMemo(() => [
    { label: 'Total Titles', value: stats.total,     icon: Film, color: 'var(--accent)' },
    { label: 'Watching',     value: stats.watching,  icon: Tv,   color: 'var(--info)'   },
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
        {statCards.map(c => <StatCard key={c.label} icon={c.icon} label={c.label} value={c.value} color={c.color} />)}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        {['Library', 'Sync'].map(tab => (
          <button key={tab} className={`btn-sm ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
            style={{ padding: '0.6rem 1.5rem', fontWeight: 800 }}>{tab}</button>
        ))}
      </div>

      {activeTab === 'Library' && (
        <>
          {/* Add & Search */}
          <div className="dual-grid mb-lg">
            <div className="glass-card">
              <span className="card-title">Add New Title</span>
              <div className="form-stack mt-sm">
                <input type="text" placeholder="Title name"
                  value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  className="form-input" />
                <div className="flex-row gap-sm">
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="form-input">
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="form-input">
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {/* Episode range */}
                <div className="flex-row gap-sm">
                  <div style={{ flex: 1 }}>
                    <label className="label-caps" style={{ fontSize: '0.65rem', marginBottom: '4px', display: 'block' }}>Start Ep</label>
                    <input type="number" value={form.episode} min="1"
                      onChange={e => setForm({ ...form, episode: parseInt(e.target.value) || 1 })} className="form-input" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="label-caps" style={{ fontSize: '0.65rem', marginBottom: '4px', display: 'block' }}>Total Eps</label>
                    <input type="number" placeholder="?" value={form.total_episodes} min="1"
                      onChange={e => setForm({ ...form, total_episodes: e.target.value })} className="form-input" />
                  </div>
                </div>
                {/* Rating slider */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label className="label-caps" style={{ fontSize: '0.65rem' }}>Rating</label>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#e5a50a' }}>{parseFloat(form.rating).toFixed(1)} / 10</span>
                  </div>
                  <input type="range" min="0" max="10" step="0.5"
                    value={form.rating} onChange={e => setForm({ ...form, rating: parseFloat(e.target.value) })}
                    className="form-input" style={{ padding: 0, cursor: 'pointer', accentColor: '#e5a50a' }} />
                </div>
                <button onClick={handleAdd} className="btn-primary btn-full"><Plus size={16} /> Add to Library</button>
              </div>
            </div>

            <div className="glass-card flex-center-col">
              <span className="card-title">Search Library</span>
              <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
                <input type="text" placeholder="Search by title or type..."
                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  className="form-input" style={{ paddingLeft: '40px' }} />
              </div>
            </div>
          </div>

          {/* Media grid */}
          <div className="media-grid">
            {filteredMedia.map(item => {
              const totalEps  = item.total_episodes || null;
              const epProgress = totalEps ? Math.min((item.episode / totalEps) * 100, 100) : null;

              return (
                <div key={item.id} className="glass-card media-card">
                  <div className="media-card__body">
                    <div className="media-card__header">
                      <div>
                        <span className="type-badge" style={{ color: TYPE_COLOR[item.type], background: `${TYPE_COLOR[item.type]}18` }}>{item.type}</span>
                        <h4 className="media-card__title">{item.title}</h4>
                      </div>
                      <button onClick={() => handleDelete(item.id, item.title)} className="btn-icon btn-icon--ghost" aria-label="Delete title">
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Episode tracking */}
                    <div className="flex-row gap-sm mb-sm" style={{ alignItems: 'flex-end' }}>
                      <div style={{ flex: 1 }}>
                        <p className="label-caps" style={{ marginBottom: '4px', fontSize: '0.65rem' }}>Season</p>
                        <input type="number" value={item.season}
                          onChange={e => handleProgress(item.id, 'season', parseInt(e.target.value) || 1)}
                          className="form-input" style={{ padding: '0.4rem', fontSize: '0.82rem' }} min="1" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p className="label-caps" style={{ marginBottom: '4px', fontSize: '0.65rem' }}>Episode</p>
                        <input type="number" value={item.episode}
                          onChange={e => handleProgress(item.id, 'episode', parseInt(e.target.value) || 1)}
                          className="form-input" style={{ padding: '0.4rem', fontSize: '0.82rem' }} min="1" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p className="label-caps" style={{ marginBottom: '4px', fontSize: '0.65rem' }}>Total Eps</p>
                        <input type="number" placeholder="?"
                          value={item.total_episodes || ''}
                          onChange={e => handleProgress(item.id, 'total_episodes', parseInt(e.target.value) || null)}
                          className="form-input" style={{ padding: '0.4rem', fontSize: '0.82rem' }} min="1" />
                      </div>
                    </div>

                    {/* Episode progress bar */}
                    {epProgress !== null && (
                      <div style={{ marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>Progress</span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: TYPE_COLOR[item.type] }}>
                            Ep {item.episode}/{item.total_episodes}
                          </span>
                        </div>
                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.07)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${epProgress}%`, height: '100%', background: TYPE_COLOR[item.type], borderRadius: '2px', transition: '0.3s' }} />
                        </div>
                      </div>
                    )}

                    {/* Rating slider */}
                    <div style={{ marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>Rating</span>
                        <StarDisplay rating={parseFloat(item.rating) || 0} />
                      </div>
                      <input type="range" min="0" max="10" step="0.5"
                        value={item.rating || 0}
                        onChange={e => handleProgress(item.id, 'rating', parseFloat(e.target.value))}
                        style={{ width: '100%', cursor: 'pointer', accentColor: '#e5a50a' }} />
                    </div>

                    <div className="media-card__footer">
                      <select value={item.status}
                        onChange={e => handleProgress(item.id, 'status', e.target.value)}
                        className="form-input" style={{ width: 'auto', padding: '4px 8px', fontSize: '0.72rem' }}>
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Card bottom progress track */}
                  <div className="media-card__progress-track">
                    <div className="media-card__progress-fill"
                      style={{
                        width: item.status === 'Completed' ? '100%' : epProgress !== null ? `${epProgress}%` : '40%',
                        background: `linear-gradient(90deg, ${STATUS_COLOR[item.status]}, ${TYPE_COLOR[item.type]})`,
                      }} />
                  </div>
                </div>
              );
            })}
          </div>

          {filteredMedia.length === 0 && (
            <EmptyState icon={Tv} title="No titles found" description="Your library is empty or your search didn't match anything." />
          )}
        </>
      )}

      {activeTab === 'Sync' && (
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>OTT Provider Synchronization</h3>
          <p className="text-secondary" style={{ marginBottom: '2rem' }}>Connect your streaming accounts to automatically pull watch history into your library.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            {[
              { name: 'Netflix',        color: '#E50914', status: 'Connected' },
              { name: 'Amazon Prime',   color: '#00A8E1', status: 'Connect'   },
              { name: 'Disney+ Hotstar',color: '#032541', status: 'Connect'   },
              { name: 'Zee5',           color: '#8230C6', status: 'Connect'   },
            ].map(provider => (
              <div key={provider.name} style={{ border: `1px solid ${provider.color}55`, padding: '1.5rem', borderRadius: '12px', background: `linear-gradient(135deg, ${provider.color}11, transparent)`, display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                <h4 style={{ fontWeight: 800, fontSize: '1.2rem', color: provider.color }}>{provider.name}</h4>
                <button className="btn-ghost" style={{ width: '100%', borderColor: provider.color, color: provider.status === 'Connected' ? 'var(--text-1)' : provider.color, background: provider.status === 'Connected' ? `${provider.color}44` : 'transparent' }}
                  onClick={() => toast.success(`${provider.name} sync initiated.`)}>
                  {provider.status}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
