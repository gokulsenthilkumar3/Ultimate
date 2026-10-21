'use client';

import React, { useState } from 'react';

export default function SettingsPage() {
    const [smsParsing, setSmsParsing] = useState(true);
    const [pushNotif, setPushNotif] = useState(true);
    const [emailReport, setEmailReport] = useState(false);
    const [mfa, setMfa] = useState(false);
    const [message, setMessage] = useState('');

    const handleSaveSettings = (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('✓ Settings updated successfully!');
        setTimeout(() => setMessage(''), 3000);
    };

    return (
        <div className="fade-in">
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Preferences & Settings</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Configure notifications, security, and transaction engine rules</p>
            </div>

            <div style={{ maxWidth: '640px' }}>
                <form onSubmit={handleSaveSettings} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    
                    {/* SMS parsing Section */}
                    <div>
                        <h4 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px 0', color: 'var(--text-primary)' }}>Automation Engine</h4>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>AI SMS & Email Scraping</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Automatically capture and sync SMS alerts from banks</div>
                            </div>
                            <input 
                                type="checkbox" 
                                checked={smsParsing}
                                onChange={(e) => setSmsParsing(e.target.checked)}
                                style={{ width: '40px', height: '20px', cursor: 'pointer' }}
                            />
                        </div>
                    </div>

                    <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: 0 }} />

                    {/* Notifications Section */}
                    <div>
                        <h4 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px 0', color: 'var(--text-primary)' }}>Notifications</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>Real-time Push Alerts</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Get notified immediately when budgets cross 80% limits</div>
                                </div>
                                <input 
                                    type="checkbox" 
                                    checked={pushNotif}
                                    onChange={(e) => setPushNotif(e.target.checked)}
                                    style={{ width: '40px', height: '20px', cursor: 'pointer' }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>Weekly Email Analytics Report</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Receive visual HTML cashflow reports every Monday morning</div>
                                </div>
                                <input 
                                    type="checkbox" 
                                    checked={emailReport}
                                    onChange={(e) => setEmailReport(e.target.checked)}
                                    style={{ width: '40px', height: '20px', cursor: 'pointer' }}
                                />
                            </div>
                        </div>
                    </div>

                    <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: 0 }} />

                    {/* Security Section */}
                    <div>
                        <h4 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px 0', color: 'var(--text-primary)' }}>Security</h4>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>Two-Factor Authentication (2FA)</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Secure logins with one-time verification tokens</div>
                            </div>
                            <input 
                                type="checkbox" 
                                checked={mfa}
                                onChange={(e) => setMfa(e.target.checked)}
                                style={{ width: '40px', height: '20px', cursor: 'pointer' }}
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ padding: '12px', marginTop: 8 }}>
                        Save Settings
                    </button>

                    {message && (
                        <div style={{ 
                            fontSize: 13, 
                            fontWeight: 600, 
                            color: 'var(--accent-green)', 
                            textAlign: 'center', 
                            marginTop: 4 
                        }}>
                            {message}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
