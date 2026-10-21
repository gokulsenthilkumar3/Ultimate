'use client';

import React from 'react';
import { formatCurrency } from '@/packages/utils/validators';

export default function CardsPage() {
    return <div className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 28 }}><div><h3 style={{ fontSize: 20, fontWeight: 700 }}>Cards</h3><p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Manage your payment cards and see their impact on your spending plan.</p></div><button className="btn btn-primary btn-sm">+ Link card</button></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 420px) 1fr', gap: 24 }}>
            <div className="card" style={{ minHeight: 220, background: 'linear-gradient(135deg, #6c63ff, #3730a3)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}><div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}><span>FinSync One</span><span>VISA</span></div><div style={{ fontSize: 20, letterSpacing: 3 }}>••••  ••••  ••••  4242</div><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span>GOKUL</span><span>09/29</span></div></div>
            <div className="card"><div className="card-title">Card overview</div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginTop: 20 }}><div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Current spend</div><div style={{ fontSize: 22, fontWeight: 800 }}>{formatCurrency(14820)}</div></div><div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Available limit</div><div style={{ fontSize: 22, fontWeight: 800 }}>{formatCurrency(85180)}</div></div></div><div className="progress-bar" style={{ marginTop: 24 }}><div className="progress-fill" style={{ width: '15%', background: 'var(--accent)' }} /></div><p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>15% of ₹1,00,000 monthly limit used.</p></div>
        </div>
    </div>;
}
