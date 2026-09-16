'use client';

import React, { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';

const navItems = [
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>, label: 'Dashboard', href: '/dashboard' },
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>, label: 'Transactions', href: '/dashboard/transactions' },
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M18.4 7.2 9.2 16.4 5 12.2" /></svg>, label: 'Analytics', href: '/dashboard/analytics' },
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>, label: 'Budget', href: '/dashboard/budget' },
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></svg>, label: 'Investments', href: '/dashboard/investments' },
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /><path d="M7 15h2" /></svg>, label: 'Wallets', href: '/dashboard/wallets' },
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v16H4z" /><path d="M8 2v4M16 2v4M7 10h10M7 14h6" /></svg>, label: 'Bills', href: '/dashboard/bills' },
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>, label: 'Cards', href: '/dashboard/cards' },
];

const bottomItems = [
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 1 0-16 0" /></svg>, label: 'Profile', href: '/dashboard/profile' },
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>, label: 'Settings', href: '/dashboard/settings' },
];

interface UserProfile {
    name: string;
    email: string;
    initials: string;
    plan: string;
    budgetRule: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<UserProfile>({ name: 'Loading…', email: '', initials: '?', plan: 'Free Plan', budgetRule: '50/30/20' });
    const [pageTitle, setPageTitle] = useState('Dashboard');

    useEffect(() => {
        const nav = [...navItems, ...bottomItems].find(n => n.href === pathname);
        if (nav) setPageTitle(nav.label);
    }, [pathname]);

    useEffect(() => {
        let redirectTimer: any;
        const unsub = auth.onAuthStateChanged(async (firebaseUser) => {
            if (!firebaseUser) {
                // In dev, wait 4s before redirecting — Firebase might be slow to init
                if (process.env.NODE_ENV === 'development') {
                    redirectTimer = setTimeout(() => router.push('/login'), 4000);
                } else {
                    router.push('/login');
                }
                return;
            }
            clearTimeout(redirectTimer);
            try {
                const timeoutSnap = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));
                const userRef = doc(db, 'users', firebaseUser.uid);
                const snap: any = await Promise.race([getDoc(userRef), timeoutSnap]);
                const displayName = firebaseUser.displayName || snap.data?.()?.profile?.name || snap.data?.()?.email?.split('@')[0] || 'User';
                const email = firebaseUser.email || snap.data?.()?.email || '';
                const initials = displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                const budgetRule = snap.data?.()?.budget?.rule || '50/30/20';
                setUser({ name: displayName, email, initials, plan: 'Free Plan', budgetRule });
            } catch {
                const displayName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User';
                const initials = displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                setUser({ name: displayName, email: firebaseUser.email || '', initials, plan: 'Free Plan', budgetRule: '50/30/20' });
            }
        });
        return () => { unsub(); clearTimeout(redirectTimer); };
    }, [router]);

    const handleLogout = async () => {
        try {
            await auth.signOut();
            router.push('/login');
        } catch (e) {
            console.error(e);
        }
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    return (
        <div className="dashboard-layout">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">💰</div>
                    <span className="sidebar-logo-text">FinSync One</span>
                </div>

                <div className="sidebar-section-label">Main</div>
                <nav className="sidebar-nav">
                    {navItems.map(item => (
                        <a
                            key={item.label}
                            href={item.href}
                            className={`sidebar-item${pathname === item.href ? ' active' : ''}`}
                        >
                            {item.icon}
                            {item.label}
                            {item.label === 'Transactions' && <span className="sidebar-badge">New</span>}
                        </a>
                    ))}

                    <div className="sidebar-section-label">Account</div>
                    {bottomItems.map(item => (
                        <a key={item.label} href={item.href} className={`sidebar-item${pathname === item.href ? ' active' : ''}`}>
                            {item.icon}
                            {item.label}
                        </a>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <button onClick={handleLogout} className="sidebar-item" style={{ color: 'var(--error)', marginBottom: 8 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                        Sign Out
                    </button>
                    <div className="sidebar-user">
                        <div className="sidebar-avatar">{user.initials}</div>
                        <div className="sidebar-user-info">
                            <div className="sidebar-user-name">{user.name}</div>
                            <div className="sidebar-user-email">{user.plan}</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="main-content">
                <div className="top-bar">
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div className="top-bar-title">{pageTitle}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                            {getGreeting()}, {user.name.split(' ')[0]} 👋
                        </div>
                    </div>
                    <div className="top-bar-actions">
                        <button className="icon-btn" title="Search">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                        </button>
                        <button className="icon-btn" title="Notifications">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                        </button>
                        <div className="sidebar-avatar" style={{ cursor: 'pointer' }} title={user.email}>{user.initials}</div>
                    </div>
                </div>
                <div className="page-content">
                    {children}
                </div>
            </div>
        </div>
    );
}
