import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { featurePath } from '../config/featureRegistry';
import { 
  Settings, X, User, Shield, Terminal, Server,
  RefreshCw, CreditCard, Gift, ArrowUpRight
} from 'lucide-react';
import useStore from '../store/useStore';
import { apiSync } from '../store/useStore';
import ConfirmDialog from './ui/ConfirmDialog';
import useDialogFocus from '../hooks/useDialogFocus';
import { fetchIpInfo } from '../hooks/useGeolocation';
import ReferralDashboard from './ReferralDashboard';
import { formatTime } from '../utils/userFormatters';

export default function SettingsModal({ onClose }) {
  const navigate = useNavigate();
  const dialogRef = useDialogFocus(true, onClose);
  const [activeTab, setActiveTab] = useState('Profile');
  const user = useStore(state => state.user);
  const appConfig = useStore(state => state.appConfig) || {};
  const setOnboardingComplete = useStore(state => state.setOnboardingComplete);

  const [serverStatus, setServerStatus] = useState('Checking...');
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [logsError, setLogsError] = useState('');
  const [networkInfo, setNetworkInfo] = useState({ status: 'idle', ip: '', location: '' });
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetError, setResetError] = useState('');
  const billingPortalUrl = /^https?:\/\//i.test(String(appConfig.billingPortalUrl || '')) ? appConfig.billingPortalUrl : '';

  const fetchNetworkInfo = async () => {
    setNetworkInfo({ status: 'loading', ip: '', location: '' });
    try {
      const data = await fetchIpInfo();
      setNetworkInfo({ status: 'ready', ip: data?.ip || 'Unknown', location: [data?.city, data?.country_name].filter(Boolean).join(', ') || 'Unavailable' });
    } catch {
      setNetworkInfo({ status: 'error', ip: '', location: '' });
    }
  };

  useEffect(() => {
    const checkServer = async () => {
      try {
        const start = Date.now();
        const res = await apiSync('/health', 'GET');
        if (res && (res.status === 'online' || res.status === 'ok')) {
          const latency = Date.now() - start;
          setServerStatus(`Online (${latency}ms)`);
        } else {
          setServerStatus('Error');
        }
      } catch {
        setServerStatus('Offline');
      }
    };

    const fetchLogs = async () => {
      try {
        const data = await apiSync('/logs', 'GET');
        if (Array.isArray(data)) setLogs(data);
        else setLogsError('Activity could not be read.');
      } catch {
        setLogsError('Activity could not be loaded. Try again later.');
      }
      setLoadingLogs(false);
    };

    checkServer();
    fetchLogs();
  }, []);

  const systemStats = [
    { label: 'API status', value: serverStatus, icon: Server, status: serverStatus.includes('Online') },
  ];

  const handleResetOnboarding = () => {
    setConfirmReset(true);
  };

  const doReset = async () => {
    try {
      await setOnboardingComplete(false);
      setConfirmReset(false);
      onClose();
      window.location.reload();
    } catch (error) {
      setResetError(error.message || 'Setup could not be restarted.');
      throw error;
    }
  };

  const openProfile = view => {
    onClose();
    navigate(featurePath('profile', view));
  };

  const tabs = [
    { id: 'Profile', icon: User },
    { id: 'Referrals', icon: Gift },
    { id: 'Audit', icon: Shield },
    { id: 'System', icon: Terminal },
  ];

  return (
    <div className="settings-modal-shell gt-settings-modal"
      ref={dialogRef}
      tabIndex={-1}
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="settings-title"
    >
      <ConfirmDialog
        open={confirmReset}
        title="Reset Onboarding?"
        description="This will restart the setup process. You will see the wizard again on next refresh. Your existing data will be preserved."
        confirmLabel="Restart Setup"
        onConfirm={doReset}
        onCancel={() => setConfirmReset(false)}
      />
      <div className="settings-modal-card fade-in">
        
        {/* Sidebar */}
        <nav className="settings-modal-card__sidebar" aria-label="Settings sections">
          <p className="gt-settings-modal__eyebrow">GROWTHTRACK / ACCOUNT</p>
          <h2 id="settings-title" className="gt-settings-modal__title">
            <Settings size={20} aria-hidden="true" /> Settings
          </h2>
          
          {tabs.map(tab => (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="gt-settings-modal__nav-item"
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              <tab.icon size={16} aria-hidden="true" />
              {tab.id}
            </button>
          ))}

          <div className="gt-settings-modal__sidebar-footer">
            <button type="button"
              onClick={handleResetOnboarding}
              className="gt-settings-modal__quiet-button"
            >
              <RefreshCw size={16} aria-hidden="true" /> Restart setup
            </button>
            {resetError && <p role="alert" className="gt-settings-modal__error">{resetError}</p>}
          </div>
        </nav>

        {/* Content Area */}
        <div className="settings-modal-card__content">
          <header className="settings-modal-card__header">
            <div><p className="gt-settings-modal__eyebrow">YOUR WORKSPACE</p><h3>{activeTab === 'Profile' ? 'Your account, at a glance.' : activeTab}</h3></div>
            <button type="button" onClick={onClose} aria-label="Close settings" className="gt-settings-modal__close">
              <X size={20} />
            </button>
          </header>

          <div className="settings-modal-card__body">
            {activeTab === 'Profile' && (
              <div className="gt-settings-modal__overview">
                <div className="gt-settings-modal__identity">
                  <div className="gt-settings-modal__monogram" aria-hidden="true">{user?.name?.[0]?.toUpperCase() || 'U'}</div>
                  <div>
                    <h4>{user?.name || 'Your account'}</h4>
                    <p>{user?.email || 'Email unavailable'}</p>
                  </div>
                </div>

                <p className="gt-settings-modal__section-label">GO DIRECTLY TO</p>
                <div className="gt-settings-modal__links">
                  <button type="button" onClick={() => openProfile('personal')}><User size={20} aria-hidden="true" /><span><strong>Account details</strong><small>Name, contact and profile</small></span><ArrowUpRight size={18} aria-hidden="true" /></button>
                  <button type="button" onClick={() => openProfile('security')}><Shield size={20} aria-hidden="true" /><span><strong>Privacy & security</strong><small>Password, sessions, AI and drafts</small></span><ArrowUpRight size={18} aria-hidden="true" /></button>
                  <button type="button" onClick={() => openProfile('integrations')}><Server size={20} aria-hidden="true" /><span><strong>Connections</strong><small>Service availability and social links</small></span><ArrowUpRight size={18} aria-hidden="true" /></button>
                  <button type="button" onClick={() => openProfile('appearance')}><Settings size={20} aria-hidden="true" /><span><strong>Display preferences</strong><small>Theme, units and accessibility</small></span><ArrowUpRight size={18} aria-hidden="true" /></button>
                </div>
                <div className="gt-settings-modal__billing">
                  <div><strong>Billing</strong><p>{billingPortalUrl ? 'Manage your account in the billing portal.' : 'A billing portal is not configured.'}</p></div>
                  {billingPortalUrl && <a href={billingPortalUrl} target="_blank" rel="noopener noreferrer" className="gt-settings-modal__quiet-button"><CreditCard size={16} aria-hidden="true" /> Open billing <ArrowUpRight size={16} aria-hidden="true" /></a>}
                </div>
              </div>
            )}

            {activeTab === 'Referrals' && (
              <ReferralDashboard />
            )}

            {activeTab === 'Audit' && (
              <section className="gt-settings-modal__activity" aria-label="Recent account activity">
                <p>Recent account and workspace events recorded by the server.</p>
                <div className="gt-settings-modal__activity-list">
                  {loadingLogs ? (
                    <p role="status">Loading activity…</p>
                  ) : logsError ? (
                    <p role="alert" className="gt-settings-modal__error">{logsError}</p>
                  ) : logs.length === 0 ? (
                    <p>No activity recorded yet.</p>
                  ) : (
                    logs.map((log, i) => (
                      <article key={log.id || `${log.timestamp}-${i}`}>
                        <div><strong>{log.action || 'Activity'} {log.table_name ? `· ${log.table_name}` : ''}</strong><time dateTime={log.timestamp}>{log.timestamp ? formatTime(log.timestamp, user) : 'Time unavailable'}</time></div>
                        {typeof log.details === 'string' && <p>{log.details.slice(0, 180)}</p>}
                      </article>
                    ))
                  )}
                </div>
              </section>
            )}

            {activeTab === 'System' && (
              <section className="gt-settings-modal__system">
                <p>Live status from the application server. This check does not verify every service or security control.</p>
                <div className="gt-settings-modal__system-grid">
                  {systemStats.map((s, i) => (
                    <div key={i} className="gt-settings-modal__system-card">
                      <s.icon size={20} aria-hidden="true" />
                      <div>
                        <p className="gt-settings-modal__section-label">{s.label}</p>
                        <p role="status" data-online={s.status}>{s.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="gt-settings-modal__network">
                  <div><h4>Network lookup</h4><p>See your public IP address and an approximate location from an external lookup service.</p></div>
                  <button type="button" className="gt-settings-modal__quiet-button" onClick={fetchNetworkInfo} disabled={networkInfo.status === 'loading'}>{networkInfo.status === 'loading' ? 'Checking…' : 'Check network'}</button>
                  {networkInfo.status === 'ready' && <p role="status">IP: {networkInfo.ip} · Approximate location: {networkInfo.location}</p>}
                  {networkInfo.status === 'error' && <p role="alert" className="gt-settings-modal__error">Network information is unavailable.</p>}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
