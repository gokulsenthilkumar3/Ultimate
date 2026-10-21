'use client';

import React, { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { formatCurrency } from '@/packages/utils/validators';

interface UserBudget {
    income: number;
    needs: number;
    wants: number;
    savings: number;
    rule: string;
}

interface UserProfile {
    name: string;
    budgetRule: string;
    familySize: number;
    budget: UserBudget;
}

const sampleTransactions = [
    { name: 'Swiggy', category: 'Food', date: 'Today, 2:30 PM', amount: -450, icon: '🍔' },
    { name: 'Amazon', category: 'Shopping', date: 'Yesterday', amount: -1200, icon: '📦' },
    { name: 'Salary Credit', category: 'Income', date: 'Mar 1', amount: 0, icon: '💵', isSalary: true },
    { name: 'Netflix', category: 'Entertainment', date: 'Feb 28', amount: -649, icon: '🎬' },
    { name: 'Electricity Bill', category: 'Utilities', date: 'Feb 27', amount: -1800, icon: '⚡' },
];

function fmt(n: number) {
    return '₹' + Math.abs(n).toLocaleString('en-IN');
}

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

export default function DashboardPage() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = auth.onAuthStateChanged(async (firebaseUser) => {
            if (!firebaseUser) return;
            try {
                const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
                const data = snap.data();
                const displayName = firebaseUser.displayName || data?.profile?.name || data?.email?.split('@')[0] || 'there';
                if (data?.budget?.monthly) {
                    setProfile({
                        name: displayName,
                        budgetRule: data.budget.rule || '50/30/20',
                        familySize: data.profile?.familySize || 1,
                        budget: {
                            income: data.budget.monthly.income || 0,
                            needs: data.budget.monthly.needs || 0,
                            wants: data.budget.monthly.wants || 0,
                            savings: data.budget.monthly.savings || 0,
                            rule: data.budget.rule || '50/30/20',
                        }
                    });
                } else {
                    setProfile({ name: displayName, budgetRule: '50/30/20', familySize: 1, budget: { income: 0, needs: 0, wants: 0, savings: 0, rule: '50/30/20' } });
                }
            } catch {
                const name = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'there';
                setProfile({ name, budgetRule: '50/30/20', familySize: 1, budget: { income: 0, needs: 0, wants: 0, savings: 0, rule: '50/30/20' } });
            } finally {
                setLoading(false);
            }
        });
        return () => unsub();
    }, []);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
                <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTop: '3px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading your dashboard…</div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    const ruleParts = (profile?.budgetRule || '50/30/20').split('/');
    const ruleNeeds = ruleParts[0] || '50';
    const ruleWants = ruleParts[1] || '30';
    const ruleSavings = ruleParts[2] || '20';

    const income = profile?.budget.income || 0;
    const needs = profile?.budget.needs || 0;
    const wants = profile?.budget.wants || 0;
    const savings = profile?.budget.savings || 0;

    // Sample spending (replace with real transaction data later)
    const needsSpent = Math.round(needs * 0.47);
    const wantsSpent = Math.round(wants * 0.55);
    const savingsSpent = Math.round(savings * 0.12);

    const hasBudget = income > 0;

    const txWithSalary = sampleTransactions.map(tx =>
        tx.isSalary ? { ...tx, amount: income } : tx
    );

    const stats = [
        { label: 'Monthly Income', value: hasBudget ? formatCurrency(income) : '—', change: 'From onboarding', positive: true, color: 'var(--accent-green)', bg: 'rgba(0,212,160,0.1)', icon: '📥' },
        { label: `Needs (${ruleNeeds}%)`, value: hasBudget ? formatCurrency(needs) : '—', change: `${fmt(needsSpent)} spent so far`, positive: true, color: '#ff6b9d', bg: 'rgba(255,107,157,0.1)', icon: '🏠' },
        { label: `Wants (${ruleWants}%)`, value: hasBudget ? formatCurrency(wants) : '—', change: `${fmt(wantsSpent)} spent so far`, positive: true, color: 'var(--accent-orange)', bg: 'rgba(255,159,67,0.1)', icon: '🎯' },
        { label: `Savings (${ruleSavings}%)`, value: hasBudget ? formatCurrency(savings) : '—', change: `${fmt(savingsSpent)} invested`, positive: true, color: 'var(--accent)', bg: 'rgba(108,99,255,0.1)', icon: '📈' },
    ];

    const budgetCategories = [
        { label: `Needs (${ruleNeeds}%)`, spent: needsSpent, total: needs, color: '#ff6b9d' },
        { label: `Wants (${ruleWants}%)`, spent: wantsSpent, total: wants, color: 'var(--accent-orange)' },
        { label: `Savings (${ruleSavings}%)`, spent: savingsSpent, total: savings, color: 'var(--accent-green)' },
    ];

    return (
        <div className="fade-in">
            {/* Welcome */}
            <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: '-0.6px', color: 'var(--text-primary)', marginBottom: 4 }}>
                    {getGreeting()}, {profile?.name.split(' ')[0] || 'there'} 👋
                </h2>
                <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                    {hasBudget
                        ? `Your personalised ${profile?.budgetRule} budget plan is active for March 2026.`
                        : 'Complete onboarding to activate your personalised budget plan.'}
                </p>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                {stats.map(s => (
                    <div key={s.label} className="stat-card">
                        <div className="stat-card-header">
                            <span className="stat-card-label">{s.label}</span>
                            <div className="stat-card-icon" style={{ background: s.bg }}>
                                <span style={{ fontSize: 18 }}>{s.icon}</span>
                            </div>
                        </div>
                        <div className="stat-card-value" style={{ color: s.color }}>{s.value}</div>
                        <div className="stat-card-change positive">{s.change}</div>
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
                            <div className="card-subtitle">Sample data — connect your bank to sync</div>
                        </div>
                        <button className="btn btn-secondary btn-sm">Add Entry</button>
                    </div>
                    {txWithSalary.map((tx, i) => (
                        <div key={i} className="transaction-item">
                            <div className="transaction-icon" style={{ background: 'var(--bg-secondary)' }}>
                                <span style={{ fontSize: 18 }}>{tx.icon}</span>
                            </div>
                            <div className="transaction-info">
                                <div className="transaction-name">{tx.name}</div>
                                <div className="transaction-date">{tx.date} · <span style={{ color: 'var(--text-muted)' }}>{tx.category}</span></div>
                            </div>
                            <div className={`transaction-amount ${tx.amount < 0 ? 'debit' : 'credit'}`}>
                                {tx.amount < 0 ? '-' : '+'}{hasBudget && tx.isSalary ? formatCurrency(tx.amount) : fmt(tx.amount)}
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
                                <div className="card-subtitle">
                                    {hasBudget ? `Your ${profile?.budgetRule} plan` : 'Complete onboarding first'}
                                </div>
                            </div>
                            <span className="badge badge-green">On Track</span>
                        </div>
                        {hasBudget ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {budgetCategories.map(cat => (
                                    <div key={cat.label}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 500 }}>
                                            <span>{cat.label}</span>
                                            <span>{fmt(cat.spent)} / {formatCurrency(cat.total)}</span>
                                        </div>
                                        <div className="progress-bar">
                                            <div className="progress-fill" style={{ width: `${Math.min(100, (cat.spent / cat.total) * 100)}%`, background: cat.color }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                                <div style={{ fontSize: 32, marginBottom: 8 }}>⚙️</div>
                                No budget data yet
                                <div style={{ marginTop: 12 }}>
                                    <a href="/onboarding" className="btn btn-primary btn-sm">Complete Setup</a>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* AI Insight */}
                    <div className="card" style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.1), rgba(0,212,160,0.05))', border: '1px solid rgba(108,99,255,0.2)' }}>
                        <div style={{ fontSize: 20, marginBottom: 10 }}>✨</div>
                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                            AI Insight
                        </div>
                        {hasBudget ? (
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                You're on track with your {profile?.budgetRule} budget! Consider locking {formatCurrency(Math.round(savings * 0.4))} into SIPs this month to hit your annual savings goal.
                            </p>
                        ) : (
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                Complete your onboarding to get personalised AI-powered financial insights based on your income and family size.
                            </p>
                        )}
                        <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }}>
                            Explore options
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
