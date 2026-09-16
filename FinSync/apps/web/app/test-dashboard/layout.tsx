'use client';

import React from 'react';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

const navItems = [
    { emoji: '🏠', label: 'Dashboard', href: '/test-dashboard', active: true },
    { emoji: '💸', label: 'Transactions', href: '/test-dashboard' },
    { emoji: '📊', label: 'Analytics', href: '/test-dashboard' },
    { emoji: '🎯', label: 'Budget', href: '/test-dashboard' },
    { emoji: '📈', label: 'Investments', href: '/test-dashboard' },
];

const bottomItems = [
    { emoji: '⚙️', label: 'Settings', href: '/test-dashboard' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await auth.signOut();
            router.push('/login');
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="dashboard-layout">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">💰</div>
                    <span className="sidebar-logo-text">FinSync</span>
                </div>

                <div className="sidebar-section-label">Main</div>
                <nav className="sidebar-nav">
                    {navItems.map(item => (
                        <a key={item.label} href={item.href} className={`sidebar-item${item.active ? ' active' : ''}`}>
                            <span style={{ fontSize: 16 }}>{item.emoji}</span>
                            {item.label}
                            {item.label === 'Transactions' && <span className="sidebar-badge">12</span>}
                        </a>
                    ))}

                    <div className="sidebar-section-label">More</div>
                    {bottomItems.map(item => (
                        <a key={item.label} href={item.href} className="sidebar-item">
                            <span style={{ fontSize: 16 }}>{item.emoji}</span>
                            {item.label}
                        </a>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <button onClick={handleLogout} className="sidebar-item" style={{ color: 'var(--error)' }}>
                        <span style={{ fontSize: 16 }}>🚪</span>
                        Sign Out
                    </button>
                    <div className="sidebar-user" style={{ marginTop: 8 }}>
                        <div className="sidebar-avatar">G</div>
                        <div className="sidebar-user-info">
                            <div className="sidebar-user-name">Gokul S.</div>
                            <div className="sidebar-user-email">Free Plan</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="main-content">
                <div className="top-bar">
                    <div className="top-bar-title">Dashboard</div>
                    <div className="top-bar-actions">
                        <button className="icon-btn" title="Search">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                        </button>
                        <button className="icon-btn" title="Notifications">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                        </button>
                        <div className="sidebar-avatar" style={{ cursor: 'pointer' }}>G</div>
                    </div>
                </div>
                <div className="page-content">
                    {children}
                </div>
            </div>
        </div>
    );
}
