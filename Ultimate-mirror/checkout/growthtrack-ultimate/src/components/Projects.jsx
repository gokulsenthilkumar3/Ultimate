import React, { useState, useEffect } from 'react';
import { GitBranch, Star, GitFork, ExternalLink, Code2, Clock, Circle, Search, ArrowDownUp } from 'lucide-react';
import PageHeader from './ui/PageHeader';
import { useToast } from '../hooks/useToast';

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
  Jupyter: '#DA5B0B'
};

export default function Projects() {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('updated'); // updated, stars, forks, name
  const toast = useToast();

  useEffect(() => {
    fetch('https://api.github.com/users/gokulsenthilkumar3/repos?sort=updated&per_page=100')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch repositories');
        return res.json();
      })
      .then(data => {
        setRepos(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        toast.error('Failed to load GitHub projects');
        setLoading(false);
      });
  }, [toast]);

  const filteredRepos = repos.filter(repo => {
    // 1. Type Filter
    if (filter === 'source' && repo.fork) return false;
    if (filter === 'fork' && !repo.fork) return false;
    
    // 2. Search Filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesName = repo.name.toLowerCase().includes(term);
      const matchesDesc = repo.description && repo.description.toLowerCase().includes(term);
      const matchesLang = repo.language && repo.language.toLowerCase().includes(term);
      if (!matchesName && !matchesDesc && !matchesLang) return false;
    }
    
    return true;
  }).sort((a, b) => {
    if (sortBy === 'updated') return new Date(b.pushed_at) - new Date(a.pushed_at);
    if (sortBy === 'stars') return b.stargazers_count - a.stargazers_count;
    if (sortBy === 'forks') return b.forks_count - a.forks_count;
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return 0;
  });

  const getLanguageColor = (lang) => LANGUAGE_COLORS[lang] || '#8b949e';

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  };

  return (
    <div className="fade-in module-page">
      <PageHeader
        accent="Engineering"
        icon={<GitBranch size={24} />}
        title="GitHub Projects"
        subtitle="Track and manage your code repositories and contributions"
      />

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
          <div style={{ width: 1, height: 30, background: 'var(--border)' }}></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star size={20} color="var(--warning)" />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Stars</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>
                {repos.reduce((acc, curr) => acc + curr.stargazers_count, 0)}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0 0.5rem', width: '220px' }}>
            <Search size={14} color="var(--text-3)" />
            <input 
              type="text" 
              placeholder="Search repositories..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-1)', padding: '0.5rem', outline: 'none', width: '100%', fontSize: '0.8rem' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0 0.5rem' }}>
            <ArrowDownUp size={14} color="var(--text-3)" />
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-2)', padding: '0.5rem', outline: 'none', fontSize: '0.8rem', cursor: 'pointer' }}
            >
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
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
          <div className="spin-ring"></div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {filteredRepos.map(repo => (
            <div key={repo.id} className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <a href={repo.html_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-1)', textDecoration: 'none', fontWeight: 700, fontSize: '1.05rem', wordBreak: 'break-all' }}>
                  <GitBranch size={18} color="var(--text-2)" />
                  {repo.name}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Star size={12} /> {repo.stargazers_count}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <GitFork size={12} /> {repo.forks_count}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
                  <Clock size={12} /> {formatDate(repo.pushed_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
