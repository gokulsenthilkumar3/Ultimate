'use client';

import React from 'react';
import { formatCurrency } from '@/packages/utils/validators';

const wallets = [
    { name: 'Everyday account', provider: 'HDFC Bank', balance: 82450, number: '•••• 2841', color: '#6c63ff', icon: '🏦' },
    { name: 'Spending wallet', provider: 'UPI & cash', balance: 12380, number: '•••• 9012', color: '#00d4a0', icon: '💳' },
    { name: 'Savings vault', provider: 'Emergency fund', balance: 156000, number: 'Goal: 6 months', color: '#ff9f43', icon: '🛡️' },
];

export default function WalletsPage() {
    const total = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
    return <div className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 28 }}>
            <div><h3 style={{ fontSize: 20, fontWeight: 700 }}>Your money, in one place</h3><p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Accounts, cash, and savings synced alongside your expense plan.</p></div>
            <button className="btn btn-primary btn-sm">+ Add account</button>
        </div>
        <div className="card" style={{ marginBottom: 24, background: 'linear-gradient(135deg, rgba(108,99,255,.16), rgba(0,212,160,.06))' }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total available balance</div>
            <div style={{ fontSize: 34, fontWeight: 800, marginTop: 4 }}>{formatCurrency(total)}</div>
            <div style={{ color: 'var(--accent-green)', fontSize: 12, marginTop: 8 }}>↑ ₹4,250 this month</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 18 }}>
            {wallets.map(wallet => <div className="card" key={wallet.name} style={{ borderTop: `3px solid ${wallet.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 26 }}>{wallet.icon}</span><span className="badge badge-green">Connected</span></div>
                <div style={{ fontWeight: 700, marginTop: 24 }}>{wallet.name}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{wallet.provider} · {wallet.number}</div>
                <div style={{ fontSize: 23, fontWeight: 800, marginTop: 20 }}>{formatCurrency(wallet.balance)}</div>
            </div>)}
        </div>
    </div>;
}
