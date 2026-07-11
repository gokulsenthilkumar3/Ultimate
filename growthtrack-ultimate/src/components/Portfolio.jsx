import { Z_INDEX } from '../constants';
import React, { useState } from 'react';
import { LayoutDashboard, ExternalLink, RefreshCw, Code, Smartphone, Monitor, Settings, X, Check } from 'lucide-react';
import PageHeader from './ui/PageHeader';
import useStore from '../store/useStore';
import { useToast } from '../hooks/useToast';

export default function Portfolio() {
  const user = useStore(s => s.user);
  const updateUserSlice = useStore(s => s.updateUserSlice);
  const toast = useToast();

  const [iframeKey, setIframeKey] = useState(0);
  const [device, setDevice] = useState('desktop');
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  // Read portfolio URL from user profile — or use default
  const portfolioUrl = user?.portfolioUrl || user?.data?.portfolioUrl || 'https://portfolio-ten-plum-98.vercel.app/';
  const repoUrl = user?.socialMedia?.GitHub || 'https://github.com/gokulsenthilkumar3';

  const refreshIframe = () => setIframeKey(prev => prev + 1);

  const handleSaveUrl = () => {
    if (!urlInput.trim()) return;
    let url = urlInput.trim();
    if (!url.startsWith('http')) url = 'https://' + url;
    updateUserSlice('portfolioUrl', url);
    toast.success('Portfolio URL saved.');
    setEditingUrl(false);
    setUrlInput('');
  };

  if (!portfolioUrl) {
    return (
      <div className="fade-in module-page">
        <PageHeader
          accent="External"
          icon={<LayoutDashboard size={24} />}
          title="Portfolio Manager"
          subtitle="Manage your personal portfolio directly from the dashboard"
        />
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', maxWidth: '480px', margin: '0 auto' }}>
          <LayoutDashboard size={48} color="var(--accent)" style={{ margin: '0 auto 1.5rem' }} />
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem' }}>No Portfolio URL Configured</h3>
          <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>Enter the URL of your portfolio website to embed it here.</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              className="form-input"
              placeholder="https://your-portfolio.vercel.app"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveUrl()}
              style={{ flex: 1 }}
            />
            <button className="btn-primary" onClick={handleSaveUrl} disabled={!urlInput.trim()}>
              <Check size={16} /> Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in module-page" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        accent="External"
        icon={<LayoutDashboard size={24} />}
        title="Portfolio Manager"
        subtitle="Manage your personal portfolio directly from the dashboard"
      />

      <div className="glass-card" style={{ padding: '0.75rem 1.5rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.82rem', color: 'var(--text-3)' }}>
            <span style={{ fontWeight: 600 }}>URL:</span>
            <span style={{ color: 'var(--accent)', fontFamily: 'monospace', fontSize: '0.75rem' }}>{portfolioUrl.replace('https://', '')}</span>
          </div>

          {device && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', borderLeft: '1px solid var(--border)', paddingLeft: '1.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 600 }}>PREVIEW:</span>
              <button
                className={`btn-icon ${device === 'desktop' ? 'active' : ''}`}
                onClick={() => setDevice('desktop')}
                style={{ color: device === 'desktop' ? 'var(--accent)' : 'var(--text-3)', background: device === 'desktop' ? 'var(--bg-elevated)' : 'transparent' }}
              >
                <Monitor size={16} />
              </button>
              <button
                className={`btn-icon ${device === 'mobile' ? 'active' : ''}`}
                onClick={() => setDevice('mobile')}
                style={{ color: device === 'mobile' ? 'var(--accent)' : 'var(--text-3)', background: device === 'mobile' ? 'var(--bg-elevated)' : 'transparent' }}
              >
                <Smartphone size={16} />
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-icon" onClick={() => { setEditingUrl(true); setUrlInput(portfolioUrl); }} title="Change Portfolio URL">
            <Settings size={16} />
          </button>
          <button className="btn-icon" onClick={refreshIframe} title="Refresh Frame">
            <RefreshCw size={16} />
          </button>
          <a href={repoUrl} target="_blank" rel="noopener noreferrer" className="btn-icon" title="View Source Code" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Code size={16} />
          </a>
          <a href={portfolioUrl} target="_blank" rel="noopener noreferrer" className="btn-icon" title="Open in New Tab" style={{ textDecoration: 'none', color: 'inherit' }}>
            <ExternalLink size={16} />
          </a>
        </div>
      </div>

      {editingUrl && (
        <div style={{ position: 'fixed', inset: 0, zIndex: Z_INDEX.OVERLAY, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '440px', padding: '2rem', position: 'relative' }}>
            <button onClick={() => setEditingUrl(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}><X size={18} /></button>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.25rem' }}>Change Portfolio URL</h3>
            <input
              className="form-input"
              placeholder="https://your-portfolio.vercel.app"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveUrl()}
              style={{ width: '100%', marginBottom: '1rem' }}
            />
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleSaveUrl} disabled={!urlInput.trim()}>
              <Check size={16} /> Save URL
            </button>
          </div>
        </div>
      )}

      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: device === 'mobile' ? 'center' : 'stretch',
        overflow: 'hidden',
        minHeight: '600px'
      }}>
        <div className="glass-card" style={{
          padding: 0,
          overflow: 'hidden',
          width: device === 'mobile' ? '375px' : '100%',
          height: device === 'mobile' ? '812px' : 'auto',
          flex: device === 'mobile' ? 'none' : 1,
          maxHeight: '100%',
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          borderRadius: device === 'mobile' ? '36px' : 'var(--radius-lg)',
          border: device === 'mobile' ? '8px solid var(--bg-surface)' : '1px solid var(--border)',
          boxShadow: device === 'mobile' ? '0 24px 60px rgba(0,0,0,0.4)' : 'var(--shadow-card)',
          position: 'relative'
        }}>
          {device === 'mobile' && (
            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '120px', height: '24px', background: 'var(--bg-surface)', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', zIndex: Z_INDEX.FLOATING_ELEMENT }}></div>
          )}
          <iframe
            key={iframeKey}
            src={portfolioUrl}
            title="Portfolio Manager"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              background: '#fff',
              minHeight: '600px',
            }}
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </div>
      </div>
    </div>
  );
}
