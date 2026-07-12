import { Z_INDEX } from '../constants';
import React, { useState, useMemo } from 'react';
import { LayoutDashboard, ExternalLink, RefreshCw, Code, Smartphone, Monitor, Settings, X, Check, LineChart as LineChartIcon, DollarSign, TrendingUp, TrendingDown, Briefcase } from 'lucide-react';
import PageHeader from './ui/PageHeader';
import useStore from '../store/useStore';
import { useToast } from '../hooks/useToast';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';

const MOCK_ASSETS = [
  { symbol: 'AAPL', name: 'Apple Inc.', qty: 15, avgPrice: 150, currentPrice: 185.40, history: [140, 145, 150, 160, 155, 170, 185.40] },
  { symbol: 'TSLA', name: 'Tesla Inc.', qty: 10, avgPrice: 220, currentPrice: 175.20, history: [230, 210, 205, 190, 180, 170, 175.20] },
  { symbol: 'BTC', name: 'Bitcoin', qty: 0.5, avgPrice: 40000, currentPrice: 64500, history: [35000, 38000, 42000, 50000, 55000, 60000, 64500] },
  { symbol: 'NVDA', name: 'Nvidia Corp.', qty: 25, avgPrice: 80, currentPrice: 135.50, history: [80, 85, 95, 110, 120, 130, 135.50] },
];

export default function Portfolio() {
  const user = useStore(s => s.user);
  const updateUserSlice = useStore(s => s.updateUserSlice);
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('investments');
  const [iframeKey, setIframeKey] = useState(0);
  const [device, setDevice] = useState('desktop');
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState('');

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

  const totalInvested = useMemo(() => MOCK_ASSETS.reduce((acc, a) => acc + (a.qty * a.avgPrice), 0), []);
  const currentValue = useMemo(() => MOCK_ASSETS.reduce((acc, a) => acc + (a.qty * a.currentPrice), 0), []);
  const totalROI = ((currentValue - totalInvested) / totalInvested) * 100;

  return (
    <div className="fade-in module-page" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        accent="External"
        icon={<Briefcase size={24} />}
        title="Portfolio & Investments"
        subtitle="Manage your personal portfolio website and investment assets"
      />

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: '14px', border: '1px solid var(--border)', width: 'fit-content' }}>
        {['investments', 'web'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            padding: '8px 24px', borderRadius: '10px', border: 'none',
            background: activeTab === t ? 'var(--accent)' : 'transparent',
            color: activeTab === t ? '#fff' : 'var(--text-3)',
            fontWeight: 800, cursor: 'pointer', fontSize: '0.78rem',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            transition: 'all 0.3s ease',
          }}>
            {t === 'investments' ? '📈 Investments' : '🌐 Web Portfolio'}
          </button>
        ))}
      </div>

      {activeTab === 'investments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Ticker / Stats Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent)' }}>
              <p className="label-caps" style={{ color: 'var(--text-3)', marginBottom: '8px' }}>Total Invested</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <DollarSign size={24} color="var(--accent)" />
                <span className="finance-mono text-display" style={{ fontSize: '2rem' }}>${totalInvested.toLocaleString()}</span>
              </div>
            </div>
            
            <div className="glass-card" style={{ padding: '1.5rem', borderLeft: `4px solid ${totalROI >= 0 ? '#10b981' : '#f43f5e'}` }}>
              <p className="label-caps" style={{ color: 'var(--text-3)', marginBottom: '8px' }}>Current Value</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <DollarSign size={24} color={totalROI >= 0 ? '#10b981' : '#f43f5e'} />
                <span className="finance-mono text-display" style={{ fontSize: '2rem' }}>${currentValue.toLocaleString()}</span>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <p className="label-caps" style={{ color: 'var(--text-3)', marginBottom: '8px' }}>Total ROI</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {totalROI >= 0 ? <TrendingUp size={24} color="#10b981" /> : <TrendingDown size={24} color="#f43f5e" />}
                <span className="finance-mono text-display" style={{ fontSize: '2rem', color: totalROI >= 0 ? '#10b981' : '#f43f5e' }}>
                  {totalROI >= 0 ? '+' : ''}{totalROI.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '2rem' }}>
            <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>Asset Allocation</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {MOCK_ASSETS.map(asset => {
                const assetValue = asset.qty * asset.currentPrice;
                const assetInvested = asset.qty * asset.avgPrice;
                const roi = ((assetValue - assetInvested) / assetInvested) * 100;
                const isPositive = roi >= 0;
                const chartData = asset.history.map((val, idx) => ({ time: idx, price: val }));
                
                return (
                  <div key={asset.symbol} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div>
                      <p style={{ fontWeight: 800, fontSize: '1.1rem' }}>{asset.symbol}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{asset.name}</p>
                    </div>
                    
                    <div style={{ height: '50px', width: '100%', paddingRight: '2rem' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id={`grad-${asset.symbol}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={isPositive ? '#10b981' : '#f43f5e'} stopOpacity={0.3}/>
                              <stop offset="95%" stopColor={isPositive ? '#10b981' : '#f43f5e'} stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <YAxis domain={['dataMin', 'dataMax']} hide />
                          <Area type="monotone" dataKey="price" stroke={isPositive ? '#10b981' : '#f43f5e'} strokeWidth={2} fillOpacity={1} fill={`url(#grad-${asset.symbol})`} isAnimationActive={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div>
                      <p className="finance-mono text-display" style={{ fontSize: '1.1rem' }}>${assetValue.toLocaleString()}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{asset.qty} shares</p>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <p className="finance-mono" style={{ fontSize: '1.1rem', fontWeight: 800, color: isPositive ? '#10b981' : '#f43f5e' }}>
                        {isPositive ? '+' : ''}{roi.toFixed(2)}%
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Avg: ${asset.avgPrice}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'web' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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
      )}
    </div>
  );
}
