'use client';

import React from 'react';

const stats = [
    { label: 'Total Balance', value: '₹1,24,500', change: '+2.5%', positive: true, icon: '💰', color: 'var(--accent)', bg: 'rgba(108,99,255,0.1)' },
    { label: 'Monthly Income', value: '₹85,000', change: '+0%', positive: true, icon: '📥', color: 'var(--accent-green)', bg: 'rgba(0,212,160,0.1)' },
    { label: 'Monthly Expenses', value: '₹32,400', change: '-8.3%', positive: true, icon: '📤', color: 'var(--accent-orange)', bg: 'rgba(255,159,67,0.1)' },
    { label: 'Savings Rate', value: '61.9%', change: '+1.2%', positive: true, icon: '🎯', color: 'var(--accent-pink)', bg: 'rgba(255,107,157,0.1)' },
];

const transactions = [
    { name: 'Swiggy', category: 'Food', date: 'Today, 2:30 PM', amount: -450, icon: '🍔' },
    { name: 'Amazon', category: 'Shopping', date: 'Yesterday', amount: -1200, icon: '📦' },
    { name: 'Salary Credit', category: 'Income', date: 'Mar 1', amount: 85000, icon: '💵' },
    { name: 'Netflix', category: 'Entertainment', date: 'Feb 28', amount: -649, icon: '🎬' },
    { name: 'Electricity Bill', category: 'Utilities', date: 'Feb 27', amount: -1800, icon: '⚡' },
];

const budgetCategories = [
    { label: 'Needs (50%)', spent: 14200, total: 42500, color: 'var(--accent-pink)' },
    { label: 'Wants (30%)', spent: 12400, total: 25500, color: 'var(--accent-orange)' },
    { label: 'Savings (20%)', spent: 5800, total: 17000, color: 'var(--accent-green)' },
];

function fmt(n: number) {
    return '₹' + Math.abs(n).toLocaleString('en-IN');
}

export default function DashboardPage() {
    return (
        <div className="fade-in">
            {/* Welcome */}
            <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: '-0.6px', color: 'var(--text-primary)', marginBottom: 4 }}>
                    Good afternoon, Gokul 👋
                </h2>
                <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                    Here's an overview of your finances — March 2026.
                </p>
            </div>

            {/* Stats */}
            <div className="stats-grid">
                {stats.map(s => (
                    <div key={s.label} className="stat-card">
                        <div className="stat-card-header">
                            <span className="stat-card-label">{s.label}</span>
                            <div className="stat-card-icon" style={{ background: s.bg }}>
                                <span style={{ fontSize: 18 }}>{s.icon}</span>
                            </div>
                        </div>
                        <div className="stat-card-value">{s.value}</div>
                        <div className={`stat-card-change ${s.positive ? 'positive' : 'negative'}`}>
                            {s.positive ? '↑' : '↓'} {s.change} from last month
                        </div>
                    </div>
                ))}
            </div>

            {/* Two-column layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
                {/* Transactions */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <div className="card-title">Recent Transactions</div>
                            <div className="card-subtitle">Your latest activity</div>
                        </div>
                        <button className="btn btn-secondary btn-sm">View all</button>
                    </div>
                    {transactions.map(tx => (
                        <div key={tx.name} className="transaction-item">
                            <div className="transaction-icon" style={{ background: 'var(--bg-secondary)' }}>
                                <span style={{ fontSize: 18 }}>{tx.icon}</span>
                            </div>
                            <div className="transaction-info">
                                <div className="transaction-name">{tx.name}</div>
                                <div className="transaction-date">{tx.date} · <span style={{ color: 'var(--text-muted)' }}>{tx.category}</span></div>
                            </div>
                            <div className={`transaction-amount ${tx.amount < 0 ? 'debit' : 'credit'}`}>
                                {tx.amount < 0 ? '-' : '+'}{fmt(tx.amount)}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Right column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {/* Budget */}
                    <div className="card">
                        <div className="card-header">
                            <div>
                                <div className="card-title">Budget Status</div>
                                <div className="card-subtitle">50/30/20 rule</div>
                            </div>
                            <span className="badge badge-green">On track</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {budgetCategories.map(cat => (
                                <div key={cat.label}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 500 }}>
                                        <span>{cat.label}</span>
                                        <span>{fmt(cat.spent)} / {fmt(cat.total)}</span>
                                    </div>
                                    <div className="progress-bar">
                                        <div className="progress-fill" style={{ width: `${Math.min(100, (cat.spent / cat.total) * 100)}%`, background: cat.color }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* AI Insight */}
                    <div className="card" style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.1), rgba(0,212,160,0.05))', border: '1px solid rgba(108,99,255,0.2)' }}>
                        <div style={{ fontSize: 20, marginBottom: 10 }}>✨</div>
                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                            AI Insight
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            You're saving well! Consider investing ₹5,100 more in SIP this month to hit your annual investment goal.
                        </p>
                        <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }}>
                            Explore options
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
