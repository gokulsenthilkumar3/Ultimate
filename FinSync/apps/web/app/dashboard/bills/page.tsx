'use client';

import React from 'react';
import { formatCurrency } from '@/packages/utils/validators';

const bills = [
    { name: 'Airtel Broadband', date: 'Due 18 Mar', amount: 999, icon: '🌐', status: 'Upcoming' },
    { name: 'Electricity', date: 'Due 22 Mar', amount: 1840, icon: '⚡', status: 'Upcoming' },
    { name: 'Netflix', date: 'Auto-pay 28 Mar', amount: 649, icon: '🎬', status: 'Auto-pay' },
];

export default function BillsPage() {
    return <div className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 28 }}>
            <div><h3 style={{ fontSize: 20, fontWeight: 700 }}>Bills & subscriptions</h3><p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Stay ahead of every payment without leaving your budget.</p></div>
            <button className="btn btn-primary btn-sm">+ Add bill</button>
        </div>
        <div className="card" style={{ marginBottom: 24 }}><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Due in the next 14 days</div><div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{formatCurrency(2839)}</div><div style={{ fontSize: 12, color: 'var(--accent-orange)', marginTop: 6 }}>2 payments need attention</div></div>
        <div className="card">
            {bills.map((bill, index) => <div key={bill.name} className="transaction-item" style={index === bills.length - 1 ? { borderBottom: 'none' } : undefined}>
                <div className="transaction-icon">{bill.icon}</div><div className="transaction-info"><div className="transaction-name">{bill.name}</div><div className="transaction-date">{bill.date}</div></div><div style={{ textAlign: 'right' }}><div style={{ fontWeight: 700 }}>{formatCurrency(bill.amount)}</div><div style={{ fontSize: 11, color: bill.status === 'Auto-pay' ? 'var(--accent-green)' : 'var(--accent-orange)' }}>{bill.status}</div></div>
            </div>)}
        </div>
    </div>;
}
