import { Z_INDEX } from '../constants';
import React, { useState, useEffect } from 'react';
import { 
  Settings, X, User, Shield, Terminal, Globe, Server, 
  Database, Lock, CheckCircle2, XCircle, Zap, Star,
  Trash2, RefreshCw
} from 'lucide-react';
import useStore from '../store/useStore';
import { apiSync } from '../store/useStore';
import ConfirmDialog from './ui/ConfirmDialog';

export default function SettingsModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('Profile');
  const user = useStore(state => state.user);
  const skills = useStore(state => state.skills) || [];
  const events = useStore(state => state.calendar_events) || [];
  const setOnboardingComplete = useStore(state => state.setOnboardingComplete);

  const [serverStatus, setServerStatus] = useState('Checking...');
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [networkInfo, setNetworkInfo] = useState({ ip: 'Detecting...', location: '' });
  const [confirmReset, setConfirmReset] = useState(false);

  const fetchNetworkInfo = async () => {
    try {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const geoData = await geoRes.json();
            const loc = geoData.address.city || geoData.address.town || geoData.address.village || 'Unknown';
            const country = geoData.address.country || '';
            const ipRes = await fetch('https://ipapi.co/json/');
            const ipData = await ipRes.json();
            setNetworkInfo({ ip: ipData.ip, location: `${loc}, ${country} (GPS)` });
          } catch (e) {
            const ipRes = await fetch('https://ipapi.co/json/');
            const ipData = await ipRes.json();
            setNetworkInfo({ ip: ipData.ip, location: `${ipData.city}, ${ipData.country_name} (IP)` });
          }
        }, async () => {
          const res = await fetch('https://ipapi.co/json/');
          const data = await res.json();
          setNetworkInfo({ ip: data.ip, location: `${data.city}, ${data.country_name} (IP)` });
        });
      } else {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        setNetworkInfo({ ip: data.ip, location: `${data.city}, ${data.country_name}` });
      }
    } catch (err) {
      setNetworkInfo({ ip: 'Unavailable', location: 'Offline' });
    }
  };

  useEffect(() => {
    const checkServer = async () => {
      try {
        const start = Date.now();
        const res = await apiSync('/health', 'GET');
        if (res && res.status === 'online') {
          const latency = Date.now() - start;
          setServerStatus(`Online (${latency}ms)`);
        } else {
          setServerStatus('Error');
        }
      } catch (err) {
        setServerStatus('Offline');
      }
    };

    const fetchLogs = async () => {
      try {
        const data = await apiSync('/logs', 'GET');
        if (Array.isArray(data)) setLogs(data);
      } catch (err) {
        console.error('Failed to fetch logs');
      }
      setLoadingLogs(false);
    };

    checkServer();
    fetchLogs();
    fetchNetworkInfo();
  }, []);

  const systemStats = [
    { label: 'API Server', value: serverStatus, icon: Server, status: serverStatus.includes('Online') },
    { label: 'UI Engine', value: 'Running', icon: Globe, status: true },
    { label: 'Data Nodes', value: 'SQLite3', icon: Database, status: true },
    { label: 'Security', value: 'Active', icon: Lock, status: true }
  ];

  const userStats = [
    { label: 'Skills', value: skills.length, icon: Star, color: 'var(--accent)' },
    { label: 'Health Score', value: '84', icon: Zap, color: '#10b981' },
  ];

  const handleResetOnboarding = () => {
    setConfirmReset(true);
  };

  const doReset = () => {
    setOnboardingComplete(false);
    onClose();
    setConfirmReset(false);
    window.location.reload(); // Force refresh to trigger wizard
  };

  const tabs = [
    { id: 'Profile', icon: User },
    { id: 'Audit', icon: Shield },
    { id: 'System', icon: Terminal },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: Z_INDEX.OVERLAY,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)'
    }}>
      <ConfirmDialog
        open={confirmReset}
        title="Reset Onboarding?"
        description="This will restart the setup process. You will see the wizard again on next refresh. Your existing data will be preserved."
        confirmLabel="Restart Setup"
        onConfirm={doReset}
        onCancel={() => setConfirmReset(false)}
      />
      <div className="glass-card fade-in" style={{
        width: '100%', maxWidth: '800px', height: '600px',
        display: 'flex', flexDirection: 'row', overflow: 'hidden',
        padding: 0, border: '1px solid var(--border-strong)'
      }}>
        
        {/* Sidebar */}
        <div style={{
          width: '240px', borderRight: '1px solid var(--border)',
          background: 'rgba(255,255,255,0.02)', padding: '2rem 1rem',
          display: 'flex', flexDirection: 'column', gap: '0.5rem'
        }}>
          <h2 className="text-display" style={{ fontSize: '1.2rem', marginBottom: '1.5rem', padding: '0 1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings size={20} /> Settings
          </h2>
          
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`btn-ghost ${activeTab === tab.id ? 'active' : ''}`}
              style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem' }}
            >
              <tab.icon size={16} style={{ marginRight: '10px' }} />
              {tab.id}
            </button>
          ))}

          <div style={{ marginTop: 'auto', padding: '1rem' }}>
            <button 
              onClick={handleResetOnboarding}
              style={{ 
                width: '100%', padding: '0.6rem', borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                color: 'var(--text-3)', fontSize: '0.7rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'
              }}
              className="hover-border-accent"
            >
              <RefreshCw size={12} /> Reset Onboarding
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <header style={{ 
            padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <h3 style={{ fontWeight: 800, fontSize: '1.1rem' }}>{activeTab} Settings</h3>
            <button onClick={onClose} style={{ 
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' 
            }} className="hover-text-1">
              <X size={20} />
            </button>
          </header>

          <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
            {activeTab === 'Profile' && (
              <div className="stagger-container">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
                  <div style={{ 
                    width: '64px', height: '64px', borderRadius: '16px', 
                    background: user?.skinTones?.Face || 'var(--accent)', 
                    border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff' }}>
                      {user?.name?.[0]?.toUpperCase() || 'A'}
                    </span>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{user?.name || 'Administrator'}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{user?.email || 'admin@growthtrack.ultimate'}</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                  {userStats.map((s, i) => (
                    <div key={i} style={{ padding: '1.25rem', background: 'var(--bg-elevated)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                      <s.icon size={16} color={s.color} style={{ marginBottom: '0.5rem' }} />
                      <p style={{ fontSize: '1.4rem', fontWeight: 900 }}>{s.value}</p>
                      <p className="label-caps" style={{ fontSize: '0.6rem', color: 'var(--text-3)' }}>{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', lineHeight: 1.6 }}>
                    Ultimate Digital Twin Engine v2.1<br />
                    <span style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>IP: {networkInfo.ip} | Location: {networkInfo.location}</span>
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'Audit' && (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '1rem' }}>System Transaction History</p>
                <div style={{ 
                  flex: 1, overflowY: 'auto', background: 'var(--bg-dark)', 
                  borderRadius: '12px', padding: '1rem', border: '1px solid var(--border)',
                  fontFamily: '"JetBrains Mono", monospace'
                }}>
                  {loadingLogs ? (
                    <p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>Loading logs...</p>
                  ) : logs.length === 0 ? (
                    <p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>No activity logged.</p>
                  ) : (
                    logs.map((log, i) => (
                      <div key={i} style={{ marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '4px' }}>
                          <span style={{ color: 'var(--accent)', fontWeight: 800 }}>[{log.action}] {log.table_name}</span>
                          <span style={{ color: 'var(--text-3)' }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-2)', wordBreak: 'break-all' }}>
                          ID: {log.item_id} | {log.details ? log.details.slice(0, 80) + '...' : 'Verified update'}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'System' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  {systemStats.map((s, i) => (
                    <div key={i} className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.02)' }}>
                      <s.icon size={16} color={s.status ? 'var(--success)' : 'var(--danger)'} />
                      <div>
                        <p className="label-caps" style={{ fontSize: '0.6rem', color: 'var(--text-3)' }}>{s.label}</p>
                        <p style={{ fontSize: '0.8rem', fontWeight: 800, color: s.status ? 'var(--text-1)' : 'var(--danger)' }}>{s.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
