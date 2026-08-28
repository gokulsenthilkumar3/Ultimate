import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  const [activeTab, setActiveTab]       = useState('github');
  const [viewMode, setViewMode]         = useState('grid');
  const [repos, setRepos]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState('all');
  const [searchTerm, setSearchTerm]     = useState('');
  const [sortBy, setSortBy]             = useState('updated');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteInput, setNoteInput]       = useState('');
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');

  // Manual projects state
  const [showForm, setShowForm]         = useState(false);
  const [editId, setEditId]             = useState(null);
  const formState = useState(EMPTY_FORM);
  const [form, setForm] = formState;

  const toast = useToast();

  const githubManageEnabled = user?.githubManageEnabled || false;
  const githubToken = user?.githubToken || '';
  const githubUsername = user?.githubUsername || user?.socialMedia?.GitHub?.replace(/.*github\.com\//, '') || '';
  const manualProjects = user?.manualProjects || [];
  const repoNotes = user?.repoNotes || {};

  // Create/Edit Repo states
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [githubRepoForm, setGithubRepoForm] = useState({ name: '', description: '', private: false, editMode: false, oldName: '', owner: '' });

  const saveNote = (repoId) => {
    updateUserSlice('repoNotes', { ...repoNotes, [repoId]: noteInput });
    setEditingNoteId(null);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showSortDropdown && !e.target.closest('.sort-dropdown-container')) {
        setShowSortDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSortDropdown]);

  useEffect(() => {
    if (!githubManageEnabled && !githubUsername) { setLoading(false); return; }
    setLoading(true);
    
    const endpoint = (githubManageEnabled && githubToken)
      ? `https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator`
      : `https://api.github.com/users/${githubUsername}/repos?sort=updated&per_page=100`;

    const headers = {};
    if (githubManageEnabled && githubToken) {
      headers['Authorization'] = `Bearer ${githubToken}`;
      headers['Accept'] = 'application/vnd.github.v3+json';
    }

    fetch(endpoint, { headers })
      .then(res => { 
        if (res.status === 401) {
          toast.error('GitHub token is invalid or expired. Please reconnect in settings.');
          throw new Error('Unauthorized');
        }
        if (!res.ok) throw new Error('Failed'); 
        return res.json(); 
      })
      .then(data => { setRepos(data); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, [githubManageEnabled, githubToken, githubUsername, toast]);

  const handleCreateOrEditGithubRepo = async () => {
    if (!githubRepoForm.name.trim()) { toast.error('Repository name is required'); return; }
    
    const isEdit = githubRepoForm.editMode;
    const endpoint = isEdit 
      ? `https://api.github.com/repos/${githubRepoForm.owner}/${githubRepoForm.oldName}`
      : `https://api.github.com/user/repos`;
    
    const method = isEdit ? 'PATCH' : 'POST';
    
    try {
      const res = await fetch(endpoint, {
        method,
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: githubRepoForm.name.trim(),
          description: githubRepoForm.description.trim(),
          private: githubRepoForm.private,
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to save repository');
      }
      
      const savedRepo = await res.json();
      
      if (isEdit) {
        setRepos(repos.map(r => r.id === savedRepo.id ? savedRepo : r));
        toast.success(`Repository ${savedRepo.name} updated`);
      } else {
        setRepos([savedRepo, ...repos]);
        toast.success(`Repository ${savedRepo.name} created`);
      }
      setShowGithubModal(false);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteGithubRepo = async (owner, name, repoId) => {
    if (!window.confirm(`Are you absolutely sure you want to delete ${owner}/${name}? This action cannot be undone.`)) return;
    
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${name}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to delete repository');
      }
      
      setRepos(repos.filter(r => r.id !== repoId));
      toast.success(`Repository deleted successfully`);
    } catch (err) {
      toast.error(err.message);
    }
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
              <div className="sort-dropdown-container" style={{ position: 'relative' }}>
                <button 
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.45rem 0.75rem', cursor: 'pointer', color: 'var(--text-2)', fontSize: '0.8rem', outline: 'none' }}
                >
                  <ArrowDownUp size={14} color="var(--text-3)" />
                  {sortBy === 'updated' ? 'Recently Updated' : sortBy === 'stars' ? 'Most Stars' : sortBy === 'forks' ? 'Most Forks' : 'Alphabetical'}
                </button>
                
                {showSortDropdown && (
                  <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '6px', background: 'rgba(20,20,20,0.95)', backdropFilter: 'blur(10px)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.4rem', minWidth: '160px', zIndex: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {[
                      { value: 'updated', label: 'Recently Updated' },
                      { value: 'stars', label: 'Most Stars' },
                      { value: 'forks', label: 'Most Forks' },
                      { value: 'name', label: 'Alphabetical' }
                    ].map(opt => (
                      <div 
                        key={opt.value}
                        onClick={() => { setSortBy(opt.value); setShowSortDropdown(false); }}
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', fontWeight: 600, color: sortBy === opt.value ? 'var(--accent)' : 'var(--text-2)', cursor: 'pointer', borderRadius: '4px', background: sortBy === opt.value ? 'rgba(99,102,241,0.1)' : 'transparent', transition: 'all 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = sortBy === opt.value ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)'}
                        onMouseLeave={e => e.currentTarget.style.background = sortBy === opt.value ? 'rgba(99,102,241,0.1)' : 'transparent'}
                      >
                        {opt.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-elevated)', padding: '3px', borderRadius: 'var(--radius-sm)' }}>
                <button className={`btn-sm ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
                <button className={`btn-sm ${filter === 'source' ? 'active' : ''}`} onClick={() => setFilter('source')}>Sources</button>
                <button className={`btn-sm ${filter === 'fork' ? 'active' : ''}`} onClick={() => setFilter('fork')}>Forks</button>
              </div>

              <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-elevated)', padding: '3px', borderRadius: 'var(--radius-sm)' }}>
                <button className={`btn-sm ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>Grid</button>
                <button className={`btn-sm ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>List</button>
              </div>

              {githubManageEnabled && githubToken && (
                <button className="btn-primary" onClick={() => { setGithubRepoForm({ name: '', description: '', private: false, editMode: false, oldName: '', owner: '' }); setShowGithubModal(true); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                  <Plus size={14} /> New Repo
                </button>
              )}

              {/* GitHub username config */}
              <button className="btn-sm" onClick={() => navigate('/settings')}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                <Code2 size={12} /> {githubManageEnabled ? 'Manage Account' : (githubUsername ? `@${githubUsername}` : 'Set Username')}
              </button>
            </div>
          </div>

          {/* GitHub Create/Edit Repo Modal */}
          {showGithubModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="glass-card" style={{ width: '400px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', animation: 'fadeIn 0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>{githubRepoForm.editMode ? 'Edit Repository' : 'Create New Repository'}</h3>
                  <button className="btn-icon" onClick={() => setShowGithubModal(false)}><X size={18} /></button>
                </div>
                
                <div>
                  <label className="form-label">Repository Name *</label>
                  <input className="form-input" value={githubRepoForm.name} onChange={e => setGithubRepoForm({...githubRepoForm, name: e.target.value})}  placeholder="awesome-project" />
                </div>
                
                <div>
                  <label className="form-label">Description (Optional)</label>
                  <textarea className="form-input" value={githubRepoForm.description} onChange={e => setGithubRepoForm({...githubRepoForm, description: e.target.value})} style={{ width: '100%', minHeight: '80px', resize: 'vertical' }} placeholder="What does this repository do?" />
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" id="repoPrivate" checked={githubRepoForm.private} onChange={e => setGithubRepoForm({...githubRepoForm, private: e.target.checked})} style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }} />
                  <label htmlFor="repoPrivate" style={{ fontSize: '0.85rem', color: 'var(--text-1)', cursor: 'pointer', fontWeight: 600 }}>Make this repository private</label>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <button className="btn-primary" onClick={handleCreateOrEditGithubRepo} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                    {githubRepoForm.editMode ? 'Save Changes' : 'Create Repository'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
              <div className="spin-ring" />
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)' }}>
              {githubUsername ? 'No repositories match your filters.' : 'Set your GitHub username above to load repositories.'}
            </div>
          ) : viewMode === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
              {filteredRepos.map(repo => (
                <div key={repo.id} className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <a href={repo.html_url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-1)', textDecoration: 'none', fontWeight: 700, fontSize: '1.05rem', wordBreak: 'break-all', paddingRight: '0.5rem' }}>
                      <GitBranch size={18} color="var(--text-2)" flexShrink={0} />
                      {repo.name} {repo.private && <span style={{ fontSize: '0.65rem', padding: '1px 6px', background: 'var(--warning)', color: 'black', borderRadius: '4px', fontWeight: 800 }}>PRIVATE</span>}
                    </a>
                    
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      {githubManageEnabled && githubToken && repo.permissions?.admin && (
                        <>
                          <button className="btn-icon" onClick={() => { setGithubRepoForm({ name: repo.name, description: repo.description || '', private: repo.private, editMode: true, oldName: repo.name, owner: repo.owner.login }); setShowGithubModal(true); }} style={{ padding: '4px' }} title="Edit Repo Settings">
                            <Edit2 size={14} color="var(--text-3)" />
                          </button>
                          <button className="btn-icon" onClick={() => handleDeleteGithubRepo(repo.owner.login, repo.name, repo.id)} style={{ padding: '4px' }} title="Delete Repo">
                            <Trash2 size={14} color="var(--danger)" />
                          </button>
                        </>
                      )}
                      <a href={repo.html_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-3)', padding: '4px', display: 'flex', alignItems: 'center' }}>
                        <ExternalLink size={16} />
                      </a>
                    </div>
                  </div>
                  <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', flex: 1, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {repo.description || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>No description provided.</span>}
                  </p>
                  
                  {/* Repo Comments Section */}
                  <div style={{ marginTop: 'auto', paddingTop: '0.75rem' }}>
                    {editingNoteId === repo.id ? (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input 
                          autoFocus
                          value={noteInput}
                          onChange={e => setNoteInput(e.target.value)}
                          placeholder="Add a comment..."
                          style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.4rem 0.5rem', color: 'var(--text-1)', fontSize: '0.75rem', outline: 'none' }}
                          onKeyDown={e => e.key === 'Enter' && saveNote(repo.id)}
                        />
                        <button className="btn-icon" onClick={() => saveNote(repo.id)} style={{ padding: '4px', background: 'rgba(16,185,129,0.1)' }}><Check size={14} color="var(--success)" /></button>
                        <button className="btn-icon" onClick={() => setEditingNoteId(null)} style={{ padding: '4px', background: 'rgba(244,63,94,0.1)' }}><X size={14} color="var(--danger)" /></button>
                      </div>
                    ) : repoNotes[repo.id] ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.6rem', background: 'rgba(99,102,241,0.06)', borderRadius: '6px', border: '1px solid rgba(99,102,241,0.15)' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-1)', fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>"{repoNotes[repo.id]}"</span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button className="btn-icon" onClick={() => { setEditingNoteId(repo.id); setNoteInput(repoNotes[repo.id]); }} style={{ padding: '4px' }}><Edit2 size={12} color="var(--text-3)" /></button>
                          <button className="btn-icon" onClick={() => { const newNotes = {...repoNotes}; delete newNotes[repo.id]; updateUserSlice('repoNotes', newNotes); }} style={{ padding: '4px' }}><Trash2 size={12} color="var(--danger)" /></button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => { setEditingNoteId(repo.id); setNoteInput(''); }}
                        style={{ fontSize: '0.75rem', color: 'var(--accent)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 0', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.8, transition: 'opacity 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.opacity = 1}
                        onMouseLeave={e => e.currentTarget.style.opacity = 0.8}
                      >
                        <Plus size={12} /> Add Comment
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-3)' }}>
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
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredRepos.map(repo => (
                <div key={repo.id} className="glass-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
                      <GitBranch size={16} color="var(--text-2)" />
                      <a href={repo.html_url} target="_blank" rel="noopener noreferrer"
                        style={{ color: 'var(--text-1)', textDecoration: 'none', fontWeight: 700, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {repo.name} {repo.private && <span style={{ fontSize: '0.65rem', padding: '1px 6px', background: 'var(--warning)', color: 'black', borderRadius: '4px', fontWeight: 800, verticalAlign: 'middle', marginLeft: '6px' }}>PRIVATE</span>}
                      </a>
                    </div>
                    <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {repo.description || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>No description provided.</span>}
                    </p>
                    
                    {/* Repo Comments for List View */}
                    <div style={{ marginTop: '0.5rem' }}>
                      {editingNoteId === repo.id ? (
                        <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '400px' }}>
                          <input 
                            autoFocus
                            value={noteInput}
                            onChange={e => setNoteInput(e.target.value)}
                            placeholder="Add a comment..."
                            style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.3rem 0.5rem', color: 'var(--text-1)', fontSize: '0.75rem', outline: 'none' }}
                            onKeyDown={e => e.key === 'Enter' && saveNote(repo.id)}
                          />
                          <button className="btn-icon" onClick={() => saveNote(repo.id)} style={{ padding: '4px', background: 'rgba(16,185,129,0.1)' }}><Check size={14} color="var(--success)" /></button>
                          <button className="btn-icon" onClick={() => setEditingNoteId(null)} style={{ padding: '4px', background: 'rgba(244,63,94,0.1)' }}><X size={14} color="var(--danger)" /></button>
                        </div>
                      ) : repoNotes[repo.id] ? (
                        <div style={{ display: 'inline-flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0.5rem', background: 'rgba(99,102,241,0.06)', borderRadius: '4px', border: '1px solid rgba(99,102,241,0.15)', gap: '1rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-1)', fontStyle: 'italic' }}>"{repoNotes[repo.id]}"</span>
                          <div style={{ display: 'flex', gap: '2px' }}>
                            <button className="btn-icon" onClick={() => { setEditingNoteId(repo.id); setNoteInput(repoNotes[repo.id]); }} style={{ padding: '2px' }}><Edit2 size={12} color="var(--text-3)" /></button>
                            <button className="btn-icon" onClick={() => { const newNotes = {...repoNotes}; delete newNotes[repo.id]; updateUserSlice('repoNotes', newNotes); }} style={{ padding: '2px' }}><Trash2 size={12} color="var(--danger)" /></button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={() => { setEditingNoteId(repo.id); setNoteInput(''); }}
                          style={{ fontSize: '0.7rem', color: 'var(--accent)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 0', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.8 }}
                          onMouseEnter={e => e.currentTarget.style.opacity = 1}
                          onMouseLeave={e => e.currentTarget.style.opacity = 0.8}
                        >
                          <Plus size={12} /> Add Comment
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexShrink: 0 }}>
                    {repo.language && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-2)', width: '90px' }}>
                        <Circle size={10} fill={getLanguageColor(repo.language)} color={getLanguageColor(repo.language)} />
                        {repo.language}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-2)', width: '60px' }}>
                      <Star size={14} color="var(--warning)" /> {repo.stargazers_count}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-2)', width: '60px' }}>
                      <GitFork size={14} /> {repo.forks_count}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-3)', width: '100px' }}>
                      <Clock size={14} /> {formatDate(repo.pushed_at)}
                    </div>
                    {githubManageEnabled && githubToken && repo.permissions?.admin && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn-icon" onClick={() => { setGithubRepoForm({ name: repo.name, description: repo.description || '', private: repo.private, editMode: true, oldName: repo.name, owner: repo.owner.login }); setShowGithubModal(true); }} style={{ padding: '6px' }} title="Edit Repo Settings">
                          <Edit2 size={14} color="var(--text-3)" />
                        </button>
                        <button className="btn-icon" onClick={() => handleDeleteGithubRepo(repo.owner.login, repo.name, repo.id)} style={{ padding: '6px' }} title="Delete Repo">
                          <Trash2 size={14} color="var(--danger)" />
                        </button>
                      </div>
                    )}
                    <a href={repo.html_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-3)', display: 'flex', alignItems: 'center' }}>
                      <ExternalLink size={18} />
                    </a>
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
                    onChange={e => setForm({ ...form, title: e.target.value })}  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Description</label>
                  <input className="form-input" placeholder="What does this project do?" value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}  />
                </div>
                <div>
                  <label className="form-label">Tech Stack / Language</label>
                  <input className="form-input" placeholder="e.g. React, Python, PostgreSQL" value={form.stack}
                    onChange={e => setForm({ ...form, stack: e.target.value })}  />
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select className="form-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Project URL</label>
                  <input className="form-input" placeholder="https://your-project-url.com" value={form.url}
                    onChange={e => setForm({ ...form, url: e.target.value })}  />
                </div>
                <div>
                  <label className="form-label">Start Date</label>
                  <input type="date" className="form-input" value={form.startDate}
                    onChange={e => setForm({ ...form, startDate: e.target.value })}  />
                </div>
                <div>
                  <label className="form-label">Target End Date</label>
                  <input type="date" className="form-input" value={form.endDate}
                    onChange={e => setForm({ ...form, endDate: e.target.value })}  />
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
                  <h3 className="card-title mb-lg">Project Timeline (6-Month Window)</h3>
                  <div style={{ minWidth: '700px' }}>
                    {(() => {
                      // 6-month window: 1 month ago → 5 months ahead (≈183 days)
                      const now = new Date();
                      const windowStart = new Date(now); windowStart.setDate(windowStart.getDate() - 30);
                      const windowEnd   = new Date(now); windowEnd.setDate(windowEnd.getDate() + 153);
                      const windowMs    = windowEnd.getTime() - windowStart.getTime();

                      // Month tick labels across the window
                      const ticks = [];
                      const tickCur = new Date(windowStart.getFullYear(), windowStart.getMonth(), 1);
                      tickCur.setMonth(tickCur.getMonth() + 1);
                      while (tickCur < windowEnd) {
                        const pct = ((tickCur.getTime() - windowStart.getTime()) / windowMs) * 100;
                        ticks.push({ pct, label: tickCur.toLocaleDateString('en', { month: 'short', year: '2-digit' }) });
                        tickCur.setMonth(tickCur.getMonth() + 1);
                      }

                      // "Today" marker
                      const todayPct = ((now.getTime() - windowStart.getTime()) / windowMs) * 100;

                      const withDates = manualProjects.filter(p => p.startDate);
                      if (withDates.length === 0) {
                        return <p style={{ color: 'var(--text-3)', textAlign: 'center', padding: '2rem 0' }}>Assign a Start Date to your projects to view them on the timeline.</p>;
                      }

                      return (
                        <>
                          {/* Tick header */}
                          <div style={{ display: 'flex', marginLeft: '190px', marginBottom: '6px', position: 'relative', height: '18px' }}>
                            {ticks.map(t => (
                              <div key={t.label} style={{ position: 'absolute', left: `${t.pct}%`, fontSize: '0.58rem', color: 'var(--text-3)', transform: 'translateX(-50%)', fontWeight: 700, whiteSpace: 'nowrap' }}>{t.label}</div>
                            ))}
                          </div>

                          {withDates.map(p => {
                            const projStart = new Date(p.startDate + 'T00:00:00');
                            const projEnd   = p.endDate ? new Date(p.endDate + 'T00:00:00') : new Date(projStart.getTime() + 30 * 86400000);

                            // Clamp to window
                            const clampStart = Math.max(projStart.getTime(), windowStart.getTime());
                            const clampEnd   = Math.min(projEnd.getTime(),   windowEnd.getTime());

                            // Skip if entirely outside window
                            if (clampStart >= clampEnd) return null;

                            const leftPct = ((clampStart - windowStart.getTime()) / windowMs) * 100;
                            const widthPct = ((clampEnd - clampStart) / windowMs) * 100;
                            const totalDays = Math.round((projEnd.getTime() - projStart.getTime()) / 86400000);
                            const isBeforeWindow = projStart.getTime() < windowStart.getTime();
                            const isAfterWindow  = projEnd.getTime()   > windowEnd.getTime();

                            return (
                              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '10px' }} onClick={() => startEdit(p)}>
                                <div style={{ width: '180px', fontSize: '0.82rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer', color: 'var(--text-1)', flexShrink: 0 }}>
                                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: STATUS_COLOR[p.status] || 'var(--accent)', marginRight: '6px', flexShrink: 0, verticalAlign: 'middle' }} />
                                  {p.title}
                                </div>
                                <div style={{ flex: 1, height: '30px', background: 'var(--bg-input)', borderRadius: '6px', position: 'relative', border: '1px solid var(--border)', overflow: 'hidden' }}>
                                  {/* Today marker */}
                                  {todayPct >= 0 && todayPct <= 100 && (
                                    <div style={{ position: 'absolute', left: `${todayPct}%`, top: 0, bottom: 0, width: '2px', background: 'rgba(99,102,241,0.5)', zIndex: 2 }} />
                                  )}
                                  {/* Bar */}
                                  <div style={{
                                    position: 'absolute', left: `${leftPct}%`, width: `${widthPct}%`,
                                    height: '100%', background: STATUS_COLOR[p.status] || 'var(--accent)',
                                    opacity: 0.85, borderRadius: '4px',
                                    borderLeft:  isBeforeWindow ? '3px solid rgba(255,255,255,0.5)' : undefined,
                                    borderRight: isAfterWindow  ? '3px solid rgba(255,255,255,0.5)' : undefined,
                                    display: 'flex', alignItems: 'center', padding: '0 8px',
                                    color: '#fff', fontSize: '0.7rem', fontWeight: 800,
                                    whiteSpace: 'nowrap', overflow: 'hidden', cursor: 'pointer',
                                  }}>
                                    {widthPct > 8 && `${totalDays}d`}
                                  </div>
                                </div>
                                <div style={{ width: '65px', fontSize: '0.65rem', color: STATUS_COLOR[p.status], fontWeight: 800, flexShrink: 0 }}>{p.status}</div>
                              </div>
                            );
                          })}
                        </>
                      );
                    })()}
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
