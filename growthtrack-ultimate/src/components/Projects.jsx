import React, { useState, useEffect } from 'react';
import { GitBranch, Star, GitFork, ExternalLink, Code2, Clock, Circle, Search, ArrowDownUp, Plus, Trash2, Edit2, Save, X, Check } from 'lucide-react';
import PageHeader from './ui/PageHeader';
import { useToast } from '../hooks/useToast';
import useStore from '../store/useStore';

const LANGUAGE_COLORS = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Java: '#b07219',
  'C++': '#f34b7d',
  'C#': '#178600',
  Go: '#00ADD8',
  Rust: '#dea584',
  Vue: '#41b883',
  React: '#61dafb',
  Jupyter: '#DA5B0B',
};

const STATUSES = ['Active', 'In Progress', 'Completed', 'Archived', 'On Hold'];
const STATUS_COLOR = {
  Active: 'var(--success)',
  'In Progress': 'var(--info)',
  Completed: 'var(--accent)',
  Archived: 'var(--text-3)',
  'On Hold': 'var(--warning)',
};

const EMPTY_FORM = { title: '', description: '', stack: '', status: 'Active', url: '', startDate: new Date().toISOString().split('T')[0], endDate: '' };

export default function Projects() {
  const user = useStore(s => s.user);
  const updateUserSlice = useStore(s => s.updateUserSlice);

  const [activeTab, setActiveTab]       = useState('github');
  const [viewMode, setViewMode]         = useState('grid');
  const [repos, setRepos]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState('all');
  const [searchTerm, setSearchTerm]     = useState('');
  const [sortBy, setSortBy]             = useState('updated');
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');

  // Manual projects state
  const [showForm, setShowForm]         = useState(false);
  const [editId, setEditId]             = useState(null);
  const [form, setForm]                 = useState(EMPTY_FORM);

  const toast = useToast();

  const githubUsername = user?.githubUsername || user?.socialMedia?.GitHub?.replace(/.*github\.com\//, '') || '';
  const manualProjects = user?.manualProjects || [];

  useEffect(() => {
    if (!githubUsername) { setLoading(false); return; }
    setLoading(true);
    fetch(`https://api.github.com/users/${githubUsername}/repos?sort=updated&per_page=100`)
      .then(res => { if (!res.ok) throw new Error('Failed'); return res.json(); })
      .then(data => { setRepos(data); setLoading(false); })
      .catch(() => { toast.error('Failed to load GitHub projects'); setLoading(false); });
  }, [githubUsername, toast]);

  const handleSaveUsername = () => {
    if (!usernameInput.trim()) return;
    updateUserSlice('githubUsername', usernameInput.trim());
    toast.success(`GitHub username set to @${usernameInput.trim()}`);
    setEditingUsername(false);
    setUsernameInput('');
  };

  const filteredRepos = repos.filter(repo => {
    if (filter === 'source' && repo.fork) return false;
    if (filter === 'fork' && !repo.fork) return false;
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      if (!repo.name.toLowerCase().includes(t) &&
          !(repo.description || '').toLowerCase().includes(t) &&
          !(repo.language || '').toLowerCase().includes(t)) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'updated') return new Date(b.pushed_at) - new Date(a.pushed_at);
    if (sortBy === 'stars')   return b.stargazers_count - a.stargazers_count;
    if (sortBy === 'forks')   return b.forks_count - a.forks_count;
    if (sortBy === 'name')    return a.name.localeCompare(b.name);
    return 0;
  });

  const getLanguageColor = lang => LANGUAGE_COLORS[lang] || '#8b949e';
  const formatDate = d => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(d));

  // ── Manual project CRUD ──────────────────────────────────────────────
  const handleAddOrEdit = () => {
    if (!form.title.trim()) { toast.error('Project title is required'); return; }
    let url = form.url.trim();
    if (url && !url.startsWith('http')) url = 'https://' + url;

    let updated;
    if (editId !== null) {
      updated = manualProjects.map(p => p.id === editId ? { ...form, url, id: editId } : p);
      toast.success('Project updated');
    } else {
      const newEntry = { ...form, url, id: Date.now().toString() };
      updated = [newEntry, ...manualProjects];
      toast.success(`"${form.title}" added`);
    }
    updateUserSlice('manualProjects', updated);
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(false);
  };

  const handleDelete = id => {
    const updated = manualProjects.filter(p => p.id !== id);
    updateUserSlice('manualProjects', updated);
    toast.info('Project removed');
  };

  const startEdit = p => {
    setForm({ title: p.title, description: p.description || '', stack: p.stack || '', status: p.status || 'Active', url: p.url || '', startDate: p.startDate || '', endDate: p.endDate || '' });
    setEditId(p.id);
    setShowForm(true);
  };

  return (
    <div className="fade-in module-page">
      <PageHeader
        accent="Engineering"
        icon={<GitBranch size={24} />}
        title="Projects Hub"
        subtitle="Manage GitHub repositories and personal projects"
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {[['github', 'GitHub Repos'], ['manual', 'My Projects']].map(([key, label]) => (
          <button key={key} className={`btn-sm ${activeTab === key ? 'active' : ''}`}
            onClick={() => setActiveTab(key)} style={{ padding: '0.5rem 1.2rem', fontWeight: 800 }}>
            {label} {key === 'github' ? `(${repos.length})` : `(${manualProjects.length})`}
          </button>
        ))}
      </div>

      {/* ── GitHub tab ── */}
      {activeTab === 'github' && (
        <>
          {/* Toolbar */}
          <div className="glass-card mb-lg" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Code2 size={20} color="var(--accent)" />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Repos</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>{repos.length}</div>
                </div>
              </div>
              <div style={{ width: 1, height: 30, background: 'var(--border)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Star size={20} color="var(--warning)" />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Stars</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>
                    {repos.reduce((acc, r) => acc + r.stargazers_count, 0)}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0 0.5rem', width: '220px' }}>
                <Search size={14} color="var(--text-3)" />
                <input type="text" placeholder="Search repositories..." value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-1)', padding: '0.5rem', outline: 'none', width: '100%', fontSize: '0.8rem' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0 0.5rem' }}>
                <ArrowDownUp size={14} color="var(--text-3)" />
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-2)', padding: '0.5rem', outline: 'none', fontSize: '0.8rem', cursor: 'pointer' }}>
                  <option value="updated">Recently Updated</option>
                  <option value="stars">Most Stars</option>
                  <option value="forks">Most Forks</option>
                  <option value="name">Alphabetical</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-elevated)', padding: '3px', borderRadius: 'var(--radius-sm)' }}>
                <button className={`btn-sm ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
                <button className={`btn-sm ${filter === 'source' ? 'active' : ''}`} onClick={() => setFilter('source')}>Sources</button>
                <button className={`btn-sm ${filter === 'fork' ? 'active' : ''}`} onClick={() => setFilter('fork')}>Forks</button>
              </div>

              {/* GitHub username config */}
              {!editingUsername ? (
                <button className="btn-sm" onClick={() => { setEditingUsername(true); setUsernameInput(githubUsername); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                  <Code2 size={12} /> {githubUsername ? `@${githubUsername}` : 'Set Username'}
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <input className="form-input" value={usernameInput} onChange={e => setUsernameInput(e.target.value)}
                    placeholder="GitHub username" onKeyDown={e => e.key === 'Enter' && handleSaveUsername()}
                    style={{ width: '130px', fontSize: '0.8rem', padding: '4px 8px' }} />
                  <button className="btn-primary" style={{ padding: '4px 8px' }} onClick={handleSaveUsername}><Check size={12} /></button>
                  <button className="btn-sm" style={{ padding: '4px 8px' }} onClick={() => setEditingUsername(false)}><X size={12} /></button>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
              <div className="spin-ring" />
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)' }}>
              {githubUsername ? 'No repositories match your filters.' : 'Set your GitHub username above to load repositories.'}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
              {filteredRepos.map(repo => (
                <div key={repo.id} className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <a href={repo.html_url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-1)', textDecoration: 'none', fontWeight: 700, fontSize: '1.05rem', wordBreak: 'break-all' }}>
                      <GitBranch size={18} color="var(--text-2)" />{repo.name}
                    </a>
                    <a href={repo.html_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-3)' }}>
                      <ExternalLink size={16} />
                    </a>
                  </div>
                  <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', flex: 1, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {repo.description || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>No description provided.</span>}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-3)' }}>
                    {repo.language && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Circle size={10} fill={getLanguageColor(repo.language)} color={getLanguageColor(repo.language)} />
                        {repo.language}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Star size={12} /> {repo.stargazers_count}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><GitFork size={12} /> {repo.forks_count}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}><Clock size={12} /> {formatDate(repo.pushed_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── My Projects (manual) tab ── */}
      {activeTab === 'manual' && (
        <>
          {/* Add / Edit form */}
          {showForm ? (
            <div className="glass-card mb-lg" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span className="card-title">{editId ? 'Edit Project' : 'Add New Project'}</span>
                <button className="btn-icon" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setEditId(null); }}><X size={16} /></button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Project Title *</label>
                  <input className="form-input" placeholder="e.g. Personal Finance App" value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })} style={{ width: '100%' }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Description</label>
                  <input className="form-input" placeholder="What does this project do?" value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })} style={{ width: '100%' }} />
                </div>
                <div>
                  <label className="form-label">Tech Stack / Language</label>
                  <input className="form-input" placeholder="e.g. React, Python, PostgreSQL" value={form.stack}
                    onChange={e => setForm({ ...form, stack: e.target.value })} style={{ width: '100%' }} />
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select className="form-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={{ width: '100%' }}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Project URL</label>
                  <input className="form-input" placeholder="https://your-project-url.com" value={form.url}
                    onChange={e => setForm({ ...form, url: e.target.value })} style={{ width: '100%' }} />
                </div>
                <div>
                  <label className="form-label">Start Date</label>
                  <input type="date" className="form-input" value={form.startDate}
                    onChange={e => setForm({ ...form, startDate: e.target.value })} style={{ width: '100%' }} />
                </div>
                <div>
                  <label className="form-label">Target End Date</label>
                  <input type="date" className="form-input" value={form.endDate}
                    onChange={e => setForm({ ...form, endDate: e.target.value })} style={{ width: '100%' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button className="btn-primary" onClick={handleAddOrEdit} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Save size={14} /> {editId ? 'Save Changes' : 'Add Project'}
                </button>
                <button className="btn-sm" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setEditId(null); }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <button className="btn-primary" onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY_FORM); }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={16} /> Add Project
              </button>
              <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-elevated)', padding: '3px', borderRadius: 'var(--radius-sm)' }}>
                <button className={`btn-sm ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>Grid</button>
                <button className={`btn-sm ${viewMode === 'kanban' ? 'active' : ''}`} onClick={() => setViewMode('kanban')}>Kanban</button>
                <button className={`btn-sm ${viewMode === 'gantt' ? 'active' : ''}`} onClick={() => setViewMode('gantt')}>Timeline</button>
              </div>
            </div>
          )}

          {manualProjects.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border)', background: 'transparent' }}>
              <Code2 size={40} color="var(--accent)" style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.5 }} />
              <p style={{ color: 'var(--text-3)', fontWeight: 700 }}>No projects yet</p>
              <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Click "Add Project" to manually track your personal projects.</p>
            </div>
          ) : (
            <>
              {viewMode === 'grid' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                  {manualProjects.map(p => (
                    <div key={p.id} className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h3 style={{ fontWeight: 800, fontSize: '1.05rem', margin: 0, flex: 1 }}>{p.title}</h3>
                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0, marginLeft: '8px' }}>
                          <button className="btn-icon" style={{ padding: '4px' }} onClick={() => startEdit(p)} title="Edit"><Edit2 size={14} /></button>
                          <button className="btn-icon" style={{ padding: '4px', color: 'var(--danger)' }} onClick={() => handleDelete(p.id)} title="Delete"><Trash2 size={14} /></button>
                        </div>
                      </div>
                      {p.description && <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.description}</p>}
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        {p.stack && p.stack.split(',').map(s => <span key={s} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '99px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', fontWeight: 700 }}>{s.trim()}</span>)}
                        <span style={{ marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 800, color: STATUS_COLOR[p.status] || 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{p.status}</span>
                      </div>
                      {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 700, textDecoration: 'none', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}><ExternalLink size={12} /> Visit Project</a>}
                    </div>
                  ))}
                </div>
              )}

              {viewMode === 'kanban' && (
                <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem', alignItems: 'flex-start' }}>
                  {STATUSES.map(status => (
                    <div key={status} style={{ minWidth: '280px', flex: 1, background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '1rem', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `2px solid ${STATUS_COLOR[status]}`, paddingBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 800, color: 'var(--text-1)' }}>{status}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-3)', background: 'var(--bg-glass)', padding: '2px 8px', borderRadius: '10px' }}>
                          {manualProjects.filter(p => p.status === status).length}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {manualProjects.filter(p => p.status === status).map(p => (
                          <div key={p.id} className="glass-card" style={{ padding: '1rem', cursor: 'pointer', transition: 'transform 0.2s', ':hover': { transform: 'translateY(-2px)' } }} onClick={() => startEdit(p)}>
                            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>{p.title}</h4>
                            {p.stack && (
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {p.stack.split(',').map(s => <span key={s} style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'var(--bg-input)', borderRadius: '4px', border: '1px solid var(--border)' }}>{s.trim()}</span>)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {viewMode === 'gantt' && (
                <div className="glass-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
                  <h3 className="card-title mb-lg">Project Timeline (90 Days)</h3>
                  <div style={{ minWidth: '700px' }}>
                    {manualProjects.length > 0 && manualProjects.filter(p => p.startDate).map((p, i) => {
                      const now = new Date();
                      const start = new Date(p.startDate);
                      const end = p.endDate ? new Date(p.endDate) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
                      const totalDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
                      const ninetyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                      const daysFromStartWindow = (start.getTime() - ninetyDaysAgo.getTime()) / (1000 * 60 * 60 * 24);
                      
                      const left = Math.max(0, Math.min(100, (daysFromStartWindow / 90) * 100));
                      const width = Math.max(2, Math.min(100 - left, (totalDays / 90) * 100));
                      
                      return (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }} onClick={() => startEdit(p)}>
                          <div style={{ width: '180px', fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}>
                            {p.title}
                          </div>
                          <div style={{ flex: 1, height: '36px', background: 'var(--bg-input)', borderRadius: '18px', position: 'relative', border: '1px solid var(--border)' }}>
                            <div style={{ position: 'absolute', left: `${left}%`, width: `${width}%`, height: '100%', background: STATUS_COLOR[p.status], opacity: 0.8, borderRadius: '18px', display: 'flex', alignItems: 'center', padding: '0 12px', color: '#fff', fontSize: '0.75rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', cursor: 'pointer', transition: 'opacity 0.2s' }}>
                              {totalDays.toFixed(0)}d
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {manualProjects.filter(p => p.startDate).length === 0 && (
                      <p style={{ color: 'var(--text-3)', textAlign: 'center', padding: '2rem 0' }}>Assign a Start Date to your projects to view them on the timeline.</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
