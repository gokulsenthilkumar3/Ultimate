import React, { useState } from 'react';
import { LayoutDashboard, ExternalLink, RefreshCw, Code, Smartphone, Monitor } from 'lucide-react';
import PageHeader from './ui/PageHeader';

export default function Portfolio() {
  const [iframeKey, setIframeKey] = useState(0);
  const [mode, setMode] = useState('live'); // 'admin' or 'live'
  const [device, setDevice] = useState('desktop'); // 'desktop' or 'mobile'

  const portfolioUrl = 'https://portfolio-ten-plum-98.vercel.app';
  const adminUrl = `${portfolioUrl}/admin`;
  const repoUrl = 'https://github.com/gokulsenthilkumar3/Portfolio';

  const refreshIframe = () => setIframeKey(prev => prev + 1);

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
          <div style={{ display: 'flex', background: 'var(--bg-elevated)', padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <button 
              className={`btn-sm ${mode === 'live' ? 'active' : ''}`} 
              onClick={() => setMode('live')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: 'none', background: mode === 'live' ? 'var(--accent)' : 'transparent', color: mode === 'live' ? '#fff' : 'var(--text-3)' }}
            >
              Live Site
            </button>
            <button 
              className={`btn-sm ${mode === 'admin' ? 'active' : ''}`} 
              onClick={() => setMode('admin')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: 'none', background: mode === 'admin' ? 'var(--accent)' : 'transparent', color: mode === 'admin' ? '#fff' : 'var(--text-3)' }}
            >
              Admin Panel
            </button>
          </div>

          {mode === 'live' && (
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
          <button className="btn-icon" onClick={refreshIframe} title="Refresh Frame">
            <RefreshCw size={16} />
          </button>
          <a href={repoUrl} target="_blank" rel="noopener noreferrer" className="btn-icon" title="View Source Code" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Code size={16} />
          </a>
          <a href={mode === 'admin' ? adminUrl : portfolioUrl} target="_blank" rel="noopener noreferrer" className="btn-icon" title="Open in New Tab" style={{ textDecoration: 'none', color: 'inherit' }}>
            <ExternalLink size={16} />
          </a>
        </div>
      </div>

      <div style={{ 
        flex: 1, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: device === 'mobile' && mode === 'live' ? 'center' : 'stretch', 
        overflow: 'hidden', 
        minHeight: '600px' 
      }}>
        <div className="glass-card" style={{ 
          padding: 0, 
          overflow: 'hidden', 
          width: device === 'mobile' && mode === 'live' ? '375px' : '100%', 
          height: device === 'mobile' && mode === 'live' ? '812px' : 'auto',
          flex: device === 'mobile' && mode === 'live' ? 'none' : 1,
          maxHeight: '100%',
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          borderRadius: device === 'mobile' && mode === 'live' ? '36px' : 'var(--radius-lg)',
          border: device === 'mobile' && mode === 'live' ? '8px solid var(--bg-surface)' : '1px solid var(--border)',
          boxShadow: device === 'mobile' && mode === 'live' ? '0 24px 60px rgba(0,0,0,0.4)' : 'var(--shadow-card)',
          position: 'relative'
        }}>
          {device === 'mobile' && mode === 'live' && (
            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '120px', height: '24px', background: 'var(--bg-surface)', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', zIndex: 10 }}></div>
          )}
          <iframe
            key={iframeKey}
            src={mode === 'admin' ? adminUrl : portfolioUrl}
            title="Portfolio Manager"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              background: '#fff'
            }}
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </div>
      </div>
    </div>
  );
}
